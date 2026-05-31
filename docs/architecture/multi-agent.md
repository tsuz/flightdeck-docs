---
sidebar_position: 1
---

# Multi-Agent Communication

Flightdeck simplifies AI agent communication through a secure, reliable, and scalable design.
The calling agent ("Agent A") delegates a task; the called agent ("Agent B") runs as
an ordinary agent and its answer flows back as the tool's result through a REST API
endpoint — without A holding a thread open while B works.

## High Level Workflow

The design below assumes two Flightdeck agents (Agent A and Agent B).

```
  Agent A (caller)                         Agent B (callee — an ordinary agent)
  ────────────────                         ─────────────────────────────────────
  LLM calls a delegating tool
        │
        ▼
  A's tool service:
   • mints an HMAC callback token
   • POSTs the task to B's /api/chat ──────▶ /api/chat stores the reply route
     with a `reply` descriptor                (reply-to topic, keyed by session_id)
   • acks "pending": commits the                     │
     tool-use offset, NO result                      ▼
                                            think → tools → end turn
                                            EndTurnProcessor left-joins the reply
                                            route into message-output
                                                      │
                                                      ▼
  /api/tools/response  ◀──────────────────  B's OutputConsumer POSTs the answer
   • verifies the token                       Authorization: Bearer <token>
   • writes a tool-use-result                 body: { "result": "<B's answer>" }
        │                                      (then tombstones the reply route)
        ▼
  A's aggregator matches tool_use_id
   → the turn completes
   (or times out → synthesized error)
```


## Design choices

### Asynchronous dispatch

A's tool, the delegator, does **not** publish a `tool-use-result` when it dispatches.
It acks the `tool-use` offset so the dispatch is not redelivered, then returns —
the "pending" ack. No consumer is held open for the duration of the
sub-call. The result is published later, by the callback. This is what lets a
delegated task take seconds or minutes without tying up A's tool consumer.

Async is chosen precisely so a long sub-call does not block the messages behind
it in the same partition. A Kafka consumer processes a partition in order, so if
the delegator held the consumer open while waiting on B, every subsequent
`tool-use` in that partition would stall behind it. By returning immediately and
committing the `tool-use` offset as early as possible, the partition keeps moving
and progress is never lost to a slow or stuck sub-call.

```
     consumer            external            tool-use-result     tool-use            Agent A API         Agent B
     thread              endpoint            topic               offset              endpoint
     │                   │                   │                   │                   │                   │
     read tool-use       │                   │                   │                   │                   │
     │                   │                   │                   │                   │                   │
     │──POST task───────▶│                   │                   │                   │                   │
     │                   │──dispatch to B────┼───────────────────┼───────────────────┼───────────────────▶
     │◀──202 pending─────│                   │                   │                   │                   │
     │                   │                   │                   │                   │                   │
     │───commit offset───┼───────────────────┼───────────────────▶                   │                   │
     │  (NO result yet)  │                   │                   │                   │                   │
     │                   │                   │                   │                   │                   │
     ┊ consumer free     │                   │                   │                   │                   │
     ┊                   │                   │                   │                   │ B works (seconds … minutes)
     ┊                   │                   │                   │                   ◀──result───────────│
     ┊                   │                   ◀──write result─────┼───────────────────│                   │
     ┊                   │                   │ turn completes    │                   │                   │
```

The offset is committed **before** any `tool-use-result` exists; the result is
written later, when B's callback arrives. Note that B never touches A's topics —
it POSTs to **A's API endpoint**, and that endpoint is what writes into the
`tool-use-result` topic. Contrast the synchronous alternative,
where the consumer stays occupied and both the write and the commit happen only
after B responds:

```
     consumer            external            tool-use-result     tool-use
     thread              endpoint            topic               offset
     │                   │                   │                   │
     read tool-use       │                   │                   │
     │                   │                   │                   │
     │──POST task───────▶│                   │                   │
     ┃ waiting           │ B works (seconds … minutes)           │
     ┃◀──result──────────│                   │                   │
     │───write result────┼───────────────────▶                   │
     │───commit offset───┼───────────────────┼───────────────────▶
     │ done (only now)   │                   │                   │
```

A parallel consumer can still serve other tools while one is parked on B, so
this isn't about head-of-line stalls. The win is resource cost: the async
version doesn't keep a consumer occupied — and an open connection to B — for the
minutes a sub-call can take.

### Securing Agent A from Agent B Callback

When Agent A dispatches to Agent B, it sends a message-specific token signed by
the key stored in Agent A. The token carries the correlation fields A needs to
match the eventual result, so when the callback arrives A can verify it really
came from this dispatch (the sender is who it claims to be) without storing any
state of its own — everything needed to match the result travels in the token.
Agent B, for its part, only needs to emit its result and echo the token back:

```
  Agent A (holds TOOL_CALLBACK_SECRET)        Agent B (no secret)
  ────────────────────────────────────        ───────────────────
  tool service:
    token = payload "." HMAC(secret, payload)
        │
        │  token (opaque) ──────────────────▶ stores token,
        │                                      echoes it back
        │                                      verbatim
        │                                          │
        │  ◀───────────────── token + result ──────┘
        ▼
  chat-api:
    recompute HMAC(secret, payload)
    match? → accept   mismatch? → reject
  ────────────────────────────────────
  B can carry the token but cannot read,
  forge, or alter it — a blind courier.
```

The token carries these correlation fields:

| Field | Meaning |
|-------|---------|
| `session_id` | A's session — where the result is keyed back |
| `tool_use_id` | the specific tool call to complete |
| `tool_id`, `name` | the tool's identity |
| `total_tools` | how many tools the turn is waiting on |
| `agent` | the calling agent's name (who minted the token) |
| `iat`, `exp` | issued-at / expiry (epoch seconds) |

```
token = base64url(payloadJson) "." base64url(HMAC_SHA256(secret, payloadJson))
```

Only Agent A holds the secret (`TOOL_CALLBACK_SECRET`), on the two components
that need it: the tool service that **signs** and the chat-api that **verifies**.
Agent B never sees the secret — it cannot read, forge, or alter the token. B is a
blind courier that echoes the opaque token back. The HMAC is computed over the
exact transmitted bytes, so JSON key ordering is irrelevant to verification.

Even if the HMAC token is compromised on Agent B, Agent A dedupes results by
`tool_use_id`: the first callback for a tool call is accepted and every
subsequent one is ignored. A forged or replayed callback can therefore only race
a result A already has, which significantly lowers the chance of compromising the
workflow.

This dedupe is in place: the aggregator drops duplicate `tool_use_id`s both while
a turn is still accumulating and, after it completes, for a short tombstone window
(`TOOL_AGG_TOMBSTONE_TTL_MS`, default 60s) that absorbs late or replayed
callbacks. The residual exposure is a replay that arrives only after the tombstone
has been swept — and by then A has already consumed the original result and moved
on to the next think iteration, so a late forged callback has nothing live to
influence.

### Storing Stateful Reply Metadata

B's chat-api stores the reply descriptor on its `reply-to` topic, keyed by
`session_id`. It never enters B's prompt, and B has no "call back the caller"
tool. At end-turn, `EndTurnProcessor` left-joins the descriptor into
`message-output`, and B's `OutputConsumer` performs the delivery. Routing lives
in the delivery layer, so B stays a vanilla agent.

Because the reply target belongs to B's **session** (not to any single message),
it is set once at task start and read once at the terminal output — it does not
have to survive B's internal think→tool loops.

```
  /api/chat request received by Agent B
        │
        ├─ content ─────────▶ B's prompt ──▶ think → tool → think → …
        │                     (routing never enters here)            │
        │                                                            ▼
        │                                      think-request-response topic
        │                                                            │
        └─ reply descriptor ─▶ reply-to topic                        │
                               (keyed by session_id)                 │
                                       │                             │
                                       └─────────────┬───────────────┘
                                                     ▼
                                       EndTurnProcessor left-joins
                                       reply-to into output-message
                                                     │
                                                     ▼
                                            output-message topic
                                                     │
                                                     ▼
                                       OutputConsumer consumes it,
                                       POSTs the answer back to Agent A
```

Once it has delivered, `OutputConsumer` writes a tombstone back into the
`reply-to` topic for that `session_id`. Because the topic is keyed and compacted,
the tombstone retires the route, so the stored reply state does not grow without
bound as sessions complete.

> **Bottleneck.** Today `/api/tools/response` accepts only one message at a time,
> which caps how fast `OutputConsumer` can drain its output. Enabling batching on
> the API side — accepting many results per request — would increase total
> throughput significantly. This still needs to be implemented.

> **Where the tombstone belongs.** The tombstone is currently emitted by
> `OutputConsumer` after delivery. It would more naturally live on
> `EndTurnProcessor`, the left-join processor that joins `think-request-response`
> with `reply-to` — that processor already owns the reply-route state, so retiring
> the route there keeps cleanup next to the state it manages rather than deferring
> it to the delivery step.

A tells B where to send the answer with a `reply` descriptor on the `/api/chat`
request — **not** in the message content. Crucially, the descriptor names a
*logical callback service*, never a URL:

```json
// POST /api/chat  — received by Agent B
// Host: agent-b-host:8000
// Content-Type: application/json
{
  "session_id": "<a fresh session for B's sub-conversation>",
  "content": "<the task for B>",
  "reply": {
    "callbackService": "my-agent-a",
    "bearerToken": "<the HMAC token>"
  }
}
```

#### Callback routing is operator-controlled (SSRF-safe)

The caller supplies only the service *name* (`callbackService`); it never supplies
a URL. Agent B resolves that name to a base URL from its own operator-controlled
config — the `ALLOWED_HOST_MAPPING` environment variable, a comma-separated list
of `name:baseUrl` entries — and appends the fixed callback path
`/api/tools/response`. The HTTP method (`POST`) and the response field (`result`)
are likewise fixed by B, not chosen by the caller.

Because the destination is chosen from operator config rather than caller input,
an untrusted peer cannot steer B's callback at an arbitrary host: the SSRF
primitive that an attacker-controlled `endpoint` would create is structurally
removed. A `callbackService` that B is not configured for is rejected at
`/api/chat` with a `400` (fail closed), so an unroutable reply never even reaches
the `reply-to` topic.

When B finishes, it POSTs to the resolved URL — A's `/api/tools/response` —
carrying the HMAC token as a bearer credential and the answer under the fixed
`result` field:

```json
// POST <resolved base URL>/api/tools/response  — sent back to Agent A
// Authorization: Bearer <the HMAC token>
// Content-Type: application/json
{
  "result": "<B's answer>"
}
```

### Response Message Type

Agent A can ask Agent B to return a specific JSON shape, but B cannot guarantee
it: an LLM is non-deterministic, so any structured-output contract may be
violated. We therefore do **not** assume B treats A as a machine — we assume only
that B can parse natural language. Consequently the response from B to A is
modeled as a plain **string**, never a typed payload.

### Failure Scenarios

We must assume Agent B offers **no guarantee** of returning a result. It can
crash, hang, or simply never answer, and — being a vanilla agent — it has no
channel to report its own failure. So A cannot wait on B forever; it has to
decide for itself when a missing result has become a failure.

A's aggregator, `AggregateToolExecutionResultProcessor`, reads **two** topics. It
consumes `think-request-response` as a seed — that gives it the full set of
expected `tool_use_id`s (and `total_tools`) for the session — and it consumes
`tool-use-result`, where each callback lands. State is accumulated per
`session_id`. Once every expected `tool_use_id` has a result, it emits the
complete set to `tool-use-all-complete` and the turn advances to the next think
iteration.

If a result never arrives, a wall-clock sweep — running every
`TOOL_AGG_PUNCTUATE_INTERVAL_MS` (default 15s) — checks each session against its
deadline (seed time + `ASYNC_TOOL_TIMEOUT_MS`, default 5 min). When the deadline
passes with results still missing, the aggregator synthesizes a
`{ status: "error", reason: "timeout" }` result for each missing `tool_use_id`
and emits the now-complete set downstream. Every `tool_use` block always gets a
result, so the turn can never hang.

```
    think-request-response topic         tool-use-result
        (seeds expected set)          (callbacks land here)
                  │                             │
                  └──────────────┬──────────────┘
                                 ▼
                 AggregateToolExecutionResultProcessor
                 (accumulates state per session_id)
                                 │
           ┌─────────────────────┴──────────────────────┐
           ▼                                             ▼
  all expected results arrived          sweep every TOOL_AGG_PUNCTUATE_INTERVAL_MS:
  → emit right away                     now ≥ seed + ASYNC_TOOL_TIMEOUT_MS and
           │                            still missing → synthesize
           │                            { status: "error", reason: "timeout" }
           │                                             │
           └─────────────────────┬──────────────────────┘
                                 ▼
                      tool-use-all-complete topic
                      (every tool_use_id now has a result)
                                 │
                                 ▼
                         next think iteration
```

## Configuration

| Variable | Where | Default | Purpose |
|----------|-------|---------|---------|
| `TOOL_CALLBACK_SECRET` | A's tool service + A's chat-api | — | HMAC secret to sign/verify callback tokens |
| `ASYNC_TOOL_TIMEOUT_MS` | A's processing | `300000` (5 minutes) | How long to wait for a result before synthesizing an error |
| `TOOL_AGG_PUNCTUATE_INTERVAL_MS` | A's processing | `15000` (15 seconds) | How often the aggregator sweeps for timed-out sessions |
| `TOOL_AGG_TOMBSTONE_TTL_MS` | A's processing | `60000` (60 seconds) | How long a completed turn is kept as a tombstone to absorb late / duplicate callbacks |
| `REPLY_TO_STATE_TTL_MS` | B's processing | `86400000` (24 hours) | Time-expiry for stored reply routes |
| `REPLY_RETRY_MAX_MS` | B's chat-api | `120000` (2 minutes) | Retry budget for delivering a callback |
| `ALLOWED_HOST_MAPPING` | B's chat-api | — | Allowlist of `name:baseUrl` entries (comma-separated) that resolves a `reply` descriptor's `callbackService` to a trusted base URL; the callback path is fixed. Unknown names are rejected (fail closed). |

## Example

See the **`multi-agent-setup`** example in the repository for a complete,
runnable two-agent setup (an orchestrator delegating to a worker) with the async
dispatcher, the reply descriptor, and the callback wiring shown end to end.
