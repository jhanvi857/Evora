package com.evora.application;

public record EvoraRuntimeConfig(
        long validationSeed,
        double validationFailureRate,
        long executionSeed,
        double executionFailureRate,
        long notificationSeed,
        double notificationFailureRate
) {
    public static EvoraRuntimeConfig happyPath() {
        return new EvoraRuntimeConfig(10L, 0.0d, 20L, 0.0d, 30L, 0.0d);
    }

    public static EvoraRuntimeConfig mixed() {
        return new EvoraRuntimeConfig(10L, 0.05d, 20L, 0.08d, 30L, 0.05d);
    }

    public static EvoraRuntimeConfig validationFailure() {
        return new EvoraRuntimeConfig(10L, 1.0d, 20L, 0.0d, 30L, 0.0d);
    }

    public static EvoraRuntimeConfig executionFailure() {
        return new EvoraRuntimeConfig(10L, 0.0d, 20L, 1.0d, 30L, 0.0d);
    }

    public static EvoraRuntimeConfig notificationFailure() {
        return new EvoraRuntimeConfig(10L, 0.0d, 20L, 0.0d, 30L, 1.0d);
    }
}
