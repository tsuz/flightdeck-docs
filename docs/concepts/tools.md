---
sidebar_position: 3
---

# Tools

Tools are the layer that performs actions, directed by the LLM. When the LLM decides an action is needed, it calls a tool. The tool executes the action — querying a database, calling an API, sending an email — and the results are posted to the next step in the workflow.

## Important

Tools must exist in **both** layers to work:

1. **When calling the LLM** — The tool definition (name, description, input schema) must be provided to the LLM so it knows the tool is available and can decide when to use it. Without this, the LLM has no way to direct the action.

You provide tool definitions to the Think layer via the **`TOOLS_JSON_FILE`** environment variable. Set it to the path of a JSON file that contains all your tool definitions:

```bash
TOOLS_JSON_FILE=./tools.json
```

Here's an example of what that file looks like:

```json
[
  {
    "name": "web_search",
    "description": "Search the web for current information on a topic.",
    "prompt_context": "You are a research assistant. When the user asks a question that requires up-to-date information, use the web_search tool to find relevant results.",
    "category": "research",
    "input_schema": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "The search query"
        }
      },
      "required": ["query"]
    }
  },
  {
    "name": "send_email",
    "description": "Send an email to a recipient.",
    "prompt_context": "When the user asks to send an email, extract the recipient, subject, and body. Ask for confirmation before sending.",
    "category": "email",
    "input_schema": {
      "type": "object",
      "properties": {
        "to": {
          "type": "string",
          "description": "Recipient email address"
        },
        "subject": {
          "type": "string",
          "description": "Email subject line"
        },
        "body": {
          "type": "string",
          "description": "Email body content"
        }
      },
      "required": ["to", "subject", "body"]
    }
  }
]
```

The Think layer reads this file at startup and includes the tool definitions in every LLM call so the model knows what actions are available.

2. **In the Tools execution function** — The corresponding execution function must exist in your consumer so there is actual code to run when the LLM calls the tool. If the LLM directs a call to a function that doesn't exist, the call will fail.

   The execution function receives a payload like this from the Think layer:

   ```json
   {
     "session_id": "session-20260320-143022",
     "user_id": "user-alice",
     "tool_name": "send_email",
     "tool_input": {
       "to": "john@example.com",
       "subject": "Meeting tomorrow",
       "body": "Hi John, just confirming our meeting tomorrow at 10am."
     },
     "timestamp": "2026-03-20T14:31:12Z"
   }
   ```

   Your execution function then runs the actual API call (e.g., sends the email), and sends the result to the Kafka topic `AGENT_NAME + "-tool-use-result"`. This is how the result flows back to the Think layer for the next reasoning step.

The tool definition tells the LLM *what it can do*. The execution function defines *what actually happens*. Both must be present, and the `name` field is what connects them.

## Tool Payload Structure

Every tool is defined with the following fields:

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Unique identifier for the tool. Must match the execution function name. |
| `description` | `string` | Short description of what the tool does. The LLM reads this to decide when to use the tool. |
| `prompt_context` | `string` | Instructions that guide the agent's behavior when this tool is relevant. This shapes how the agent reasons about using the tool. |
| `category` | `string` | Logical grouping for organizing tools (e.g., `"email"`, `"research"`, `"scheduling"`). |
| `input_schema` | `object` | JSON Schema defining the expected input parameters — types, descriptions, and which fields are required. |

### Why This Structure?

- **`name`** links the tool definition to its execution function. When the LLM outputs a tool call with `"name": "send_email"`, Flightdeck routes it to the `send_email` execution function in your consumer.
- **`description`** is what the LLM sees when deciding *which* tool to use. Keep it concise and specific.
- **`prompt_context`** gives the agent behavioral instructions specific to this tool — how to extract parameters from the user's message, what to confirm before acting, and how to present results. This is injected into the agent's prompt when the tool is available.
- **`input_schema`** ensures the LLM produces structured, validated input. Required fields prevent incomplete tool calls. Descriptions on each property help the LLM map user intent to the correct parameters.

## Examples

### Web Search

```json
{
  "name": "web_search",
  "description": "Search the web for current information on a topic.",
  "prompt_context": "You are a research assistant. When the user asks a question that requires up-to-date information, use the web_search tool to find relevant results. Summarize the findings concisely and cite your sources. For weather-related queries, include temperature, conditions, and forecasts.",
  "category": "research",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The search query"
      }
    },
    "required": ["query"]
  }
}
```

### Lookup Contacts

```json
{
  "name": "lookup_contacts",
  "description": "Look up contact information for a person by name or email.",
  "prompt_context": "You are a contacts lookup assistant. When the user asks about a person's contact information, use the lookup_contacts tool to find their details. Present the results clearly including name, email, and phone number if available.",
  "category": "contacts",
  "input_schema": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "The name of the person to look up"
      },
      "email": {
        "type": "string",
        "description": "The email of the person to look up"
      }
    },
    "required": []
  }
}
```

### Schedule Meeting

```json
{
  "name": "schedule_meeting",
  "description": "Schedule a meeting with participants at a given time.",
  "prompt_context": "You are a helpful assistant that schedules meetings. When the user asks to set up a meeting, extract the participants, preferred time, and duration. Use the schedule_meeting tool to book it. Always confirm the details before scheduling.",
  "category": "scheduling",
  "input_schema": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "description": "Meeting title"
      },
      "participants": {
        "type": "array",
        "items": { "type": "string" },
        "description": "List of participant emails"
      },
      "start_time": {
        "type": "string",
        "description": "ISO 8601 start time"
      },
      "duration_minutes": {
        "type": "integer",
        "description": "Duration in minutes"
      }
    },
    "required": ["title", "participants", "start_time", "duration_minutes"]
  }
}
```

### Send Email

```json
{
  "name": "send_email",
  "description": "Send an email to a recipient.",
  "prompt_context": "You are an email drafting assistant. When the user asks to send an email, help them compose a clear and professional message. Extract the recipient, subject, and body. Use the send_email tool to deliver it. Ask for confirmation before sending.",
  "category": "email",
  "input_schema": {
    "type": "object",
    "properties": {
      "to": {
        "type": "string",
        "description": "Recipient email address"
      },
      "subject": {
        "type": "string",
        "description": "Email subject line"
      },
      "body": {
        "type": "string",
        "description": "Email body content"
      }
    },
    "required": ["to", "subject", "body"]
  }
}
```

### Create Task

```json
{
  "name": "create_task",
  "description": "Create a task or to-do item.",
  "prompt_context": "You are a task management assistant. When the user wants to create a task or to-do item, extract the title, description, due date, and priority. Use the create_task tool. Default priority is medium if not specified.",
  "category": "tasks",
  "input_schema": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "description": "Task title"
      },
      "description": {
        "type": "string",
        "description": "Task description"
      },
      "due_date": {
        "type": "string",
        "description": "Due date in ISO 8601 format"
      },
      "priority": {
        "type": "string",
        "enum": ["low", "medium", "high"],
        "description": "Task priority"
      }
    },
    "required": ["title"]
  }
}
```

## Connecting to Execution Functions

Each tool payload must have a corresponding execution function in your consumer. The `name` field is the link — when the LLM calls a tool, Flightdeck matches the name to the function and passes the validated input.

For example, the `send_email` tool payload above maps to this execution function:

```python
@tool("send_email")
def send_email(to: str, subject: str, body: str) -> str:
    """Send an email to a recipient."""
    # Your email sending logic here
    smtp.send(to=to, subject=subject, body=body)
    return f"Email sent to {to}"
```

```go
func SendEmail(ctx context.Context, input SendEmailInput) (string, error) {
    // Your email sending logic here
    err := smtp.Send(input.To, input.Subject, input.Body)
    if err != nil {
        return "", err
    }
    return fmt.Sprintf("Email sent to %s", input.To), nil
}
```

The function parameters must match the `input_schema` properties. Flightdeck validates the LLM's output against the schema before calling your function, so you can trust that required fields are present and types are correct.
