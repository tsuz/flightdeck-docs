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

2. **In the Tools execution function** — The corresponding execution function must exist in your consumer so there is actual code to run when the LLM calls the tool. If the LLM directs a call to a function that doesn't exist, the call will fail. See the [Building Custom Tool Functions](/docs/guides/custom-tools) guide on how to implement this.

The tool definition tells the LLM *what it can do*. The execution function defines *what actually happens*. Both must be present, and the `name` field is what connects them.

