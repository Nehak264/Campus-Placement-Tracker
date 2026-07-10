package com.placement.tracker.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.util.List;

@Entity
@Data
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private Double cgpa;
    private String skills;
    private String branch;
    private Integer gradYear;

    @OneToMany(mappedBy = "student", cascade = CascadeType.ALL)
    private List<Application> applications;
}

