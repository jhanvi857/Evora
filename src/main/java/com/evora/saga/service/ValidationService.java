package com.evora.saga.service;

public interface ValidationService {
    ServiceResult validate(String jobId, String jobType, String payload, String idempotencyKey);
    ServiceResult releaseResources(String jobId, String idempotencyKey);
}
