---
sidebar_position: 2
---

# Think

The **Think** layer is a function that calls the LLM. It is the decision-making core of each agent — the single call that determines what to do next.

LLM APIs are stateless. They have no memory of previous calls. This means everything the agent needs to reason — current context, conversation history, tool results, prompts, and any other relevant information — must be assembled and presented in one call. The Think function is responsible for gathering all of this and sending it to the LLM as a single request.
## Choosing the LLM

Flightdeck ships with a default Think implementation that handles the LLM call for you. You can configure it entirely through environment variables without touching any code:

- **`LLM_PROVIDER`** — LLM provider to use — `claude` or `gemini`. Default: `claude`

If `claude` is used as the LLM provider, the following configs are applied:

- **`CLAUDE_API_KEY`** — Your Anthropic API key *(required for Claude)*
- **`CLAUDE_MODEL`** — Claude model to use. Default: `claude-haiku-4-5-20251001`
- **`CLAUDE_MAX_TOKENS`** — Max tokens per Claude response. Default: `4096`
- **`CLAUDE_API_URL`** — Claude API endpoint. Default: `https://api.anthropic.com/v1/messages`

If `gemini` is used as the LLM provider, the following configs are applied:

- **`GEMINI_API_KEY`** — Your Google Gemini API key *(required for Gemini)*
- **`GEMINI_MODEL`** — Gemini model to use. Default: `gemini-2.5-flash`
- **`GEMINI_MAX_TOKENS`** — Max tokens per Gemini response. Default: `4096`
- **`GEMINI_API_URL`** — Gemini API endpoint. Default: `https://generativelanguage.googleapis.com/v1beta`

Set these in your `.env` file and the default Think function will use them automatically.

## Prompts

The default system prompt is:

```
You are an intelligent AI assistant with access to various tools.
Analyze the user's request and determine the best course of action.
Use the available tools when needed to fulfill the user's request.
If you can answer directly without tools, do so.

Be concise and helpful. When using tools, explain what you're doing and why.
```

Conversation history, tool definitions, and task context are automatically appended below the system prompt.

You can override the default by setting `SYSTEM_PROMPT_FILE` to the path of a file containing your custom system prompt:

```bash
SYSTEM_PROMPT_FILE=./my-prompt.txt
```

## Custom Behavior

If you need to modify the LLM behavior or process multi-modal inputs like images, audio, or video, a custom Think function may be needed. See [Building custom Think functions](/category/building-custom-think-functions) guide for full examples.
