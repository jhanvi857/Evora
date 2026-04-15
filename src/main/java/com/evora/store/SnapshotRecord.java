package com.evora.store;

import java.time.Instant;

public record SnapshotRecord(
        String aggregateId,
        int version,
        String payload,
        Instant updatedAt
) {
}
