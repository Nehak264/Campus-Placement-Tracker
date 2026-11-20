package com.placement.tracker.dto;

import jakarta.validation.constraints.NotBlank;

public record RejectRequest(@NotBlank String reason) {
}
