:orphan:

Operations
==========

This page is intentionally **hidden from the sidebar** (``:orphan:``). It
covers building and hosting this documentation site — not the FlowStudio app
itself.

Build docs locally
------------------

.. code-block:: bash

   python -m pip install -r docs/requirements.txt
   python -m sphinx -b html docs docs/_build/html

Helpers:

* Windows PowerShell: ``.\docs\publish.ps1``
* Windows CMD: ``docs\publish.bat``

Open ``docs/_build/html/index.html`` in a browser. Expected look: dark Read
the Docs left sidebar with **Contents:** and search, white main content.

Deploy
------

Deploy **only** the built HTML tree:

.. code-block:: text

   docs/_build/html/*  →  /var/www/frontend-documentation/

Never upload ``.rst``, ``conf.py``, or ``requirements.txt`` to the public
document root.

Nginx example
-------------

.. code-block::nginx

   location = /frontend-documentation {
     return 301 /frontend-documentation/;
   }

   location ^~ /frontend-documentation/ {
     alias /var/www/frontend-documentation/;
     index index.html;
   }

Verify
------

.. code-block:: bash

   curl -I https://flowstudio.crestwardlabs.com/frontend-documentation/
   curl -I https://flowstudio.crestwardlabs.com/frontend-documentation/_static/css/theme.css

App hosting note
----------------

The product UI is separate (e.g. https://flowstudio.crestwardlabs.com/workflows/).
Serve the Vite ``dist/`` with SPA fallback; set ``VITE_API_URL`` at build time.
