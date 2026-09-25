package in.fasalrakshak.api.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class StaffUser {
	@Id public String email;
	public String passwordHash;
	public String role; // EXPERT | OFFICER
}
