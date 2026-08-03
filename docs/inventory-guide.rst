Data sources
============

Screen: ``/data-sources`` (``DataSources.tsx``). Filename
``inventory-guide.rst`` maps to **Data Sources** in FlowStudio.

Purpose
-------

Connect knowledge inputs used by agents and workflows: uploaded documents,
database sources, and websites (crawl / schema helpers).

Capabilities
------------

* CRUD data sources.
* Test connection.
* Fetch schema.
* Upload files (multipart ``fetch``; may include tenant header).
* List / delete files.
* Crawl website sources.
* Derive schema from URL (``POST /data-sources/schema-from-url``).
* Filter builder UI for query-oriented sources.

APIs used
---------

.. list-table::
   :header-rows: 1
   :widths: 14 52 34

   * - Method
     - Path
     - Usage
   * - GET
     - ``/data-sources``
     - List
   * - POST
     - ``/data-sources``
     - Create
   * - PUT
     - ``/data-sources/{sourceId}``
     - Update
   * - DELETE
     - ``/data-sources/{sourceId}``
     - Delete
   * - POST
     - ``/data-sources/{sourceId}/test``
     - Connectivity test
   * - GET
     - ``/data-sources/{sourceId}/schema``
     - Schema inspection
   * - POST
     - ``/data-sources/{sourceId}/upload``
     - File upload
   * - GET
     - ``/data-sources/{sourceId}/files``
     - List files
   * - DELETE
     - ``/data-sources/{sourceId}/files?filename=``
     - Remove file
   * - POST
     - ``/data-sources/{sourceId}/crawl``
     - Website crawl
   * - POST
     - ``/data-sources/schema-from-url``
     - Schema from URL

Query cache key: ``queryKeys.dataSources``.
