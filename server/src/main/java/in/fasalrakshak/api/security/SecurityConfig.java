package in.fasalrakshak.api.security;

import java.util.List;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

// Roles: FARMER (a device), EXPERT (KVK), OFFICER (district). Stateless JWT.
@Configuration
public class SecurityConfig {
	@Bean
	SecurityFilterChain chain(HttpSecurity http, JwtFilter jwt, @Qualifier("corsSource") CorsConfigurationSource cors) throws Exception {
		http.csrf(c -> c.disable())
			.cors(c -> c.configurationSource(cors))
			.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(a -> a
				.requestMatchers("/api/auth/**", "/api/health").permitAll()
				// Telephony and device webhooks authenticate with their own shared keys.
				.requestMatchers("/api/ivr/**").permitAll()
				.requestMatchers(HttpMethod.POST, "/api/sensors/readings").permitAll()
				.requestMatchers("/api/staff/**", "/api/sms/**").hasAnyRole("EXPERT", "OFFICER")
				.requestMatchers("/api/sync", "/api/cases/mine").hasRole("FARMER")
				.requestMatchers("/api/**").authenticated()
				.anyRequest().permitAll())
			.exceptionHandling(e -> e.authenticationEntryPoint((req, res, ex) -> res.sendError(401, "Sign in first")))
			.addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class);
		return http.build();
	}

	@Bean
	PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

	@Bean
	CorsConfigurationSource corsSource(@Value("${app.cors}") List<String> origins) {
		CorsConfiguration c = new CorsConfiguration();
		c.setAllowedOrigins(origins);
		c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
		c.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Device-Key", "X-Ivr-Key"));
		UrlBasedCorsConfigurationSource s = new UrlBasedCorsConfigurationSource();
		s.registerCorsConfiguration("/api/**", c);
		return s;
	}
}
