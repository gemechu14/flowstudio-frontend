Configuration
=============

TypeScript & Vite
-----------------

* TypeScript 5 with React JSX.
* Vite resolves ``src/`` as the application root; there is **no** ``paths``
  alias map in ``vite.config.ts`` (imports use relative paths).
* Dev server port: **5173**.

React Query defaults
--------------------

Configured in ``src/lib/queryClient.ts``:

.. list-table::
   :header-rows: 1
   :widths: 40 60

   * - Option
     - Value
   * - ``staleTime``
     - 60_000 ms (60 s)
   * - ``gcTime``
     - 5 × 60_000 ms (5 min)
   * - ``refetchOnWindowFocus``
     - ``false``
   * - ``retry``
     - ``1``

Shared query keys live on ``queryKeys`` (dashboard, agents, workflows, tools,
community, channels, data sources, MCP, API keys, per-workflow runs).
Mutations that change dashboard-facing counts should call
``invalidateDashboardStats()``.

Design tokens
-------------

Tokens are CSS custom properties in ``src/styles/globals.css``. Default
``:root`` is dark; light theme overrides via ``[data-theme="light"]``
(driven by ``ThemeContext`` / ``cl_theme``).

Brand / accent (dark default)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 40 30 30

   * - Purpose
     - Token
     - Example
   * - Primary blue
     - ``--blue`` / ``--accent``
     - ``#3B82F6``
   * - Primary hover
     - ``--blue-hover``
     - ``#2563EB``
   * - Soft accent fill
     - ``--accent-soft``
     - blue at ~12% alpha
   * - Accent text
     - ``--accent-text``
     - matches ``--accent``

Surfaces & text (dark)
~~~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 40 60

   * - Token
     - Role
   * - ``--bg-page``
     - Page background (``#09090B``)
   * - ``--bg-surface`` / ``--bg-card``
     - Elevated panels / cards
   * - ``--text-primary``
     - Primary foreground
   * - ``--text-secondary`` / ``--text-tertiary``
     - Muted copy
   * - ``--border``
     - Default borders
   * - ``--verified`` / ``--untested`` / ``--invalid``
     - Status colors (+ ``*-dim`` fills)

Sidebar & shell
~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 40 60

   * - Token
     - Role
   * - ``--sidebar-width``
     - 240px expanded
   * - ``--sidebar-width-collapsed``
     - 72px
   * - ``--sidebar-bg``
     - Deep near-black shell (``#111113``)
   * - ``--topbar-height``
     - 72px

Typography
~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Role
     - Stack
   * - Sans / UI
     - ``--font-sans``: Segoe UI, system-ui, …
   * - Mono
     - ``--font-mono``: JetBrains Mono (loaded in ``index.html``)

UI patterns (this codebase)
~~~~~~~~~~~~~~~~~~~~~~~~~~~

* **Primary actions** — accent / blue fills using ``--accent`` / ``--blue``.
* **Cards** — ``--bg-card`` surfaces with ``--border`` (see ``components/ui/Card.tsx``).
* **App shell** — ``Sidebar`` + ``TopBar``; mobile nav via ``ThemeContext``.
* **Toasts** — ``ToastProvider`` portals to ``document.body``; fixed top-right
  (``.app-toast`` in ``globals.css``).

Deployment notes (frontend)
---------------------------

1. Set ``VITE_API_URL`` at **build time** (Vite inlines ``import.meta.env``).
2. Run ``npm run build``; serve the ``dist/`` directory behind any static host
   or reverse proxy.
3. Configure SPA fallback so client routes (``/workflows``, ``/agents``, …)
   rewrite to ``index.html``.
4. Ensure the API allows the frontend origin (CORS) and matches the URL used
   in ``VITE_API_URL``.

No Vercel-specific assumptions are required by this repository.
