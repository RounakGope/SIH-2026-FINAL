package in.fasalrakshak.api.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

// Remembers automatic messages already sent (block alert per day, escalation per case).
@Entity
public class SentKey {
	@Id public String k;
	public long at;
}
