package in.fasalrakshak.api.web;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import in.fasalrakshak.api.domain.DeviceRepo;
import in.fasalrakshak.api.domain.DeviceUser;
import in.fasalrakshak.api.domain.StaffRepo;
import in.fasalrakshak.api.security.Jwt;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
	private final Jwt jwt;
	private final DeviceRepo devices;
	private final StaffRepo staff;
	private final PasswordEncoder encoder;

	public AuthController(Jwt jwt, DeviceRepo devices, StaffRepo staff, PasswordEncoder encoder) {
		this.jwt = jwt; this.devices = devices; this.staff = staff; this.encoder = encoder;
	}

	// A farmer's phone: no account, no personal data, just a random device id.
	// The same device always gets the same uid back.
	@PostMapping("/device")
	public Map<String, Object> device(@RequestBody Map<String, String> body) {
		String deviceId = body.get("deviceId");
		if (deviceId == null || deviceId.length() < 8 || deviceId.length() > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "deviceId");
		DeviceUser d = devices.findByDeviceId(deviceId).orElseGet(() -> {
			DeviceUser n = new DeviceUser(); n.uid = "f-" + UUID.randomUUID(); n.deviceId = deviceId; n.createdAt = System.currentTimeMillis();
			return devices.save(n);
		});
		return Map.of("token", jwt.issue(d.uid, "FARMER", Duration.ofDays(365)), "uid", d.uid);
	}

	// KVK experts and district officers.
	@PostMapping("/login")
	public Map<String, Object> login(@RequestBody Map<String, String> body) {
		var u = staff.findById(String.valueOf(body.get("email")).trim().toLowerCase())
			.filter(s -> encoder.matches(String.valueOf(body.get("password")), s.passwordHash))
			.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Wrong email or password"));
		return Map.of("token", jwt.issue(u.email, u.role, Duration.ofHours(12)), "uid", u.email, "email", u.email, "role", u.role.toLowerCase());
	}
}
