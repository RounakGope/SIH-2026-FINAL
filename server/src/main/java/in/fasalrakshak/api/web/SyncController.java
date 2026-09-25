package in.fasalrakshak.api.web;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import in.fasalrakshak.api.domain.AppliedOp;
import in.fasalrakshak.api.domain.AppliedOpRepo;
import in.fasalrakshak.api.domain.PlotEntity;
import in.fasalrakshak.api.domain.PlotRepo;
import in.fasalrakshak.api.service.CaseService;
import tools.jackson.databind.ObjectMapper;

// The farmer app's outbox. Each op carries an opId (the idempotency key): an op
// already applied is acknowledged again without being re-applied, so a retry over
// flaky 2G can never double-write. Ops apply one by one, each in its own transaction.
@RestController
@RequestMapping("/api")
public class SyncController {
	private static final Logger log = LoggerFactory.getLogger(SyncController.class);
	private final CaseService cases;
	private final AppliedOpRepo applied;
	private final PlotRepo plots;
	private final ObjectMapper json;
	private final TransactionTemplate tx;

	public SyncController(CaseService cases, AppliedOpRepo applied, PlotRepo plots, ObjectMapper json, TransactionTemplate tx) {
		this.cases = cases; this.applied = applied; this.plots = plots; this.json = json; this.tx = tx;
	}

	@PostMapping("/sync")
	@SuppressWarnings("unchecked")
	public Map<String, Object> sync(@RequestBody Map<String, List<Map<String, Object>>> body, Principal who) {
		String uid = who.getName();
		List<String> done = new ArrayList<>(), rejected = new ArrayList<>();
		for (Map<String, Object> op : body.getOrDefault("ops", List.of())) {
			String opId = CaseService.str(op.get("opId"));
			if (opId == null) continue;
			if (applied.existsById(opId)) { done.add(opId); continue; }
			try {
				tx.executeWithoutResult(s -> {
					switch (String.valueOf(op.get("type"))) {
						case "case" -> cases.upsertFromFarmer(uid, (Map<String, Object>) op.get("case"));
						case "plot" -> savePlot(uid, (Map<String, Object>) op.get("plot"));
						default -> throw new IllegalArgumentException("unknown op type " + op.get("type"));
					}
					AppliedOp a = new AppliedOp(); a.opId = opId; a.appliedAt = System.currentTimeMillis();
					applied.save(a);
				});
				done.add(opId);
			} catch (ResponseStatusException | IllegalArgumentException e) {
				// A rule violation won't succeed on retry either: acknowledge it so it
				// leaves the outbox, and report it.
				log.warn("sync op {} from {} rejected: {}", opId, uid, e.getMessage());
				AppliedOp a = new AppliedOp(); a.opId = opId; a.appliedAt = System.currentTimeMillis();
				applied.save(a);
				done.add(opId); rejected.add(opId);
			}
		}
		return Map.of("applied", done, "rejected", rejected);
	}

	private void savePlot(String uid, Map<String, Object> p) {
		String id = CaseService.str(p.get("id"));
		PlotEntity e = plots.findById(id).orElseGet(PlotEntity::new);
		if (e.uid != null && !e.uid.equals(uid)) throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "not your plot");
		e.id = id; e.uid = uid; e.taluka = CaseService.str(p.get("taluka")); e.crop = CaseService.str(p.get("crop"));
		e.phone = CaseService.str(p.get("phone")); e.smsConsent = Boolean.TRUE.equals(p.get("smsConsent"));
		e.lang = CaseService.str(p.get("lang")); e.data = json.writeValueAsString(p);
		plots.save(e);
	}

	@GetMapping("/cases/mine")
	public List<Map<String, Object>> mine(Principal who) { return cases.mine(who.getName()); }
}
