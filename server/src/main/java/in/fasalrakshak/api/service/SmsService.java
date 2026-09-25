package in.fasalrakshak.api.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import in.fasalrakshak.api.domain.SmsMessage;
import in.fasalrakshak.api.domain.SmsRepo;
import tools.jackson.databind.ObjectMapper;

// The SMS gateway. Every message is stored (the sandbox inbox shows them all).
// With SMS_WEBHOOK_URL set it is also POSTed as JSON {to, text, kind} to that URL,
// the hook for a real provider (which in India needs a DLT-registered sender ID and
// templates); without it, nothing leaves the server.
@Service
public class SmsService {
	private static final Logger log = LoggerFactory.getLogger(SmsService.class);
	private final SmsRepo repo;
	private final ObjectMapper json;
	private final String webhook;
	private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

	public SmsService(SmsRepo repo, ObjectMapper json, @Value("${app.sms.webhook-url:}") String webhook) {
		this.repo = repo; this.json = json; this.webhook = webhook;
	}

	public SmsMessage send(String to, String text, String kind, String taluka) {
		SmsMessage m = new SmsMessage();
		m.id = UUID.randomUUID().toString(); m.toAddr = to; m.text = text; m.kind = kind; m.taluka = taluka;
		m.at = System.currentTimeMillis();
		m.gateway = webhook.isBlank() ? "sandbox" : "webhook";
		m.status = "stored";
		if (!webhook.isBlank()) {
			try {
				var req = HttpRequest.newBuilder(URI.create(webhook)).timeout(Duration.ofSeconds(10))
					.header("Content-Type", "application/json")
					.POST(HttpRequest.BodyPublishers.ofByteArray(json.writeValueAsBytes(Map.of("to", to, "text", text, "kind", kind)))).build();
				int code = http.send(req, HttpResponse.BodyHandlers.discarding()).statusCode();
				m.status = code < 300 ? "sent" : "failed";
			} catch (Exception e) {
				log.warn("SMS webhook failed: {}", e.getMessage());
				m.status = "failed";
			}
		}
		return repo.save(m);
	}

	public List<SmsMessage> recent() { return repo.findTop500ByOrderByAtDesc(); }
	public boolean live() { return !webhook.isBlank(); }
}
