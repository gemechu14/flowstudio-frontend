Community & platform admin
==========================

Screen: ``/community`` (``CommunityTools.tsx``). Filename
``platform-guide.rst`` covers community catalog plus ``super_admin`` platform
controls.

Catalog (all authenticated users)
---------------------------------

Browse shared tools; enable or disable for the current tenant where the UI
exposes those actions.

Super admin
-----------

* **Submissions** tab — review pending community submissions.
* Approve / reject submissions.
* Remove catalog entries.
* **Tenant switcher** in the sidebar (``GET /admin/tenants``) stores
  ``cl_active_tenant`` and sends ``x-active-tenant`` on subsequent API calls.

APIs used
---------

.. list-table::
   :header-rows: 1
   :widths: 14 48 38

   * - Method
     - Path
     - Usage
   * - GET
     - ``/community/catalog``
     - Browse catalog
   * - GET
     - ``/community/submissions``
     - Admin submissions queue
   * - POST
     - ``/community/submit/{toolId}``
     - Submit tool (from Tools)
   * - POST
     - ``/community/approve/{toolId}``
     - Approve submission
   * - POST
     - ``/community/reject/{toolId}``
     - Reject submission
   * - POST
     - ``/community/enable/{toolId}``
     - Enable for tenant
   * - POST
     - ``/community/disable/{toolId}``
     - Disable for tenant
   * - DELETE
     - ``/community/catalog/{toolId}``
     - Remove from catalog
   * - GET
     - ``/admin/tenants``
     - Tenant switcher (Sidebar)

Query keys: ``queryKeys.communityCatalog``,
``queryKeys.communitySubmissions``.
