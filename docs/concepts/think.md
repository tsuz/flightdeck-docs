---
sidebar_position: 2
---

# Think

The **Think** layer is the decision-making core of each agent. It is the LLM call that determines what to do next based on the available information.

## How It Works

When an agent receives a task, the Think layer:

1. **Evaluates the current context** — the task description, conversation history, outputs from previous agents, and any relevant state
2. **Decides the next action** — whether to call a tool, request more information, delegate to another agent, or produce a final response
3. **Executes the decision** — invokes the chosen tool or generates output, then re-evaluates based on the result

This loop continues until the agent determines the task is complete.

## What the LLM Sees

Each Think step provides the LLM with:

- **System prompt** — the agent's role, goal, and behavioral instructions
- **Available tools** — the set of functions the agent can call, with their schemas and descriptions
- **Task context** — the current task description and any outputs from upstream agents
- **Conversation history** — prior Think steps, tool calls, and their results within the current task

The LLM uses all of this to decide the most appropriate next action.

## Think vs Business Logic

The Think layer is intentionally separate from your business logic:

| Think (LLM) | Business Logic (Developer) |
|---|---|
| Decides *which* tool to call | Defines *what* the tool does |
| Chooses the order of operations | Defines the available operations |
| Interprets ambiguous inputs | Defines the rules and constraints |
| Adapts to unexpected results | Defines the expected workflow |

The developer provides the tools and prompts. The LLM reasons about when and how to use them.

## Example

Given an agent with access to `search_email` and `send_email` tools, and the user input "Reply to John's last email saying I'll be there":

1. **Think** — I need to find John's last email first → call `search_email("from:John", limit=1)`
2. **Think** — I found the email about a meeting on Friday. I need to reply → call `send_email(to="john@...", subject="Re: Friday Meeting", body="I'll be there")`
3. **Think** — The email was sent successfully. The task is complete → return final response
