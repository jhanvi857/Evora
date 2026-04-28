package com.evora.domain;

public class JobSubmitResult {
    private final Job job;
    private final boolean alreadyExists;

    private JobSubmitResult(Job job, boolean alreadyExists) {
        this.job = job;
        this.alreadyExists = alreadyExists;
    }

    public static JobSubmitResult created(Job job) {
        return new JobSubmitResult(job, false);
    }

    public static JobSubmitResult alreadyExists(Job job) {
        return new JobSubmitResult(job, true);
    }

    public Job getJob() { return job; }
    public boolean isAlreadyExists() { return alreadyExists; }
}
