---
sidebar_position: 4
---

# Configuring the Frontend

The `frontend` service (the React dashboard) has its own configuration, set on that service in `docker-compose.yml`. These values are injected into the container at startup — **no image rebuild is needed**.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WS_URL` | *(optional)* | Overrides the WebSocket endpoint the dashboard connects to (e.g. `wss://your-host/ws`). If unset, the URL is auto-detected from the page: `wss://` when served over HTTPS, `ws://` otherwise, against the page's own host at `/ws`. |

## WebSocket Endpoint (`WS_URL`)

The dashboard streams chat responses, pipeline events, and logs over a WebSocket. By default it derives the endpoint from the page it was served from, so most deployments need no configuration:

- Served over **HTTPS** → connects via `wss://<page-host>/ws`
- Served over **HTTP** → connects via `ws://<page-host>/ws`

This matters because browsers block insecure `ws://` connections from a secure (HTTPS) page — the auto-detection picks `wss://` for you.

Set `WS_URL` only when the WebSocket lives somewhere other than the page's own host (for example, a separate gateway):

```yaml
services:
  frontend:
    image: ghcr.io/tsuz/flightdeck/frontend:${FLIGHTDECK_VERSION:-latest}
    ports:
      - "80:80"
    environment:
      WS_URL: wss://your-host/ws   # optional; omit to auto-detect
```

After changing the value, restart the `frontend` service to re-inject it:

```bash
docker compose up -d frontend
```
