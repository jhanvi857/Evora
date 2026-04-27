package com.evora.application;

import com.evora.command.SubmitJobCommand;
import com.evora.domain.order.JobAggregate;
import com.evora.shared.DomainEvent;
import com.evora.store.EventReplayService;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class JobCommandService {
    private final JobEventAppender appender;
    @SuppressWarnings("unused")
    private final EventReplayService replayService;

    public JobCommandService(JobEventAppender appender, EventReplayService replayService) {
        this.appender = appender;
        this.replayService = replayService;
    }

    public List<DomainEvent> submitJob(SubmitJobRequest request) {
        String aggregateId = request.jobId() != null ? request.jobId() : UUID.randomUUID().toString();
        List<DomainEvent> history = appender.loadHistory(aggregateId);
        JobAggregate aggregate = JobAggregate.rehydrate(history);

        SubmitJobCommand command = new SubmitJobCommand(
                aggregateId,
                request.userId(),
                request.jobType(),
                request.priority(),
                request.payload(),
                request.idempotencyKey(),
                Instant.now());

        return appender.append(aggregateId, version -> {
            aggregate.submit(command);
            return aggregate.getUncommittedEvents();
        });
    }
}
