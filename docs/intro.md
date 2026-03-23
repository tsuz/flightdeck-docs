---
sidebar_position: 1
slug: /
---

# Introduction

**Flightdeck** is an open-source AI agent orchestrator that makes it easy to build and compose without worrying about states and infrastructure.

## Why Flightdeck?

Flightdeck is an framework layer purpose-built for running AI agents in production. It addresses four critical areas:

### Reliability

Production agent systems need to handle failure gracefully and maintain consistent state. Flightdeck provides:

- **State management** — Persistent, checkpointed execution state so agents can resume from where they left off after interruptions
- **Scalability** — Horizontal scaling of agent workloads with built-in queue management and resource-aware scheduling
- **Fault tolerance** — Automatic retries with exponential backoff, circuit breakers for downstream services, and graceful degradation when individual agents fail

### Observability

Running agents without visibility is flying blind. Flightdeck gives you full operational insight:

- **Cost control** — Per-agent and per-task token usage tracking with budget limits and alerts to prevent runaway spend
- **Auditing** — Complete execution traces capturing every LLM call, tool invocation, and decision point for compliance and debugging
- **Latency monitoring** — End-to-end timing for tasks, tool calls, and LLM round-trips with bottleneck identification and SLA tracking
- **Logging** — Structured, leveled logs across all agent activity with correlation IDs to trace requests end-to-end through multi-agent workflows
- **User feedback** — Built-in feedback collection hooks that tie end-user ratings and corrections back to specific agent runs for continuous improvement

### Developer Usability

Flightdeck is designed to get out of your way so you can focus on what your agents actually do:

- **No complex abstractions** — Business logic and infrastructure are cleanly separated. Define what your agents do in plain, straightforward code while Flightdeck handles execution, scaling, and recovery behind the scenes
- **Language agnostic** — First-class SDKs for Python, TypeScript, and Go. Define agents in whichever language your team already uses, and mix languages within the same workflow
- **Unit testing** — Test agents, tools, and workflows in isolation with built-in mocks for LLM calls and tool responses. Validate behavior deterministically without burning tokens or hitting external services
