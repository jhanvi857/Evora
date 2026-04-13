package com.evora.eventstore;

public class OptimisticConcurrencyException extends RuntimeException {
    public OptimisticConcurrencyException(String message) {
        super(message);
    }
}
