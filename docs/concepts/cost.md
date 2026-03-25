---
sidebar_position: 4
---

# Cost

Cost tracking gives you visibility into how much each call and session spends on LLM tokens. Flightdeck tracks usage at every level — input tokens, output tokens, and calculated dollar cost.

## How It Works

Every LLM call made through the Think layer records input and output token counts. Flightdeck aggregates these counts per call and per session, and then multiplies by the model's token pricing to produce a dollar cost. The generated cost value is then joined with the session's input message, which gets evaluated at the Think component.

## Calculation

The developer needs to provide `INPUT_TOKEN_PRICE` and `OUTPUT_TOKEN_PRICE` environment variables, which are used to calculate the pricing based on the input and output token counts. The pricing is per million tokens. If these are not provided, the price is set to `null`.

```bash
INPUT_TOKEN_PRICE=1 # $1/million tokens
OUTPUT_TOKEN_PRICE=5 # $5/million tokens
```

Note that the price calculation includes decimal places, so it may have some floating point errors.

## Budgeting

The developer can set the `BUDGET_PRICE_PER_SESSION` environment variable to limit usage by pricing per session. When the session's cumulative cost surpasses this limit, Flightdeck detects it and stops the session. If not provided, the default is unlimited usage. `INPUT_TOKEN_PRICE` and `OUTPUT_TOKEN_PRICE` are required for `BUDGET_PRICE_PER_SESSION` to work.

The following example ends the session if the total cost exceeds $5:

```bash
BUDGET_PRICE_PER_SESSION=5.00
```

The session ends when:

```
sum(input tokens) × INPUT_TOKEN_PRICE + sum(output tokens) × OUTPUT_TOKEN_PRICE >= BUDGET_PRICE_PER_SESSION
```

## Viewing Costs

Cost data can be viewed in the frontend UI.
