# Evora | Event-Sourced Order Management System

Evora is a high-fidelity, event-sourced Order Management System (OMS) built on the NioFlow micro-framework. It demonstrates advanced distributed systems patterns including CQRS, Saga Orchestration, Event Sourcing, and Idempotent Command Handling within a unified, high-performance runtime.

## System Architecture

Evora utilizes a strict separation between command processing and query projections. The following diagram illustrates the component interaction and data flow across the system, utilizing a Polyglot Persistence strategy to optimize for both write integrity and read performance.

```mermaid
graph TD
    subgraph Client_Tier [Client Tier]
        UI[Web Dashboard]
        Admin[Admin Portal]
    end

    subgraph API_Layer [API Layer / NioFlow]
        Srv[HttpOrderServer]
        Bridge[OrderApi]
    end

    subgraph Command_Side [Write Model / Event Sourcing]
        Handler[PlaceOrderCommandHandler]
        Agg[OrderAggregate]
        Store[(PostgreSQL Event Store)]
        Bus[Internal Event Bus]
    end

    subgraph Saga_Orchestrator [Distributed Coordination]
        Orch[OrderSaga]
        Inv[Inventory Service]
        Pay[Payment Service]
        Ship[Shipping Service]
    end

    subgraph Query_Side [Read Model / CQRS]
        Proj[OrderProjector]
        Repo[(MongoDB Read Model)]
    end

    UI --> Srv
    Admin --> Srv
    Srv --> Bridge
    Bridge --> Handler
    Handler --> Agg
    Agg --> Store
    Agg --> Bus
    Bus --> Orch
    Bus --> Proj
    Orch --> Inv
    Orch --> Pay
    Orch --> Ship
    Proj --> Repo
    Repo --> Bridge
```

## Saga Execution Workflow

The transaction lifecycle is coordinated via a Saga. If any stage in the happy path fails, the system executes compensation events to maintain consistency across simulated downstream services.

```mermaid
sequenceDiagram
    participant B as Event Bus
    participant S as OrderSaga
    participant I as Inventory
    participant P as Payment
    participant H as Shipping
    participant E as Event Store (PostgreSQL)

    Note over B,E: Scenario: Payment Declined
    B->>S: OrderPlacedEvent
    S->>I: Reserve Items
    I-->>S: Success
    S->>E: InventoryReservedEvent
    S->>P: Process Payment
    P-->>S: FAILURE (Declined)
    S->>E: PaymentChargeFailedEvent
    S->>I: Release Items (Compensate)
    I-->>S: Success
    S->>E: InventoryReleasedEvent
    S->>E: OrderFailedEvent (Status: PAYMENT_DECLINED)
```

## Polyglot Persistence Strategy

The system utilizes specialized storage engines for different operational requirements:

* **PostgreSQL (Write-Side)**: Used as the primary Event Store. It provides ACID compliance and transactional outbox support to ensure that domain events and state transitions are recorded with absolute integrity.
* **MongoDB (Read-Side)**: Used for the CQRS Read Model. It stores denormalized order views as documents, allowing for high-performance, complex queries required by the dashboards without imposing load on the transactional engine.

## Dashboard and Observability

Evora provides specialized portals for system management:

* **Customer Portal**: Create orders and track real-time execution via a high-fidelity event timeline.
* **Admin Portal**: Monitor global system health, success rates, and perform deep traces into raw JSON event streams.

### Event Tracing
Every state transition is visible as a raw JSON log, allowing for inspection of Aggregate IDs, Idempotency Keys, and Versioning data as it is processed by the system.

## Getting Started

### Prerequisites
* Java 17 or later
* Maven
* Docker Desktop (required for PostgreSQL and MongoDB infrastructure)

### Infrastructure Setup
Launch the persistent storage layer using the provided Docker configuration:

```bash
docker-compose up -d
```

### Launching the System
The provided launch scripts handle compilation and start the NioFlow server automatically.

**Windows (PowerShell):**
```powershell
.\launch-evora.ps1
```

**Linux / macOS (Bash):**
```bash
chmod +x launch-evora.sh
./launch-evora.sh
```

Once running, the portals are accessible at:
* **User Dashboard**: http://localhost:8080/index.html
* **Admin Panel**: http://localhost:8080/admin.html

## Simulation Scenarios
Deterministic failures can be triggered during order creation to observe Saga compensation logic:

* **STOCK_OUT**: Triggers inventory failure.
* **PAYMENT_DECLINED**: Triggers payment failure and inventory rollback.
* **SHIPPING_ERROR**: Triggers shipping failure, payment refund, and inventory release.

## Project Structure
* `com.evora.domain`: Aggregate roots and event definitions.
* `com.evora.saga`: Orchestration logic and simulated microservices.
* `com.evora.projection`: CQRS projection and MongoDB read-model repository.
* `com.evora.store`: PostgreSQL event store implementation and JSON serialization.
* `com.evora.api.http`: NioFlow server and REST endpoints.
* `src/main/resources/static`: Dashboard assets including CSS, JavaScript, and HTML.

---
Built for High-Performance Distributed Systems.