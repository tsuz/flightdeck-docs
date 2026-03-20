---
sidebar_position: 2
---

# Think

The **Think** layer is a function that calls the LLM. It is the decision-making core of each agent — the single call that determines what to do next.

LLM APIs are stateless. They have no memory of previous calls. This means everything the agent needs to reason — current context, conversation history, tool results, prompts, and any other relevant information — must be assembled and presented in one call. The Think function is responsible for gathering all of this and sending it to the LLM as a single request.

## Default Behavior

Flightdeck ships with a default Think implementation that handles the LLM call for you. You can configure it entirely through environment variables without touching any code:

- **`CLAUDE_API_KEY`** — Your Anthropic API key for authenticating with the Claude API
- **`CLAUDE_MODEL`** — The Claude model to use (e.g., `claude-sonnet-4-6`, `claude-opus-4-6`)
- **`CLAUDE_PROMPT`** — The system prompt that guides the agent's behavior and reasoning

Set these in your `.env` file and the default Think function will use them automatically.

The default `CLAUDE_PROMPT` is:

```
You are an intelligent AI assistant with access to various tools.
Analyze the user's request and determine the best course of action.
Use the available tools when needed to fulfill the user's request.
If you can answer directly without tools, do so.

Be concise and helpful. When using tools, explain what you're doing and why.

%s
```

All other information — conversation history, tool definitions, task context — is appended at the `%s` placeholder at the end of the prompt. You can override this default with your own prompt via the `CLAUDE_PROMPT` environment variable while keeping the same `%s` pattern.

## Custom Behavior

If the default Think implementation doesn't fit your needs, you can write your own by implementing a custom think consumer. The message your consumer receives looks like this:

```json
{
  "session_id": "session-20260320-143022",
  "user_id": "user-alice",
  "history": [
    {
      "session_id": "session-20260320-143022",
      "user_id": "user-alice",
      "role": "user",
      "content": "What's the weather like in Tokyo?",
      "timestamp": "2026-03-20T14:30:22Z",
      "metadata": {}
    },
    {
      "session_id": "session-20260320-143022",
      "user_id": "user-alice",
      "role": "assistant",
      "content": "It's currently 18°C and partly cloudy in Tokyo.",
      "timestamp": "2026-03-20T14:30:25Z",
      "metadata": {}
    }
  ],
  "latest_input": {
    "session_id": "session-20260320-143022",
    "user_id": "user-alice",
    "role": "user",
    "content": "Should I bring an umbrella tomorrow?",
    "timestamp": "2026-03-20T14:31:10Z",
    "metadata": {}
  },
  "memoir_context": "Alice lives in Tokyo. She frequently asks about weather and commute conditions. Prefers concise answers.",
  "timestamp": "2026-03-20T14:31:10Z"
}
```

| Field | Description |
|---|---|
| `session_id` | Identifies the current conversation session |
| `user_id` | Identifies the user |
| `history` | Full conversation history for the session — previous user and assistant messages |
| `latest_input` | The most recent user message that triggered this Think call |
| `memoir_context` | Long-term context about the user, retrieved from memory (e.g. preferences, past behavior) |
| `timestamp` | When the message was produced |

With this payload, you can implement your own logic — use a different LLM provider, add custom prompt assembly, apply guardrails, or route to different models based on the input. See the [think consumer source code](https://github.com/tsuz/ai-agent-orchestration-kafka-example) for a reference implementation.
