package com.evora.api;

public record SubmitJobApiRequest(
        String jobId,
        String userId,
        String jobType,
        String priority,
        String payload,
        String idempotencyKey
) {
}
