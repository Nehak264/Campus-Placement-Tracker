package com.placement.tracker.entity;

import com.placement.tracker.enums.PaperStatus;
import com.placement.tracker.enums.RoundType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "question_papers")
@Getter
@Setter
@NoArgsConstructor
public class QuestionPaper {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    private Integer paperYear;

    @Enumerated(EnumType.STRING)
    private RoundType roundType;

    private String title;
    private String filePath;

    // Students only see APPROVED papers; the TPC approves uploads
    @Enumerated(EnumType.STRING)
    private PaperStatus status = PaperStatus.PENDING;

    @ManyToOne
    @JoinColumn(name = "uploaded_by")
    private User uploadedBy;

    private LocalDateTime uploadedAt = LocalDateTime.now();
}
