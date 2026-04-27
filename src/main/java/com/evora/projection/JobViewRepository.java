package com.evora.projection;

import com.evora.domain.order.JobStatus;
import java.util.List;
import java.util.Optional;

public interface JobViewRepository {
    void save(JobView view);
    Optional<JobView> findByJobId(String jobId);
    List<JobView> findAll();
    List<JobView> findByStatus(JobStatus status);
    void clearAll();
    long count();
    long countByStatus(JobStatus status);
}
