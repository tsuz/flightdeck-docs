---
sidebar_position: 0
---

# Architecture

An overview of how Flightdeck is structured and how its components fit together.

## High-Level Overview

Flightdeck uses **Apache Kafka** as its base infrastructure and **Kafka Streams** as the processing and temporary storage layer. Consumers read from Kafka topics and are responsible for calling external APIs — LLMs, RAG services, tool functions, and any other external dependencies.

```
                         External APIs
               ┌──────────┬──────────┬──────────┐
               │   LLM    │   RAG    │  Tools   │
               │ Provider │ Service  │ (APIs,   │
               │ (Claude, │ (Vector  │  DBs,    │
               │  GPT-4,  │  Search, │  Files)  │
               │  Llama)  │  Embeddings)        │
               └────▲─────┴────▲─────┴────▲─────┘
                    │          │          │
┌───────────────────┼──────────┼──────────┼──────────┐
│  Agent            │          │          │          │
│                   │          │          │          │
│  ┌──────────────┐ │ ┌────────────────────┐         │
│  │  Prompts     │ │ │  Business Logic    │         │
│  └──────┬───────┘ │ └─────────┬──────────┘         │
│         │         │           │                    │
│         └─────────┼───────────┘                    │
│                   │                                │
│                   ▼                                │
│  ┌────────────────┴──────────┴──────────┴────────┐ │
│  │              Consumers                         │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │ │
│  │  │ Agent A  │ │ Agent B  │ │ Agent C  │       │ │
│  │  │ → LLM    │ │ → RAG    │ │ → Tools  │       │ │
│  │  │ → Tools  │ │ → LLM    │ │ → LLM    │       │ │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘       │ │
│  └───────┼─────────────┼───────────┼──────────────┘ │
│          │             │           │                │
│  ┌───────┴─────────────┴───────────┴──────────────┐ │
│  │  Flightdeck (Framework)                         │ │
│  │                                                 │ │
│  │  Kafka Streams                                  │ │
│  │  (Processing & Temporary Storage)               │ │
│  │                                                 │ │
│  │  Apache Kafka                                   │ │
│  │  (Base Infrastructure)                          │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
├──────────────────────────────────────────────────────┤
│                 Your Application                      │
└──────────────────────────────────────────────────────┘
```

## Components

### Framework

The framework is the core of Flightdeck, built on top of two key infrastructure components:

- **Apache Kafka** — Serves as the base infrastructure layer. Kafka provides durable, ordered message delivery between agents. All inter-agent communication flows through Kafka topics, enabling decoupled, asynchronous workflows with full replay capability and horizontal scaling of consumers.

- **Kafka Streams** — Acts as the processing and temporary storage layer. Kafka Streams handles stateful operations like agent state management, task routing, and intermediate result storage — all without requiring an external database. State is backed by Kafka's changelog topics, making it fault-tolerant and recoverable by default.

Together, these layers manage the lifecycle of agents and tasks, handling execution order, inter-agent communication, and error recovery. The framework supports multiple execution strategies:

- **Sequential** — Tasks run one after another in a defined order
- **Parallel** — Independent tasks run concurrently
- **Hierarchical** — A manager agent delegates and coordinates work across the team
- **Conditional** — Tasks are routed dynamically based on agent outputs

### Agents

Each agent is an autonomous unit with a specific role, goal, and set of tools. Agents are backed by an LLM of your choice and can be mixed and matched across providers within a single workflow. See [Tools](/docs/concepts/tools) for details.

### Task Router

The task router directs work to the right agent based on the execution strategy. In sequential mode it follows the defined order. In hierarchical mode a manager agent makes routing decisions. The router also handles context passing — forwarding outputs from upstream tasks as inputs to downstream ones.

### State Management

Flightdeck persists execution state at each step so workflows can recover from failures:

- **Checkpointing** — Agent progress is saved after each completed step
- **Queue management** — Tasks are tracked in durable queues so nothing is lost if a process crashes
- **Recovery** — Failed workflows resume from the last successful checkpoint, not from the beginning

### Tools

Tools are the interface between agents and the outside world — APIs, databases, file systems, code execution, and any custom function. See [Tools](/docs/concepts/tools) for details.

### Observability

Every action in the system is instrumented:

- **Execution traces** — Full record of every LLM call, tool invocation, and routing decision
- **Cost tracking** — Token usage and estimated spend per agent, per task, and per workflow
- **Structured logs** — Correlated, leveled logs across all components
- **User feedback** — End-user ratings tied back to specific agent runs

### Message Broker

Flightdeck uses a message broker (such as Apache Kafka) as the backbone for inter-agent communication and event-driven workflows. This enables:

- Decoupled, asynchronous communication between agents
- Durable message delivery with replay capability
- Horizontal scaling of agent consumers
- Event sourcing for full auditability of the system

## Data Flow

1. Your application submits a request to the framework
2. The framework creates tasks and assigns them to agents via the task router
3. Agents execute their work — calling LLMs and tools as needed
4. State is checkpointed after each step
5. Agent outputs flow to downstream tasks through the message broker
6. The framework collects results and returns the final output
7. Traces, costs, and logs are emitted throughout for full observability
