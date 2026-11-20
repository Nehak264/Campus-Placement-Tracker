package com.placement.tracker.entity;

import com.placement.tracker.enums.CompanyStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "companies")
@Getter
@Setter
@NoArgsConstructor
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    private String domain;
    private String contactPerson;
    private String contactEmail;

    // Shown on the TPO dashboard as "upcoming companies"
    @Enumerated(EnumType.STRING)
    private CompanyStatus status = CompanyStatus.CONTACTED;
}
