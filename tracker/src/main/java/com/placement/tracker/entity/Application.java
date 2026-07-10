package com.placement.tracker.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Entity
@Data
public class Application {
   @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

   @ManyToOne
    @JoinColumn(name="student_id")
    private Student student;

   @ManyToOne
    @JoinColumn(name="company_id")
    private Comapany company;

   private LocalDate appliedDate;
   private String currentStatus;

   @OneToMany(mappedBy = "application", cascade = CascadeType.ALL)
    private List<Round>rounds;
}
