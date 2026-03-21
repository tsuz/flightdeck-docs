---
sidebar_position: 3
---

# TypeScript

A custom Think consumer in TypeScript using the Anthropic SDK and KafkaJS.

## Example

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { Kafka } from "kafkajs";

const AGENT_NAME = "my-agent";

const kafka = new Kafka({ brokers: ["localhost:9092"] });
const consumer = kafka.consumer({ groupId: `${AGENT_NAME}-think-group` });
const producer = kafka.producer();
const client = new Anthropic();

await consumer.connect();
await producer.connect();
await consumer.subscribe({ topic: `${AGENT_NAME}-think` });

await consumer.run({
  eachMessage: async ({ message }) => {
    const payload = JSON.parse(message.value!.toString());

    // Build messages from history + latest input
    const messages = payload.history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));
    messages.push({
      role: payload.latest_input.role,
      content: payload.latest_input.content,
    });

    // Build system prompt
    let system = "You are a helpful assistant. Be concise.";
    if (payload.memoir_context) {
      system += `\n\nUser context: ${payload.memoir_context}`;
    }

    // Call Claude
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system,
      messages,
    });

    await producer.send({
      topic: `${AGENT_NAME}-think-result`,
      messages: [
        {
          value: JSON.stringify({
            session_id: payload.session_id,
            user_id: payload.user_id,
            content: response.content[0].text,
            timestamp: payload.timestamp,
          }),
        },
      ],
    });
  },
});
```
