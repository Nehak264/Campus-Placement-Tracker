package com.placement.tracker.repository;

import com.placement.tracker.entity.*;
import com.placement.tracker.enums.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DriveRepository extends JpaRepository<Drive, Long> {
    List<Drive> findByStatus(DriveStatus status);
    List<Drive> findByCompanyId(Long companyId);
    // Earlier years of the same company, used for the anonymous past-rounds history
    List<Drive> findByCompanyIdAndAcademicYearNot(Long companyId, String academicYear);
}