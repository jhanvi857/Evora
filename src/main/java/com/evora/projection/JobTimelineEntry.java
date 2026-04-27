package com.evora.projection;

import java.time.Instant;
import java.util.Map;

public record JobTimelineEntry(
        String eventType,
        int version,
        Instant occurredAt,
        Map<String, Object> payload
) {
}
