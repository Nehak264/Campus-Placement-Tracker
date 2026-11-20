package com.placement.tracker.entity;

import jakarta.persistence.*;

import java.util.List;

public class Comapany {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String role;
    private String domain;

    @OneToMany(mappedBy = "company" , cascade = CascadeType.ALL)
    private List<Application>applications;
}
