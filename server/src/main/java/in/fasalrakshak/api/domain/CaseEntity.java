package in.fasalrakshak.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

// One field walk (a "case"). The indexed columns are what the server filters and
// aggregates on; `data` holds the full JSON record the app sends (photo, top-3,
// treatment, expert verdict, server re-check...), so the app's record shape can
// grow without a migration.
@Entity
@Table(name = "cases", indexes = {
	@Index(columnList = "uid"), @Index(columnList = "taluka"), @Index(columnList = "status"), @Index(columnList = "createdAt")
})
public class CaseEntity {
	@Id public String id;
	public String uid;
	public String taluka;
	public String crop;
	public String label;
	public String status;
	public Double lat;
	public Double lon;
	public Long createdAt;
	public Boolean share;
	public Boolean seed;
	public String phone;
	public String kind;
	@JdbcTypeCode(SqlTypes.LONG32VARCHAR) @Column(nullable = false) public String data;
}
