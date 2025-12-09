# LibreChat Local Development

Local development setup for LibreChat (loveholid.ai).

## Prerequisites

- Docker and Docker Compose
- Google Cloud SDK (for `gcloud auth application-default login`)
- API keys for AI providers (Anthropic, Google)

## Quick Start

1. **Clone this repo**
   ```bash
   git clone https://github.com/lh-nchapman/librechat-local-dev.git
   cd librechat-local-dev
   ```

2. **Create your environment file**
   ```bash
   cp .env.example .env
   ```

3. **Configure your `.env` file**
   - Add your Google OAuth credentials (from [Google Cloud Console](https://console.cloud.google.com/apis/credentials))
   - Add your Anthropic API key
   - Set up Google AI credentials (see below)

4. **Set up Google AI authentication**
   ```bash
   gcloud auth application-default login
   ```

5. **Start LibreChat**
   ```bash
   docker compose up -d
   ```

6. **Access LibreChat**
   Open http://localhost:3080 in your browser

## Configuration

### Environment Variables

Key variables in `.env`:

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude models |
| `ENDPOINTS` | Enabled AI endpoints (e.g., `google,anthropic`) |

### Model Configuration

Edit `librechat.yaml` to customize available models and their settings.

## Stopping

```bash
docker compose down
```

To also remove volumes (database data):
```bash
docker compose down -v
```

## Troubleshooting

### "Cannot connect to MongoDB"
Wait a few seconds after starting - MongoDB takes time to initialize.

### Google OAuth not working
Ensure your OAuth consent screen is configured and your redirect URI includes `http://localhost:3080/oauth/google/callback`.

### Models not loading
Check that your API keys are correctly set in `.env` and that the endpoints are enabled.

## Links

- [LibreChat Documentation](https://www.librechat.ai/docs)
- [LibreChat GitHub](https://github.com/danny-avila/LibreChat)
