---
sidebar_position: 1
---

# Python

A tool function consumer in Python using the Flightdeck SDK. The developer only writes processing logic and calls `ctx.success()` or `ctx.error()`.

## Example

```python
import json
from flightdeck_sdk import ToolConsumerRunner, ToolConsumerConfig


def lookup_order(order_id: str) -> dict:
    # business logic — call a database, API, etc.
    return {"order_id": order_id, "status": "shipped", "eta": "2026-03-23"}


def process(key: str | None, value: str | None, ctx) -> None:
    try:
        request = json.loads(value)
        tool_name = request["name"]
        tool_input = request["input"]

        if tool_name == "lookup_order":
            result = lookup_order(tool_input["order_id"])
            ctx.success(result)
        else:
            ctx.error(f"Unknown tool: {tool_name}")

    except Exception as e:
        ctx.error(str(e))


if __name__ == "__main__":
    runner = ToolConsumerRunner(
        ToolConsumerConfig(
            agent_name="order-agent",
            brokers="localhost:9092",
            process_fn=process,
        )
    )

    runner.start()
```

## How It Works

1. **`ToolConsumerRunner`** connects to Kafka and listens for tool call messages based on the `agent_name`
2. **`process_fn`** is called for each message with the key, value, and a context object
3. Parse the request to get `name` and `input`, then route to the correct business logic function
4. **`ctx.success()`** sends the result back so the Think layer can continue
5. **`ctx.error()`** reports a failure for the tool call
