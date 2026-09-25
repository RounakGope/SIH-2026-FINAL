package in.fasalrakshak.api.domain;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SensorRepo extends JpaRepository<SensorReading, Long> {
	java.util.List<SensorReading> findByPlotIdAndAtGreaterThanEqualOrderByAtAsc(String plotId, long since);
}
