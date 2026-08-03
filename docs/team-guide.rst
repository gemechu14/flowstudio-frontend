Team & roles
============

Filename ``team-guide.rst``. Team management UI lives in ``Users.tsx``.

Current routing status
----------------------

``Users.tsx`` is **not registered** in ``App.tsx``. The page implements invite
and role editing against the users API, but end users cannot navigate to it
until a route is added (e.g. ``/users``).

Roles
-----

.. list-table::
   :header-rows: 1
   :widths: 24 76

   * - Role
     - Notes
   * - ``member``
     - Default role for new invites in the Users form
   * - ``org_admin``
     - Org administration (invite / role change in Users UI)
   * - ``super_admin``
     - Platform admin; tenant switcher + community moderation elsewhere

APIs used (by ``auth.ts`` / Users page)
---------------------------------------

.. list-table::
   :header-rows: 1
   :widths: 14 40 46

   * - Method
     - Path
     - Usage
   * - GET
     - ``/users``
     - List tenant users
   * - POST
     - ``/users``
     - Create / invite user
   * - PUT
     - ``/users/{user_id}``
     - Update user / role
   * - DELETE
     - ``/users/{user_id}``
     - Deactivate / remove

Create/update forms allow assigning ``org_admin`` or ``member`` (not
promoting to ``super_admin`` via that UI).
