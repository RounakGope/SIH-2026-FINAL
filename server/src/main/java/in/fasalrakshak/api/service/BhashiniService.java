package in.fasalrakshak.api.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

// Bhashini (Government of India language platform) text-to-speech and speech
// recognition for Marathi, Hindi and English. Two calls, per the Bhashini ULCA docs:
//   1. getModelsPipeline (with the ULCA user id and API key) returns the inference
//      endpoint, its key and the service id for the task and language;
//   2. the inference call itself.
// Endpoints are cached for an hour. Without BHASHINI_USER_ID / BHASHINI_API_KEY this
// service is off and the app uses the phone's own speech engine.
@Service
public class BhashiniService {
	private static final String CONFIG_URL = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline";
	private static final String PIPELINE_ID = "64392f96daac500b55c543cd"; // MeitY pipeline (ASR, NMT, TTS)
	private record Endpoint(String url, String keyName, String keyValue, String serviceId, long at) {}

	private final String userId, apiKey;
	private final ObjectMapper json;
	private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
	private final Map<String, Endpoint> cache = new ConcurrentHashMap<>();

	public BhashiniService(@Value("${app.bhashini.user-id:}") String userId, @Value("${app.bhashini.api-key:}") String apiKey, ObjectMapper json) {
		this.userId = userId; this.apiKey = apiKey; this.json = json;
	}

	public boolean enabled() { return !userId.isBlank() && !apiKey.isBlank(); }

	private Endpoint endpoint(String task, String lang) throws Exception {
		Endpoint e = cache.get(task + lang);
		if (e != null && System.currentTimeMillis() - e.at() < 3_600_000) return e;
		Map<String, Object> body = Map.of(
			"pipelineTasks", List.of(Map.of("taskType", task, "config", Map.of("language", Map.of("sourceLanguage", lang)))),
			"pipelineRequestConfig", Map.of("pipelineId", PIPELINE_ID));
		var req = HttpRequest.newBuilder(URI.create(CONFIG_URL)).timeout(Duration.ofSeconds(15))
			.header("Content-Type", "application/json").header("userID", userId).header("ulcaApiKey", apiKey)
			.POST(HttpRequest.BodyPublishers.ofByteArray(json.writeValueAsBytes(body))).build();
		Map<String, Object> r = call(req);
		Map<String, Object> ep = cast(r.get("pipelineInferenceAPIEndPoint"));
		Map<String, Object> key = cast(ep.get("inferenceApiKey"));
		Map<String, Object> cfg = cast(((List<?>) cast(((List<?>) r.get("pipelineResponseConfig")).get(0)).get("config")).get(0));
		e = new Endpoint((String) ep.get("callbackUrl"), (String) key.get("name"), (String) key.get("value"), (String) cfg.get("serviceId"), System.currentTimeMillis());
		cache.put(task + lang, e);
		return e;
	}

	// Base64 WAV audio of `text` spoken in `lang` (en | mr | hi).
	public String tts(String text, String lang) throws Exception {
		Endpoint e = endpoint("tts", lang);
		Map<String, Object> body = Map.of(
			"pipelineTasks", List.of(Map.of("taskType", "tts", "config", Map.of(
				"language", Map.of("sourceLanguage", lang), "serviceId", e.serviceId(), "gender", "female", "samplingRate", 16000))),
			"inputData", Map.of("input", List.of(Map.of("source", text))));
		Map<String, Object> r = call(inference(e, body));
		return (String) cast(((List<?>) cast(((List<?>) r.get("pipelineResponse")).get(0)).get("audio")).get(0)).get("audioContent");
	}

	// Transcript of base64 audio in `lang`. Bhashini expects wav, flac or ogg audio.
	public String asr(String audioB64, String format, String lang) throws Exception {
		Endpoint e = endpoint("asr", lang);
		Map<String, Object> body = Map.of(
			"pipelineTasks", List.of(Map.of("taskType", "asr", "config", Map.of(
				"language", Map.of("sourceLanguage", lang), "serviceId", e.serviceId(), "audioFormat", format, "samplingRate", 16000))),
			"inputData", Map.of("audio", List.of(Map.of("audioContent", audioB64))));
		Map<String, Object> r = call(inference(e, body));
		return (String) cast(((List<?>) cast(((List<?>) r.get("pipelineResponse")).get(0)).get("output")).get(0)).get("source");
	}

	private HttpRequest inference(Endpoint e, Map<String, Object> body) {
		return HttpRequest.newBuilder(URI.create(e.url())).timeout(Duration.ofSeconds(30))
			.header("Content-Type", "application/json").header(e.keyName(), e.keyValue())
			.POST(HttpRequest.BodyPublishers.ofByteArray(json.writeValueAsBytes(body))).build();
	}

	private Map<String, Object> call(HttpRequest req) throws Exception {
		HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
		if (res.statusCode() >= 300) throw new IllegalStateException("Bhashini HTTP " + res.statusCode());
		return json.readValue(res.body(), new TypeReference<>() {});
	}

	@SuppressWarnings("unchecked")
	private static Map<String, Object> cast(Object o) { return (Map<String, Object>) o; }
}
