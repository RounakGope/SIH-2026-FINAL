package in.fasalrakshak.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

// In-memory database, so the test runs while a dev server holds ./data locked.
// The end-to-end checks are in api-test.py.
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE")
class ApiApplicationTests {

	@Test
	void contextLoads() {
	}

}
