package in.fasalrakshak.api.domain;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DeviceRepo extends JpaRepository<DeviceUser, String> {
	java.util.Optional<DeviceUser> findByDeviceId(String deviceId);
}
