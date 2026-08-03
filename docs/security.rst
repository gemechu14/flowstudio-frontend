Security
========

Token storage
-------------

The frontend stores session data in **localStorage** only (no sessionStorage
for auth):

.. list-table::
   :header-rows: 1
   :widths: 32 68

   * - Key
     - Purpose
   * - ``cl_token``
     - Access token (JWT). Set on login/register; cleared on logout / 401.
   * - ``cl_user``
     - Cached ``AuthUser`` JSON for fast shell hydrate before ``GET /auth/me``.
   * - ``cl_active_tenant``
     - Super-admin tenant switch JSON ``{ tenant_id, name, slug }``.
   * - ``cl_theme``
     - ``light`` or ``dark`` preference.
   * - ``cl_sidebar_collapsed``
     - ``1`` / ``0`` sidebar width preference.

Authorization header
--------------------

``apiFetch`` in ``src/api/client.ts`` attaches:

.. code-block:: text

   Authorization: Bearer <cl_token>

When ``cl_active_tenant`` is present and parseable, it also sends:

.. code-block:: text

   x-active-tenant: <tenant_id>

Session bootstrap
-----------------

1. No ``cl_token`` → unauthenticated (``user = null``).
2. Token present → hydrate from ``cl_user``, then ``GET /auth/me``.
3. Success → refresh user cache; failure → clear ``cl_token`` and ``cl_user``.

401 handling
------------

On HTTP **401**, ``apiFetch``:

1. Calls ``clearToken()`` (removes ``cl_token``).
2. Redirects with ``window.location.href = '/login'``.
3. Throws ``ApiError(401, 'Session expired')``.

There is **no refresh-token flow** in this frontend. Expired sessions require
logging in again.

Role-based UI gates
-------------------

* ``super_admin`` — tenant switcher; community submission moderation.
* ``org_admin`` / ``member`` — distinguished mainly in the unrouted
  ``Users.tsx`` invite form.
* Do not treat client-side checks as security boundaries; the API must enforce
  authorization.

Secrets & Vite env
------------------

* Never put API secrets, private keys, or OAuth client secrets in
  ``VITE_*`` variables — they are embedded in the browser bundle.
* ``VITE_API_URL`` is a public origin only.
* Provider API keys for LLMs are stored via the Settings UI
  (``/settings/api-keys``) on the backend, not in frontend env files.

Network failures
----------------

Failed fetches (offline / unreachable API) raise ``NetworkError`` and dispatch
a ``backend:unreachable`` window event so ``AppShell`` can show
``BackendErrorScreen``.
