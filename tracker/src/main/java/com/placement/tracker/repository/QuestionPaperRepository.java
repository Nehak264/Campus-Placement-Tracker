package com.placement.tracker.repository;

import com.placement.tracker.entity.*;
import com.placement.tracker.enums.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface QuestionPaperRepository extends JpaRepository<QuestionPaper, Long> {
    List<QuestionPaper> findByStatus(PaperStatus status);
    List<QuestionPaper> findByCompanyIdAndStatus(Long companyId, PaperStatus status);
}
