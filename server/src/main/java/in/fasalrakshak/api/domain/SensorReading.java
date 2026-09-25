package in.fasalrakshak.api.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(indexes = @Index(columnList = "plotId, at"))
public class SensorReading {
	@Id @GeneratedValue public Long id;
	public String plotId;
	public long at;
	public double leafWetness;
	public Double soilMoisture;
	public Double tempC;
	public Double rh;
	public String device;
	public Integer stepMin;
}
