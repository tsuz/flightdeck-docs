---
sidebar_position: 2
---

# Go

A custom Think consumer in Go using the Anthropic SDK and kafka-go.

## Example

```go
package main

import (
	"context"
	"encoding/json"
	"log"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/segmentio/kafka-go"
)

const agentName = "my-agent"

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type Payload struct {
	SessionID     string    `json:"session_id"`
	UserID        string    `json:"user_id"`
	History       []Message `json:"history"`
	LatestInput   Message   `json:"latest_input"`
	MemoirContext string    `json:"memoir_context"`
	Timestamp     string    `json:"timestamp"`
}

func main() {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers: []string{"localhost:9092"},
		Topic:   agentName + "-think",
		GroupID: agentName + "-think-group",
	})
	writer := &kafka.Writer{
		Addr:  kafka.TCP("localhost:9092"),
		Topic: agentName + "-think-result",
	}
	client := anthropic.NewClient()

	for {
		msg, err := reader.ReadMessage(context.Background())
		if err != nil {
			log.Fatal(err)
		}

		var payload Payload
		json.Unmarshal(msg.Value, &payload)

		// Build messages from history + latest input
		var messages []anthropic.MessageParam
		for _, m := range payload.History {
			if m.Role == "user" {
				messages = append(messages, anthropic.NewUserMessage(
					anthropic.NewTextBlock(m.Content),
				))
			} else {
				messages = append(messages, anthropic.NewAssistantMessage(
					anthropic.NewTextBlock(m.Content),
				))
			}
		}
		messages = append(messages, anthropic.NewUserMessage(
			anthropic.NewTextBlock(payload.LatestInput.Content),
		))

		// Build system prompt
		system := "You are a helpful assistant. Be concise."
		if payload.MemoirContext != "" {
			system += "\n\nUser context: " + payload.MemoirContext
		}

		// Call Claude
		response, err := client.Messages.New(context.Background(), anthropic.MessageNewParams{
			Model:     anthropic.ModelClaudeSonnet4_6,
			MaxTokens: 4096,
			System:    []anthropic.TextBlockParam{{Text: system}},
			Messages:  messages,
		})
		if err != nil {
			log.Printf("LLM error: %v", err)
			continue
		}

		result, _ := json.Marshal(map[string]string{
			"session_id": payload.SessionID,
			"user_id":    payload.UserID,
			"content":    response.Content[0].Text,
			"timestamp":  payload.Timestamp,
		})

		writer.WriteMessages(context.Background(), kafka.Message{
			Value: result,
		})
	}
}
```
