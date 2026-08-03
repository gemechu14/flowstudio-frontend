Tools
=====

Screen: ``/tools`` (``Tools.tsx``). Filename ``products-guide.rst`` maps to
the **Tools** library.

Purpose
-------

Manage executable tools available to agents: upload source packages,
AI-generate stubs, approve/reject, test, edit env vars, and optionally submit
to the community catalog.

Lifecycle
---------

1. Upload (``POST /tools/upload``) or AI generate (``POST /tools/ai/generate``).
2. Review source (``GET /tools/{id}/source``).
3. Approve / reject.
4. Test with payload (``POST /tools/{id}/test``).
5. Configure secrets/config via env-var editor.
6. Optional community submit from Tools or Community pages.

APIs used
---------

.. list-table::
   :header-rows: 1
   :widths: 14 48 38

   * - Method
     - Path
     - Usage
   * - GET
     - ``/tools`` (optional ``?status=``)
     - List / filter
   * - POST
     - ``/tools/upload``
     - Upload package
   * - GET
     - ``/tools/{id}/source``
     - View source
   * - POST
     - ``/tools/{id}/approve``
     - Approve
   * - POST
     - ``/tools/{id}/reject``
     - Reject
   * - POST
     - ``/tools/{id}/test``
     - Run test
   * - PUT
     - ``/tools/{id}``
     - Replace / update upload
   * - DELETE
     - ``/tools/{id}``
     - Delete
   * - POST
     - ``/tools/ai/generate``
     - AI scaffold
   * - GET
     - ``/tools/{toolId}/env-vars``
     - List env var status
   * - PUT
     - ``/tools/{toolId}/env-vars/{keyName}``
     - Set env var
   * - DELETE
     - ``/tools/{toolId}/env-vars/{keyName}``
     - Delete env var

Query cache key: ``queryKeys.tools``.
