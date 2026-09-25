package in.fasalrakshak.api.web;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import in.fasalrakshak.api.service.CaseService;

// Anonymous reports for the outbreak alert and map: no uid, photo, phone or exact
// location; only cases whose farmer agreed to share (plus demo data).
@RestController
public class ReportController {
	private final CaseService cases;
	public ReportController(CaseService cases) { this.cases = cases; }

	@GetMapping("/api/reports")
	public List<Map<String, Object>> reports(@RequestParam(required = false) String taluka,
		@RequestParam(required = false) Double lat, @RequestParam(required = false) Double lon,
		@RequestParam(required = false) Double radiusKm) {
		return cases.reports(taluka, lat, lon, radiusKm);
	}
}
