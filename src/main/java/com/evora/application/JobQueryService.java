package com.evora.application;

import com.evora.domain.order.JobStatus;
import com.evora.projection.JobView;
import com.evora.projection.JobViewRepository;

import java.util.List;
import java.util.Optional;

public class JobQueryService {
    private final JobViewRepository repository;

    public JobQueryService(JobViewRepository repository) {
        this.repository = repository;
    }

    public Optional<JobView> getJobById(String jobId) {
        return repository.findByJobId(jobId);
    }

    public List<JobView> listJobs() {
        return repository.findAll();
    }

    public List<JobView> findByStatus(JobStatus status) {
        return repository.findByStatus(status);
    }

    public long getTotalJobs() {
        return repository.count();
    }

    public long getJobsByStatus(JobStatus status) {
        return repository.countByStatus(status);
    }
}
