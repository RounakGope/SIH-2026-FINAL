package in.fasalrakshak.api.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

// HS256 JSON Web Tokens with the JDK's own HMAC: { sub, role, iat, exp }.
@Component
public class Jwt {
	private static final Base64.Encoder ENC = Base64.getUrlEncoder().withoutPadding();
	private static final Base64.Decoder DEC = Base64.getUrlDecoder();
	private final byte[] key;
	private final ObjectMapper json;

	public Jwt(@Value("${app.jwt-secret}") String secret, ObjectMapper json) {
		if (secret.length() < 32) throw new IllegalStateException("JWT_SECRET must be at least 32 characters");
		this.key = secret.getBytes(StandardCharsets.UTF_8);
		this.json = json;
	}

	public String issue(String subject, String role, Duration ttl) {
		Map<String, Object> claims = new LinkedHashMap<>();
		long now = Instant.now().getEpochSecond();
		claims.put("sub", subject); claims.put("role", role); claims.put("iat", now); claims.put("exp", now + ttl.toSeconds());
		String body = ENC.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8)) + "." +
			ENC.encodeToString(json.writeValueAsBytes(claims));
		return body + "." + ENC.encodeToString(sign(body));
	}

	// The claims, or null if the token is malformed, forged or expired.
	public Map<String, Object> verify(String token) {
		try {
			String[] p = token.split("[.]");
			if (p.length != 3) return null;
			if (!MessageDigest.isEqual(sign(p[0] + "." + p[1]), DEC.decode(p[2]))) return null;
			Map<String, Object> claims = json.readValue(DEC.decode(p[1]), new TypeReference<>() {});
			if (((Number) claims.get("exp")).longValue() < Instant.now().getEpochSecond()) return null;
			return claims;
		} catch (RuntimeException e) {
			return null;
		}
	}

	private byte[] sign(String data) {
		try {
			Mac mac = Mac.getInstance("HmacSHA256");
			mac.init(new SecretKeySpec(key, "HmacSHA256"));
			return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
		} catch (Exception e) {
			throw new IllegalStateException(e);
		}
	}
}
