---
sidebar_position: 1
---

# Building Custom Tool Functions

This guide walks through creating custom tools for your Flightdeck agents.

## Basic Tool with Decorator

The simplest way to create a tool:

```python
from flightdeck.tools import tool

@tool("Weather Lookup")
def get_weather(city: str, units: str = "celsius") -> str:
    """Get the current weather for a city.

    Args:
        city: City name (e.g., "Tokyo", "New York")
        units: Temperature units — "celsius" or "fahrenheit"
    """
    import requests
    resp = requests.get(
        "https://api.weatherapi.com/v1/current.json",
        params={"key": os.environ["WEATHER_API_KEY"], "q": city},
    )
    data = resp.json()
    temp = data["current"]["temp_c" if units == "celsius" else "temp_f"]
    condition = data["current"]["condition"]["text"]
    return f"{city}: {temp}° {units}, {condition}"
```

**Key points:**
- The function name becomes the tool identifier
- The docstring becomes the tool description the LLM sees
- Type hints define the parameter schema
- Default values make parameters optional

## Tool with Pydantic Schema

For precise control over the schema:

```python
from flightdeck.tools import BaseTool
from pydantic import BaseModel, Field

class SearchInput(BaseModel):
    query: str = Field(description="Search query")
    max_results: int = Field(default=5, ge=1, le=20, description="Number of results")
    language: str = Field(default="en", description="Language code")

class CustomSearchTool(BaseTool):
    name: str = "Custom Search"
    description: str = "Search a custom knowledge base"
    args_schema: type = SearchInput

    # Instance configuration
    api_endpoint: str = "https://search.example.com/api"

    def _run(self, query: str, max_results: int = 5, language: str = "en") -> str:
        import requests
        resp = requests.get(self.api_endpoint, params={
            "q": query,
            "limit": max_results,
            "lang": language,
        })
        results = resp.json()["results"]
        return "\n".join(f"- {r['title']}: {r['snippet']}" for r in results)
```

## Async Tools

For I/O-bound operations:

```python
from flightdeck.tools import BaseTool

class AsyncAPITool(BaseTool):
    name: str = "Async API"
    description: str = "Call an external API asynchronously"

    async def _arun(self, endpoint: str, method: str = "GET") -> str:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.request(method, endpoint) as resp:
                return await resp.text()
```

## Error Handling in Tools

Return clear error messages instead of raising exceptions:

```python
@tool("Database Query")
def query_db(sql: str) -> str:
    """Execute a read-only SQL query."""
    import sqlite3
    if not sql.strip().upper().startswith("SELECT"):
        return "Error: Only SELECT queries are allowed for safety."
    try:
        conn = sqlite3.connect("app.db")
        cursor = conn.execute(sql)
        rows = cursor.fetchall()
        conn.close()
        if not rows:
            return "Query returned no results."
        return str(rows)
    except sqlite3.Error as e:
        return f"Database error: {e}"
```

## Composing Multiple Tools

Group related tools together:

```python
from flightdeck.tools import tool

@tool("List Files")
def list_files(directory: str) -> str:
    """List files in a directory."""
    import os
    files = os.listdir(directory)
    return "\n".join(files)

@tool("Read File")
def read_file(path: str) -> str:
    """Read the contents of a file."""
    with open(path) as f:
        return f.read()

@tool("Write File")
def write_file(path: str, content: str) -> str:
    """Write content to a file."""
    with open(path, "w") as f:
        f.write(content)
    return f"Successfully wrote {len(content)} characters to {path}"

# Give the agent all file tools
file_agent = Agent(
    role="File Manager",
    goal="Manage project files",
    model="claude-sonnet-4-6",
    tools=[list_files, read_file, write_file],
)
```

## Testing Tools

Test tools independently before giving them to agents:

```python
def test_weather_tool():
    result = get_weather.run("Tokyo")
    assert "Tokyo" in result
    assert "°" in result

def test_weather_tool_invalid_city():
    result = get_weather.run("NotARealCity12345")
    assert "error" in result.lower() or "not found" in result.lower()
```
