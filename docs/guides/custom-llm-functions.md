---
sidebar_position: 0
---

# Building Custom LLM Functions

Flightdeck lets you define custom functions that agents can call during execution. These functions are invoked by consumers when the LLM requests a tool call, and can interact with any external service — databases, APIs, file systems, or other internal services.

This guide shows how to build custom LLM functions in each supported language.

## Go

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/flightdeck/flightdeck-go/agent"
)

// Define the function input schema
type SendEmailInput struct {
	To      string `json:"to" description:"Recipient email address"`
	Subject string `json:"subject" description:"Email subject line"`
	Body    string `json:"body" description:"Email body content"`
}

// Define the function
func SendEmail(ctx context.Context, input SendEmailInput) (string, error) {
	// Call your email service here
	fmt.Printf("Sending email to %s: %s\n", input.To, input.Subject)

	return fmt.Sprintf("Email sent to %s", input.To), nil
}

func main() {
	a := agent.New(agent.Config{
		Model: "claude-sonnet-4-6",
	})

	// Register the function
	a.RegisterFunction("send_email", agent.Function{
		Description: "Send an email to a recipient",
		Handler:     SendEmail,
	})

	// Run the agent
	result, err := a.Run(context.Background(), "Send a welcome email to user@example.com")
	if err != nil {
		panic(err)
	}
	fmt.Println(result)
}
```

## Python

```python
from flightdeck import Agent
from flightdeck.tools import tool

@tool("Send Email")
def send_email(to: str, subject: str, body: str) -> str:
    """Send an email to a recipient.

    Args:
        to: Recipient email address
        subject: Email subject line
        body: Email body content
    """
    # Call your email service here
    print(f"Sending email to {to}: {subject}")

    return f"Email sent to {to}"


agent = Agent(
    role="Assistant",
    goal="Help users with tasks",
    model="claude-sonnet-4-6",
    tools=[send_email],
)

result = agent.run("Send a welcome email to user@example.com")
print(result)
```

## TypeScript

```typescript
import { Agent, defineTool } from "@flightdeck/sdk";
import { z } from "zod";

// Define the function with a Zod schema
const sendEmail = defineTool({
  name: "send_email",
  description: "Send an email to a recipient",
  schema: z.object({
    to: z.string().describe("Recipient email address"),
    subject: z.string().describe("Email subject line"),
    body: z.string().describe("Email body content"),
  }),
  handler: async ({ to, subject, body }) => {
    // Call your email service here
    console.log(`Sending email to ${to}: ${subject}`);

    return `Email sent to ${to}`;
  },
});

const agent = new Agent({
  model: "claude-sonnet-4-6",
  tools: [sendEmail],
});

const result = await agent.run("Send a welcome email to user@example.com");
console.log(result);
```

## Java

```java
package com.example;

import io.flightdeck.Agent;
import io.flightdeck.AgentConfig;
import io.flightdeck.tools.Tool;
import io.flightdeck.tools.ToolParam;

public class Main {

    // Define the function as an annotated method
    @Tool(
        name = "send_email",
        description = "Send an email to a recipient"
    )
    public static String sendEmail(
        @ToolParam(description = "Recipient email address") String to,
        @ToolParam(description = "Email subject line") String subject,
        @ToolParam(description = "Email body content") String body
    ) {
        // Call your email service here
        System.out.printf("Sending email to %s: %s%n", to, subject);

        return String.format("Email sent to %s", to);
    }

    public static void main(String[] args) {
        Agent agent = Agent.builder()
            .model("claude-sonnet-4-6")
            .tool(Main.class, "sendEmail")
            .build();

        String result = agent.run("Send a welcome email to user@example.com");
        System.out.println(result);
    }
}
```
