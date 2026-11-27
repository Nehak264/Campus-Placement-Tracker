package com.placement.tracker.dto;

import com.placement.tracker.entity.Student;

// Never return the Student entity directly: it holds User, which has the password hash.
public record StudentResponse(
        Long id, String name, String email, String rollNo, String branch,
        Integer gradYear, Double cgpa, Integer activeBacklogs,
        String verificationStatus, String rejectionReason) {

    public static StudentResponse from(Student s) {
        return new StudentResponse(
                s.getId(), s.getUser().getName(), s.getUser().getEmail(), s.getRollNo(),
                s.getBranch(), s.getGradYear(), s.getCgpa(), s.getActiveBacklogs(),
                s.getVerificationStatus().name(), s.getRejectionReason());
    }
}
