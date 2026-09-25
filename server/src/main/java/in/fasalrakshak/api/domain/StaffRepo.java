package in.fasalrakshak.api.domain;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StaffRepo extends JpaRepository<StaffUser, String> {

}
