---
sidebar_position: 6
---

# Multi-Agent Communication

FlightDeck lets one agent call another agent **as an asynchronous tool**. The
calling agent ("Agent A") delegates a task; the called agent ("Agent B") runs as
an ordinary agent and its answer flows back as the tool's result — without A
holding a thread open while B works.

The guiding principle:

> **Agent A treats Agent B as a generic async tool. Agent B treats the request as
> a generic chat. Neither needs to know the other is an agent.**

This keeps the two agents fully decoupled: A's tooling and B's agent logic each
stay unaware of the orchestration between them.

## The round trip

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

### Asynchronous, not blocking

A's delegating tool does **not** publish a `tool-use-result` when it dispatches.
It acks the `tool-use` offset so the dispatch is not redelivered, then returns —
the "pending" ack. No worker thread is held open for the duration of the
sub-call. The result is published later, by the callback. This is what lets a
delegated task take seconds or minutes without tying up A's tool consumer.

### The callback token is a capability; the secret stays with A

When A dispatches, it mints an HMAC-SHA256 token carrying the correlation fields
it needs to match the eventual result:

| Field | Meaning |
|-------|---------|
| `session_id` | A's session — where the result is keyed back |
| `tool_use_id` | the specific tool call to complete |
| `tool_id`, `name` | the tool's identity |
| `total_tools` | how many tools the turn is waiting on |
| `iat`, `exp` | issued-at / expiry (epoch seconds) |

```
token = base64url(payloadJson) "." base64url(HMAC_SHA256(secret, payloadJson))
```

Only Agent A holds the secret (`TOOL_CALLBACK_SECRET`), on the two components
that need it: the tool service that **signs** and the chat-api that **verifies**.
Agent B never sees the secret — it cannot read, forge, or alter the token. B is a
blind courier that echoes the opaque token back. The HMAC is computed over the
exact transmitted bytes, so JSON key ordering is irrelevant to verification.

### Reply routing is transport, not prompt

A tells B where to send the answer with a `reply` descriptor on the `/api/chat`
request — **not** in the message content:

```json
{
  "session_id": "<a fresh session for B's sub-conversation>",
  "content": "<the task for B>",
  "reply": {
    "type": "RESTAPI",
    "endpoint": "https://agent-a-host:8000",
    "method": "POST",
    "path": "/api/tools/response",
    "responseAsField": "result",
    "bearerToken": "<the HMAC token>"
  }
}
```

B's chat-api stores this descriptor on its `reply-to` topic, keyed by
`session_id`. It never enters B's prompt, and B has no "call back the caller"
tool. At end-turn, `EndTurnProcessor` left-joins the descriptor into
`message-output`, and B's `OutputConsumer` performs the delivery. Routing lives
in the delivery layer, so B stays a vanilla agent.

Because the reply target belongs to B's **session** (not to any single message),
it is set once at task start and read once at the terminal output — it does not
have to survive B's internal think→tool loops.

### The answer is free-form; A shapes it

B returns ordinary prose — no JSON contract is imposed on B's LLM. B's
`OutputConsumer` wraps the answer under the caller-named field
(`responseAsField`, e.g. `{ "result": "<answer>" }`) and POSTs it to
`/api/tools/response`. A verifies the token and writes a canonical
`tool-use-result` whose `result` carries B's response.

### Failure is a timeout, not an error channel

B never reports failure. If B crashes or never answers, A's tool aggregator —
which was seeded with the full set of expected `tool_use_id`s from the LLM's
request — reaches its deadline (`ASYNC_TOOL_TIMEOUT_MS`, default 5 minutes) and
synthesizes a `status: "error"` result for the missing tool. Every `tool_use`
block always gets a result, so the turn can never hang. The binding deadline is
this aggregator timeout: B must answer within it (raise it if B legitimately
needs longer).

### One-shot delivery

On a successful callback, B's `OutputConsumer` tombstones the reply route so the
one-shot call cannot be double-delivered. The `reply-to` topic is also compacted
with a time-based retention (`REPLY_TO_STATE_TTL_MS`, default 24 hours) so stale
routes are eventually dropped. Retriable callback failures (5xx, timeouts) are
retried with backoff; non-retriable ones (e.g. an expired token) are logged and
skipped.

## The callback endpoint

Agent A's chat-api exposes:

```
POST /api/tools/response
Authorization: Bearer <HMAC token>
{ "result": <any JSON> }
→ 202 Accepted
```

The token supplies the correlation fields, so the body only needs the result
payload. Duplicate callbacks are safe — the aggregator dedupes by `tool_use_id`.

## Configuration

| Variable | Where | Default | Purpose |
|----------|-------|---------|---------|
| `TOOL_CALLBACK_SECRET` | A's tool service + A's chat-api | — | HMAC secret to sign/verify callback tokens |
| `ASYNC_TOOL_TIMEOUT_MS` | A's processing | `300000` | How long to wait for a result before synthesizing an error |
| `REPLY_TO_STATE_TTL_MS` | B's processing | `86400000` | Time-expiry for stored reply routes |
| `REPLY_RETRY_MAX_MS` | B's chat-api | `120000` | Retry budget for delivering a callback |

## Example

See the **`multi-agent-setup`** example in the repository for a complete,
runnable two-agent setup (an orchestrator delegating to a worker) with the async
dispatcher, the reply descriptor, and the callback wiring shown end to end.
