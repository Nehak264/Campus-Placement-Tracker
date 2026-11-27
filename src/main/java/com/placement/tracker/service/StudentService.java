package com.placement.tracker.service;

import com.placement.tracker.dto.StudentResponse;
import com.placement.tracker.entity.Student;
import com.placement.tracker.enums.VerificationStatus;
import com.placement.tracker.exception.ApiException;
import com.placement.tracker.repository.StudentRepository;
import com.placement.tracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;

    public List<StudentResponse> listByStatus(VerificationStatus status) {
        return studentRepository.findByVerificationStatus(status)
                .stream().map(StudentResponse::from).toList();
    }

    @Transactional
    public StudentResponse approve(Long id) {
        Student s = get(id);
        s.setVerificationStatus(VerificationStatus.APPROVED);
        s.setRejectionReason(null);
        s.getUser().setEnabled(true);
        userRepository.save(s.getUser());
        return StudentResponse.from(studentRepository.save(s));
    }

    @Transactional
    public StudentResponse reject(Long id, String reason) {
        Student s = get(id);
        s.setVerificationStatus(VerificationStatus.REJECTED);
        s.setRejectionReason(reason);
        s.getUser().setEnabled(false);
        userRepository.save(s.getUser());
        return StudentResponse.from(studentRepository.save(s));
    }

    private Student get(Long id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Student not found"));
    }
}
