# Evora

Evora is an event-sourced Order Management System built on Java 17+ with explicit architecture boundaries for CQRS and Saga evolution.

## Current Status

Implemented end-to-end in-memory workflow:

- Immutable command model
- Aggregate root with event replay support
- Immutable domain events with versioning and timestamp
- In-memory append-only event store with optimistic concurrency checks
- In-memory event bus for event fan-out
- Idempotent command processing via processed-command registry
- Saga orchestration with simulated Inventory, Payment, and Shipping services
- Compensation flow on downstream failures (inventory release and payment refund)
- CQRS read-side projector and in-memory order query model
- Bootstrap flow that executes PlaceOrder end-to-end and prints read-model state

## Package Layout

- `com.evora.shared`: minimal base abstractions (`Command`, `DomainEvent`, `AggregateRoot`)
- `com.evora.command`: write-side command contracts
- `com.evora.handler`: command handlers
- `com.evora.application`: composition root (`EvoraRuntime`), command/query/timeline services, event appender, idempotency registry
- `com.evora.api`: API-facing facade and request/response DTOs
- `com.evora.domain.order`: aggregate and value objects
- `com.evora.event`: full workflow event set (success, failure, compensation)
- `com.evora.eventstore`: append-only event storage contracts and implementation
- `com.evora.bus`: in-memory event bus and subscriber model
- `com.evora.saga`: process manager and simulated external services
- `com.evora.projection`: read model repository and projector
- `com.evora`: app bootstrap entrypoint

## Workflow

1. `OrderCommandService` builds `PlaceOrderCommand` from request data.
2. `PlaceOrderCommandHandler` enforces idempotency and asks `OrderAggregate` to emit events.
3. `OrderEventAppender` appends events to event store and publishes to event bus.
4. `OrderSaga` reacts to `OrderPlacedEvent` and executes Inventory -> Payment -> Shipping.
5. Saga emits follow-up events and compensation events when required.
6. `OrderProjector` consumes events and updates `OrderView` for query-side reads.
7. `OrderQueryService` serves read model snapshots.
8. `OrderTimelineService` serves full event timeline per aggregate.
9. `OrderApi` acts as transport-neutral boundary for HTTP or any external adapter.

## Run (without Maven)

Compile:

```powershell
New-Item -ItemType Directory -Force -Path target/tmp-classes | Out-Null
$files = Get-ChildItem -Path src/main/java -Recurse -Filter *.java | ForEach-Object { $_.FullName }
javac -d target/tmp-classes $files
```

Run:

```powershell
java -cp target/tmp-classes com.evora.EvoraApplication
```

Run deterministic scenarios:

```powershell
java -cp target/tmp-classes com.evora.EvoraApplication happy
java -cp target/tmp-classes com.evora.EvoraApplication inventory-fail
java -cp target/tmp-classes com.evora.EvoraApplication payment-fail
java -cp target/tmp-classes com.evora.EvoraApplication shipping-fail
```

## Tuning Simulated Services

Failure behavior is configurable through `EvoraRuntimeConfig`:

- `SimulatedInventoryService(seed, failureRate)`
- `SimulatedPaymentService(seed, failureRate)`
- `SimulatedShippingService(seed, failureRate)`

Lower `failureRate` approaches happy-path confirmation. Higher values force compensation paths.

## Infrastructure Next Steps

- Replace in-memory event store with PostgreSQL append-only stream storage
- Add snapshotting for faster aggregate rehydration
- Add durable idempotency store (Redis/Postgres)
- Add NioFlow HTTP routes for command/query endpoints
- Add outbox or durable bus (Kafka) for cross-process event delivery