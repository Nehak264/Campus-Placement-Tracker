package com.placement.tracker.entity;

import com.placement.tracker.enums.DriveStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "drives")
@Getter
@Setter
@NoArgsConstructor
public class Drive {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    private String role;
    private Double ctc;

    // Eligibility criteria used by the screening logic
    private Double minCgpa;
    private Integer maxBacklogs = 0;

    @ElementCollection
    @CollectionTable(name = "drive_allowed_branches", joinColumns = @JoinColumn(name = "drive_id"))
    @Column(name = "branch")
    private Set<String> allowedBranches = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "drive_required_skills",
            joinColumns = @JoinColumn(name = "drive_id"),
            inverseJoinColumns = @JoinColumn(name = "skill_id"))
    private Set<Skill> requiredSkills = new HashSet<>();

    @Column(columnDefinition = "TEXT")
    private String jdText;

    private LocalDate deadline;
    private LocalDate driveDate;

    // e.g. "2026-27". Lets us build the anonymous past-rounds history from earlier years.
    private String academicYear;

    @Enumerated(EnumType.STRING)
    private DriveStatus status = DriveStatus.DRAFT;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private User createdBy;
}
