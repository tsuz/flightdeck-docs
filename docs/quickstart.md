---
sidebar_position: 2
---

# Quickstart

Get a multi-agent system running in under 5 minutes.

## Prerequisites

- [Git](https://git-scm.com/downloads)
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A Claude API key from [Anthropic](https://console.anthropic.com/)

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/tsuz/ai-agent-orchestration-kafka-example.git
cd ai-agent-orchestration-kafka-example

# 2. Create your .env file
cp .env.example .env
# Edit .env and add your CLAUDE_API_KEY

# 3. Start all services
docker compose up --build
```

## Try It Out

Once all services are running, open [http://localhost:80](http://localhost:80) in your browser and type in the chat:

```
Hi can I send an email?
```

## What's Next?

- [Agents](/docs/concepts/agents) — Learn how agents work in depth
- [Tasks](/docs/concepts/tasks) — Understand task configuration and dependencies
- [Crews](/docs/concepts/crews) — Orchestrate agents into workflows
- [Tools](/docs/concepts/tools) — Connect agents to external capabilities
