package com.evora.application;

public record SubmitJobRequest(
        String jobId,
        String userId,
        String jobType,
        String priority,
        String payload,
        String idempotencyKey
) {
}
