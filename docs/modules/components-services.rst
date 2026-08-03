Components & services
=====================

Layout
------

* ``Sidebar`` — navigation, brand, tenant switcher (``super_admin``).
* ``TopBar`` — page chrome / mobile menu.
* ``AppShellSkeleton`` — loading chrome while auth hydrates.

UI primitives
-------------

``components/ui/``: ``Button``, ``Badge``, ``Card``, ``ConfirmModal``,
``FilterBuilder``, ``Toast``.

Feature components
------------------

* ``components/tools/`` — upload, card, tester, validator, env-var editor.
* ``components/agents/`` — ``AgentPanel``, ``AgentChat`` (SSE stream to
  ``POST /agents/{id}/stream``).

API service modules
-------------------

See :doc:`../features` for the module map. Each file under ``src/api/`` wraps
paths relative to ``BASE_URL`` and returns typed records used by pages.

Error surfaces
--------------

* ``ErrorBoundary`` — wraps Workflows route.
* ``BackendErrorScreen`` — full-page when ``backend:unreachable`` fires.
