package in.fasalrakshak.api.domain;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SmsRepo extends JpaRepository<SmsMessage, String> {
	java.util.List<SmsMessage> findTop500ByOrderByAtDesc();
}
