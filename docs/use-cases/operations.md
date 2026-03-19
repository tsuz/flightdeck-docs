---
sidebar_position: 1
---

# Operations

Use Flightdeck to build AI-powered operations agents that monitor, triage, and respond to incidents across your infrastructure.

## Overview

Operations teams deal with a constant stream of alerts, logs, and metrics. An operations agent can automate the repetitive parts — triaging alerts, correlating signals, running diagnostics, and escalating when human intervention is needed.

## How It Works

```
Alert fires (e.g. PagerDuty, Datadog)
        │
        ▼
┌──────────────────┐
│  Triage Agent     │  ← Classifies severity, deduplicates, enriches context
│  (Think + Tools)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Diagnosis Agent  │  ← Queries logs, metrics, and runbooks
│  (Think + Tools)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Response Agent   │  ← Executes remediation or escalates to on-call
│  (Think + Tools)  │
└──────────────────┘
```

## Example Workflow

1. **Triage Agent** receives an alert, checks for duplicates, pulls recent related alerts, and classifies severity
2. **Diagnosis Agent** queries log aggregation (e.g. Elasticsearch, CloudWatch), checks dashboards, and cross-references known issues in the runbook
3. **Response Agent** decides on action — restart a service, scale up resources, roll back a deploy, or page the on-call engineer with a summary

## Tools Involved

- Alert APIs (PagerDuty, Opsgenie)
- Log and metrics queries (Datadog, Grafana, CloudWatch)
- Infrastructure actions (Kubernetes API, AWS CLI, Terraform)
- Communication (Slack, email for escalation)
- Runbook / knowledge base lookup

## Why Flightdeck

- **Kafka backbone** ensures alerts are never lost, even during agent restarts
- **State management** tracks ongoing incidents across multiple agent interactions
- **Audit trail** records every decision and action for post-incident review
- **Cost control** prevents runaway LLM usage during alert storms
