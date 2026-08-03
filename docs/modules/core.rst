Core
====

Entry & shell
-------------

* ``src/main.tsx`` — mounts React, wraps ``BrowserRouter``, loads global CSS.
* ``src/App.tsx`` — ``QueryClientProvider`` → ``ThemeProvider`` →
  ``AuthProvider`` → ``ToastProvider`` → ``AppShell`` with routes.
* ``src/constants.ts`` — shared constants (e.g. timezone list for schedules).

HTTP core
---------

``src/api/client.ts``:

* ``BASE_URL`` from ``import.meta.env.VITE_API_URL`` (default
  ``http://localhost:8000``).
* ``getToken`` / ``setToken`` / ``clearToken`` for ``cl_token``.
* ``apiFetch<T>(path, options)`` — Bearer auth, optional ``x-active-tenant``,
  JSON body Content-Type, 15s default timeout, 401 redirect, ``ApiError`` /
  ``NetworkError``.

Design system
-------------

``src/styles/globals.css`` — CSS variables for light/dark themes, sidebar,
top bar, workflow canvas, responsive breakpoints, and ``.app-toast``.
