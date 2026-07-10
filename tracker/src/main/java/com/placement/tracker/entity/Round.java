package com.placement.tracker.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Entity
@Data
public class Round {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "application_id")
    private Application application;

    private String roundName;   // Aptitude / Technical / HR
    private Integer roundNumber;
    private String result;      // passed / rejected / pending
    private LocalDate date;
}
