Agents
======

Screen: ``/agents`` (``Agents.tsx``). Filename ``customers-guide.rst`` maps to
the **Agents** product surface in this codebase.

Purpose
-------

Create and manage AI agents (name, system prompt, model settings as exposed by
the API), open a chat panel, and stream responses.

UI
--

* List / select agents.
* ``AgentPanel`` for create/edit.
* ``AgentChat`` for conversational testing with server-sent streaming.

APIs used
---------

.. list-table::
   :header-rows: 1
   :widths: 14 48 38

   * - Method
     - Path
     - Usage
   * - GET
     - ``/agents``
     - List agents
   * - POST
     - ``/agents``
     - Create agent
   * - PUT
     - ``/agents/{id}``
     - Update agent
   * - DELETE
     - ``/agents/{id}``
     - Delete agent
   * - POST
     - ``/agents/{agentId}/stream``
     - SSE chat stream (``AgentChat``)

Query cache key: ``queryKeys.agents``.
