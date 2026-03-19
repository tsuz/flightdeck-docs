---
sidebar_position: 4
---

# Tools

**Tools** give agents the ability to interact with the outside world — search the web, read files, call APIs, execute code, and more.

## Built-in Tools

Flightdeck ships with commonly used tools:

| Tool | Description |
|---|---|
| `WebSearchTool` | Search the web via Google/Bing |
| `FileReadTool` | Read files from the filesystem |
| `FileWriteTool` | Write files to the filesystem |
| `CodeInterpreterTool` | Execute Python code in a sandbox |
| `HTTPTool` | Make HTTP requests to APIs |
| `SQLTool` | Query SQL databases |
| `PDFReaderTool` | Extract text from PDF files |
| `JSONSearchTool` | Search and query JSON data |

```python
from flightdeck import Agent
from flightdeck.tools import WebSearchTool, FileReadTool, CodeInterpreterTool

agent = Agent(
    role="Analyst",
    goal="Research and analyze data",
    model="claude-sonnet-4-6",
    tools=[
        WebSearchTool(),
        FileReadTool(),
        CodeInterpreterTool(),
    ],
)
```

## Creating Custom Tools

Use the `@tool` decorator to create custom tools:

```python
from flightdeck.tools import tool

@tool("Stock Price Lookup")
def get_stock_price(ticker: str) -> str:
    """Look up the current stock price for a given ticker symbol.

    Args:
        ticker: The stock ticker symbol (e.g., AAPL, GOOGL)
    """
    import yfinance as yf
    stock = yf.Ticker(ticker)
    price = stock.info.get("currentPrice", "N/A")
    return f"{ticker}: ${price}"

agent = Agent(
    role="Financial Analyst",
    goal="Analyze stock performance",
    model="claude-sonnet-4-6",
    tools=[get_stock_price],
)
```

The docstring and type hints are used to generate the tool schema that the LLM sees.

## Tool Class Pattern

For more complex tools, extend the `BaseTool` class:

```python
from flightdeck.tools import BaseTool
from pydantic import BaseModel, Field

class DatabaseQueryInput(BaseModel):
    query: str = Field(description="SQL query to execute")
    database: str = Field(default="main", description="Database name")

class DatabaseQueryTool(BaseTool):
    name: str = "Database Query"
    description: str = "Execute a read-only SQL query against the database"
    args_schema: type = DatabaseQueryInput

    def _run(self, query: str, database: str = "main") -> str:
        import sqlite3
        conn = sqlite3.connect(f"{database}.db")
        cursor = conn.execute(query)
        results = cursor.fetchall()
        conn.close()
        return str(results)
```

## Tool Configuration

Some built-in tools accept configuration:

```python
from flightdeck.tools import WebSearchTool, SQLTool

search = WebSearchTool(
    max_results=5,
    search_engine="google",
)

sql = SQLTool(
    connection_string="postgresql://user:pass@localhost/mydb",
    read_only=True,  # Prevent mutations
)
```

## Tool Caching

Enable caching to avoid redundant tool calls:

```python
@tool("Expensive API Call", cache=True)
def call_api(query: str) -> str:
    """Call an external API. Results are cached for identical queries."""
    # ... expensive operation
```
