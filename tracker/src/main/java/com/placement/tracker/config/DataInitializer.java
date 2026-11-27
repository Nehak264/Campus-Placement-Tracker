package com.placement.tracker.config;

import com.placement.tracker.entity.User;
import com.placement.tracker.enums.Role;
import com.placement.tracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

// Creates the TPO and TPC accounts on first run (they never self-register)
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.tpo-email}") private String tpoEmail;
    @Value("${app.seed.tpo-password}") private String tpoPassword;
    @Value("${app.seed.tpc-email}") private String tpcEmail;
    @Value("${app.seed.tpc-password}") private String tpcPassword;

    @Override
    public void run(String... args) {
        seed("TPO Officer", tpoEmail, tpoPassword, Role.TPO);
        seed("TPC Member", tpcEmail, tpcPassword, Role.TPC);
    }

    private void seed(String name, String email, String password, Role role) {
        if (userRepository.existsByEmail(email)) return;
        User u = new User();
        u.setName(name);
        u.setEmail(email);
        u.setPasswordHash(passwordEncoder.encode(password));
        u.setRole(role);
        u.setEnabled(true);
        userRepository.save(u);
    }
}
