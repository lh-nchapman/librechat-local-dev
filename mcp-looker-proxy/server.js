import express from 'express';

const app = express();
app.use(express.json());

const LOOKER_BASE_URL = process.env.LOOKER_BASE_URL || 'https://loveholidays.cloud.looker.com';
const PORT = process.env.PORT || 5001;

// Helper to make Looker API calls directly
async function lookerApiCall(accessToken, method, path, body = null) {
  const url = `${LOOKER_BASE_URL}${path}`;
  console.log(`[Looker API] ${method} ${path}`);

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Looker API error ${response.status}: ${error}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

// MCP Tools definitions - Full set matching the official Looker MCP
const tools = [
  // ==================== Models & Explores ====================
  {
    name: 'get_models',
    description: 'Get all available LookML models in the source',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_explores',
    description: 'Get all explores for the given model from the source',
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
    description: 'Get all dimensions from a given explore in a given model',
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
    description: 'Get all measures from a given explore in a given model',
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
    name: 'get_filters',
    description: 'Get all filters from a given explore in a given model',
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
    name: 'get_parameters',
    description: 'Get all parameters from a given explore in a given model',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'The model containing the explore' },
        explore: { type: 'string', description: 'The explore containing the fields' },
      },
      required: ['model', 'explore'],
    },
  },

  // ==================== Queries ====================
  {
    name: 'query',
    description: 'Run an inline query using the Looker semantic model',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'The model containing the explore' },
        explore: { type: 'string', description: 'The explore to be queried' },
        fields: { type: 'array', items: { type: 'string' }, description: 'The fields to retrieve' },
        filters: { type: 'object', description: 'The filters for the query' },
        pivots: { type: 'array', items: { type: 'string' }, description: 'Pivot fields' },
        sorts: { type: 'array', items: { type: 'string' }, description: 'Sort fields' },
        limit: { type: 'integer', description: 'Row limit' },
        tz: { type: 'string', description: 'Query timezone' },
      },
      required: ['model', 'explore', 'fields'],
    },
  },
  {
    name: 'query_sql',
    description: 'Generate SQL for a query using the Looker semantic model',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'The model containing the explore' },
        explore: { type: 'string', description: 'The explore to be queried' },
        fields: { type: 'array', items: { type: 'string' }, description: 'The fields to retrieve' },
        filters: { type: 'object', description: 'The filters for the query' },
        pivots: { type: 'array', items: { type: 'string' }, description: 'Pivot fields' },
        sorts: { type: 'array', items: { type: 'string' }, description: 'Sort fields' },
        limit: { type: 'integer', description: 'Row limit' },
        tz: { type: 'string', description: 'Query timezone' },
      },
      required: ['model', 'explore', 'fields'],
    },
  },
  {
    name: 'query_url',
    description: 'Generate a URL link to a Looker explore',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'The model containing the explore' },
        explore: { type: 'string', description: 'The explore to be queried' },
        fields: { type: 'array', items: { type: 'string' }, description: 'The fields to retrieve' },
        filters: { type: 'object', description: 'The filters for the query' },
        pivots: { type: 'array', items: { type: 'string' }, description: 'Pivot fields' },
        sorts: { type: 'array', items: { type: 'string' }, description: 'Sort fields' },
        limit: { type: 'integer', description: 'Row limit' },
        tz: { type: 'string', description: 'Query timezone' },
        vis_config: { type: 'object', description: 'Visualization config' },
      },
      required: ['model', 'explore', 'fields'],
    },
  },

  // ==================== Dashboards ====================
  {
    name: 'get_dashboards',
    description: 'Search for saved Dashboards by name or description',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Dashboard title to search' },
        desc: { type: 'string', description: 'Dashboard description to search' },
        limit: { type: 'integer', description: 'Number of results' },
        offset: { type: 'integer', description: 'Offset for pagination' },
      },
      required: [],
    },
  },
  {
    name: 'run_dashboard',
    description: 'Run the queries associated with a dashboard',
    inputSchema: {
      type: 'object',
      properties: {
        dashboard_id: { type: 'string', description: 'The dashboard ID to run' },
        filters: { type: 'object', description: 'Dashboard filters to apply' },
      },
      required: ['dashboard_id'],
    },
  },
  {
    name: 'make_dashboard',
    description: 'Create a new dashboard in the users personal folder in Looker',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'The title of the Dashboard' },
        description: { type: 'string', description: 'The description of the Dashboard' },
      },
      required: ['title'],
    },
  },
  {
    name: 'add_dashboard_element',
    description: 'Create a dashboard element (tile) in the given dashboard',
    inputSchema: {
      type: 'object',
      properties: {
        dashboard_id: { type: 'string', description: 'The dashboard ID' },
        model: { type: 'string', description: 'The model containing the explore' },
        explore: { type: 'string', description: 'The explore to be queried' },
        fields: { type: 'array', items: { type: 'string' }, description: 'The fields to retrieve' },
        filters: { type: 'object', description: 'The filters for the query' },
        pivots: { type: 'array', items: { type: 'string' }, description: 'Pivot fields' },
        sorts: { type: 'array', items: { type: 'string' }, description: 'Sort fields' },
        limit: { type: 'integer', description: 'Row limit' },
        title: { type: 'string', description: 'Title of the dashboard element' },
        vis_config: { type: 'object', description: 'Visualization config' },
        tz: { type: 'string', description: 'Query timezone' },
      },
      required: ['dashboard_id', 'model', 'explore', 'fields'],
    },
  },

  // ==================== Looks ====================
  {
    name: 'get_looks',
    description: 'Search for saved Looks in Looker',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Look title to search' },
        desc: { type: 'string', description: 'Look description to search' },
        limit: { type: 'integer', description: 'Number of results' },
        offset: { type: 'integer', description: 'Offset for pagination' },
      },
      required: [],
    },
  },
  {
    name: 'run_look',
    description: 'Run the query associated with a saved Look',
    inputSchema: {
      type: 'object',
      properties: {
        look_id: { type: 'string', description: 'The Look ID to run' },
        limit: { type: 'integer', description: 'Row limit' },
      },
      required: ['look_id'],
    },
  },
  {
    name: 'make_look',
    description: 'Create a new Look in the users personal folder in Looker',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'The title of the Look' },
        description: { type: 'string', description: 'The description of the Look' },
        model: { type: 'string', description: 'The model containing the explore' },
        explore: { type: 'string', description: 'The explore to be queried' },
        fields: { type: 'array', items: { type: 'string' }, description: 'The fields to retrieve' },
        filters: { type: 'object', description: 'The filters for the query' },
        pivots: { type: 'array', items: { type: 'string' }, description: 'Pivot fields' },
        sorts: { type: 'array', items: { type: 'string' }, description: 'Sort fields' },
        limit: { type: 'integer', description: 'Row limit' },
        vis_config: { type: 'object', description: 'Visualization config' },
        tz: { type: 'string', description: 'Query timezone' },
      },
      required: ['title', 'model', 'explore', 'fields'],
    },
  },

  // ==================== Connections ====================
  {
    name: 'get_connections',
    description: 'Get all database connections in the Looker instance',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_connection_databases',
    description: 'Get all databases in a connection',
    inputSchema: {
      type: 'object',
      properties: {
        connection_name: { type: 'string', description: 'The connection name' },
      },
      required: ['connection_name'],
    },
  },
  {
    name: 'get_connection_schemas',
    description: 'Get all schemas in a connection',
    inputSchema: {
      type: 'object',
      properties: {
        connection_name: { type: 'string', description: 'The connection name' },
        database: { type: 'string', description: 'The database name' },
      },
      required: ['connection_name'],
    },
  },
  {
    name: 'get_connection_tables',
    description: 'Get all tables in a connection',
    inputSchema: {
      type: 'object',
      properties: {
        connection_name: { type: 'string', description: 'The connection name' },
        database: { type: 'string', description: 'The database name' },
        schema: { type: 'string', description: 'The schema name' },
      },
      required: ['connection_name'],
    },
  },
  {
    name: 'get_connection_table_columns',
    description: 'Get all columns for specified tables in a connection',
    inputSchema: {
      type: 'object',
      properties: {
        connection_name: { type: 'string', description: 'The connection name' },
        database: { type: 'string', description: 'The database name' },
        schema: { type: 'string', description: 'The schema name' },
        tables: { type: 'array', items: { type: 'string' }, description: 'Table names' },
      },
      required: ['connection_name', 'tables'],
    },
  },

  // ==================== Projects & LookML ====================
  {
    name: 'get_projects',
    description: 'Get all LookML projects in the Looker instance',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_project_files',
    description: 'Get all LookML files in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_project_file',
    description: 'Get the contents of a LookML file',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        file_id: { type: 'string', description: 'The file ID' },
      },
      required: ['project_id', 'file_id'],
    },
  },
  {
    name: 'create_project_file',
    description: 'Create a new LookML file in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        file_name: { type: 'string', description: 'The file name' },
        content: { type: 'string', description: 'The file content' },
      },
      required: ['project_id', 'file_name', 'content'],
    },
  },
  {
    name: 'update_project_file',
    description: 'Update the content of a LookML file in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        file_id: { type: 'string', description: 'The file ID' },
        content: { type: 'string', description: 'The new file content' },
      },
      required: ['project_id', 'file_id', 'content'],
    },
  },
  {
    name: 'delete_project_file',
    description: 'Delete a LookML file in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        file_id: { type: 'string', description: 'The file ID' },
      },
      required: ['project_id', 'file_id'],
    },
  },
  {
    name: 'dev_mode',
    description: 'Change the current session into or out of dev mode',
    inputSchema: {
      type: 'object',
      properties: {
        enable: { type: 'boolean', description: 'Enable or disable dev mode' },
      },
      required: ['enable'],
    },
  },

  // ==================== Embedding ====================
  {
    name: 'generate_embed_url',
    description: 'Generate an embeddable URL for Looker content',
    inputSchema: {
      type: 'object',
      properties: {
        target_url: { type: 'string', description: 'The URL to embed' },
        session_length: { type: 'integer', description: 'Session length in seconds' },
        force_logout_login: { type: 'boolean', description: 'Force logout and login' },
      },
      required: ['target_url'],
    },
  },

  // ==================== Health & Analysis ====================
  {
    name: 'health_pulse',
    description: 'Perform health checks on a Looker instance (database connections, dashboard performance, etc)',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'Health check action to perform' },
      },
      required: [],
    },
  },
  {
    name: 'health_analyze',
    description: 'Analyze projects, models, and explores in a Looker instance',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'Analysis action to perform' },
        project: { type: 'string', description: 'Project to analyze' },
        model: { type: 'string', description: 'Model to analyze' },
      },
      required: [],
    },
  },
  {
    name: 'health_vacuum',
    description: 'Audit and identify unused LookML objects in a Looker instance',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'Vacuum action to perform' },
        project: { type: 'string', description: 'Project to audit' },
      },
      required: [],
    },
  },

  // ==================== Conversational Analytics ====================
  {
    name: 'conversational_analytics',
    description: 'Use the Conversational Analytics API to analyze data from Looker using natural language',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'Natural language question to ask' },
        model: { type: 'string', description: 'The model to query' },
        explore: { type: 'string', description: 'The explore to query' },
      },
      required: ['question'],
    },
  },
];

// Execute a tool
async function executeTool(toolName, args, accessToken) {
  if (!accessToken) {
    throw new Error('OAuth authentication required');
  }

  switch (toolName) {
    // ==================== Models & Explores ====================
    case 'get_models': {
      const models = await lookerApiCall(accessToken, 'GET', '/api/4.0/lookml_models');
      return models.map(m => ({ name: m.name, label: m.label, has_content: m.has_content }));
    }

    case 'get_explores': {
      const model = await lookerApiCall(accessToken, 'GET', `/api/4.0/lookml_models/${args.model}`);
      return model.explores?.map(e => ({
        name: e.name,
        label: e.label,
        description: e.description,
        hidden: e.hidden
      })) || [];
    }

    case 'get_dimensions': {
      const explore = await lookerApiCall(accessToken, 'GET', `/api/4.0/lookml_models/${args.model}/explores/${args.explore}`);
      return explore.fields?.dimensions?.map(d => ({
        name: d.name,
        label: d.label,
        type: d.type,
        description: d.description,
        sql: d.sql,
        suggest_explore: d.suggest_explore,
        suggest_dimension: d.suggest_dimension,
        suggestions: d.suggestions,
      })) || [];
    }

    case 'get_measures': {
      const explore = await lookerApiCall(accessToken, 'GET', `/api/4.0/lookml_models/${args.model}/explores/${args.explore}`);
      return explore.fields?.measures?.map(m => ({
        name: m.name,
        label: m.label,
        type: m.type,
        description: m.description,
        sql: m.sql,
        suggest_explore: m.suggest_explore,
        suggest_dimension: m.suggest_dimension,
        suggestions: m.suggestions,
      })) || [];
    }

    case 'get_filters': {
      const explore = await lookerApiCall(accessToken, 'GET', `/api/4.0/lookml_models/${args.model}/explores/${args.explore}`);
      return explore.fields?.filters?.map(f => ({
        name: f.name,
        label: f.label,
        type: f.type,
        description: f.description,
      })) || [];
    }

    case 'get_parameters': {
      const explore = await lookerApiCall(accessToken, 'GET', `/api/4.0/lookml_models/${args.model}/explores/${args.explore}`);
      return explore.fields?.parameters?.map(p => ({
        name: p.name,
        label: p.label,
        type: p.type,
        description: p.description,
        default_value: p.default_value,
        allowed_values: p.allowed_values,
      })) || [];
    }

    // ==================== Queries ====================
    case 'query': {
      const query = {
        model: args.model,
        view: args.explore,
        fields: args.fields,
        filters: args.filters || {},
        pivots: args.pivots || [],
        sorts: args.sorts || [],
        limit: args.limit?.toString() || '500',
        query_timezone: args.tz,
      };
      return await lookerApiCall(accessToken, 'POST', '/api/4.0/queries/run/json', query);
    }

    case 'query_sql': {
      const query = {
        model: args.model,
        view: args.explore,
        fields: args.fields,
        filters: args.filters || {},
        pivots: args.pivots || [],
        sorts: args.sorts || [],
        limit: args.limit?.toString() || '500',
        query_timezone: args.tz,
      };
      return await lookerApiCall(accessToken, 'POST', '/api/4.0/queries/run/sql', query);
    }

    case 'query_url': {
      const query = {
        model: args.model,
        view: args.explore,
        fields: args.fields,
        filters: args.filters || {},
        pivots: args.pivots || [],
        sorts: args.sorts || [],
        limit: args.limit?.toString() || '500',
        query_timezone: args.tz,
        vis_config: args.vis_config || {},
      };
      const createdQuery = await lookerApiCall(accessToken, 'POST', '/api/4.0/queries', query);
      return {
        id: createdQuery.id,
        slug: createdQuery.slug,
        url: `${LOOKER_BASE_URL}/explore/${args.model}/${args.explore}?qid=${createdQuery.slug}`,
        share_url: createdQuery.share_url,
      };
    }

    // ==================== Dashboards ====================
    case 'get_dashboards': {
      const params = new URLSearchParams();
      if (args.title) params.append('title', args.title);
      if (args.desc) params.append('description', args.desc);
      if (args.limit) params.append('limit', args.limit.toString());
      if (args.offset) params.append('offset', args.offset.toString());
      const path = '/api/4.0/dashboards' + (params.toString() ? `?${params}` : '');
      return await lookerApiCall(accessToken, 'GET', path);
    }

    case 'run_dashboard': {
      const elements = await lookerApiCall(accessToken, 'GET', `/api/4.0/dashboards/${args.dashboard_id}/dashboard_elements`);
      const results = [];
      for (const element of elements) {
        if (element.query_id) {
          try {
            const result = await lookerApiCall(accessToken, 'GET', `/api/4.0/queries/${element.query_id}/run/json`);
            results.push({ element_id: element.id, title: element.title, data: result });
          } catch (e) {
            results.push({ element_id: element.id, title: element.title, error: e.message });
          }
        }
      }
      return results;
    }

    case 'make_dashboard': {
      // Get user's personal folder
      const me = await lookerApiCall(accessToken, 'GET', '/api/4.0/user');
      const dashboard = await lookerApiCall(accessToken, 'POST', '/api/4.0/dashboards', {
        title: args.title,
        description: args.description || '',
        folder_id: me.personal_folder_id,
      });
      return {
        id: dashboard.id,
        title: dashboard.title,
        url: `${LOOKER_BASE_URL}/dashboards/${dashboard.id}`,
      };
    }

    case 'add_dashboard_element': {
      // First create the query
      const query = {
        model: args.model,
        view: args.explore,
        fields: args.fields,
        filters: args.filters || {},
        pivots: args.pivots || [],
        sorts: args.sorts || [],
        limit: args.limit?.toString() || '500',
        query_timezone: args.tz,
        vis_config: args.vis_config || {},
      };
      const createdQuery = await lookerApiCall(accessToken, 'POST', '/api/4.0/queries', query);

      // Then create the dashboard element
      const element = await lookerApiCall(accessToken, 'POST', '/api/4.0/dashboard_elements', {
        dashboard_id: args.dashboard_id,
        query_id: createdQuery.id,
        title: args.title || '',
        type: 'vis',
      });
      return { element_id: element.id, query_id: createdQuery.id };
    }

    // ==================== Looks ====================
    case 'get_looks': {
      const params = new URLSearchParams();
      if (args.title) params.append('title', args.title);
      if (args.desc) params.append('description', args.desc);
      if (args.limit) params.append('limit', args.limit.toString());
      if (args.offset) params.append('offset', args.offset.toString());
      const path = '/api/4.0/looks' + (params.toString() ? `?${params}` : '');
      return await lookerApiCall(accessToken, 'GET', path);
    }

    case 'run_look': {
      const params = args.limit ? `?limit=${args.limit}` : '';
      return await lookerApiCall(accessToken, 'GET', `/api/4.0/looks/${args.look_id}/run/json${params}`);
    }

    case 'make_look': {
      // Get user's personal folder
      const me = await lookerApiCall(accessToken, 'GET', '/api/4.0/user');

      // Create the query first
      const query = {
        model: args.model,
        view: args.explore,
        fields: args.fields,
        filters: args.filters || {},
        pivots: args.pivots || [],
        sorts: args.sorts || [],
        limit: args.limit?.toString() || '500',
        query_timezone: args.tz,
        vis_config: args.vis_config || {},
      };
      const createdQuery = await lookerApiCall(accessToken, 'POST', '/api/4.0/queries', query);

      // Create the look
      const look = await lookerApiCall(accessToken, 'POST', '/api/4.0/looks', {
        title: args.title,
        description: args.description || '',
        folder_id: me.personal_folder_id,
        query_id: createdQuery.id,
      });
      return {
        id: look.id,
        title: look.title,
        url: `${LOOKER_BASE_URL}/looks/${look.id}`,
      };
    }

    // ==================== Connections ====================
    case 'get_connections': {
      return await lookerApiCall(accessToken, 'GET', '/api/4.0/connections');
    }

    case 'get_connection_databases': {
      return await lookerApiCall(accessToken, 'GET', `/api/4.0/connections/${args.connection_name}/databases`);
    }

    case 'get_connection_schemas': {
      const params = args.database ? `?database=${encodeURIComponent(args.database)}` : '';
      return await lookerApiCall(accessToken, 'GET', `/api/4.0/connections/${args.connection_name}/schemas${params}`);
    }

    case 'get_connection_tables': {
      const params = new URLSearchParams();
      if (args.database) params.append('database', args.database);
      if (args.schema) params.append('schema_name', args.schema);
      const path = `/api/4.0/connections/${args.connection_name}/tables` + (params.toString() ? `?${params}` : '');
      return await lookerApiCall(accessToken, 'GET', path);
    }

    case 'get_connection_table_columns': {
      const body = {
        connection_name: args.connection_name,
        database: args.database,
        schema_name: args.schema,
        table_names: args.tables,
      };
      return await lookerApiCall(accessToken, 'POST', '/api/4.0/connections/columns', body);
    }

    // ==================== Projects & LookML ====================
    case 'get_projects': {
      return await lookerApiCall(accessToken, 'GET', '/api/4.0/projects');
    }

    case 'get_project_files': {
      return await lookerApiCall(accessToken, 'GET', `/api/4.0/projects/${args.project_id}/files`);
    }

    case 'get_project_file': {
      return await lookerApiCall(accessToken, 'GET', `/api/4.0/projects/${args.project_id}/files/${encodeURIComponent(args.file_id)}`);
    }

    case 'create_project_file': {
      return await lookerApiCall(accessToken, 'POST', `/api/4.0/projects/${args.project_id}/files`, {
        path: args.file_name,
        content: args.content,
      });
    }

    case 'update_project_file': {
      return await lookerApiCall(accessToken, 'PATCH', `/api/4.0/projects/${args.project_id}/files/${encodeURIComponent(args.file_id)}`, {
        content: args.content,
      });
    }

    case 'delete_project_file': {
      await lookerApiCall(accessToken, 'DELETE', `/api/4.0/projects/${args.project_id}/files/${encodeURIComponent(args.file_id)}`);
      return { success: true };
    }

    case 'dev_mode': {
      const session = await lookerApiCall(accessToken, 'PATCH', '/api/4.0/session', {
        workspace_id: args.enable ? 'dev' : 'production',
      });
      return { dev_mode: session.workspace_id === 'dev' };
    }

    // ==================== Embedding ====================
    case 'generate_embed_url': {
      const body = {
        target_url: args.target_url,
        session_length: args.session_length || 600,
        force_logout_login: args.force_logout_login || false,
      };
      const result = await lookerApiCall(accessToken, 'POST', '/api/4.0/embed/sso_url', body);
      return result;
    }

    // ==================== Health & Analysis ====================
    case 'health_pulse': {
      // Get various health metrics
      const results = {};
      try {
        results.connections = await lookerApiCall(accessToken, 'GET', '/api/4.0/connections');
        results.running_queries = await lookerApiCall(accessToken, 'GET', '/api/4.0/running_queries');
      } catch (e) {
        results.error = e.message;
      }
      return results;
    }

    case 'health_analyze': {
      const results = {};
      if (args.project) {
        results.project = await lookerApiCall(accessToken, 'GET', `/api/4.0/projects/${args.project}`);
        results.validation = await lookerApiCall(accessToken, 'POST', `/api/4.0/projects/${args.project}/validate`);
      }
      if (args.model) {
        results.model = await lookerApiCall(accessToken, 'GET', `/api/4.0/lookml_models/${args.model}`);
      }
      return results;
    }

    case 'health_vacuum': {
      // Get content usage info to find unused objects
      const results = {};
      try {
        results.content_usage = await lookerApiCall(accessToken, 'GET', '/api/4.0/content_metadata_access?limit=100');
        if (args.project) {
          results.project_files = await lookerApiCall(accessToken, 'GET', `/api/4.0/projects/${args.project}/files`);
        }
      } catch (e) {
        results.error = e.message;
      }
      return results;
    }

    // ==================== Conversational Analytics ====================
    case 'conversational_analytics': {
      // This requires the Conversational Analytics API which may not be available on all instances
      const body = {
        query: args.question,
        model: args.model,
        explore: args.explore,
      };
      try {
        return await lookerApiCall(accessToken, 'POST', '/api/4.0/conversational_analytics/query', body);
      } catch (e) {
        return { error: 'Conversational Analytics API may not be enabled on this instance', details: e.message };
      }
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Handle MCP JSON-RPC requests
async function handleMcpRequest(req, res) {
  const { method, params, id } = req.body;

  // Get the access token from Authorization header
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  console.log(`[MCP] ${method} - Auth: ${accessToken ? 'present' : 'missing'}`);

  try {
    let result;

    switch (method) {
      case 'initialize':
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
          },
          serverInfo: {
            name: 'looker-oauth-proxy',
            version: '2.0.0',
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
  res.json({
    status: 'ok',
    service: 'looker-oauth-proxy',
    version: '2.0.0',
    tools_count: tools.length,
  });
});

app.listen(PORT, () => {
  console.log(`Looker OAuth Proxy running on port ${PORT}`);
  console.log(`Looker URL: ${LOOKER_BASE_URL}`);
  console.log(`Tools available: ${tools.length}`);
});
