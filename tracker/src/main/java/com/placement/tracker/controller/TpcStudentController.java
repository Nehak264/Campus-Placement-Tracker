package com.placement.tracker.controller;

import com.placement.tracker.dto.RejectRequest;
import com.placement.tracker.dto.StudentResponse;
import com.placement.tracker.enums.VerificationStatus;
import com.placement.tracker.service.StudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// TPC only (see SecurityConfig): student verification
@RestController
@RequestMapping("/api/tpc/students")
@RequiredArgsConstructor
public class TpcStudentController {

    private final StudentService studentService;

    @GetMapping
    public List<StudentResponse> list(@RequestParam(defaultValue = "PENDING") VerificationStatus status) {
        return studentService.listByStatus(status);
    }

    @PutMapping("/{id}/approve")
    public StudentResponse approve(@PathVariable Long id) {
        return studentService.approve(id);
    }

    @PutMapping("/{id}/reject")
    public StudentResponse reject(@PathVariable Long id, @Valid @RequestBody RejectRequest body) {
        return studentService.reject(id, body.reason());
    }
}
