package com.evora.saga.service;

public interface ExecutionService {
    ServiceResult execute(String jobId, String jobType, String payload, String idempotencyKey);
    ServiceResult rollback(String jobId, String idempotencyKey);
}
