---
sidebar_position: 4
---

# Adding a RAG as Prompt Search Layer

Use Retrieval-Augmented Generation (RAG) to give your agents access to relevant context from your own data before they think and act.

## Overview

A RAG layer sits between the incoming task and the Think layer. Before the LLM decides what to do, the RAG layer searches your knowledge base — documents, past conversations, internal wikis, product catalogs — and injects the most relevant results into the prompt. This grounds the agent's reasoning in your proprietary data.

## How It Fits in Flightdeck

```
User request
     │
     ▼
┌──────────────┐
│  RAG Layer    │  ← Searches vector DB for relevant context
└──────┬───────┘
       │ (enriched prompt)
       ▼
┌──────────────┐
│  Think Layer  │  ← LLM reasons with retrieved context
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Tools        │  ← Executes actions based on decision
└──────────────┘
```

The RAG layer runs as a tool function within your consumer. When a message arrives, the consumer calls the vector search before passing the enriched prompt to the LLM.

## Example

```python
from flightdeck.tools import tool
import chromadb

client = chromadb.HttpClient(host="localhost", port=8000)
collection = client.get_collection("knowledge_base")

@tool("Search Knowledge Base")
def search_knowledge_base(query: str, top_k: int = 5) -> str:
    """Search the internal knowledge base for relevant documents.

    Args:
        query: The search query
        top_k: Number of results to return
    """
    results = collection.query(query_texts=[query], n_results=top_k)
    documents = results["documents"][0]
    return "\n\n---\n\n".join(documents)
```

The agent's Think layer can now call `search_knowledge_base` to retrieve context before answering or making decisions.

## Supported Vector Databases

Any vector database works as a RAG backend. Common options:

- **ChromaDB** — lightweight, easy to self-host
- **Pinecone** — managed, scales to billions of vectors
- **Weaviate** — open source with hybrid search
- **pgvector** — PostgreSQL extension, no extra infrastructure
- **Qdrant** — open source with filtering support

## Tips

- **Chunk your data** — split documents into smaller, focused chunks for more precise retrieval
- **Include metadata** — store source, date, and category alongside embeddings so agents can cite their sources
- **Tune top_k** — too few results miss context, too many dilute the prompt. Start with 3-5 and adjust.
- **Re-rank results** — use a re-ranking model or LLM call to order results by relevance before injecting into the prompt
