# Looker MCP Server with OAuth Passthrough

This is a test setup for passing user OAuth credentials through to Looker instead of using service account credentials.

## How it works

1. User authenticates to LibreChat via Google OAuth
2. LibreChat passes the user's OAuth token to this MCP server via the `Authorization` header
3. The MCP server (Genai Toolbox) forwards that token to Looker for API calls
4. Looker validates the token and returns data based on that user's permissions

## Prerequisites

For this to work, your Looker instance must be configured to accept OAuth tokens that match your authentication method. Options:

### Option A: Looker OAuth App (Direct)
Register an OAuth app in Looker:
1. Go to Looker Admin > Platform > OAuth Applications
2. Or use the API: `POST /oauth_client_apps` with `client_guid`, `redirect_uri`, `enabled`

### Option B: Google OAuth (if Looker uses Google Auth)
If Looker is configured for Google OAuth authentication, users who sign in with Google may be able to use their Google tokens directly.

### Option C: OIDC (if Looker uses OIDC)
If Looker uses OpenID Connect, configure the OIDC settings to match your identity provider.

## Running

```bash
docker compose up -d
```

The MCP server will be available at `http://localhost:5000/mcp`

## Testing

Test with curl:
```bash
# Get your OAuth token from LibreChat or browser dev tools
TOKEN="your-oauth-token"

# Test the MCP endpoint
curl -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Configuring LibreChat

Update `librechat.yaml` to point to this local server:

```yaml
mcpServers:
  looker-oauth:
    type: streamable-http
    url: http://host.docker.internal:5000/mcp
    startup: true
    initTimeout: 60000
```

## Notes

- The `LOOKER_USE_CLIENT_OAUTH=true` setting tells the toolbox to use the OAuth token from the Authorization header
- LibreChat needs to be configured to forward OAuth tokens to MCP servers (this may require LibreChat changes)
