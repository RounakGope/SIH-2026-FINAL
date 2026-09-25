package in.fasalrakshak.api.web;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import in.fasalrakshak.api.domain.PlotRepo;
import in.fasalrakshak.api.domain.Registration;
import in.fasalrakshak.api.domain.RegistrationRepo;
import in.fasalrakshak.api.domain.SensorReading;
import in.fasalrakshak.api.domain.SensorRepo;
import in.fasalrakshak.api.domain.SmsMessage;
import in.fasalrakshak.api.service.BhashiniService;
import in.fasalrakshak.api.service.CaseService;
import in.fasalrakshak.api.service.InferenceService;
import in.fasalrakshak.api.service.SmsService;

// The non-app channels: SMS gateway, IVR line, field sensors, speech; and health.
@RestController
public class ChannelController {
	private final SmsService sms;
	private final CaseService cases;
	private final RegistrationRepo registrations;
	private final SensorRepo sensors;
	private final PlotRepo plots;
	private final BhashiniService bhashini;
	private final InferenceService inference;
	private final boolean ivrSimulator;
	private final String ivrKey, sensorKey;

	public ChannelController(SmsService sms, CaseService cases, RegistrationRepo registrations, SensorRepo sensors, PlotRepo plots,
		BhashiniService bhashini, InferenceService inference, @Value("${app.ivr.simulator}") boolean ivrSimulator,
		@Value("${app.ivr.key:}") String ivrKey, @Value("${app.sensor-key}") String sensorKey) {
		this.sms = sms; this.cases = cases; this.registrations = registrations; this.sensors = sensors; this.plots = plots;
		this.bhashini = bhashini; this.inference = inference; this.ivrSimulator = ivrSimulator; this.ivrKey = ivrKey; this.sensorKey = sensorKey;
	}

	// ---------- SMS ----------
	@PostMapping("/api/sms")
	public SmsMessage send(@RequestBody Map<String, String> m) {
		return sms.send(m.get("to"), m.get("text"), m.getOrDefault("kind", "manual"), m.get("taluka"));
	}

	@GetMapping("/api/sms/sandbox")
	public List<Map<String, Object>> sandbox() {
		return sms.recent().stream().map(m -> {
			Map<String, Object> o = new LinkedHashMap<>();
			o.put("id", m.id); o.put("to", m.toAddr); o.put("text", m.text); o.put("kind", m.kind);
			o.put("taluka", m.taluka); o.put("at", m.at); o.put("gateway", m.gateway); o.put("status", m.status);
			return o;
		}).toList();
	}

	// ---------- IVR (the telephony provider's webhook; the /ivr page simulates it) ----------
	private void ivrAllowed(String key) {
		if (!ivrSimulator && (ivrKey.isBlank() || !ivrKey.equals(key))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "IVR key");
	}

	@PostMapping("/api/ivr/calls")
	public Map<String, Object> ivrCall(@RequestBody Map<String, Object> c, @RequestHeader(value = "X-Ivr-Key", required = false) String key) {
		ivrAllowed(key);
		if (!String.valueOf(c.get("phone")).matches("[6-9]\\d{9}")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "phone");
		return cases.ivrCase(c);
	}

	@PostMapping("/api/ivr/register")
	public Map<String, Object> ivrRegister(@RequestBody Map<String, String> r, @RequestHeader(value = "X-Ivr-Key", required = false) String key) {
		ivrAllowed(key);
		if (r.get("phone") == null || !r.get("phone").matches("[6-9]\\d{9}")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "phone");
		Registration reg = new Registration();
		reg.phone = r.get("phone"); reg.taluka = r.get("taluka"); reg.crop = r.get("crop"); reg.lang = r.get("lang");
		reg.via = r.getOrDefault("via", "ivr"); reg.at = System.currentTimeMillis();
		registrations.save(reg);
		return Map.of("registered", reg.phone);
	}

	// ---------- field sensors ----------
	@PostMapping("/api/sensors/readings")
	public Map<String, Object> reading(@RequestBody Map<String, Object> r, @RequestHeader(value = "X-Device-Key", required = false) String key) {
		if (!sensorKey.equals(key)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "device key");
		SensorReading s = new SensorReading();
		s.plotId = CaseService.str(r.get("plotId"));
		Double at = CaseService.num(r.get("at")); s.at = at == null ? System.currentTimeMillis() : at.longValue();
		Double lw = CaseService.num(r.get("leafWetness")); s.leafWetness = lw == null ? 0 : Math.max(0, Math.min(1, lw));
		s.soilMoisture = CaseService.num(r.get("soilMoisture")); s.tempC = CaseService.num(r.get("tempC")); s.rh = CaseService.num(r.get("rh"));
		s.device = CaseService.str(r.getOrDefault("device", "sensor"));
		Double step = CaseService.num(r.get("stepMin")); s.stepMin = step == null ? 5 : step.intValue();
		sensors.save(s);
		return Map.of("ok", true);
	}

	@GetMapping("/api/sensors/{plotId}")
	public List<SensorReading> readings(@PathVariable String plotId, Authentication who) {
		boolean staff = who.getAuthorities().stream().anyMatch(a -> !a.getAuthority().equals("ROLE_FARMER"));
		if (!staff && plots.findById(plotId).map(p -> !who.getName().equals(p.uid)).orElse(false))
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "not your plot");
		return sensors.findByPlotIdAndAtGreaterThanEqualOrderByAtAsc(plotId, System.currentTimeMillis() - 86_400_000L);
	}

	// ---------- speech (Bhashini) ----------
	@PostMapping("/api/speech/tts")
	public Map<String, String> tts(@RequestBody Map<String, String> r) throws Exception {
		if (!bhashini.enabled()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Bhashini keys not configured");
		String text = r.getOrDefault("text", "");
		if (text.isBlank() || text.length() > 1200) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "text");
		return Map.of("audio", bhashini.tts(text, r.getOrDefault("lang", "mr")));
	}

	@PostMapping("/api/speech/asr")
	public Map<String, String> asr(@RequestBody Map<String, String> r) throws Exception {
		if (!bhashini.enabled()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Bhashini keys not configured");
		String mime = r.getOrDefault("mime", "audio/wav");
		String format = mime.contains("ogg") ? "ogg" : mime.contains("flac") ? "flac" : mime.contains("webm") ? "webm" : "wav";
		return Map.of("text", bhashini.asr(r.get("audio"), format, r.getOrDefault("lang", "mr")));
	}

	// ---------- health ----------
	@GetMapping("/api/health")
	public Map<String, Object> health() {
		return Map.of("ok", true, "smsGateway", sms.live() ? "webhook" : "sandbox", "bhashini", bhashini.enabled(),
			"reverification", inference.enabled(), "ivr", ivrSimulator ? "simulator" : "provider");
	}
}
