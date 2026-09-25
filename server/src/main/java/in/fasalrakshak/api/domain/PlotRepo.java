package in.fasalrakshak.api.domain;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PlotRepo extends JpaRepository<PlotEntity, String> {
	java.util.List<PlotEntity> findByTalukaAndSmsConsentTrue(String taluka);
}
