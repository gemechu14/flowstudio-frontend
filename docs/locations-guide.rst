Channels
========

Screen: ``/channels`` (``Channels.tsx``). Filename ``locations-guide.rst``
maps to **Channels** (messaging integrations).

Purpose
-------

Configure bots and inbound webhooks for Slack, Telegram, Discord, and
WhatsApp so external messages can reach FlowStudio agents/workflows.

Capabilities
------------

* List / create / update / delete channel configs.
* Register Discord slash commands.
* Register WhatsApp.
* Register webhook endpoints.
* Build webhook URL helper:
  ``{BASE_URL}/channels/webhook/{channelType}/{webhookSecret}``.

APIs used
---------

.. list-table::
   :header-rows: 1
   :widths: 14 52 34

   * - Method
     - Path
     - Usage
   * - GET
     - ``/channels``
     - List configs
   * - POST
     - ``/channels``
     - Create
   * - PUT
     - ``/channels/{configId}``
     - Update
   * - DELETE
     - ``/channels/{configId}``
     - Delete
   * - POST
     - ``/channels/{configId}/register-discord-commands``
     - Discord commands
   * - POST
     - ``/channels/{configId}/register-whatsapp``
     - WhatsApp registration
   * - POST
     - ``/channels/{configId}/register-webhook``
     - Webhook registration

Query cache key: ``queryKeys.channels``.
