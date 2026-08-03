State
=====

AuthProvider
------------

``src/contexts/AuthContext.tsx``

* Exposes ``user``, ``setUser``, ``isLoading``.
* Bootstraps from ``cl_token`` + ``cl_user``, then validates with
  ``GET /auth/me``.
* ``logout`` clears token/user and navigates to ``/login``.

ThemeProvider
-------------

``src/contexts/ThemeContext.tsx``

* Theme ``light`` | ``dark`` persisted as ``cl_theme``.
* Sidebar collapsed flag ``cl_sidebar_collapsed``.
* Mobile nav open state for the responsive shell.

React Query
-----------

``src/lib/queryClient.ts`` — shared ``QueryClient``, ``queryKeys``, and
``invalidateDashboardStats()``. Pages use ``useQuery`` / ``useMutation`` for
list and stats caching (see :doc:`../configuration`).

ToastProvider
-------------

``src/components/ui/Toast.tsx`` — app-level toasts via ``useToast().show``.
Viewport is portaled to ``document.body`` so placement is viewport top-right.
