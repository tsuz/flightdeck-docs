---
sidebar_position: 1
slug: /intro
---

# Introduction

**Flightdeck** is an open-source AI agent orchestration layer that makes it easy to build, compose, and manage multi-agent systems.

## Why Flightdeck?

Flightdeck is an orchestration layer purpose-built for running AI agents in production. It addresses four critical areas:

### Reliability

Production agent systems need to handle failure gracefully and maintain consistent state. Flightdeck provides:

- **State management** — Persistent, checkpointed execution state so agents can resume from where they left off after interruptions
- **Scalability** — Horizontal scaling of agent workloads with built-in queue management and resource-aware scheduling
- **Fault tolerance** — Automatic retries with exponential backoff, circuit breakers for downstream services, and graceful degradation when individual agents fail

### Multi-Agent Orchestration

Complex tasks benefit from specialized agents working together rather than a single monolithic prompt:

- **Role-based agents** — Define agents with distinct roles, goals, and tool access, each optimized for their part of the workflow
- **Flexible execution** — Sequential pipelines, parallel fan-out/fan-in, hierarchical delegation, and conditional routing
- **Inter-agent communication** — Structured context passing between agents with typed inputs and outputs

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
## Architecture Overview

```
┌─────────────────────────────────────────┐
│              Your Application            │
├─────────────────────────────────────────┤
│           Flightdeck Crew               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Agent A  │ │ Agent B │ │ Agent C │   │
│  │ (Claude) │ │ (GPT-4) │ │ (Llama) │   │
│  └────┬─────┘ └────┬────┘ └────┬────┘   │
│       │            │           │         │
│  ┌────┴────────────┴───────────┴────┐    │
│  │          Task Router             │    │
│  └────┬────────────┬───────────┬────┘    │
│       │            │           │         │
│  ┌────┴────┐ ┌─────┴───┐ ┌────┴────┐    │
│  │  Tools  │ │ Memory  │ │ Traces  │    │
│  └─────────┘ └─────────┘ └─────────┘    │
├─────────────────────────────────────────┤
│        LLM Providers (Any Model)        │
└─────────────────────────────────────────┘
```

## Next Steps

- [**Quickstart**](/docs/quickstart) — Build your first multi-agent system in 5 minutes
- [**Core Concepts**](/docs/concepts/agents) — Understand agents, tasks, crews, and tools
- [**Guides**](/docs/guides/custom-tools) — Step-by-step tutorials for common patterns
- [**API Reference**](/docs/api/client) — Full API documentation
