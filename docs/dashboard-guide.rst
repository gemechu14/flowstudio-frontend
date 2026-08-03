Dashboard
=========

Screen: ``/dashboard`` (``Dashboard.tsx``).

Purpose
-------

Overview of platform activity for the signed-in tenant: aggregate counts,
activity chart data, and recent workflow runs as returned by the dashboard
stats endpoint.

Data loading
------------

Uses TanStack Query with key ``queryKeys.dashboardStats``
(``['dashboard-stats']``). After mutations on agents, tools, workflows, or
runs, callers should invoke ``invalidateDashboardStats()`` so the next
dashboard visit refetches.

API
---

.. list-table::
   :header-rows: 1
   :widths: 18 42 40

   * - Method
     - Path
     - Usage
   * - GET
     - ``/workflows/dashboard/stats``
     - Primary dashboard payload (stats, chart series, recent runs)

UI notes
--------

* Loading states use the shared skeleton patterns from ``globals.css``.
* Empty / error states surface API ``detail`` messages when present.
