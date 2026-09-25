package in.fasalrakshak.api.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;
import in.fasalrakshak.api.domain.CaseEntity;
import in.fasalrakshak.api.domain.CaseRepo;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

// Cases (field walks): the farmer's writes, the anonymous reports other farmers
// see, and the expert's decisions. The write rules are the same as firestore.rules.
@Service
public class CaseService {
	public static final Set<String> DECIDED = Set.of("confirmed", "corrected", "lab_referred");
	public static final double THRESHOLD = 0.7;     // below this the app does not prescribe
	public static final int CELL = 20;              // report grid: 1/20 degree, about 5.5 km
	private static final long DAY = 86_400_000L;
	private static final TypeReference<Map<String, Object>> MAP = new TypeReference<>() {};

	private final CaseRepo repo;
	private final ObjectMapper json;
	private final Names names;
	private final JdbcTemplate jdbc;
	private final InferenceService inference;
	private final SmsService sms;
	private final SmsTexts texts;
	private final boolean postgis;

	public CaseService(CaseRepo repo, ObjectMapper json, Names names, JdbcTemplate jdbc, InferenceService inference,
		SmsService sms, SmsTexts texts, @org.springframework.beans.factory.annotation.Value("${spring.datasource.url}") String dbUrl) {
		this.repo = repo; this.json = json; this.names = names; this.jdbc = jdbc; this.inference = inference;
		this.sms = sms; this.texts = texts;
		this.postgis = dbUrl.startsWith("jdbc:postgresql");
	}

	public Map<String, Object> read(CaseEntity e) {
		Map<String, Object> d = json.readValue(e.data, MAP);
		d.put("id", e.id); d.put("status", e.status); d.put("label", e.label);
		return d;
	}

	private void apply(CaseEntity e, Map<String, Object> d) {
		e.uid = str(d.get("uid")); e.taluka = str(d.get("taluka")); e.crop = str(d.get("crop"));
		e.label = str(d.get("label")); e.status = str(d.get("status"));
		e.lat = num(d.get("lat")); e.lon = num(d.get("lon"));
		Double created = num(d.get("createdAt")); e.createdAt = created == null ? System.currentTimeMillis() : created.longValue();
		e.share = Boolean.TRUE.equals(d.get("share")); e.seed = Boolean.TRUE.equals(d.get("seed"));
		e.phone = str(d.get("phone")); e.kind = str(d.get("kind"));
		e.data = json.writeValueAsString(d);
	}

	// ---------- farmer writes (from the sync outbox) ----------
	@Transactional
	public Map<String, Object> upsertFromFarmer(String uid, Map<String, Object> in) {
		String id = str(in.get("id"));
		if (id == null || id.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "case id missing");
		CaseEntity e = repo.findById(id).orElse(null);
		if (e != null && !uid.equals(e.uid)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "not your case");
		Map<String, Object> incoming = new LinkedHashMap<>(in);
		incoming.put("uid", uid);
		// A farmer never writes the expert's verdict, the server's re-check, or demo data.
		incoming.remove("expert"); incoming.remove("serverCheck"); incoming.remove("seed");
		if (e != null && DECIDED.contains(e.status)) { incoming.remove("status"); incoming.remove("label"); }
		else if (incoming.containsKey("status") && !Set.of("auto", "pending_review").contains(incoming.get("status")))
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "only an expert can decide a case");
		Map<String, Object> data = e == null ? new LinkedHashMap<>() : read(e);
		data.putAll(incoming);
		if (e == null) { e = new CaseEntity(); e.id = id; if (!data.containsKey("expert")) data.put("expert", null); }
		apply(e, data);
		repo.save(e);
		if (in.get("photo") != null && !DECIDED.contains(e.status)) {
			// Start the server re-check once this write has committed, or it would look
			// for a case that isn't in the database yet.
			if (TransactionSynchronizationManager.isSynchronizationActive())
				TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
					@Override public void afterCommit() { inference.verifyLater(id); }
				});
			else inference.verifyLater(id);
		}
		return data;
	}

	public List<Map<String, Object>> mine(String uid) { return repo.findByUid(uid).stream().map(this::read).toList(); }

	// ---------- anonymous reports: what other farmers may see ----------
	public boolean shared(CaseEntity e) { return Boolean.TRUE.equals(e.seed) || Boolean.TRUE.equals(e.share); }

	public Map<String, Object> reportOf(Map<String, Object> c) {
		Map<String, Object> r = new LinkedHashMap<>();
		r.put("id", c.get("id"));
		for (String k : List.of("taluka", "crop", "label", "status", "confidence")) if (c.get(k) != null) r.put(k, c.get(k));
		Double created = num(c.get("createdAt"));
		if (created != null) r.put("createdAt", Math.floorDiv(created.longValue(), DAY) * DAY);
		Double lat = num(c.get("lat")), lon = num(c.get("lon"));
		if (lat != null && lon != null) { r.put("cy", Math.round(lat * CELL)); r.put("cx", Math.round(lon * CELL)); }
		Double sev = num(c.get("sevIndex"));
		if (sev != null) r.put("sev", Math.round(sev));
		Double acres = num(c.get("acres"));
		if (acres != null) r.put("acres", Math.round(acres));
		if (c.get("prevTreatment") != null) r.put("treated", c.get("prevTreatment"));
		if (c.get("improved") != null) r.put("improved", c.get("improved"));
		if (Boolean.TRUE.equals(c.get("seed"))) r.put("seed", true);
		return r;
	}

	// Last 30 days of shared cases as reports, optionally within one taluka or within
	// radiusKm of a point (PostGIS ST_DWithin on PostgreSQL, plain maths elsewhere).
	public List<Map<String, Object>> reports(String taluka, Double lat, Double lon, Double radiusKm) {
		long since = System.currentTimeMillis() - 30 * DAY;
		List<CaseEntity> list;
		if (taluka != null) list = repo.findByTaluka(taluka);
		else if (lat != null && lon != null && radiusKm != null) {
			if (postgis) {
				List<String> ids = jdbc.queryForList("SELECT id FROM cases WHERE lat IS NOT NULL AND ST_DWithin(" +
					"geography(ST_SetSRID(ST_MakePoint(lon, lat), 4326)), geography(ST_SetSRID(ST_MakePoint(?, ?), 4326)), ?)",
					String.class, lon, lat, radiusKm * 1000);
				list = repo.findAllById(ids);
			} else {
				list = repo.findByCreatedAtGreaterThanEqual(since).stream()
					.filter(e -> e.lat != null && distanceKm(lat, lon, e.lat, e.lon) <= radiusKm).toList();
			}
		} else list = repo.findByCreatedAtGreaterThanEqual(since);
		return list.stream().filter(e -> shared(e) && e.createdAt != null && e.createdAt >= since && !"ivr".equals(e.kind))
			.map(e -> reportOf(read(e))).toList();
	}

	public boolean countsForAlert(CaseEntity e, Map<String, Object> c) {
		Double conf = num(c.get("confidence"));
		boolean counted = "confirmed".equals(e.status) || "corrected".equals(e.status)
			|| ("auto".equals(e.status) && conf != null && conf >= THRESHOLD);
		return counted && names.diseased(e.crop, e.label);
	}

	// ---------- staff ----------
	public List<Map<String, Object>> staffCases() {
		return repo.findByCreatedAtGreaterThanEqual(System.currentTimeMillis() - 90 * DAY).stream().map(this::read).toList();
	}

	@Transactional
	public Map<String, Object> decide(String id, Map<String, Object> decision, String staffEmail) {
		CaseEntity e = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "no such case"));
		String status = str(decision.get("status"));
		if (!DECIDED.contains(status)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status must be confirmed, corrected or lab_referred");
		Map<String, Object> d = read(e);
		Map<String, Object> expert = new LinkedHashMap<>();
		expert.put("label", decision.get("label")); expert.put("by", staffEmail);
		expert.put("at", System.currentTimeMillis()); expert.put("note", decision.get("note"));
		d.put("status", status); d.put("expert", expert);
		if ("corrected".equals(status) && decision.get("label") != null) d.put("label", decision.get("label"));
		apply(e, d);
		repo.save(e);
		// The farmer is told by SMS, in their language, if they gave a number.
		if (e.phone != null) {
			String text = texts.expertReply(status, e.crop, e.label, str(d.getOrDefault("lang", "mr")), e.kind);
			if (text != null) sms.send(e.phone, text, "expert", e.taluka);
		}
		return d;
	}

	@Transactional
	public int seed(List<Map<String, Object>> cases) {
		for (Map<String, Object> c : cases) {
			c.put("seed", true);
			CaseEntity e = new CaseEntity(); e.id = str(c.get("id"));
			apply(e, c); repo.save(e);
		}
		return cases.size();
	}

	@Transactional
	public long clearSeed() { return repo.deleteBySeedTrue(); }

	// A voice report from the IVR line: a case for the KVK queue with a call-back number.
	@Transactional
	public Map<String, Object> ivrCase(Map<String, Object> c) {
		Map<String, Object> d = new LinkedHashMap<>(c);
		d.put("kind", "ivr"); d.put("status", "pending_review"); d.put("share", false); d.put("expert", null);
		d.put("uid", "ivr:" + str(c.get("phone")));
		d.putIfAbsent("createdAt", System.currentTimeMillis());
		CaseEntity e = new CaseEntity(); e.id = str(c.get("id")) != null ? str(c.get("id")) : java.util.UUID.randomUUID().toString();
		d.put("id", e.id);
		apply(e, d); repo.save(e);
		return d;
	}

	// ---------- helpers ----------
	public static String str(Object o) { return o == null ? null : o.toString(); }
	public static Double num(Object o) {
		if (o instanceof Number n) return n.doubleValue();
		try { return o == null ? null : Double.valueOf(o.toString()); } catch (NumberFormatException ex) { return null; }
	}
	public static double distanceKm(double aLat, double aLon, double bLat, double bLon) {
		double r = Math.PI / 180, dLat = (bLat - aLat) * r, dLon = (bLon - aLon) * r;
		double h = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.pow(Math.sin(dLon / 2), 2);
		return 6371 * 2 * Math.asin(Math.sqrt(h));
	}
	public List<CaseEntity> all() { return new ArrayList<>(repo.findAll()); }
}
