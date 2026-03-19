---
sidebar_position: 1
---

# API Reference

Complete API reference for the Flightdeck Python SDK.

## `flightdeck.Agent`

```python
class Agent(
    role: str,
    goal: str,
    backstory: str = "",
    model: str = None,
    tools: list[Tool] = [],
    memory: bool = True,
    max_iterations: int = 25,
    max_tokens: int = 4096,
    temperature: float = 0.7,
    verbose: bool = False,
    callbacks: list[BaseCallback] = [],
)
```

### Methods

#### `agent.run(prompt: str) -> str`
Execute a single prompt and return the result.

#### `await agent.arun(prompt: str) -> str`
Async version of `run`.

---

## `flightdeck.Task`

```python
class Task(
    description: str,
    agent: Agent,
    expected_output: str = None,
    context: list[Task] = [],
    output_file: str = None,
    output_json: type[BaseModel] = None,
    async_execution: bool = False,
    timeout: int = None,
)
```

### Properties

#### `task.output -> TaskOutput`
Access the task result after execution.

#### `task.output.raw -> str`
Raw string output.

#### `task.output.json -> BaseModel`
Parsed output (when `output_json` is set).

---

## `flightdeck.Crew`

```python
class Crew(
    agents: list[Agent],
    tasks: list[Task],
    process: Process = Process.sequential,
    verbose: bool = False,
    max_rpm: int = None,
    memory: bool = False,
    planning: bool = False,
    manager_model: str = None,
    callbacks: list[BaseCallback] = [],
    iterate_until: Callable = None,
    max_iterations: int = 1,
)
```

### Methods

#### `crew.run(inputs: dict = {}) -> CrewResult`
Execute all tasks and return the result.

#### `await crew.arun(inputs: dict = {}) -> CrewResult`
Async version of `run`.

#### `Crew.from_yaml(agents_config: str, tasks_config: str) -> Crew`
Load crew configuration from YAML files.

---

## `flightdeck.CrewResult`

```python
class CrewResult:
    final_output: str           # Output of the last task
    tasks: list[TaskResult]     # Individual task results
    token_usage: TokenUsage     # Aggregated token usage
    trace: Trace                # Execution trace
```

---

## `flightdeck.TokenUsage`

```python
class TokenUsage:
    prompt_tokens: int
    completion_tokens: int
    total: int
    estimated_cost: float
    by_agent: dict[str, TokenUsage]
```

---

## `flightdeck.Process`

```python
class Process(Enum):
    sequential = "sequential"
    hierarchical = "hierarchical"
```

---

## `flightdeck.Router`

```python
class Router(
    agents: dict[str, Agent],
    classifier_model: str = "claude-haiku-4-5",
)
```

### Methods

#### `router.route(input: str) -> str`
Classify the input and route to the appropriate agent.

---

## `flightdeck.tools.tool`

```python
@tool(name: str, cache: bool = False)
def my_tool(param: str) -> str:
    """Tool description for the LLM."""
    ...
```

---

## `flightdeck.tools.BaseTool`

```python
class BaseTool:
    name: str
    description: str
    args_schema: type[BaseModel] = None

    def _run(self, **kwargs) -> str: ...
    async def _arun(self, **kwargs) -> str: ...
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Anthropic API key |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `GOOGLE_API_KEY` | — | Google AI API key |
| `FLIGHTDECK_DEFAULT_MODEL` | `claude-sonnet-4-6` | Default model for agents |
| `FLIGHTDECK_LOG_LEVEL` | `WARNING` | Log level |
| `FLIGHTDECK_TRACE_ENABLED` | `false` | Enable execution tracing |
| `FLIGHTDECK_MAX_RETRIES` | `3` | Max retries on LLM failures |
