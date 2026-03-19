---
sidebar_position: 2
---

# Refund

Use Flightdeck to build AI agents that handle customer refund requests end-to-end — from intake to resolution.

## Overview

Refund processing involves multiple steps: verifying the purchase, checking refund eligibility against business rules, processing the refund, and communicating the outcome. An agent workflow can handle this autonomously while keeping humans in the loop for edge cases.

## How It Works

```
Customer requests a refund
        │
        ▼
┌──────────────────┐
│  Intake Agent     │  ← Extracts order details, verifies identity
│  (Think + Tools)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Policy Agent     │  ← Checks eligibility against refund policy
│  (Think + Tools)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Processing Agent │  ← Executes refund or escalates to human
│  (Think + Tools)  │
└──────────────────┘
```

## Example Workflow

1. **Intake Agent** extracts the order ID from the customer message, looks up the order in the database, and verifies the customer's identity
2. **Policy Agent** checks the refund policy — is the item within the return window? Is it eligible for a full or partial refund? Are there prior refund claims on this account?
3. **Processing Agent** issues the refund through the payment provider, updates the order status, and sends a confirmation to the customer. If the case is ambiguous, it escalates to a human reviewer with a summary

## Tools Involved

- Order management system (database queries)
- Payment provider API (Stripe, PayPal)
- Customer identity verification
- Refund policy rules engine
- Communication (email, chat for customer updates)
- Escalation (ticketing system for human review)

## Why Flightdeck

- **Reliable delivery** ensures no refund request is dropped, even under high volume
- **State checkpointing** means a refund in progress can resume after failures without double-processing
- **Audit trail** provides a complete record of every decision for compliance and dispute resolution
- **Business logic separation** lets the policy team update refund rules without touching infrastructure code
