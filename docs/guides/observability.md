---
sidebar_position: 3
---

# Observability & Tracing

Monitor, debug, and optimize your multi-agent workflows.

## Verbose Mode

The simplest way to see what's happening:

```python
crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, writing_task],
    verbose=True,
)
```

Output:
```
[Researcher] Starting task: Research the topic
[Researcher] Using tool: WebSearchTool("AI agent frameworks 2026")
[Researcher] Tool result: Found 10 results...
[Researcher] Thinking: Let me search for more specific information...
[Researcher] Using tool: WebSearchTool("flightdeck vs crewai comparison")
[Researcher] Task complete (3 steps, 2,450 tokens)
[Writer] Starting task: Write an article
[Writer] Task complete (1 step, 1,890 tokens)
Crew finished. Total: 4,340 tokens, $0.0312
```

## Execution Traces

Get structured trace data for programmatic analysis:

```python
result = crew.run()

# Access the trace
for step in result.trace.steps:
    print(f"Agent: {step.agent}")
    print(f"Action: {step.action}")
    print(f"Input: {step.input[:100]}")
    print(f"Output: {step.output[:100]}")
    print(f"Tokens: {step.token_usage}")
    print(f"Duration: {step.duration_ms}ms")
    print("---")
```

## Token Usage Tracking

```python
result = crew.run()

usage = result.token_usage
print(f"Prompt tokens:     {usage.prompt_tokens}")
print(f"Completion tokens: {usage.completion_tokens}")
print(f"Total tokens:      {usage.total}")
print(f"Estimated cost:    ${usage.estimated_cost:.4f}")

# Per-agent breakdown
for agent_id, agent_usage in usage.by_agent.items():
    print(f"  {agent_id}: {agent_usage.total} tokens (${agent_usage.estimated_cost:.4f})")
```

## OpenTelemetry Integration

Export traces to any OpenTelemetry-compatible backend:

```python
from flightdeck.telemetry import configure_otel

configure_otel(
    service_name="my-agent-app",
    endpoint="http://localhost:4317",  # OTLP endpoint
)

# All crew executions are now traced
crew = Crew(agents=[researcher, writer], tasks=[research_task, writing_task])
result = crew.run()  # Traces exported automatically
```

### Environment Variable Configuration

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317"
export OTEL_SERVICE_NAME="my-agent-app"
export FLIGHTDECK_TRACE_ENABLED="true"
```

## Logging

Flightdeck uses Python's standard logging:

```python
import logging

# See all Flightdeck logs
logging.getLogger("flightdeck").setLevel(logging.DEBUG)

# Or just specific components
logging.getLogger("flightdeck.agents").setLevel(logging.INFO)
logging.getLogger("flightdeck.tools").setLevel(logging.DEBUG)
```

## Custom Callbacks

Build custom monitoring with callbacks:

```python
from flightdeck.callbacks import BaseCallback

class MetricsCallback(BaseCallback):
    def on_crew_start(self, crew):
        self.start_time = time.time()

    def on_task_start(self, task):
        print(f"Starting: {task.description[:50]}...")

    def on_task_end(self, task, result):
        print(f"Completed: {task.description[:50]} ({result.token_usage.total} tokens)")

    def on_tool_use(self, agent, tool_name, tool_input):
        print(f"[{agent.role}] Using {tool_name}")

    def on_crew_end(self, crew, result):
        elapsed = time.time() - self.start_time
        print(f"Crew finished in {elapsed:.1f}s")

crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, writing_task],
    callbacks=[MetricsCallback()],
)
```
