import express from 'express';
import { Looker40SDK } from '@looker/sdk';
import { NodeSession } from '@looker/sdk-node';

const app = express();
app.use(express.json());

const LOOKER_BASE_URL = process.env.LOOKER_BASE_URL || 'https://loveholidays.cloud.looker.com';
const PORT = process.env.PORT || 5001;

// Store OAuth tokens per user (in production, use Redis or similar)
const userTokens = new Map();

// MCP JSON-RPC handler
let requestId = 0;

// Create a Looker SDK instance for a user's OAuth token
function createLookerSDK(accessToken) {
  // Create a custom session that uses the OAuth token
  const session = {
    isAuthenticated: () => Promise.resolve(true),
    authenticate: () => Promise.resolve({ access_token: accessToken }),
    getToken: () => Promise.resolve({ access_token: accessToken }),
    logout: () => Promise.resolve(true),
    settings: {
      base_url: LOOKER_BASE_URL,
      verify_ssl: true,
    },
    transport: {
      request: async (method, path, queryParams, body, init) => {
        const url = new URL(path, LOOKER_BASE_URL);
        if (queryParams) {
          Object.entries(queryParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              url.searchParams.append(key, String(value));
            }
          });
        }

        const response = await fetch(url.toString(), {
          method,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            ...init?.headers,
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }

        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          body: data,
          contentType: response.headers.get('content-type'),
        };
      },
    },
  };

  return new Looker40SDK(session);
}

// Helper to make Looker API calls directly
async function lookerApiCall(accessToken, method, path, body = null) {
  const url = `${LOOKER_BASE_URL}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Looker API error ${response.status}: ${error}`);
  }

  return response.json();
}

// MCP Tools definitions
const tools = [
  {
    name: 'get_models',
    description: 'Get all available LookML models',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_explores',
    description: 'Get explores for a given model',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'The model containing the explores' },
      },
      required: ['model'],
    },
  },
  {
    name: 'get_dimensions',
    description: 'Get dimensions for an explore',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'The model containing the explore' },
        explore: { type: 'string', description: 'The explore containing the fields' },
      },
      required: ['model', 'explore'],
    },
  },
  {
    name: 'get_measures',
    description: 'Get measures for an explore',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'The model containing the explore' },
        explore: { type: 'string', description: 'The explore containing the fields' },
      },
      required: ['model', 'explore'],
    },
  },
  {
    name: 'query',
    description: 'Run a query against a Looker explore',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'The model containing the explore' },
        explore: { type: 'string', description: 'The explore to be queried' },
        fields: { type: 'array', items: { type: 'string' }, description: 'The fields to retrieve' },
        filters: { type: 'object', description: 'The filters for the query' },
        limit: { type: 'integer', description: 'Row limit' },
        sorts: { type: 'array', items: { type: 'string' }, description: 'Sort fields' },
      },
      required: ['model', 'explore', 'fields'],
    },
  },
  {
    name: 'get_dashboards',
    description: 'Search for dashboards',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Dashboard title to search' },
        limit: { type: 'integer', description: 'Number of results' },
      },
      required: [],
    },
  },
];

// Execute a tool
async function executeTool(toolName, args, accessToken) {
  if (!accessToken) {
    throw new Error('OAuth authentication required');
  }

  switch (toolName) {
    case 'get_models': {
      const models = await lookerApiCall(accessToken, 'GET', '/api/4.0/lookml_models');
      return models.map(m => ({ name: m.name, label: m.label }));
    }

    case 'get_explores': {
      const model = await lookerApiCall(accessToken, 'GET', `/api/4.0/lookml_models/${args.model}`);
      return model.explores?.map(e => ({ name: e.name, label: e.label, description: e.description })) || [];
    }

    case 'get_dimensions': {
      const explore = await lookerApiCall(accessToken, 'GET', `/api/4.0/lookml_models/${args.model}/explores/${args.explore}`);
      return explore.fields?.dimensions?.map(d => ({
        name: d.name,
        label: d.label,
        type: d.type,
        description: d.description,
      })) || [];
    }

    case 'get_measures': {
      const explore = await lookerApiCall(accessToken, 'GET', `/api/4.0/lookml_models/${args.model}/explores/${args.explore}`);
      return explore.fields?.measures?.map(m => ({
        name: m.name,
        label: m.label,
        type: m.type,
        description: m.description,
      })) || [];
    }

    case 'query': {
      const query = {
        model: args.model,
        view: args.explore,
        fields: args.fields,
        filters: args.filters || {},
        limit: args.limit?.toString() || '500',
        sorts: args.sorts || [],
      };
      const result = await lookerApiCall(accessToken, 'POST', '/api/4.0/queries/run/json', query);
      return result;
    }

    case 'get_dashboards': {
      let path = '/api/4.0/dashboards';
      const params = new URLSearchParams();
      if (args.title) params.append('title', args.title);
      if (args.limit) params.append('limit', args.limit.toString());
      if (params.toString()) path += `?${params}`;
      return await lookerApiCall(accessToken, 'GET', path);
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Handle MCP JSON-RPC requests
async function handleMcpRequest(req, res) {
  const { method, params, id, jsonrpc } = req.body;

  // Get the access token from Authorization header
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  console.log(`[MCP] ${method} - Auth: ${accessToken ? 'present' : 'missing'}`);

  try {
    let result;

    switch (method) {
      case 'initialize':
        // Require auth during initialization
        if (!accessToken) {
          return res.status(401).json({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32600,
              message: 'OAuth authentication required. Please authenticate with Looker.',
            },
          });
        }
        result = {
          protocolVersion: '2025-06-18',
          capabilities: {
            tools: { listChanged: false },
            prompts: { listChanged: false },
          },
          serverInfo: {
            name: 'mcp-looker-proxy',
            version: '1.0.0',
          },
        };
        break;

      case 'notifications/initialized':
        return res.json({ jsonrpc: '2.0', id, result: {} });

      case 'ping':
        result = {};
        break;

      case 'tools/list':
        result = { tools };
        break;

      case 'tools/call':
        if (!accessToken) {
          return res.status(401).json({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32600,
              message: 'OAuth authentication required',
            },
          });
        }
        const toolResult = await executeTool(params.name, params.arguments || {}, accessToken);
        result = {
          content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }],
        };
        break;

      default:
        return res.status(400).json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Unknown method: ${method}`,
          },
        });
    }

    res.json({ jsonrpc: '2.0', id, result });
  } catch (error) {
    console.error(`[MCP] Error:`, error);
    res.status(error.message.includes('401') ? 401 : 500).json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: error.message,
      },
    });
  }
}

// MCP endpoint
app.post('/mcp', handleMcpRequest);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'mcp-looker-proxy' });
});

app.listen(PORT, () => {
  console.log(`MCP Looker Proxy running on port ${PORT}`);
  console.log(`Looker URL: ${LOOKER_BASE_URL}`);
});
