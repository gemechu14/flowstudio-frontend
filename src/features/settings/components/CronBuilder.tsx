import { useState } from 'react'
import { TIMEZONES } from '../../../shared/constants'
import {
  MONO, SANS,
  DAYS_OF_WEEK, HOURS, MINUTES, MONTH_DAYS,
  buildCron, humanLabel,
  type CronFreq,
} from '../lib/settingsUi'

export function CronBuilder({
  value, timezone, onChange, onTimezoneChange,
}: {
  value: string
  timezone: string
  onChange: (cron: string) => void
  onTimezoneChange: (tz: string) => void
}) {
  const [freq, setFreq]     = useState<CronFreq>('day')
  const [hour, setHour]     = useState('09')
  const [minute, setMinute] = useState('00')
  const [dow, setDow]       = useState('1')
  const [dom, setDom]       = useState('1')

  const emit = (f: CronFreq, h: string, m: string, d: string, dm: string) => {
    onChange(buildCron(f, m, h, d, dm))
  }

  const set = (setter: (v: any) => void, val: string, next: Partial<{f: CronFreq; h: string; m: string; d: string; dm: string}>) => {
    setter(val)
    emit(next.f ?? freq, next.h ?? hour, next.m ?? minute, next.d ?? dow, next.dm ?? dom)
  }

  const SEL: React.CSSProperties = {
    ...SANS, fontSize: 14, padding: '6px 10px',
    backgroundColor: 'var(--card-bg)', color: 'var(--text-heading)',
    border: '1px solid var(--border)', borderRadius: 8,
    cursor: 'pointer', colorScheme: 'dark light',
  }

  const tzLabel = TIMEZONES.find(t => t.value === timezone)?.label ?? timezone
  const label = humanLabel(freq, minute, hour, dow, dom)

  return (
    <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>

      {/* Row 1 — frequency + time */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 10 }}>

        <span style={{ ...MONO, fontSize: 12, color: 'var(--text-tertiary)' }}>Run every</span>

        <select style={SEL} value={freq} onChange={e => set(setFreq, e.target.value as CronFreq, { f: e.target.value as CronFreq })}>
          <option value="hour">hour</option>
          <option value="day">day</option>
          <option value="week">week</option>
          <option value="month">month</option>
        </select>

        {freq === 'week' && (
          <>
            <span style={{ ...MONO, fontSize: 12, color: 'var(--text-tertiary)' }}>on</span>
            <select style={SEL} value={dow} onChange={e => set(setDow, e.target.value, { d: e.target.value })}>
              {DAYS_OF_WEEK.map((d, i) => <option key={i} value={String(i)}>{d}</option>)}
            </select>
          </>
        )}

        {freq === 'month' && (
          <>
            <span style={{ ...MONO, fontSize: 12, color: 'var(--text-tertiary)' }}>on day</span>
            <select style={SEL} value={dom} onChange={e => set(setDom, e.target.value, { dm: e.target.value })}>
              {MONTH_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </>
        )}

        {freq !== 'hour' ? (
          <>
            <span style={{ ...MONO, fontSize: 12, color: 'var(--text-tertiary)' }}>at</span>
            <select style={SEL} value={hour} onChange={e => set(setHour, e.target.value, { h: e.target.value })}>
              {HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
            </select>
          </>
        ) : (
          <span style={{ ...MONO, fontSize: 12, color: 'var(--text-tertiary)' }}>at minute</span>
        )}

        <select style={SEL} value={minute} onChange={e => set(setMinute, e.target.value, { m: e.target.value })}>
          {MINUTES.map(m => <option key={m} value={m}>:{m}</option>)}
        </select>
      </div>

      {/* Row 2 — timezone */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ ...MONO, fontSize: 12, color: 'var(--text-tertiary)' }}>Timezone</span>
        <select
          style={{ ...SEL, minWidth: 200 }}
          value={timezone}
          onChange={e => onTimezoneChange(e.target.value)}
        >
          {TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ ...SANS, fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
          {label} — {tzLabel}
        </span>
        <span style={{
          ...MONO, fontSize: 10, padding: '2px 8px', borderRadius: 4,
          background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--blue-border)',
        }}>{value || buildCron(freq, minute, hour, dow, dom)}</span>
      </div>
    </div>
  )
}
