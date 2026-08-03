Settings
========

Screen: ``/settings`` (``Settings.tsx``). Filename ``billing-guide.rst`` maps
to **Settings** (MCP servers, API keys, triggers). There is no billing or
subscription UI in this frontend.

Sections
--------

MCP servers
~~~~~~~~~~~

Connect Model Context Protocol servers, sync tool lists, inspect tools.

API keys
~~~~~~~~

Store provider keys on the backend (never in ``VITE_*`` env).

Triggers
~~~~~~~~

Overview / management entry points for workflow schedules and webhooks
(shared APIs with the Workflows page).

APIs used
---------

.. list-table::
   :header-rows: 1
   :widths: 14 48 38

   * - Method
     - Path
     - Usage
   * - GET
     - ``/mcp-servers``
     - List MCP servers
   * - POST
     - ``/mcp-servers``
     - Create
   * - PUT
     - ``/mcp-servers/{id}``
     - Update
   * - DELETE
     - ``/mcp-servers/{id}``
     - Delete
   * - POST
     - ``/mcp-servers/{id}/sync``
     - Sync tools
   * - GET
     - ``/mcp-servers/{id}/tools``
     - List tools on server
   * - GET
     - ``/settings/api-keys``
     - Key status list
   * - PUT
     - ``/settings/api-keys/{provider}``
     - Set key
   * - DELETE
     - ``/settings/api-keys/{provider}``
     - Remove key
   * - GET/POST/DELETE
     - ``/triggers/schedules…``
     - Schedule triggers
   * - GET/POST/DELETE
     - ``/triggers/webhooks…``
     - Webhook triggers

Query keys: ``queryKeys.mcpServers``, ``queryKeys.apiKeys``.
