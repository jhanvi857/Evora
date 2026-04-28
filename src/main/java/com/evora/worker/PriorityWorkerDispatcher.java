package com.evora.worker;

import com.evora.domain.Job;
import com.evora.store.PostgresJobStore;
import java.util.List;
import java.util.Optional;

public class PriorityWorkerDispatcher {
    private static final List<String> QUEUE_ORDER = 
        List.of("critical", "high", "default", "bulk");
    private static final int VISIBILITY_SECONDS = 30;
    
    private final PostgresJobStore jobStore;

    public PriorityWorkerDispatcher(PostgresJobStore jobStore) {
        this.jobStore = jobStore;
    }
    
    public Optional<Job> pollNextJob(String workerId) {
        for (String queue : QUEUE_ORDER) {
            Optional<Job> job = jobStore.claimNextJob(workerId, queue, VISIBILITY_SECONDS);
            if (job.isPresent()) return job;
        }
        return Optional.empty();
    }
}
