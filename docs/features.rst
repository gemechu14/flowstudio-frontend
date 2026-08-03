Features
========

Application surfaces
--------------------

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Surface
     - Description
   * - Public auth
     - ``/login`` — email/password login and organization registration
   * - App shell
     - Sidebar + top bar around authenticated routes
   * - Dashboard
     - Aggregate stats and recent workflow runs
   * - Tools
     - Upload, AI-generate, test, approve/reject tools; env vars
   * - Agents
     - CRUD agents and streaming chat
   * - Data sources
     - Documents, DB connections, website crawl / schema
   * - Workflows
     - Canvas builder, execution modes, runs, schedules, webhooks
   * - Channels
     - Messaging bot configs and webhook URLs
   * - Community
     - Shared tool catalog; submissions for ``super_admin``
   * - Settings
     - MCP servers, LLM API keys, workflow triggers overview
   * - Profile
     - Name and password updates

Role access matrix
------------------

Roles come from ``AuthUser.role``. There is **no route-level RBAC** — any
authenticated user can open all registered routes. Gating is feature-level.

.. list-table::
   :header-rows: 1
   :widths: 28 18 18 18 18

   * - Capability
     - member
     - org_admin
     - super_admin
     - Notes
   * - All main app routes
     - Yes
     - Yes
     - Yes
     - Router does not filter by role
   * - Tenant switcher
     - —
     - —
     - Yes
     - ``GET /admin/tenants`` + ``cl_active_tenant`` / ``x-active-tenant``
   * - Community submissions approve/reject
     - —
     - —
     - Yes
     - Community Tools page
   * - Invite / manage users UI
     - —
     - Intended
     - Intended
     - Implemented in ``Users.tsx`` (currently unrouted)

Feature guides
--------------

.. toctree::
   :maxdepth: 1

   auth-guide
   dashboard-guide
   formulas-guide
   customers-guide
   inventory-guide
   products-guide
   team-guide
   locations-guide
   billing-guide
   platform-guide

API modules used by the frontend
--------------------------------

.. list-table::
   :header-rows: 1
   :widths: 28 72

   * - Module
     - Responsibility
   * - ``src/api/client.ts``
     - ``BASE_URL``, token helpers, ``apiFetch``, 401 handling
   * - ``src/api/auth.ts``
     - Register, login, user admin helpers
   * - ``src/api/tools.ts`` / ``toolEnvVars.ts``
     - Tool CRUD, upload, test, AI generate, env vars
   * - ``src/api/agents.ts``
     - Agent CRUD (chat stream called from ``AgentChat``)
   * - ``src/api/workflows.ts``
     - Workflows, runs, checkpoints, schedules, webhooks
   * - ``src/api/dataSources.ts``
     - Data source CRUD, upload, crawl, schema
   * - ``src/api/channels.ts``
     - Channel configs and registration helpers
   * - ``src/api/communityTools.ts``
     - Catalog and submission lifecycle
   * - ``src/api/apiKeys.ts``
     - Settings API keys
   * - ``src/api/mcpServers.ts`` / ``mcp.ts``
     - MCP server CRUD, sync, tools list
