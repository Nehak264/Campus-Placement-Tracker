package com.placement.tracker.repository;

import com.placement.tracker.entity.*;
import com.placement.tracker.enums.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
    List<Application> findByStudentId(Long studentId);
    List<Application> findByDriveId(Long driveId);
    boolean existsByStudentIdAndDriveId(Long studentId, Long driveId);
    long countByDriveId(Long driveId);
}