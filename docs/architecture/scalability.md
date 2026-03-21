---
sidebar_position: 2
---

# Scalability

Flightdeck scales horizontally by leveraging Kafka's partitioning and consumer group model. Adding capacity is as simple as running more consumer instances.

## Horizontal Scaling

Each Kafka topic is divided into partitions. Consumers within the same consumer group are automatically assigned partitions by Kafka's group coordinator. To handle more load, deploy additional consumer instances — Kafka rebalances the partitions across them.

```
Topic: order-agent-tool-requests (6 partitions)

  Consumer 1 → [P0, P1]
  Consumer 2 → [P2, P3]
  Consumer 3 → [P4, P5]
```

Adding a 4th consumer triggers a rebalance:

```
  Consumer 1 → [P0, P1]
  Consumer 2 → [P2, P3]
  Consumer 3 → [P4]
  Consumer 4 → [P5]
```

## Independent Scaling Per Layer

Each layer in Flightdeck — Think, Tools, and any custom consumers — scales independently. If tool execution is the bottleneck, scale the tool consumers without touching the Think consumers. If LLM calls are slow, add more Think consumers.

## Backpressure

Kafka acts as a buffer between layers. If the Think layer produces tool calls faster than the tool consumers can handle, messages queue up in the topic. Consumers process at their own pace without data loss. This natural backpressure prevents cascading failures.

## Partition Key Strategy

Messages are keyed by `session_id` so all messages for a given session are routed to the same partition. This guarantees ordering within a session while allowing parallel processing across sessions.

## Rate Limiting

LLM providers enforce rate limits. Flightdeck consumers can be configured with a maximum requests-per-minute to stay within provider limits. When the limit is reached, consumers slow down rather than failing.

## Multi-Region

Kafka supports multi-region replication (via MirrorMaker or Confluent Cluster Linking). For global deployments, you can run Flightdeck consumers close to your users while keeping data replicated across regions.
