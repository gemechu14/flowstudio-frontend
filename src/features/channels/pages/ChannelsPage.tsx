import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ChannelConfig,
  listChannels,
} from '../api/channels.api'
import { queryKeys } from '../../../shared/api/queryKeys'
import { SANS } from '../lib/channelsUi'
import { ChannelRow } from '../components/ChannelRow'
import { AddChannelForm } from '../components/AddChannelForm'
import { SetupGuideSection } from '../components/SetupGuideSection'
import { ChannelsListSkeleton } from '../components/ChannelsSkeleton'

export default function ChannelsPage() {
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)

  const { data: channels = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.channels,
    queryFn: () => listChannels().catch(() => [] as ChannelConfig[]),
  })

  const existingTypes = new Set(channels.map(c => c.channel_type))

  return (
    <div
      className="ch-page"
      style={{
      padding: '28px 36px', width: '100%', boxSizing: 'border-box',
      background: 'var(--bg-surface)', minHeight: '100%', ...SANS,
    }}>

      {/* Header */}
      <div
        className="ch-header"
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}
      >
        <div className="ch-header-copy">
          <div style={{ ...SANS, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 6 }}>
            CHANNELS
          </div>
          <h2 style={{ ...SANS, fontSize: 16, fontWeight: 500, color: 'var(--text-heading)', margin: 0 }}>
            Bot Integrations
          </h2>
          <p style={{ ...SANS, fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, marginBottom: 0, maxWidth: 540 }}>
            Connect FlowStudio to messaging platforms. Users can trigger and monitor workflows by chatting with your bot.
          </p>
        </div>
        <button
          className="ch-add-btn"
          onClick={() => setShowAddForm(v => !v)}
          style={{
            ...SANS, fontSize: 13, padding: '8px 16px',
            background: showAddForm ? 'var(--bg-hover)' : 'var(--accent)',
            color: showAddForm ? 'var(--text-secondary)' : 'var(--btn-upload-text)',
            border: `1px solid ${showAddForm ? 'var(--border)' : 'var(--accent)'}`,
            borderRadius: 999,
            cursor: 'pointer', fontWeight: 600, flexShrink: 0, marginTop: 2,
          }}
        >{showAddForm ? 'Cancel' : '+ Add Channel'}</button>
      </div>

      {showAddForm && (
        <AddChannelForm
          onCreated={c => {
            queryClient.setQueryData<ChannelConfig[]>(queryKeys.channels, (prev = []) => [...prev, c])
            setShowAddForm(false)
          }}
          onCancel={() => setShowAddForm(false)}
          existingTypes={existingTypes}
        />
      )}

      {/* Channel list */}
      {loading ? (
        <ChannelsListSkeleton />
      ) : channels.length === 0 && !showAddForm ? (
        <div style={{
          textAlign: 'center', padding: '60px 0',
          background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12,
        }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>💬</div>
          <div style={{ ...SANS, fontSize: 14, color: 'var(--text-heading)', fontWeight: 600, marginBottom: 6 }}>
            No channels connected
          </div>
          <div style={{ ...SANS, fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 340, margin: '0 auto 20px' }}>
            Add Slack, Telegram, Discord, or WhatsApp so users can chat directly with your workflows.
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              ...SANS, fontSize: 13, padding: '8px 16px',
              background: 'var(--accent)', color: 'var(--btn-upload-text)', border: '1px solid var(--accent)',
              borderRadius: 999, cursor: 'pointer', fontWeight: 600,
            }}
          >+ Add Your First Channel</button>
        </div>
      ) : (
        channels.map(c => (
          <ChannelRow
            key={c.config_id}
            config={c}
            onUpdated={updated => queryClient.setQueryData<ChannelConfig[]>(queryKeys.channels, (prev = []) =>
              prev.map(x => x.config_id === updated.config_id ? updated : x)
            )}
            onDeleted={() => queryClient.setQueryData<ChannelConfig[]>(queryKeys.channels, (prev = []) =>
              prev.filter(x => x.config_id !== c.config_id)
            )}
          />
        ))
      )}

      {/* Info box */}
      {!loading && channels.length > 0 && (
        <div
          className="ch-howto"
          style={{
          ...SANS, fontSize: 12, color: 'var(--text-tertiary)',
          padding: '12px 16px', background: 'var(--bg-surface)',
          border: '1px solid var(--border)', borderRadius: 8,
          lineHeight: 1.6, marginTop: 4,
        }}>
          <strong style={{ color: 'var(--text-secondary)' }}>How it works:</strong>{' '}
          Users message your bot. The bot routes their intent to the right workflow automatically using AI.
          Supported commands: <em>run [workflow]</em>, <em>status</em>, <em>schedule [workflow] daily at 9am</em>, <em>list schedules</em>, and natural language questions about your data.
        </div>
      )}

      <SetupGuideSection />
    </div>
  )
}
