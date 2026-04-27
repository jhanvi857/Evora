package com.evora.api;

import com.evora.application.JobCommandService;
import com.evora.application.JobQueryService;
import com.evora.application.JobTimelineService;
import com.evora.application.SubmitJobRequest;
import com.evora.domain.order.JobStatus;
import com.evora.projection.JobView;
import com.evora.shared.DomainEvent;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class OrderApi {
    private final JobCommandService commandService;
    private final JobQueryService queryService;
    private final JobTimelineService timelineService;

    public OrderApi(JobCommandService commandService, JobQueryService queryService, JobTimelineService timelineService) {
        this.commandService = commandService;
        this.queryService = queryService;
        this.timelineService = timelineService;
    }

    public List<DomainEvent> submitJob(SubmitJobRequest request) {
        return commandService.submitJob(request);
    }

    public Optional<JobView> getJob(String jobId) {
        return queryService.getJobById(jobId);
    }

    public List<JobView> listJobs(String status) {
        if (status != null && !status.isBlank()) {
            return queryService.findByStatus(JobStatus.valueOf(status.toUpperCase()));
        }
        return queryService.listJobs();
    }

    public List<DomainEvent> getJobTimeline(String jobId) {
        return timelineService.getTimeline(jobId);
    }

    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalJobs", queryService.getTotalJobs());
        for (JobStatus status : JobStatus.values()) {
            stats.put(status.name().toLowerCase() + "Count", queryService.getJobsByStatus(status));
        }
        return stats;
    }
}
