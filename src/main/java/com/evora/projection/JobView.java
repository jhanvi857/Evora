package com.evora.projection;

import com.evora.domain.order.JobStatus;
import java.time.Instant;
import java.util.List;

public record JobView(
        String jobId,
        String userId,
        String jobType,
        String priority,
        String payload,
        JobStatus status,
        String currentStep,
        String failureReason,
        Instant updatedAt,
        List<JobTimelineEntry> timeline
) {
}
