package com.evora.domain.order;

public enum JobStatus {
    SUBMITTED,
    QUEUED,
    RUNNING,
    COMPLETED,
    VALIDATION_FAILED,
    EXECUTION_FAILED,
    NOTIFICATION_FAILED
}
