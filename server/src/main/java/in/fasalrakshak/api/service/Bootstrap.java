package in.fasalrakshak.api.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import in.fasalrakshak.api.domain.StaffRepo;
import in.fasalrakshak.api.domain.StaffUser;

// Start-up: the PostGIS extension and spatial index (on PostgreSQL), and two demo
// staff accounts when there are none.
@Component
public class Bootstrap implements ApplicationRunner {
	private static final Logger log = LoggerFactory.getLogger(Bootstrap.class);
	private final JdbcTemplate jdbc;
	private final StaffRepo staff;
	private final PasswordEncoder encoder;
	private final String dbUrl, demoPassword;

	public Bootstrap(JdbcTemplate jdbc, StaffRepo staff, PasswordEncoder encoder,
		@Value("${spring.datasource.url}") String dbUrl, @Value("${app.staff.password}") String demoPassword) {
		this.jdbc = jdbc; this.staff = staff; this.encoder = encoder; this.dbUrl = dbUrl; this.demoPassword = demoPassword;
	}

	@Override
	public void run(ApplicationArguments args) {
		if (dbUrl.startsWith("jdbc:postgresql")) {
			jdbc.execute("CREATE EXTENSION IF NOT EXISTS postgis");
			jdbc.execute("CREATE INDEX IF NOT EXISTS cases_geo_idx ON cases USING GIST ((geography(ST_SetSRID(ST_MakePoint(lon, lat), 4326))))");
			log.info("PostGIS ready: spatial index on cases");
		}
		if (staff.count() == 0) {
			add("expert@kvk-wardha.demo", "EXPERT");
			add("officer@wardha.demo", "OFFICER");
			log.warn("Created demo staff accounts expert@kvk-wardha.demo and officer@wardha.demo. Set STAFF_DEMO_PASSWORD before any real use.");
		}
	}

	private void add(String email, String role) {
		StaffUser u = new StaffUser(); u.email = email; u.role = role; u.passwordHash = encoder.encode(demoPassword);
		staff.save(u);
	}
}
