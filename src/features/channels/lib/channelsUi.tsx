import type { ReactNode } from 'react'
import type { ChannelType } from '../api/channels.api'

export const MONO = { fontFamily: 'var(--font-mono)' } as const
export const SANS = { fontFamily: 'var(--font-sans)' } as const

export const ANTHROPIC_MODELS = [
  { id: 'claude-sonnet-5',  label: 'Claude Sonnet 5' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { id: 'claude-opus-4-8',  label: 'Claude Opus 4.8' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  { id: 'claude-fable-5',   label: 'Claude Fable 5' },
]

export const OPENAI_MODELS = [
  { id: 'gpt-4.1',      label: 'GPT-4.1' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  { id: 'gpt-4o',       label: 'GPT-4o' },
  { id: 'gpt-4o-mini',  label: 'GPT-4o mini' },
]

export const CHANNEL_META: Record<ChannelType, {
  label: string; color: string; placeholder: string; hint: string
  icon: (size?: number) => ReactNode
}> = {
  slack: {
    label: 'Slack', color: '#4A154B', placeholder: 'xoxb-…', hint: 'Bot User OAuth Token from your Slack app',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" fill="#E01E5A"/>
        <path d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
        <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" fill="#36C5F0"/>
        <path d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
        <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z" fill="#2EB67D"/>
        <path d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
        <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z" fill="#ECB22E"/>
        <path d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
      </svg>
    ),
  },
  telegram: {
    label: 'Telegram', color: '#229ED9', placeholder: '123456:ABC-…', hint: 'Bot token from @BotFather',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#229ED9"/>
        <path d="M9.417 15.181l-.397 5.584c.568 0 .814-.244 1.109-.537l2.663-2.545 5.518 4.041c1.012.564 1.725.267 1.998-.931L23.93 4.862c.321-1.496-.541-2.082-1.527-1.714L1.538 11.557c-1.45.564-1.426 1.37-.247 1.737l5.443 1.7 12.643-7.921c.595-.394 1.136-.176.691.218z" fill="white"/>
      </svg>
    ),
  },
  discord: {
    label: 'Discord', color: '#5865F2', placeholder: 'MTk…', hint: 'Bot token from the Discord Developer Portal',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#5865F2">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.025.012.049.031.063a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    ),
  },
  whatsapp: {
    label: 'WhatsApp', color: '#25D366', placeholder: 'EAAl…', hint: 'Permanent access token from Meta for Developers',
    icon: (size = 20) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 0C5.373 0 0 5.373 0 12c0 2.127.556 4.123 1.528 5.855L0 24l6.337-1.508A11.948 11.948 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" fill="#25D366"/>
        <path d="M8.93 6.544c-.275 0-.724.1-1.104.504-.38.404-1.452 1.42-1.452 3.464s1.487 4.02 1.696 4.296c.208.275 2.897 4.62 7.138 6.295 3.533 1.393 4.243 1.117 5.007 1.046.763-.07 2.46-1.006 2.807-1.978.347-.97.347-1.804.243-1.978-.105-.174-.382-.278-.797-.486-.416-.208-2.46-1.214-2.842-1.352-.381-.14-.66-.208-.938.208-.277.416-1.074 1.352-1.316 1.63-.243.277-.486.312-.9.104-.416-.208-1.754-.647-3.342-2.064-1.236-1.102-2.07-2.463-2.313-2.879-.242-.416-.026-.64.183-.848.187-.186.416-.486.624-.73.208-.242.277-.416.416-.693.139-.278.07-.52-.035-.73-.104-.208-.934-2.254-1.28-3.084-.34-.811-.68-.7-.938-.712z" fill="white"/>
      </svg>
    ),
  },
}

export const CHANNEL_TYPES: ChannelType[] = ['slack', 'telegram', 'discord', 'whatsapp']

export const SETUP_STEPS: Record<ChannelType, { step: string; action: string }[]> = {
  slack: [
    { step: '1', action: 'Go to api.slack.com/apps → Create New App → From scratch' },
    { step: '2', action: 'OAuth & Permissions → add Bot Token Scopes: chat:write, channels:history, app_mentions:read, im:history' },
    { step: '3', action: 'Install to workspace → copy the Bot User OAuth Token (starts with xoxb-)' },
    { step: '4', action: 'Paste token below → Add Channel → copy the Webhook URL' },
    { step: '5', action: 'Socket Mode → turn OFF (otherwise HTTP webhooks are never called)' },
    { step: '6', action: 'Event Subscriptions → enable → paste Webhook URL → subscribe to app_mention, message.channels, message.im' },
  ],
  telegram: [
    { step: '1', action: 'Open Telegram → message @BotFather → /newbot → follow prompts' },
    { step: '2', action: 'Copy the token BotFather gives you (format: 123456:ABC-…)' },
    { step: '3', action: 'Paste token below → Add Channel → copy the Webhook URL' },
    { step: '4', action: 'Click "Connect to Telegram" below to register the webhook automatically' },
  ],
  discord: [
    { step: '1', action: 'Go to discord.com/developers/applications → New Application → Bot → Add Bot' },
    { step: '2', action: 'Reset Token → copy it. Enable Message Content Intent under Privileged Gateway Intents' },
    { step: '3', action: 'General Information → copy the Public Key' },
    { step: '4', action: 'Paste bot token + public key below → Add Channel → copy the Webhook URL' },
    { step: '5', action: 'Set Interactions Endpoint URL in General Information to the Webhook URL' },
    { step: '6', action: 'Invite the bot to your server via OAuth2 → URL Generator (scope: bot)' },
    { step: '7', action: '@mention the bot in any channel, or DM it directly — no slash command needed' },
  ],
  whatsapp: [
    { step: '1', action: 'Go to developers.facebook.com → My Apps → Create App → WhatsApp use case' },
    { step: '2', action: 'WhatsApp → API Setup → copy the Temporary access token and the WhatsApp Business Account ID' },
    { step: '3', action: 'Paste token + WABA ID below → Add Channel → copy the Webhook URL' },
    { step: '4', action: 'Step 2. Production setup → Configure Webhooks → paste Webhook URL, Verify token: flowstudio → Verify and save' },
    { step: '5', action: 'Click "Connect to WhatsApp" below to subscribe to message events' },
  ],
}
