package in.fasalrakshak.api.web;

import java.security.Principal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import in.fasalrakshak.api.domain.PlotRepo;
import in.fasalrakshak.api.domain.RegistrationRepo;
import in.fasalrakshak.api.service.CaseService;
import in.fasalrakshak.api.service.SmsService;

// KVK expert and district officer.
@RestController
@RequestMapping("/api/staff")
public class StaffController {
	private final CaseService cases;
	private final SmsService sms;
	private final RegistrationRepo registrations;
	private final PlotRepo plots;

	public StaffController(CaseService cases, SmsService sms, RegistrationRepo registrations, PlotRepo plots) {
		this.cases = cases; this.sms = sms; this.registrations = registrations; this.plots = plots;
	}

	@GetMapping("/cases")
	public List<Map<String, Object>> cases() { return cases.staffCases(); }

	@PostMapping("/cases/{id}/decision")
	public Map<String, Object> decide(@PathVariable String id, @RequestBody Map<String, Object> decision, Principal who) {
		return cases.decide(id, decision, who.getName());
	}

	@PostMapping("/seed")
	public Map<String, Object> seed(@RequestBody List<Map<String, Object>> list) { return Map.of("seeded", cases.seed(list)); }

	@DeleteMapping("/seed")
	public Map<String, Object> clearSeed() { return Map.of("removed", cases.clearSeed()); }

	// Officer advisory to every number registered in a taluka (IVR registrations and
	// plots whose farmer agreed to SMS).
	@PostMapping("/broadcast")
	public Map<String, Object> broadcast(@RequestBody Map<String, String> body) {
		String taluka = body.get("taluka"), text = body.get("text");
		if (text == null || text.isBlank() || text.length() > 480) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "text");
		Map<String, Boolean> to = new LinkedHashMap<>();
		registrations.findByTaluka(taluka).forEach(r -> to.put(r.phone, true));
		plots.findByTalukaAndSmsConsentTrue(taluka).forEach(p -> { if (p.phone != null) to.put(p.phone, true); });
		to.keySet().forEach(phone -> sms.send(phone, text, body.getOrDefault("kind", "broadcast"), taluka));
		return Map.of("sent", to.size());
	}
}
