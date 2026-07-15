import { useState } from 'react'
import type { ColumnInfo } from '../../api/dataSources'

export type LogicOp = 'AND' | 'OR'

export interface Condition {
  id: string
  column: string
  operator: string
  value: string
  logic: LogicOp
}

function operatorsFor(colType: string): { op: string; label: string; hasValue: boolean }[] {
  const t = colType.toLowerCase()
  const isNum = /int|float|numeric|decimal|double|real|serial|bigint|smallint/.test(t)
  const isBool = /bool/.test(t)
  const isDate = /date|time|timestamp/.test(t)

  const base = [
    { op: '=',           label: 'equals',           hasValue: true  },
    { op: '!=',          label: 'not equals',        hasValue: true  },
    { op: 'IS NULL',     label: 'is null',           hasValue: false },
    { op: 'IS NOT NULL', label: 'is not null',       hasValue: false },
  ]

  if (isBool) return base

  if (isNum || isDate) return [
    ...base,
    { op: '>',  label: 'greater than',          hasValue: true },
    { op: '>=', label: 'greater than or equal', hasValue: true },
    { op: '<',  label: 'less than',             hasValue: true },
    { op: '<=', label: 'less than or equal',    hasValue: true },
    { op: 'IN', label: 'in (comma-separated)',  hasValue: true },
  ]

  return [
    ...base,
    { op: 'LIKE',     label: 'contains (LIKE %x%)',          hasValue: true },
    { op: 'NOT LIKE', label: 'not contains',                  hasValue: true },
    { op: 'ILIKE',    label: 'contains (case-insensitive)',   hasValue: true },
    { op: 'IN',       label: 'in (comma-separated)',          hasValue: true },
    { op: 'NOT IN',   label: 'not in (comma-separated)',      hasValue: true },
  ]
}

function newCondition(columns: ColumnInfo[]): Condition {
  return {
    id: Math.random().toString(36).slice(2),
    column: columns[0]?.name ?? '',
    operator: '=',
    value: '',
    logic: 'AND',
  }
}

export function sqlToConditions(sql: string): Condition[] {
  if (!sql.trim()) return []
  const lines = sql.trim().split('\n').filter(Boolean)
  const conditions: Condition[] = []
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim()
    if (i > 0) {
      const m = line.match(/^(AND|OR)\s+/i)
      if (m) {
        if (conditions.length > 0) conditions[conditions.length - 1].logic = m[1].toUpperCase() as LogicOp
        line = line.slice(m[0].length).trim()
      }
    }
    const colMatch = line.match(/^"([^"]+)"\s+(.+)$/)
    if (!colMatch) continue
    const colName = colMatch[1]
    const rest = colMatch[2].trim()
    let operator = '=', value = ''
    if (/^IS NOT NULL/i.test(rest)) {
      operator = 'IS NOT NULL'
    } else if (/^IS NULL/i.test(rest)) {
      operator = 'IS NULL'
    } else if (/^NOT IN\s*\(/i.test(rest)) {
      operator = 'NOT IN'
      value = rest.replace(/^NOT IN\s*\(/i, '').replace(/\)\s*$/, '')
        .split(',').map(v => v.trim().replace(/^'(.*)'$/, '$1').replace(/''/g, "'")).join(', ')
    } else if (/^IN\s*\(/i.test(rest)) {
      operator = 'IN'
      value = rest.replace(/^IN\s*\(/i, '').replace(/\)\s*$/, '')
        .split(',').map(v => v.trim().replace(/^'(.*)'$/, '$1').replace(/''/g, "'")).join(', ')
    } else if (/^NOT LIKE\s+/i.test(rest)) {
      operator = 'NOT LIKE'; value = rest.replace(/^NOT LIKE\s+'%(.*)%'\s*$/i, '$1').replace(/''/g, "'")
    } else if (/^ILIKE\s+/i.test(rest)) {
      operator = 'ILIKE'; value = rest.replace(/^ILIKE\s+'%(.*)%'\s*$/i, '$1').replace(/''/g, "'")
    } else if (/^LIKE\s+/i.test(rest)) {
      operator = 'LIKE'; value = rest.replace(/^LIKE\s+'%(.*)%'\s*$/i, '$1').replace(/''/g, "'")
    } else {
      const m2 = rest.match(/^(!=|>=|<=|>|<|=)\s+(.+)$/)
      if (m2) {
        operator = m2[1]
        const raw = m2[2].trim()
        value = raw.startsWith("'") && raw.endsWith("'") ? raw.slice(1, -1).replace(/''/g, "'") : raw
      }
    }
    conditions.push({ id: Math.random().toString(36).slice(2), column: colName, operator, value, logic: 'AND' })
  }
  return conditions
}

export function conditionsToSql(conditions: Condition[], columns: ColumnInfo[]): string {
  if (!conditions.length) return ''
  return conditions.map((c, i) => {
    const col = `"${c.column}"`
    const colInfo = columns.find(x => x.name === c.column)
    const t = colInfo?.type.toLowerCase() ?? ''
    const isNum = /int|float|numeric|decimal|double|real|serial|bigint|smallint/.test(t)
    const isBool = /bool/.test(t)
    let expr = ''
    if (c.operator === 'IS NULL' || c.operator === 'IS NOT NULL') {
      expr = `${col} ${c.operator}`
    } else if (c.operator === 'IN' || c.operator === 'NOT IN') {
      const vals = c.value.split(',').map(v => v.trim()).filter(Boolean)
      const formatted = vals.map(v => isNum ? v : `'${v.replace(/'/g, "''")}'`).join(', ')
      expr = `${col} ${c.operator} (${formatted})`
    } else if (c.operator === 'LIKE' || c.operator === 'NOT LIKE' || c.operator === 'ILIKE') {
      expr = `${col} ${c.operator} '%${c.value.replace(/'/g, "''")}%'`
    } else {
      const val = isBool ? c.value.toLowerCase() : isNum ? c.value : `'${c.value.replace(/'/g, "''")}'`
      expr = `${col} ${c.operator} ${val}`
    }
    if (i === 0) return expr
    return `${conditions[i - 1].logic} ${expr}`
  }).join('\n')
}

const SEL: React.CSSProperties = {
  padding: '4px 6px', borderRadius: 5, border: '1px solid var(--border-light)',
  background: '#fff', fontSize: 12, color: 'var(--text-dark)', outline: 'none',
  fontFamily: 'var(--font-mono)',
}
const INP: React.CSSProperties = {
  ...SEL, flex: 1, minWidth: 80,
}

interface Props {
  tableName: string
  columns: ColumnInfo[]
  conditions: Condition[]
  onChange: (conditions: Condition[]) => void
}

export function FilterBuilder({ tableName, columns, conditions, onChange }: Props) {
  const [hover, setHover] = useState<string | null>(null)

  const add = () => onChange([...conditions, newCondition(columns)])
  const remove = (id: string) => onChange(conditions.filter(c => c.id !== id))
  const update = (id: string, patch: Partial<Condition>) =>
    onChange(conditions.map(c => c.id === id ? { ...c, ...patch } : c))

  const sql = conditionsToSql(conditions, columns)

  return (
    <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 12px', background: '#f4f6fb', borderBottom: '1px solid var(--border-light)',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-body)', fontFamily: 'var(--font-mono)' }}>
          {tableName}
        </span>
        <button onClick={add} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, color: 'var(--blue)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          Add condition
        </button>
      </div>

      {conditions.length === 0 ? (
        <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-body)', fontStyle: 'italic' }}>
          No filters — all rows will be returned.
        </div>
      ) : (
        <div>
          {conditions.map((cond, idx) => {
            const ops = operatorsFor(columns.find(c => c.name === cond.column)?.type ?? '')
            const opInfo = ops.find(o => o.op === cond.operator) ?? ops[0]
            const isHover = hover === cond.id
            return (
              <div key={cond.id} onMouseEnter={() => setHover(cond.id)} onMouseLeave={() => setHover(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', flexWrap: 'wrap',
                  borderBottom: idx < conditions.length - 1 ? '1px solid var(--border-light)' : 'none',
                  background: isHover ? '#f9fafb' : '#fff',
                }}>
                {idx === 0
                  ? <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', fontFamily: 'var(--font-mono)', width: 38 }}>WHERE</span>
                  : (
                    <select value={conditions[idx - 1].logic}
                      onChange={e => update(conditions[idx - 1].id, { logic: e.target.value as LogicOp })}
                      style={{ ...SEL, width: 52, color: '#3b82f6', fontWeight: 700 }}>
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  )
                }
                {/* Column */}
                <select value={cond.column}
                  onChange={e => update(cond.id, { column: e.target.value, operator: '=', value: '' })}
                  style={SEL}>
                  {columns.map(col => (
                    <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                  ))}
                </select>
                {/* Operator */}
                <select value={cond.operator}
                  onChange={e => update(cond.id, { operator: e.target.value, value: '' })}
                  style={SEL}>
                  {ops.map(o => <option key={o.op} value={o.op}>{o.label}</option>)}
                </select>
                {/* Value */}
                {opInfo.hasValue && (
                  <input value={cond.value} onChange={e => update(cond.id, { value: e.target.value })}
                    placeholder={cond.operator === 'IN' || cond.operator === 'NOT IN' ? 'val1, val2' : cond.operator.includes('LIKE') ? 'search term' : 'value'}
                    style={INP} />
                )}
                {/* Delete */}
                <button onClick={() => remove(cond.id)} style={{
                  marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 3,
                  color: isHover ? '#ef4444' : '#cbd5e1', transition: 'color 0.12s',
                }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {sql && (
        <div style={{ padding: '8px 12px', background: '#f4f6fb', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-body)', marginBottom: 3, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Preview</div>
          <code style={{ fontSize: 11, color: '#374151', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{sql}</code>
        </div>
      )}
    </div>
  )
}
