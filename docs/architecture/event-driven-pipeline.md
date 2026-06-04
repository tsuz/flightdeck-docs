---
sidebar_position: 1
---

# Foundation

Every Flightdeck agent is a scalable, reliable, and durable AI Agent, enabled by Apache Kafka and Kafka Streams.

## Durable Execution

Every message that flows in and out of the pipeline is replicated, replayable,
and fault tolerant. This is achieved through the immutable append-log property of
Apache Kafka and its distributed brokers, which replicate the log across the
cluster so it stays available even when individual brokers fail.

The processors and applications that read from these append logs (the topics)
commit offsets back to the Kafka brokers, so each service tracks how far it has
read and, if it fails, resumes from exactly that point rather than reprocessing
from the start or skipping ahead.

Some processing, such as joining two streams or keeping a running count of
messages, requires the processor to be **stateful**. That state is managed by
Kafka Streams and stored in RocksDB (memory and disk), while the source of truth
lives in a compacted changelog topic in Kafka, so it is durable too.

## Debuggability

Because every step crosses a topic, the full history of a turn is durable and
inspectable after the fact. Nothing important happens inside a hidden call stack:
each `message-input`, `think-request-response`, `tool-use`, and
`tool-use-result` is a record you can read, replay, or audit.

- **Replay a turn.** Since topics retain their records, you can re-feed a
  session's events to reproduce a bug instead of trying to catch it live.
- **Tap every topic.** The `monitoring` consumer tails all topics for a live
  view, and `tool-use-latency` carries per-tool timing for spotting slow tools.
- **Inspect the topology.** The processing service logs `topology.describe()` at
  startup, so the exact wiring of stages and topics is visible.
- **Fail loudly, not silently.** Malformed tool items are routed to
  `tool-use-dlq` rather than crashing the turn, and a tool that never answers is
  turned into an explicit timeout error rather than hanging.

## Scalability

Because every conversation is keyed by `session_id`, sessions are independent and
partition-parallel: add partitions and stream instances and throughput
scales horizontally, with each session's state pinned to a single partition
(state locality, no cross-partition coordination).

The two heaviest, slowest stages — calling the LLM and fetching information via
tool execution — are *outside* the Streams topology, so they scale on their own
as ordinary Kafka consumer groups. Doubling LLM throughput is just running more
`ThinkConsumer` instances; it doesn't touch the topology.

Generally, increasing the number of partitions and increasing the number of
consumers increases parallelism. However, increasing the partitions can cause
reordering of keys, so it is critical to think about scaling *within* a single
partition.

For the Think consumers, even within the same partition, different `session_id`
keys should run in parallel — so that each session can call the LLM — and
something like a Parallel Consumer (with key ordering preserved) should be used.
For the tool consumers, work can run freely in parallel, so either a Parallel
Consumer without key ordering or a KIP-932 Queue for Kafka can be used to scale
out within the partition, at a cost of losing ordering, which is accepted for
tool calling.

## Performance

Throughput comes from processing the pipeline as a continuous stream rather than
a request that blocks until it finishes. Records flow through the topology
without waiting, and because each stage hands off through a topic, many sessions
are in flight at once across partitions and stream threads instead of one
blocking call at a time.

There are three distinct performance profiles, one per kind of service:

- **Processors.** The Kafka Streams processors that move messages between topics.
  These handle tens of thousands of messages per second, so the messaging
  workflow itself is never the bottleneck.
- **Think consumer.** Where the LLM is called. An LLM's response time varies
  widely and each call is slow, which caps the throughput of this service. That
  throughput is recovered by running the calls in parallel with a Parallel
  Consumer rather than one at a time.
- **Tool consumer.** Where tools are executed. Tools are relatively fast, since
  they are typically an API or database call (target P99 under 1 second). As with
  the think consumer, high throughput is achieved by executing in parallel.

## Extensibility

The same topic seams that make stages reusable also make the pipeline open to
extension *without forking it*. A topic is a public integration point: anything
can subscribe to a topic to observe, or produce to one to participate, and the
existing stages neither know nor care.

- **Tap any stage for a new capability.** The `monitoring` consumer tails every
  topic for observability; the `tool-use-latency` topic feeds metrics; memoir is
  itself "just" two extra stages subscribed to `think-request-response` and
  `session-end`. New cross-cutting features — auditing, analytics, guardrails,
  per-user settings — attach the same way: subscribe to the relevant topic, emit
  to a new one. None of the core stages change.
- **Swap an implementation behind a seam.** Because `tool-use` →
  `tool-use-result` is a topic boundary, *what* fulfills a tool is pluggable: a
  local SDK consumer, a remote agent over HTTP callback, a human-in-the-loop
  queue — all satisfy the same contract. Likewise Think is swappable between
  Claude and Gemini behind `enriched-message-input` → `think-request-response`
  with zero topology change.
- **Add a new entry point.** Anything that can produce a `MessageInput` to
  `message-input` becomes a trigger — the chat-api's REST/WebSocket front door, a
  scheduler, a webhook, or the loop's own `role: "tool"` re-entry. New ingress
  sources require no pipeline changes.
- **Inject a new stage between two existing ones.** Because stages communicate
  only through topics, you can interpose a processor (e.g. a moderation or
  redaction step) by reading the upstream topic and producing to the downstream
  one — the neighbors are unaffected.

In short, extension is *additive*: new behavior is a new subscriber or a new
topic, not a modification to the existing flow. This is the same property
[multi-agent communication](./multi-agent) exploits — it is an extension of this
pipeline, not a rewrite of it.

## High Level Workflow

All topics are prefixed with the agent's name (`{AGENT_NAME}-…`), which is what
lets many agents share one Kafka cluster without colliding. Below the prefix is
dropped for readability.

![Kafka + Claude agent architecture](/img/kafka-claude-agent-architecture.svg)
