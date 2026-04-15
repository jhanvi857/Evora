package com.evora.projection;

import java.time.Instant;
import java.util.Map;

public record OrderTimelineEntry(
        String eventType,
        int version,
        Instant occurredAt,
        Map<String, Object> payload
) {
}
