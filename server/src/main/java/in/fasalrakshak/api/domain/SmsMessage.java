package in.fasalrakshak.api.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(indexes = @Index(columnList = "at"))
public class SmsMessage {
	@Id public String id;
	public String toAddr;
	@JdbcTypeCode(SqlTypes.LONG32VARCHAR) public String text;
	public String kind;
	public String taluka;
	public long at;
	public String gateway; // sandbox | webhook
	public String status;  // stored | sent | failed
}
