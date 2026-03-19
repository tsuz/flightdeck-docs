---
sidebar_position: 10
---

# Contributing

We welcome contributions to Flightdeck! Here's how to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/flightdeck/flightdeck.git
cd flightdeck

# Create a virtual environment
python -m venv .venv
source .venv/bin/activate

# Install in development mode
pip install -e ".[dev]"

# Run tests
pytest

# Run linting
ruff check .
ruff format .
```

## Project Structure

```
flightdeck/
├── flightdeck/
│   ├── __init__.py          # Public API
│   ├── agent.py             # Agent implementation
│   ├── crew.py              # Crew orchestration
│   ├── task.py              # Task definition
│   ├── router.py            # Router pattern
│   ├── tools/               # Built-in tools
│   │   ├── __init__.py
│   │   ├── base.py          # BaseTool class
│   │   ├── decorator.py     # @tool decorator
│   │   ├── web_search.py
│   │   ├── file_tools.py
│   │   └── code_interpreter.py
│   ├── memory/              # Memory backends
│   ├── telemetry/           # Tracing & metrics
│   ├── providers/           # LLM provider integrations
│   └── callbacks/           # Callback system
├── tests/
├── docs/
├── examples/
├── pyproject.toml
└── README.md
```

## Making Changes

1. **Fork** the repository and create a branch from `main`
2. **Write tests** for any new functionality
3. **Run the test suite** to make sure nothing is broken: `pytest`
4. **Format your code**: `ruff format .`
5. **Submit a pull request** with a clear description of your changes

## Reporting Issues

Open an issue on GitHub with:
- Flightdeck version (`flightdeck --version`)
- Python version (`python --version`)
- A minimal reproducible example
- Expected vs actual behavior
