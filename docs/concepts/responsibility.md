---
sidebar_position: 1
---

# Responsibility

Flightdeck draws a clear line between what the framework handles and what the developer owns. This separation keeps infrastructure concerns out of your business logic and lets each side evolve independently.

## What Flightdeck Handles

The framework is responsible for the infrastructure layer — everything that keeps your agents running reliably at scale:

- **Real-time data delivery** — Messages between agents are stored and delivered through Kafka with ordering guarantees and durability
- **State management** — Agent execution state is checkpointed and persisted via Kafka Streams, enabling recovery without external databases
- **Scaling** — Consumer groups scale horizontally as load increases, with Kafka managing partition assignment and rebalancing automatically
- **Fault tolerance** — Failed agents resume from the last checkpoint. Messages are never lost, even during crashes or restarts
- **Observability infrastructure** — Execution traces, token usage tracking, cost monitoring, and structured logging are built into the framework

## What the Developer Handles

The developer is responsible for the business logic — the parts that define what your agents actually do:

- **Prompts** — System prompts, task descriptions, and instructions that shape how each agent behaves
- **Business logic** — The rules, conditions, and workflows that determine how agents collaborate and what decisions they make
- **LLM function definitions** — Custom tool functions that agents can call — API integrations, database queries, computations, and any other capabilities
- **Agent configuration** — Which models to use, which tools each agent has access to, and how tasks are structured

## Why This Matters

This separation means:

- **Developers don't write infrastructure code** — No queue management, no retry logic, no state serialization. Focus on what your agents do, not how messages get delivered.
- **Infrastructure upgrades don't break business logic** — Flightdeck can improve scaling, fault tolerance, or tracing without requiring changes to your prompts or tool functions.
- **Teams can work independently** — Platform engineers can tune Kafka and scaling policies while product engineers iterate on prompts and agent behavior.
