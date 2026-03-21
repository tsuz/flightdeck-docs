---
sidebar_position: 1
---

# Reliability

Flightdeck is built on Apache Kafka, which provides strong durability and delivery guarantees. This page covers how Flightdeck ensures reliable operation in production.

## Message Durability

Every message — user inputs, LLM responses, tool calls, and results — flows through Kafka topics. Kafka persists messages to disk and replicates them across brokers. Messages are never lost, even if a consumer crashes mid-processing.

## Checkpointing

Agent execution state is checkpointed after each step via Kafka Streams. If a consumer fails and restarts, it resumes from the last committed offset rather than replaying from the beginning.

## Exactly-Once Semantics

Kafka supports exactly-once processing when using transactions. Flightdeck leverages this to ensure that tool calls are not executed twice — even in failure and recovery scenarios. A tool result is produced and the consumer offset is committed atomically.

## Dead Letter Queues

When a tool function fails repeatedly, the message is routed to a dead letter queue (DLQ) topic. This prevents a single bad message from blocking the entire pipeline. Failed messages can be inspected, fixed, and replayed.

## Retry Logic

Transient failures (network timeouts, rate limits from LLM providers) are retried automatically with exponential backoff. The retry count and backoff parameters are configurable per consumer.

## Health Checks

Consumers expose health check endpoints so orchestration systems (Kubernetes, Docker Compose) can detect unhealthy instances and restart them. Kafka's consumer group protocol automatically rebalances partitions when members join or leave.
