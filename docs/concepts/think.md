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

If you need to modify the LLM behavior or process multi-modal inputs like images, audio, or video, a custom Think function may be needed. See [Building custom Think functions](/docs/guides/custom-think-functions) guide for full examples.
