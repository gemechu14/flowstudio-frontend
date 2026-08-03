Pages & routes
==============

Registered in ``App.tsx`` when ``user`` is present (except ``/login``).

.. list-table::
   :header-rows: 1
   :widths: 24 28 48

   * - Route
     - Component
     - Notes
   * - ``/login``
     - ``Login``
     - Unauthenticated only
   * - ``/dashboard``
     - ``Dashboard``
     - ``GET /workflows/dashboard/stats``
   * - ``/tools``
     - ``Tools``
     - Upload, AI generate, lifecycle
   * - ``/agents``
     - ``Agents``
     - CRUD + chat panel
   * - ``/data-sources``
     - ``DataSources``
     - Docs / DB / web
   * - ``/workflows``
     - ``Workflows``
     - Builder + runs (ErrorBoundary)
   * - ``/channels``
     - ``Channels``
     - Messaging integrations
   * - ``/community``
     - ``CommunityTools``
     - Catalog + admin submissions
   * - ``/settings``
     - ``Settings``
     - MCP, keys, triggers
   * - ``/profile``
     - ``Profile``
     - ``PUT /auth/me``

Orphan page
-----------

``Users.tsx`` implements team invite/role UI but is **not** wired into the
router. See :doc:`../team-guide`.
