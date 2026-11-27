package com.placement.tracker.dto;

public record AuthResponse(String token, String role, String name, String email) {
}
