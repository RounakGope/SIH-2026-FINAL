package in.fasalrakshak.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;

// A farmer's phone: anonymous, identified by a random id the app generates.
@Entity
public class DeviceUser {
	@Id public String uid;
	@Column(unique = true) public String deviceId;
	public long createdAt;
}
