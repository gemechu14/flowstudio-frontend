Getting started
===============

Prerequisites
-------------

* **Node.js** 20 or newer
* **npm** 10 or newer (ships with recent Node)
* A running FlowStudio / Crestward API (default ``http://localhost:8000``)

Tech stack
----------

.. list-table::
   :header-rows: 1
   :widths: 28 72

   * - Layer
     - Choice
   * - Bundler / dev server
     - Vite 5 (``@vitejs/plugin-react``)
   * - UI
     - React 18 + TypeScript
   * - Routing
     - React Router DOM 6 (``BrowserRouter``)
   * - Server state
     - TanStack React Query 5
   * - HTTP
     - Native ``fetch`` via ``src/api/client.ts``
   * - Styling
     - Global CSS design tokens in ``src/styles/globals.css`` (no Tailwind)

This project is **not** Next.js and does not use App Router.

Installation
------------

From the repository root:

.. code-block:: bash

   npm install

Environment variables
---------------------

Create a ``.env`` (or ``.env.local``) at the repo root if you need a non-default API:

.. list-table::
   :header-rows: 1
   :widths: 30 15 55

   * - Variable
     - Required
     - Description
   * - ``VITE_API_URL``
     - No
     - API origin. Defaults to ``http://localhost:8000`` when unset. Read in ``src/api/client.ts`` as ``BASE_URL``.

Example:

.. code-block:: bash

   VITE_API_URL=https://api.example.com

Only ``VITE_*`` variables are exposed to the browser. Never put secrets in
``VITE_*`` values (see :doc:`security`).

Development server
------------------

.. code-block:: bash

   npm run dev

Vite serves the app at **http://localhost:5173** (see ``vite.config.ts``).

Production build
----------------

.. code-block:: bash

   npm run build
   npm run preview

``build`` runs ``tsc && vite build``. ``preview`` serves the production bundle
locally.

App routes
----------

Unauthenticated users are redirected to ``/login``.

.. list-table::
   :header-rows: 1
   :widths: 28 72

   * - Path
     - Page
   * - ``/login``
     - Sign in / create organization
   * - ``/dashboard``
     - Stats and recent activity
   * - ``/tools``
     - Tool library
   * - ``/agents``
     - Agents and chat
   * - ``/data-sources``
     - Documents, databases, websites
   * - ``/workflows``
     - Visual workflow builder and runs
   * - ``/channels``
     - Slack / Telegram / Discord / WhatsApp
   * - ``/community``
     - Community tool catalog
   * - ``/settings``
     - MCP servers, API keys, triggers
   * - ``/profile``
     - Profile and password
   * - ``/``
     - Redirects to ``/dashboard``

``src/pages/Users.tsx`` exists but is **not** registered in the router.

Project structure
-----------------

.. code-block:: text

   src/
     api/           # HTTP clients (auth, tools, agents, workflows, …)
     components/    # layout/, ui/, tools/, agents/
     contexts/      # AuthContext, ThemeContext
     lib/           # queryClient + queryKeys
     pages/         # Route-level screens
     styles/        # globals.css design tokens
     App.tsx        # Providers + routes
     main.tsx       # BrowserRouter entry
   docs/            # This Sphinx documentation
   vite.config.ts
   package.json
