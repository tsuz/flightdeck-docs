---
sidebar_position: 1
---

# Python

A custom Think consumer in Python using the Flightdeck SDK.

## Example

```python
# app.py
from sdk.tool_consumer_runner import ToolConsumerRunner, ToolConsumerConfig


def do_work(payload: str) -> str:
    # business logic here
    return f"processed: {payload}"


def process(key: str | None, value: str | None, ctx) -> None:
    try:
        print(f"Processing: {key}")
        result = do_work(value)
        print(f"Result: {result}")

        ctx.ack()
    except Exception as e:
        ctx.error(str(e))


runner = ToolConsumerRunner(
    ToolConsumerConfig(
        brokers="localhost:9092",
        group_id="my-tool-group",
        input_topic="tool-requests",
        dlq_topic="tool-requests-dlq",
        process_fn=process,
    )
)

runner.start()
```

## How It Works

1. **`ToolConsumerRunner`** connects to Kafka and listens on the `input_topic` for incoming messages
2. **`process_fn`** is called for each message with the key, value, and a context object
3. Your business logic runs inside `do_work` — call an LLM, query a database, hit an API, or anything else
4. **`ctx.ack()`** acknowledges the message and sends the result to the output topic
5. **`ctx.error()`** sends the message to the `dlq_topic` (dead letter queue) for failed processing

## Configuration

| Parameter | Description |
|---|---|
| `brokers` | Kafka broker addresses |
| `group_id` | Consumer group ID |
| `input_topic` | Kafka topic to read messages from |
| `dlq_topic` | Dead letter queue topic for failed messages |
| `process_fn` | Your processing function |
