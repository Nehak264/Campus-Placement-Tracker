package com.placement.tracker.dto;

import jakarta.validation.constraints.*;

public record RegisterRequest(
        @NotBlank String name,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, message = "Password must be at least 8 characters") String password,
        @NotBlank String rollNo,
        @NotBlank String branch,
        @NotNull Integer gradYear,
        @NotNull @DecimalMin("0.0") @DecimalMax("10.0") Double cgpa,
        @NotNull @Min(0) Integer activeBacklogs) {
}
