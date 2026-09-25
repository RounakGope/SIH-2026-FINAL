package in.fasalrakshak.api.domain;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RegistrationRepo extends JpaRepository<Registration, String> {
	java.util.List<Registration> findByTaluka(String taluka);
}
