import { useState, type ReactNode } from 'react'
import type { ChannelType } from '../api/channels.api'
import { MONO, SANS, CHANNEL_META, CHANNEL_TYPES } from '../lib/channelsUi'

type GuideStep = { title: string; body: ReactNode }

const GUIDES: Record<ChannelType, GuideStep[]> = {
  slack: [
    {
      title: 'Create a new Slack app',
      body: <>Open the <a href="https://api.slack.com/apps" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>Slack App Portal</a> and click <strong>Create New App</strong>. Choose <strong>From scratch</strong>, give it a name like <code>FlowStudio Bot</code>, and pick your workspace.</>,
    },
    {
      title: 'Add Bot Token Scopes',
      body: <>In the left menu go to <strong>OAuth and Permissions</strong>. Under <strong>Bot Token Scopes</strong> add these eight: <code>chat:write</code>, <code>channels:history</code>, <code>channels:read</code>, <code>app_mentions:read</code>, <code>im:history</code>, <code>im:read</code>, <code>im:write</code>, and <code>reactions:write</code>. The <code>reactions:write</code> scope is what allows the bot to show a 🤔 indicator on your message while it is thinking.</>,
    },
    {
      title: 'Install the app to your workspace',
      body: <>On the same <strong>OAuth and Permissions</strong> page click <strong>Install to Workspace</strong> and approve. Copy the <strong>Bot User OAuth Token</strong> that appears. It starts with <code>xoxb-</code>.</>,
    },
    {
      title: 'Add the channel in FlowStudio',
      body: <>Click <strong>Add Channel</strong> above, select <strong>Slack</strong>, paste the token, and save. A <strong>Webhook URL</strong> will appear on the channel row. Copy it.</>,
    },
    {
      title: 'Turn off Socket Mode',
      body: <>In the left menu click <strong>Socket Mode</strong> and toggle it <strong>off</strong>. Socket Mode routes events through a WebSocket connection instead of HTTP, which means your webhook URL is never called. It must be off for FlowStudio to receive messages.</>,
    },
    {
      title: 'Register the webhook in Slack',
      body: <>Go to <strong>Event Subscriptions</strong> and toggle it <strong>On</strong>. A <strong>Request URL</strong> field will appear. Paste your FlowStudio Webhook URL there and wait for the green checkmark. Under <strong>Subscribe to bot events</strong> add all three: <code>app_mention</code>, <code>message.channels</code>, and <code>message.im</code>. Save changes. Slack may prompt you to reinstall the app.</>,
    },
    {
      title: 'Enable direct messages to the bot',
      body: <>In the Slack App Portal go to <strong>App Home</strong> in the left menu. Scroll to <strong>Show Tabs</strong> and under the <strong>Messages Tab</strong> section check <strong>Allow users to send Slash commands and messages from the messages tab</strong>. Save. Without this, users will see "Sending messages to this app has been turned off" when they try to DM the bot.</>,
    },
    {
      title: 'Invite the bot and send a message',
      body: <>In any Slack channel type <code>/invite @YourBot</code>. Or open the bot under <strong>Apps</strong> in the sidebar and DM it directly. Try: <em>"list my workflows"</em>, <em>"run sales report"</em>, or <em>"schedule daily at 9am"</em>.</>,
    },
  ],
  telegram: [
    {
      title: 'Create a bot with BotFather',
      body: <>Open Telegram and message <a href="https://t.me/BotFather" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>@BotFather</a>. Send <code>/newbot</code> and follow the prompts. The username must end in <code>bot</code>, for example <code>myflow_bot</code>.</>,
    },
    {
      title: 'Copy the bot token',
      body: <>BotFather will reply with a token like <code>1234567890:AAHdqTcvCH1vGW…</code>. Keep it private. To retrieve it later send <code>/mybots</code> to BotFather and choose <strong>API Token</strong>.</>,
    },
    {
      title: 'Add the channel in FlowStudio',
      body: <>Click <strong>Add Channel</strong> above, select <strong>Telegram</strong>, paste the token, and save. Copy the <strong>Webhook URL</strong> that appears.</>,
    },
    {
      title: 'Connect to Telegram',
      body: <>Open the channel's <strong>Setup Guide</strong> and click <strong>Connect to Telegram</strong>. FlowStudio will register the webhook with Telegram automatically — no terminal needed.</>,
    },
    {
      title: 'Send your bot a message',
      body: <>Search for your bot in Telegram by its username and start a chat. Try: <em>"list my workflows"</em>, <em>"run lead scorer"</em>, or <em>"schedule report every day at 8am"</em>.</>,
    },
  ],
  discord: [
    {
      title: 'Create a new application',
      body: <>Go to the <a href="https://discord.com/developers/applications" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>Discord Developer Portal</a> and click <strong>New Application</strong>. Give it a name and accept the terms.</>,
    },
    {
      title: 'Copy the Public Key and bot token',
      body: <>On the <strong>General Information</strong> page copy the <strong>Public Key</strong> — you will need it in the next step. Then go to <strong>Bot</strong> in the left menu, click <strong>Reset Token</strong> and copy the token. Scroll down to <strong>Privileged Gateway Intents</strong>, enable <strong>Message Content Intent</strong>, and click <strong>Save Changes</strong>. The token is shown only once, so save it now.</>,
    },
    {
      title: 'Add the channel in FlowStudio',
      body: <>Click <strong>Add Channel</strong> above, select <strong>Discord</strong>, paste the <strong>bot token</strong> and the <strong>Public Key</strong>, then save. Copy the <strong>Webhook URL</strong> that appears.</>,
    },
    {
      title: 'Set the Interactions Endpoint URL',
      body: <>Back in the Discord portal go to <strong>General Information</strong>. Paste your Webhook URL into <strong>Interactions Endpoint URL</strong> and click <strong>Save Changes</strong>. Discord will call your endpoint to verify it — FlowStudio confirms the signature automatically.</>,
    },
    {
      title: 'Invite the bot to your server',
      body: <>Go to <strong>OAuth2 &gt; URL Generator</strong>. Check the <code>bot</code> scope, then under Bot Permissions check <code>View Channels</code>, <code>Read Message History</code>, and <code>Send Messages</code>. Copy the generated URL and open it in your browser to add the bot to your server.</>,
    },
    {
      title: 'Register the /chat slash command',
      body: <>Open the channel row above, click <strong>Setup</strong>, and press <strong>Register /chat Command</strong>. This registers the global <code>/chat</code> slash command with Discord. It may take a few minutes to appear in all servers.</>,
    },
    {
      title: 'Chat with the bot',
      body: <>In any server channel the bot has access to, <strong>@mention</strong> it: <em>"@Flowstudio list my workflows"</em>, <em>"@Flowstudio run sales report"</em>. You can also <strong>DM the bot directly</strong> and type without a mention — it responds to all direct messages.</>,
    },
  ],
  whatsapp: [
    {
      title: 'Create a Meta developer app',
      body: <>Go to <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>developers.facebook.com/apps</a> and click <strong>Create App</strong>. Choose <strong>Business</strong> as the type. If you do not have a verified Meta Business account set one up first at <a href="https://business.facebook.com" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>business.facebook.com</a>.</>,
    },
    {
      title: 'Add WhatsApp to your app',
      body: <>In the app dashboard find <strong>Add Products to Your App</strong> and click <strong>Set Up</strong> under <strong>WhatsApp</strong>. Link a WhatsApp Business Account. Meta provides a free test number to get started.</>,
    },
    {
      title: 'Get your access token and WABA ID',
      body: <>Go to <strong>WhatsApp &gt; API Setup</strong>. Copy the <strong>Temporary access token</strong> and the <strong>WhatsApp Business Account ID</strong> (labeled "WhatsApp Business Account ID" just below the phone number). For production, generate a permanent system user token at <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>Business Settings &gt; System Users</a> with <code>whatsapp_business_messaging</code> permission.</>,
    },
    {
      title: 'Add the channel in FlowStudio',
      body: <>Click <strong>Add Channel</strong> above, select <strong>WhatsApp</strong>, paste the access token and the WhatsApp Business Account ID, then save. Copy the <strong>Webhook URL</strong> that appears.</>,
    },
    {
      title: 'Configure the webhook',
      body: <>Go to <strong>Step 2. Production setup &gt; Configure Webhooks</strong>. Paste your FlowStudio Webhook URL into <strong>Callback URL</strong>. For <strong>Verify Token</strong> enter <code>flowstudio</code>. Click <strong>Verify and save</strong>.</>,
    },
    {
      title: 'Connect to WhatsApp',
      body: <>Open the channel row above, click <strong>Setup</strong>, and press <strong>Connect to WhatsApp</strong>. This subscribes your app to the WhatsApp Business Account so incoming messages are forwarded to your bot. Do this every time you add a new WhatsApp channel or rotate the token.</>,
    },
    {
      title: 'Send a test message',
      body: <>In <strong>Step 1. Try it out</strong>, add your phone number as a recipient and click <strong>Send message</strong>. Once you receive it, reply — your bot will respond. Try: <em>"list my workflows"</em> or <em>"run lead scorer"</em>.</>,
    },
  ],
}

export function SetupGuideSection() {
  const [activeTab, setActiveTab] = useState<ChannelType>('slack')
  const steps = GUIDES[activeTab]
  const meta = CHANNEL_META[activeTab]

  const PLATFORM_LINKS: Record<ChannelType, { label: string; href: string }> = {
    slack:    { label: 'Slack App Portal',        href: 'https://api.slack.com/apps' },
    telegram: { label: 'Open BotFather',          href: 'https://t.me/BotFather' },
    discord:  { label: 'Discord Developer Portal', href: 'https://discord.com/developers/applications' },
    whatsapp: { label: 'Meta for Developers',     href: 'https://developers.facebook.com/apps/' },
  }

  return (
    <div
      className="ch-guides"
      style={{
      marginTop: 40,
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
      background: 'var(--bg-surface)',
    }}>
      {/* Section header */}
      <div
        className="ch-guides-header"
        style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)', gap: 12, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ ...MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: 3 }}>
            SETUP GUIDES
          </div>
          <div style={{ ...SANS, fontSize: 14, fontWeight: 700, color: 'var(--text-heading)' }}>
            Step-by-step integration docs
          </div>
        </div>
        <a
          className="ch-guides-portal"
          href={PLATFORM_LINKS[activeTab].href}
          target="_blank"
          rel="noopener"
          style={{
            ...MONO, fontSize: 10, fontWeight: 600,
            padding: '5px 12px', borderRadius: 6,
            color: meta.color, border: `1px solid ${meta.color}44`,
            background: `${meta.color}12`,
            display: 'flex', alignItems: 'center', gap: 5,
            textDecoration: 'none',
          }}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <path d="M1 8L8 1M8 1H4M8 1v4"/>
          </svg>
          {PLATFORM_LINKS[activeTab].label}
        </a>
      </div>

      {/* Tabs */}
      <div className="ch-guides-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', overflowX: 'auto' }}>
        {CHANNEL_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            style={{
              ...MONO, fontSize: 11, fontWeight: 600,
              padding: '10px 18px', background: 'none', border: 'none',
              borderBottom: activeTab === type ? `2px solid ${CHANNEL_META[type].color}` : '2px solid transparent',
              color: activeTab === type ? CHANNEL_META[type].color : 'var(--text-tertiary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              marginBottom: -1, whiteSpace: 'nowrap',
              transition: 'color 0.12s',
            }}
          >
            {CHANNEL_META[type].icon(15)}
            {CHANNEL_META[type].label}
          </button>
        ))}
      </div>

      {/* Steps */}
      <div style={{ padding: '4px 0' }}>
        {steps.map((s, i) => (
          <div
            key={i}
            style={{
              display: 'flex', gap: 0, borderBottom: i < steps.length - 1 ? '1px solid var(--border)' : 'none',
              position: 'relative',
            }}
          >
            {/* Number column with connector line */}
            <div style={{
              width: 60, flexShrink: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', padding: '20px 0 0', position: 'relative',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: `${meta.color}18`, color: meta.color,
                border: `1px solid ${meta.color}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...MONO, fontSize: 10, fontWeight: 700, zIndex: 1, position: 'relative',
              }}>{i + 1}</div>
              {i < steps.length - 1 && (
                <div style={{
                  position: 'absolute', top: 46, bottom: 0, left: '50%',
                  width: 1, background: 'var(--border)',
                  transform: 'translateX(-50%)',
                }} />
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '18px 20px 20px 0' }}>
              <div style={{ ...MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginBottom: 4, textTransform: 'uppercase' }}>
                Step {i + 1}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 7, ...SANS }}>
                {s.title}
              </div>
              <div style={{ ...SANS, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {s.body}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Success footer */}
      <div style={{
        ...SANS, fontSize: 12, color: 'var(--verified)',
        padding: '12px 20px',
        background: 'var(--verified-dim)',
        borderTop: '1px solid rgba(34,197,94,0.22)',
        fontWeight: 500,
      }}>
        Once connected, users can trigger and monitor workflows by sending natural language messages to the bot.
      </div>
    </div>
  )
}
