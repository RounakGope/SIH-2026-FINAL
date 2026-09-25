package in.fasalrakshak.api.web;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

// Our own refusals ("Wrong email or password", "not your case") reach the app as
// {status, message}. Anything unexpected keeps Spring's default error body, which
// leaves exception details out.
@RestControllerAdvice
public class ApiErrors {
	@ExceptionHandler(ResponseStatusException.class)
	public ResponseEntity<Map<String, Object>> refused(ResponseStatusException e) {
		return ResponseEntity.status(e.getStatusCode())
			.body(Map.of("status", e.getStatusCode().value(), "message", e.getReason() == null ? "" : e.getReason()));
	}
}
