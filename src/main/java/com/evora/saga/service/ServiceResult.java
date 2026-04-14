package com.evora.saga.service;

public record ServiceResult(boolean success, String referenceId, String error) {
    public static ServiceResult success(String referenceId) {
        return new ServiceResult(true, referenceId, null);
    }

    public static ServiceResult failure(String error) {
        return new ServiceResult(false, null, error);
    }
}
