---
sidebar_position: 4
---

# Java

A custom Think consumer in Java using the Anthropic SDK and Apache Kafka client.

## Example

```java
package com.example;

import com.anthropic.AnthropicClient;
import com.anthropic.models.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.clients.producer.*;

import java.time.Duration;
import java.util.*;

public class ThinkConsumer {

    private static final String AGENT_NAME = "my-agent";
    private static final ObjectMapper mapper = new ObjectMapper();

    public static void main(String[] args) {
        // Kafka consumer setup
        Properties consumerProps = new Properties();
        consumerProps.put("bootstrap.servers", "localhost:9092");
        consumerProps.put("group.id", AGENT_NAME + "-think-group");
        consumerProps.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
        consumerProps.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");

        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(consumerProps);
        consumer.subscribe(List.of(AGENT_NAME + "-think"));

        // Kafka producer setup
        Properties producerProps = new Properties();
        producerProps.put("bootstrap.servers", "localhost:9092");
        producerProps.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        producerProps.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");

        KafkaProducer<String, String> producer = new KafkaProducer<>(producerProps);

        // Anthropic client
        AnthropicClient client = AnthropicClient.builder().build();

        while (true) {
            ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));

            for (ConsumerRecord<String, String> record : records) {
                try {
                    JsonNode payload = mapper.readTree(record.value());

                    // Build messages from history + latest input
                    List<MessageParam> messages = new ArrayList<>();
                    for (JsonNode msg : payload.get("history")) {
                        String role = msg.get("role").asText();
                        String content = msg.get("content").asText();
                        if ("user".equals(role)) {
                            messages.add(MessageParam.ofUser(content));
                        } else {
                            messages.add(MessageParam.ofAssistant(content));
                        }
                    }
                    JsonNode latestInput = payload.get("latest_input");
                    messages.add(MessageParam.ofUser(latestInput.get("content").asText()));

                    // Build system prompt
                    String system = "You are a helpful assistant. Be concise.";
                    if (payload.has("memoir_context") && !payload.get("memoir_context").isNull()) {
                        system += "\n\nUser context: " + payload.get("memoir_context").asText();
                    }

                    // Call Claude
                    MessageCreateParams params = MessageCreateParams.builder()
                        .model("claude-sonnet-4-6")
                        .maxTokens(4096)
                        .system(system)
                        .messages(messages)
                        .build();

                    Message response = client.messages().create(params);
                    String responseText = response.content().get(0).text();

                    // Send result
                    Map<String, String> result = Map.of(
                        "session_id", payload.get("session_id").asText(),
                        "user_id", payload.get("user_id").asText(),
                        "content", responseText,
                        "timestamp", payload.get("timestamp").asText()
                    );

                    producer.send(new ProducerRecord<>(
                        AGENT_NAME + "-think-result",
                        mapper.writeValueAsString(result)
                    ));

                } catch (Exception e) {
                    System.err.println("Error processing message: " + e.getMessage());
                }
            }
        }
    }
}
```
