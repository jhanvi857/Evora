package com.evora.client;

import com.evora.domain.Job;
import com.evora.domain.JobStatus;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class EvoraClientTest {

    @Test
    public void testJobRequestBuilder() {
        JobRequest request = JobRequest.builder()
                .queue("critical")
                .priority(1)
                .idempotencyKey("KEY-1234")
                .payload("{\"test\": true}")
                .build();

        assertEquals("critical", request.getQueue());
        assertEquals(1, request.getPriority());
        assertEquals("KEY-1234", request.getIdempotencyKey());
        assertEquals("{\"test\": true}", request.getPayload());
    }

    @Test
    public void testJobResultSuccessAndFailure() {
        JobResult successResult = JobResult.success();
        assertTrue(successResult.isSuccess());
        assertNull(successResult.getError());

        JobResult failResult = JobResult.failure("Database timeout");
        assertFalse(failResult.isSuccess());
        assertEquals("Database timeout", failResult.getError());
    }

    @Test
    public void testJobModelSettersAndGetters() {
        Job job = new Job();
        job.setQueue("critical");
        job.setStatus(JobStatus.PENDING);
        job.setAttemptCount(1);
        job.setMaxAttempts(3);

        assertEquals("critical", job.getQueue());
        assertEquals(JobStatus.PENDING, job.getStatus());
        assertEquals(1, job.getAttemptCount());
        assertEquals(3, job.getMaxAttempts());
    }
}
