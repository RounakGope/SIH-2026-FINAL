package in.fasalrakshak.api.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

// Idempotency record: an outbox op id that has already been applied.
@Entity
public class AppliedOp {
	@Id public String opId;
	public long appliedAt;
}
