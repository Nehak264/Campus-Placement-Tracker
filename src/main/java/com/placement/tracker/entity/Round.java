package com.placement.tracker.entity;

import com.placement.tracker.enums.RoundResult;
import com.placement.tracker.enums.RoundType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "rounds")
@Getter
@Setter
@NoArgsConstructor
public class Round {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Enumerated(EnumType.STRING)
    private RoundType roundType;

    private Integer roundNumber;

    @Enumerated(EnumType.STRING)
    private RoundResult result = RoundResult.PENDING;

    // Interview schedule, set by the TPC
    private LocalDate roundDate;
    private LocalTime roundTime;
    private String venue;
}
