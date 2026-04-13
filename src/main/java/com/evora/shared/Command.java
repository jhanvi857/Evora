package com.evora.shared;

import java.time.Instant;

public interface Command {
	String aggregateId();
	String idempotencyKey();
	Instant occurredAt();
}
