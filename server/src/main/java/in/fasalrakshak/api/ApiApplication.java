package in.fasalrakshak.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

// FasalRakshak API: sync for the farmer PWA, the KVK / officer dashboard, the SMS
// gateway, the IVR line, Bhashini speech and server re-verification.
@SpringBootApplication
@EnableScheduling
@EnableAsync
public class ApiApplication {
	public static void main(String[] args) {
		SpringApplication.run(ApiApplication.class, args);
	}
}
