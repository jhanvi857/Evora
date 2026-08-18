package com.evora.client;

import com.evora.domain.Job;

@FunctionalInterface
public interface EvoraJobHandler {
    JobResult handle(Job job) throws Exception;
}
