---
sidebar_position: 5
---

# Compaction

Compaction summarizes previous messages in a session to reduce token usage, keeping conversations within budget without losing essential context.

## How It Works

Compaction is controlled by two environment variables:

- **`COMPACTION_USER_MESSAGE_TRIGGER`** — The number of user messages in a session before compaction is triggered. For example, if `COMPACTION_USER_MESSAGE_TRIGGER=3`, then compaction becomes a candidate for triggering when the number of user messages is three or more. Default: `16`
- **`COMPACTION_USER_MESSAGE_UNTIL`** — The number of recent user messages to keep uncompacted. For example, if `COMPACTION_USER_MESSAGE_UNTIL=2`, the last 2 user messages are kept and all messages before them, including user messages, assistant messages, and tool calls, are compacted into a summary. Default: `8`


### Example

With `COMPACTION_USER_MESSAGE_TRIGGER=3` and `COMPACTION_USER_MESSAGE_UNTIL=2`, given a session with 5 user messages, 4 assistant messages, and 3 tool calls:

```
User Message 1      ──┐
Assistant Message 1   │
Tool Call 1           │
User Message 2        ├──▶  Compacted into summary
Assistant Message 2   │
User Message 3        │
Assistant Message 3   │
Tool Call 2         ──┘
User Message 4      ──────▶  Kept as-is  ┐ COMPACTION_USER_MESSAGE_UNTIL=2
Assistant Message 4 ──────▶  Kept as-is  │ (keep last 2 user messages
Tool Call 3         ──────▶  Kept as-is  │  and their associated messages)
User Message 5      ──────▶  Kept as-is  ┘
```

Compaction is triggered after the 3rd user message. The most recent 2 user messages (4 and 5) and their associated assistant messages and tool calls are kept, while all earlier messages are compacted into a summary.

You can control the behavior of compaction by setting the `COMPACTION_PROMPT` environment variable. This allows you to customize how messages are summarized during compaction.

:::note
If `COMPACTION_USER_MESSAGE_TRIGGER` >= `COMPACTION_USER_MESSAGE_UNTIL`, compaction may not occur because all user messages would be kept and there would be nothing to compact.
:::
