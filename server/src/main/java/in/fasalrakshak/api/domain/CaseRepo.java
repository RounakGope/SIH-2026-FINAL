package in.fasalrakshak.api.domain;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CaseRepo extends JpaRepository<CaseEntity, String> {
	java.util.List<CaseEntity> findByUid(String uid);
	java.util.List<CaseEntity> findByTaluka(String taluka);
	java.util.List<CaseEntity> findByStatus(String status);
	java.util.List<CaseEntity> findByCreatedAtGreaterThanEqual(Long since);
	@org.springframework.transaction.annotation.Transactional long deleteBySeedTrue();
}
