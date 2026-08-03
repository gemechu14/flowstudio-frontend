Workflows
=========

Screen: ``/workflows`` (``Workflows.tsx``). Live URL example:
https://flowstudio.crestwardlabs.com/workflows/

This is the primary visual builder for agentic pipelines. Filename
``formulas-guide.rst`` is retained for docs layout compatibility; the product
feature is **Workflows**.

Concepts
--------

Workflow
  Named graph with ``execution_mode``, optional ``loop_iterations``,
  ``enable_memory``, ``convergence_expr``, plus ``nodes`` and ``edges``.

Node
  Canvas unit: ``node_type``, ``label``, optional ``agent_id``, position,
  and free-form ``config`` (e.g. ``parallel_group`` in hybrid mode).

Edge
  Directed link with optional ``condition_expr`` and port metadata
  (``from_side``, ``to_side``, offsets) for the canvas.

Run
  Execution instance with status, token totals, per-node results, and optional
  collaborative ``blackboard``.

Checkpoint
  Pause state for runs with status ``awaiting_checkpoint``; resume continues
  from the saved checkpoint.

Execution modes
---------------

.. list-table::
   :header-rows: 1
   :widths: 24 76

   * - Mode
     - UI label
   * - ``sequential``
     - Sequential — Pipeline
   * - ``parallel``
     - Parallel — Fan-out
   * - ``hierarchical``
     - Hierarchical — Orchestrator
   * - ``hybrid``
     - Hybrid — DAG + Orchestrator
   * - ``collaborative``
     - Collaborative — Review Loop
   * - ``event_driven``
     - Event-Driven — Pub/Sub

Node types
----------

Supported ``NodeType`` values: ``agent``, ``orchestrator``, ``fan_out``,
``fan_in``, ``condition``, ``loop``, ``switch``, ``subworkflow``,
``collaborative_node``.

ADD chips in the toolbar are mode-aware (e.g. Orchestrator for hierarchical /
hybrid; Collab for hybrid).

Canvas UX
---------

* Dot-grid canvas (``--canvas-bg`` / ``--canvas-dot``).
* Drag nodes; connect via ports (port-drag state).
* Auto layout helper.
* Zoom controls.
* Mobile (≤1100px): list-first pane; detail tabs **Canvas / Run Result /
  History**.

Toolbar
-------

* Name + description fields.
* Mode dropdown (full ``MODE_LABELS``).
* Delete (soft-red) + Save (toast on success/error via ``useToast``).
* Delete placeholder keeps layout stable when nothing is selected.

Run results & inspector
-----------------------

* Result table columns: AGENT / STATUS / TIME / TOKENS / VIEW.
* Agent Inspector slide-over: System / Input / Output tabs, copy, expand.
* Shared Blackboard panel for collaborative runs (accent tokens).
* Run history cards with clear-all and per-run delete (confirm modal).

Triggers
--------

Schedules and webhooks can be managed from the workflow UI and also appear
under Settings.

APIs used
---------

.. list-table::
   :header-rows: 1
   :widths: 14 48 38

   * - Method
     - Path
     - Screen usage
   * - GET
     - ``/workflows``
     - List sidebar
   * - POST
     - ``/workflows``
     - Create / first save
   * - PUT
     - ``/workflows/{id}``
     - Update graph + metadata
   * - DELETE
     - ``/workflows/{id}``
     - Delete workflow
   * - POST
     - ``/workflows/{id}/run``
     - Run with initial input
   * - GET
     - ``/workflows/{id}/runs``
     - Run history
   * - GET
     - ``/workflows/{id}/runs/{run_id}``
     - Run detail / poll
   * - DELETE
     - ``/workflows/{id}/runs/{run_id}``
     - Delete one run
   * - DELETE
     - ``/workflows/{id}/runs``
     - Clear all runs
   * - GET
     - ``/workflows/{id}/runs/{run_id}/checkpoint``
     - Inspect checkpoint
   * - POST
     - ``/workflows/{id}/runs/{run_id}/resume``
     - Resume after checkpoint
   * - GET
     - ``/triggers/schedules?workflow_id=``
     - List schedules
   * - POST
     - ``/triggers/schedules``
     - Create schedule
   * - DELETE
     - ``/triggers/schedules/{trigger_id}``
     - Delete schedule
   * - GET
     - ``/triggers/webhooks?workflow_id=``
     - List webhooks
   * - POST
     - ``/triggers/webhooks``
     - Create webhook
   * - DELETE
     - ``/triggers/webhooks/{webhook_id}``
     - Delete webhook
   * - POST
     - ``/triggers/webhooks/{webhook_id}/rotate-secret``
     - Rotate webhook secret
   * - GET
     - ``/agents``
     - Bind agents to nodes

Agents list is loaded so node pickers can assign ``agent_id`` values.
