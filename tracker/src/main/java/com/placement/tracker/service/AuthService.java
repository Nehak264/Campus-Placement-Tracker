package com.placement.tracker.service;

import com.placement.tracker.dto.*;
import com.placement.tracker.entity.Student;
import com.placement.tracker.entity.User;
import com.placement.tracker.enums.Role;
import com.placement.tracker.enums.VerificationStatus;
import com.placement.tracker.exception.ApiException;
import com.placement.tracker.repository.StudentRepository;
import com.placement.tracker.repository.UserRepository;
import com.placement.tracker.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public void register(RegisterRequest r) {
        String email = r.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email))
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered");
        if (studentRepository.findByRollNo(r.rollNo().trim()).isPresent())
            throw new ApiException(HttpStatus.CONFLICT, "Roll number already registered");

        User user = new User();
        user.setName(r.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(r.password()));
        user.setRole(Role.STUDENT);
        user.setEnabled(false);               // switched on when the TPC approves
        userRepository.save(user);

        Student s = new Student();
        s.setUser(user);
        s.setRollNo(r.rollNo().trim());
        s.setBranch(r.branch());
        s.setGradYear(r.gradYear());
        s.setCgpa(r.cgpa());
        s.setActiveBacklogs(r.activeBacklogs());
        studentRepository.save(s);
    }

    public AuthResponse login(LoginRequest r) {
        User user = userRepository.findByEmail(r.email().trim().toLowerCase())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (!passwordEncoder.matches(r.password(), user.getPasswordHash()))
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");

        if (!user.isEnabled()) {
            Student s = studentRepository.findByUserId(user.getId()).orElse(null);
            if (s != null && s.getVerificationStatus() == VerificationStatus.REJECTED)
                throw new ApiException(HttpStatus.FORBIDDEN,
                        "Registration rejected by TPC: " + s.getRejectionReason());
            throw new ApiException(HttpStatus.FORBIDDEN, "Your account is pending TPC verification");
        }

        String token = jwtService.generateToken(user.getEmail(), user.getRole());
        return new AuthResponse(token, user.getRole().name(), user.getName(), user.getEmail());
    }

    public UserResponse me(String email) {
        User u = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return new UserResponse(u.getName(), u.getEmail(), u.getRole().name());
    }
}
