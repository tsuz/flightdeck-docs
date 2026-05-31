---
sidebar_position: 1
---

# Foundation

Every Flightdeck agent is one **event-driven pipeline** built on Apache Kafka. A turn is
not a function call that blocks until the LLM and its tools are done — it is a
series of messages flowing through topics, each stage consuming from one topic
and producing to the next. The user's message enters on one end, loops through
think → tools → think as many times as the LLM needs, and a final answer leaves
on the other end. Nothing holds a thread open across those hops; the topics are
the seams.

This page describes that core single-agent pipeline. [Multi-Agent
Communication](./multi-agent) builds directly on top of it — the `reply-to` and
callback machinery there is an extension of the same topic flow.

The pipeline's shape isn't incidental — keying by `session_id`, crossing a topic at
every hop, and keeping Think and tools out of the topology each buy a specific
property.

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
partition-parallel: add partitions and stream threads/instances and throughput
scales horizontally, with each session's state pinned to a single partition
(state locality, no cross-partition coordination). The two heaviest, slowest
stages — Think and tool execution — are *outside* the Streams topology, so they
scale on their own as ordinary Kafka consumer groups. Doubling LLM throughput is
just running more `ThinkConsumer` instances; it doesn't touch the topology.

## Latency

Every stage commits early and hands off through a topic rather than blocking, so
no slow downstream step stalls the partition behind it. `COMMIT_INTERVAL_MS` is
tuned low (10ms) to flush results to the next stage quickly rather than batching
for throughput. The only deliberate wait — the tool-result aggregator — is bounded
by a configurable timeout and swept on a fixed interval, so worst-case turn
latency is a known quantity rather than an open-ended hang.

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

A few choices keep per-turn overhead low:

- **Local state.** Joins (history, memoir, reply routes, tool aggregation) read
  from RocksDB stores colocated with the partition, so reconstructing a
  conversation never hits an external database.
- **Tight commits.** `COMMIT_INTERVAL_MS` is set to `10`, so results flush to the
  next stage almost immediately rather than waiting for a batch to fill.
- **Non-blocking hand-offs.** No stage holds a thread while a slow downstream step
  runs. The heavy, external work (the LLM call, tool execution, delegated
  sub-agents) lives outside the topology and never occupies a stream thread.
- **Prompt caching.** With `PROMPT_CACHING` enabled, the cached system-prompt
  prefix is reused across turns, cutting both token cost and time-to-first-token
  on the LLM call.

The net effect is that the cost of an extra turn, or an extra concurrent session,
is mostly the LLM call itself rather than pipeline overhead.

## Maintainability

The topology is assembled from independent `register()` fragments that share
nothing but topic names and a few KTables. Adding a stage means writing a
processor that reads one topic and writes another; nothing upstream or downstream
changes. Records are typed Java records and topic names are centralized constants
(`Topics`), so the wire contract is explicit and a schema change surfaces at
compile time. Each stage is unit-testable in isolation with Kafka Streams'
`TopologyTestDriver`.

## Reusability

Nothing in the pipeline is specific to a given agent. An "agent" is the *same*
processing app, think-consumer, and chat-api, parameterized by configuration — its
`AGENT_NAME` (which namespaces every topic), system prompt, and tool definitions.
That is what lets one cluster host many agents side by side, lets the
language-agnostic SDKs implement tools against a fixed topic contract, and lets
[multi-agent communication](./multi-agent) reuse the `tool-use` /
`tool-use-result` seam unchanged. Every example in the repository is the same
backbone with different config.

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

```
  user / scheduler
        │  POST /api/chat
        ▼
  ┌─────────────────┐
  │  message-input  │◀───────────────────────────────────┐  (role = "tool":
  └─────────────────┘   re-entry closes the agentic loop  │   tool results)
        │                                                  │
        ▼                                                  │
  EnrichInputMessageProcessor                              │
   • re-key by session_id                                  │
   • left-join think-response KTable → history             │
   • left-join memoir-context KTable → long-term memory    │
        │                                                  │
        ▼                                                  │
  ┌────────────────────────┐                               │
  │ enriched-message-input │                               │
  └────────────────────────┘                               │
        │                                                  │
        ▼                                                  │
  ThinkConsumer  (separate service — calls the LLM)        │
        │                                                  │
        ▼                                                  │
  ┌────────────────────────┐                               │
  │ think-request-response │── seeds ──┐                   │
  └────────────────────────┘           │                   │
        │                              │                   │
   ┌────┴─────────────┐                │                   │
   │ has tool_uses?   │                │                   │
   ├──── yes ─────────┤                ▼                   │
   ▼                  │      AggregateToolExecution         │
  ExtractToolUseItems │        ResultProcessor             │
   • fan-out 1/tool   │      • accumulate per session_id   │
        │             │      • all arrived OR timeout      │
        ▼             │                │                   │
  ┌───────────┐       │                ▼                   │
  │ tool-use  │       │      ┌────────────────────────┐    │
  └───────────┘       │      │ tool-use-all-complete  │    │
        │             │      └────────────────────────┘    │
        ▼             │                │                   │
  tool execution      │                ▼                   │
  (your SDK consumer) │      TransformToolUseDone ─────────┘
        │             │
        ▼             │  ┌──── no (end_turn) ────┐
  ┌──────────────────┐│  ▼
  │ tool-use-result  │┘  EndTurnProcessor
  └──────────────────┘    • left-join reply-to KTable
                          ▼
                    ┌────────────────┐
                    │ message-output │──▶ OutputConsumer ──▶ WebSocket / callback
                    └────────────────┘
```

## The topics

The pipeline's contract is its topics. Each is keyed by `session_id` unless
noted, so all events for one conversation land on the same partition and are
processed in order.

| Topic | Key | Carries | Role in the pipeline |
|-------|-----|---------|----------------------|
| `message-input` | `session_id` | `MessageInput` (`role`: user/assistant/tool) | The front door **and** the loop's re-entry point |
| `enriched-message-input` | `session_id` | `FullSessionContext` | Latest input + full history + memoir, ready for the LLM |
| `think-request-response` | `session_id` | `ThinkResponse` | The LLM's output: assistant text, `tool_uses`, `end_turn`, cost |
| `tool-use` | `session_id` | `ToolUseItem` | One message per tool call (fanned out) |
| `tool-use-dlq` | `session_id` | `ToolUseItem` | Malformed tool items (missing `tool_use_id`/`name`) |
| `tool-use-result` | `session_id` | `ToolUseResult` | One result per tool call |
| `tool-use-all-complete` | `session_id` | `ToolResultAccumulator` | Emitted once every expected result has landed |
| `tool-use-latency` | `tool_name` | latency metric | Per-tool observability |
| `message-output` | `session_id` | `UserResponse` | The final answer for the turn |
| `reply-to` | `session_id` | reply descriptor | Multi-agent callback route (compacted) |
| `session-end` | `session_id` | `"{}"` | Fired on inactivity (memoir only) |
| `memoir-context` | `user_id` | memoir string | Long-term, per-user memory (memoir only) |
| `memoir-context-session-end` | `user_id` | `MemoirSessionEnd` | Snapshot handed to the memoir updater (memoir only) |

Note that `tool-use` and `tool-use-result` are an ordinary topic boundary: the
pipeline produces a `tool-use` and later consumes a `tool-use-result`, but *who*
produces that result — a local SDK tool consumer, or a remote agent via callback —
is not the pipeline's concern. That seam is exactly where multi-agent plugs in.

## The stages

The processing app (`FlightDeckStreamsApp`) wires every stage into **one** Kafka
Streams topology. Each stage is an independent fragment registered via a static
`register(builder, …)` call, and they communicate only through topics — no stage
holds a reference to another.

### 1. Enrich — `EnrichInputMessageProcessor`

Reads `message-input`, re-keys by `session_id`, and reconstructs the
conversation by left-joining the `think-response` KTable
(`previousMessages + lastInputMessage + lastInputResponse`). When memoir is
enabled it also re-keys to `user_id`, left-joins the `memoir-context` KTable, and
re-keys back. The output is a `FullSessionContext` — everything the LLM needs in
one record — written to `enriched-message-input`.

### 2. Think — `ThinkConsumer` (a separate service)

The think step is **not** a Streams node. It is a standalone consumer that reads
`enriched-message-input`, calls the configured LLM (Claude or Gemini) with the
system prompt, history, and tool definitions, optionally compacts long history,
and writes a `ThinkResponse` to `think-request-response`. Keeping Think out of the
Streams topology means the slow, external, rate-limited part of a turn scales on
its own and never occupies a stream thread while waiting on an API.

### 3. Fan out tools — `ExtractToolUseItemsProcessor`

Reads `think-request-response`, keeps only responses whose `tool_uses` is
non-empty, and explodes each into individual `ToolUseItem`s on `tool-use` — one
message per call, each stamped with `total_tools` so the aggregator downstream
knows how many results to expect. Items missing a `tool_use_id` or `name` are
routed to `tool-use-dlq` instead of crashing the turn.

### 4. Execute tools — your SDK consumer

External to the topology. A tool consumer (Python or TypeScript SDK) reads
`tool-use`, runs the tool, and writes a `ToolUseResult` to `tool-use-result`. In
the multi-agent case the dispatcher acks without producing a result and the
result arrives later via callback — but the topic contract is identical.

### 5. Aggregate results — `AggregateToolExecutionResultProcessor`

The one stage that must wait. It reads **two** streams: `think-request-response`
as a **seed** (which tells it the full set of expected `tool_use_id`s for the
session) and `tool-use-result`, where each result lands. It accumulates state per
`session_id` in the `tool-result-accumulator-store`. Once every expected result
has arrived it emits the complete set to `tool-use-all-complete`. A wall-clock
punctuator sweeps for sessions past their deadline and synthesizes
`{ status: "error", reason: "timeout" }` for anything still missing — so a turn
can never hang on a tool that never answers.

### 6. Close the loop — `TransformToolUseDoneProcessor`

Reads `tool-use-all-complete` and writes the collected results **back to
`message-input`** as a single `MessageInput` with `role: "tool"`. That re-entry
is the whole agentic loop: the tool results flow through Enrich → Think again,
and the LLM decides whether to call more tools or finish.

### 7. End the turn — `EndTurnProcessor`

Reads `think-request-response`, keeps only responses where `end_turn == true` and
there are no outstanding tool calls, concatenates the assistant messages, and
left-joins the `reply-to` KTable (`null` for ordinary chats). The result is a
`UserResponse` on `message-output`, which the chat-api's `OutputConsumer`
delivers to the WebSocket client — or, for a delegated sub-call, POSTs back to the
calling agent.

### 8–9. Memoir — `SessionEndProcessor` / `MemoirSessionEndProcessor`

Optional (`MEMOIR_ENABLED`). `SessionEndProcessor` tracks last-seen time per
session in `session-last-seen-store` and a punctuator emits `session-end` after
an inactivity threshold. `MemoirSessionEndProcessor` joins that against the
session's last `ThinkResponse` and the existing `memoir-context`, and emits a
`MemoirSessionEnd` snapshot for the memoir updater to fold into long-term memory.

## State, KTables, and the loop

Three topics are materialized as KTables and shared across the stages that read
them (registered once to avoid duplicate source nodes):

| KTable / store | Keyed by | Holds |
|----------------|----------|-------|
| `think-response-store` | `session_id` | Latest `ThinkResponse` — the join target for history reconstruction |
| `memoir-context-store` | `user_id` | Long-term per-user memoir |
| `reply-to-store` | `session_id` | Multi-agent reply descriptor |
| `tool-result-accumulator-store` | `session_id` | In-flight tool-result accumulation |
| `session-last-seen-store` | `session_id` | Last activity timestamp for inactivity detection |

The history KTable is what makes the loop work without a database: each turn's
`ThinkResponse` is the materialized memory of the conversation, and Enrich joins
against it on the next turn. The conversation is reconstructed from the stream
itself, not fetched from external storage.

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `AGENT_NAME` | — | Prefix for every topic; isolates agents on a shared cluster |
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | Broker endpoint (Kafka / Confluent Cloud / WarpStream) |
| `MEMOIR_ENABLED` | `true` | Toggles the session-end + memoir stages |
| `REPLY_TO_STATE_TTL_MS` | `86400000` (24h) | Retention for `reply-to` routing state |

The Streams app runs `AT_LEAST_ONCE` with `COMMIT_INTERVAL_MS=10` by default;
both are set in `FlightDeckStreamsApp.buildConfig()`.

## Example

Any example in the repository (start with **`lead-followup-agent`**) exercises
this full pipeline end to end — message in, think, tool fan-out and aggregation,
loop, and final output — with the topology visible in the processing service's
startup logs (`topology.describe()`).
