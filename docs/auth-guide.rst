Authentication
==============

Screen: ``/login`` (``Login.tsx``). Branding: **FLOWSTUDIO** / Crestward Labs.

Flows
-----

Login
~~~~~

1. User enters email + password.
2. ``POST /auth/login`` with JSON ``{ email, password }``.
3. Response ``AuthUser`` includes ``access_token``.
4. Frontend stores token via ``setToken`` → ``localStorage.cl_token``.
5. ``setUser(user)`` and navigate to ``/dashboard``.

Register (create organization)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

1. Fields: organization name, first/last name, email, password.
2. ``POST /auth/register`` with
   ``{ org_name, email, password, first_name, last_name }``.
3. Same token + navigate behavior as login.

Session restore
~~~~~~~~~~~~~~~

On app load, ``AuthContext`` calls ``GET /auth/me`` with Bearer token when
``cl_token`` exists. Failures clear the session.

Logout
~~~~~~

Clears ``cl_token`` and ``cl_user``, then hard-navigates to ``/login``.

APIs used
---------

.. list-table::
   :header-rows: 1
   :widths: 18 42 40

   * - Method
     - Path
     - Screen / caller
   * - POST
     - ``/auth/login``
     - Login form
   * - POST
     - ``/auth/register``
     - Register form
   * - GET
     - ``/auth/me``
     - ``AuthContext`` bootstrap
   * - PUT
     - ``/auth/me``
     - Profile page (name/password)

Not implemented in this frontend
--------------------------------

* Google OAuth start/callback
* Forgot / reset / set password endpoints
* Refresh-token rotation

Those flows are absent from ``src/``; do not assume they exist.
