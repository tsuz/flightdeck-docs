---
sidebar_position: 5
---

# Store Any Data in Database for Later Use

Give your agents the ability to persist data to a database during execution so it can be retrieved in future tasks or by other agents.

## Overview

Agents often produce data that needs to outlive a single task — customer records, analysis results, extracted entities, conversation summaries. By adding a database write tool, agents can store structured data that other agents or your application can query later.

## How It Fits in Flightdeck

```
Agent executes a task
     │
     ├─► Think Layer decides to store data
     │
     ▼
┌──────────────┐
│  DB Write     │  ← Persists data to your database
│  Tool         │
└──────────────┘
     │
     ▼
Data available for future agents / your application
```

The database tool is a regular tool function registered with your consumer. The agent's Think layer decides when and what to store based on the task context.

## Example: PostgreSQL

```python
from flightdeck.tools import tool
import psycopg2
import json

@tool("Store Record")
def store_record(table: str, data: str) -> str:
    """Store a JSON record in the database for later use.

    Args:
        table: The table name to insert into
        data: JSON string of the record to store
    """
    record = json.loads(data)
    columns = ", ".join(record.keys())
    placeholders = ", ".join(["%s"] * len(record))
    values = list(record.values())

    conn = psycopg2.connect(dsn="postgresql://user:pass@localhost/mydb")
    cur = conn.cursor()
    cur.execute(f"INSERT INTO {table} ({columns}) VALUES ({placeholders})", values)
    conn.commit()
    cur.close()
    conn.close()

    return f"Stored record in {table}"


@tool("Query Records")
def query_records(query: str) -> str:
    """Query the database and return results.

    Args:
        query: SQL SELECT query to execute
    """
    conn = psycopg2.connect(dsn="postgresql://user:pass@localhost/mydb")
    cur = conn.cursor()
    cur.execute(query)
    rows = cur.fetchall()
    columns = [desc[0] for desc in cur.description]
    cur.close()
    conn.close()

    results = [dict(zip(columns, row)) for row in rows]
    return json.dumps(results, default=str)
```

## Example: MongoDB

```python
from flightdeck.tools import tool
from pymongo import MongoClient
import json

client = MongoClient("mongodb://localhost:27017")
db = client["flightdeck"]

@tool("Store Document")
def store_document(collection: str, data: str) -> str:
    """Store a JSON document in MongoDB for later use.

    Args:
        collection: The collection name
        data: JSON string of the document to store
    """
    doc = json.loads(data)
    result = db[collection].insert_one(doc)
    return f"Stored document {result.inserted_id} in {collection}"


@tool("Find Documents")
def find_documents(collection: str, filter_json: str) -> str:
    """Query MongoDB and return matching documents.

    Args:
        collection: The collection name
        filter_json: JSON string of the MongoDB query filter
    """
    query = json.loads(filter_json)
    docs = list(db[collection].find(query, {"_id": 0}))
    return json.dumps(docs, default=str)
```

## Use Cases

- **Customer context** — store customer details during onboarding so support agents can retrieve them later
- **Analysis results** — persist reports, summaries, or extracted data for downstream agents
- **Conversation memory** — save key facts from conversations for long-term recall across sessions
- **Audit records** — log agent decisions and actions to a database for compliance queries
