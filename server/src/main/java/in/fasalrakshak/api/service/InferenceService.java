package in.fasalrakshak.api.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import in.fasalrakshak.api.domain.CaseEntity;
import in.fasalrakshak.api.domain.CaseRepo;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

// Two-tier inference: the phone answers offline; when the photo reaches the server,
// the inference service (server/inference) checks it again with test-time
// augmentation. If the two disagree, a case the phone called "auto" goes to the
// KVK queue instead of standing as a confident diagnosis.
@Service
public class InferenceService {
	private static final Logger log = LoggerFactory.getLogger(InferenceService.class);
	private final String url;
	private final CaseRepo repo;
	private final ObjectMapper json;
	private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

	public InferenceService(@Value("${app.inference-url:}") String url, CaseRepo repo, ObjectMapper json) {
		this.url = url.replaceAll("/$", ""); this.repo = repo; this.json = json;
	}

	public boolean enabled() { return !url.isBlank(); }

	@Async
	public void verifyLater(String caseId) {
		if (!enabled()) return;
		try {
			CaseEntity e = repo.findById(caseId).orElse(null);
			if (e == null) return;
			Map<String, Object> d = json.readValue(e.data, new TypeReference<>() {});
			Object photo = d.get("photo");
			if (photo == null || e.crop == null) return;
			var req = HttpRequest.newBuilder(URI.create(url + "/verify")).timeout(Duration.ofSeconds(90))
				.header("Content-Type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofByteArray(json.writeValueAsBytes(Map.of("crop", e.crop.toLowerCase(), "image", photo)))).build();
			HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
			if (res.statusCode() != 200) { log.warn("re-verify {}: HTTP {}", caseId, res.statusCode()); return; }
			Map<String, Object> out = json.readValue(res.body(), new TypeReference<>() {});
			// Re-read: the farmer or an expert may have written in the meantime.
			CaseEntity fresh = repo.findById(caseId).orElse(null);
			if (fresh == null) return;
			Map<String, Object> fd = json.readValue(fresh.data, new TypeReference<>() {});
			boolean agrees = String.valueOf(out.get("label")).equals(fresh.label);
			Map<String, Object> check = new LinkedHashMap<>();
			check.put("label", out.get("label")); check.put("p", out.get("p")); check.put("agrees", agrees);
			check.put("at", System.currentTimeMillis()); check.put("model", out.get("model"));
			fd.put("serverCheck", check);
			if (!agrees && "auto".equals(fresh.status)) { fd.put("status", "pending_review"); fresh.status = "pending_review"; }
			fresh.data = json.writeValueAsString(fd);
			repo.save(fresh);
			log.info("re-verified {}: phone={} server={} ({})", caseId, fresh.label, out.get("label"), agrees ? "agrees" : "disagrees");
		} catch (Exception ex) {
			log.warn("re-verify {} failed: {}", caseId, ex.getMessage());
		}
	}
}
