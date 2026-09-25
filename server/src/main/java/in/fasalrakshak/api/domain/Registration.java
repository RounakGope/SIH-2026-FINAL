package in.fasalrakshak.api.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

// A number registered for alerts through the missed-call / IVR line.
@Entity
public class Registration {
	@Id public String phone;
	public String taluka;
	public String crop;
	public String lang;
	public String via;
	public long at;
}
