package in.fasalrakshak.api.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

// A farmer's plot, synced from the app (several per device in agri-assistant mode).
@Entity
public class PlotEntity {
	@Id public String id;
	public String uid;
	public String taluka;
	public String crop;
	public String phone;
	public Boolean smsConsent;
	public String lang;
	@JdbcTypeCode(SqlTypes.LONG32VARCHAR) public String data;
}
