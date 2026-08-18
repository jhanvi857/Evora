package com.evora.client;

public class JobResult {
    private final boolean success;
    private final String error;

    private JobResult(boolean success, String error) {
        this.success = success;
        this.error = error;
    }

    public static JobResult success() {
        return new JobResult(true, null);
    }

    public static JobResult failure(String errorMessage) {
        return new JobResult(false, errorMessage != null ? errorMessage : "Job processing failed");
    }

    public boolean isSuccess() {
        return success;
    }

    public String getError() {
        return error;
    }
}
