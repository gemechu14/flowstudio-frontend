import { useState, type CSSProperties } from 'react'
import { uploadTool, updateTool, type AiChatMessage, type ToolRecord } from '../api/tools.api'
import { ToolAiPanel } from './ToolAiPanel'
import { highlightPython } from '../lib/highlightPython'
import { IDE, MONO, TOOL_TEMPLATE, type EditMode } from '../lib/toolsUi'

export function ToolEditorPanel({ onUploaded, editMode, onCancel }: { onUploaded: (t: ToolRecord) => void; editMode?: EditMode | null; onCancel?: () => void }) {
  const [code, setCode] = useState(editMode?.initial_code ?? TOOL_TEMPLATE)
  const [filename, setFilename] = useState(editMode?.display_name ?? 'my_tool.py')
  const [requirements, setRequirements] = useState(editMode?.initial_requirements ?? '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [aiOpen, setAiOpen] = useState(false)
  const [aiProvider, setAiProvider] = useState<'anthropic' | 'openai'>('anthropic')
  const [aiModelId, setAiModelId] = useState('claude-sonnet-5')
  const [aiMessages, setAiMessages] = useState<AiChatMessage[]>([])
  const lines = code.split('\n')

  const submit = async () => {
    if (!code.trim()) return
    setUploading(true); setError(''); setWarnings([])
    try {
      const blob = new Blob([code], { type: 'text/x-python' })
      const fname = filename.endsWith('.py') ? filename : `${filename}.py`
      const file = new File([blob], fname, { type: 'text/x-python' })
      const res = editMode
        ? await updateTool(editMode.tool_id, file, requirements)
        : await uploadTool(file, requirements)
      setWarnings(res.warnings)
      onUploaded(res.tool)
      if (!editMode) { setCode(TOOL_TEMPLATE); setFilename('my_tool.py'); setRequirements('') }
    } catch (e: any) {
      const detail = e.detail
      if (detail?.errors) setError(detail.errors.join(' · '))
      else setError(e.message || String(e))
    } finally { setUploading(false) }
  }

  // Shared font/spacing so pre and textarea pixels align perfectly
  const FONT: CSSProperties = {
    ...MONO, fontSize: 13, lineHeight: '1.65',
    whiteSpace: 'pre', overflowWrap: 'normal', tabSize: 4,
  }

  return (
    <div className="tools-editor-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minWidth: 0, background: IDE.bg, overflow: 'hidden' }}>

      {/* Title bar — compact on mobile (sheet header shows title) */}
      <div className="tools-editor-titlebar" style={{ background: IDE.gutter, padding: '9px 16px', borderBottom: `1px solid ${IDE.border}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, minWidth: 0 }}>
        <div className="tools-editor-titlebar-dots" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {['#ff5f57','#febc2e','#28c840'].map(c => (
            <span key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c, display: 'inline-block' }} />
          ))}
        </div>
        <div className="tools-editor-titlebar-center" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {editMode && (
            <span style={{ ...MONO, fontSize: 9, color: '#F59E0B', background: '#F59E0B18', border: '1px solid #F59E0B40', padding: '2px 8px', borderRadius: 4, letterSpacing: '0.08em', flexShrink: 0 }}>
              EDITING
            </span>
          )}
          <span className="tools-editor-titlebar-filename" style={{ ...MONO, fontSize: 11, color: '#6e7191', background: `${IDE.border}aa`, padding: '2px 14px', borderRadius: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            {filename}
          </span>
        </div>
        <button
          type="button"
          className="tools-editor-ai-btn"
          onClick={() => setAiOpen(o => !o)}
          style={{
            ...MONO, fontSize: 11, padding: '3px 12px', borderRadius: 5, cursor: 'pointer', flexShrink: 0,
            border: `1px solid ${aiOpen ? '#a78bfa' : IDE.border}`,
            background: aiOpen ? '#a78bfa22' : 'transparent',
            color: aiOpen ? '#a78bfa' : IDE.lineNum,
            transition: 'all 0.15s',
          }}
        >✨ AI</button>
        <span className="tools-editor-titlebar-lines" style={{ ...MONO, fontSize: 10, color: IDE.lineNum, flexShrink: 0 }}>{lines.length} lines</span>
      </div>

      {/* Filename + requirements */}
      <div className="tools-editor-meta" style={{ display: 'flex', gap: 10, padding: '10px 16px', background: IDE.gutter, borderBottom: `1px solid ${IDE.border}`, flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...MONO, fontSize: 9, color: '#6e7191', marginBottom: 3, letterSpacing: '0.1em' }}>FILENAME</div>
          <input value={filename} onChange={e => setFilename(e.target.value)} placeholder="my_tool.py"
            style={{ width: '100%', fontSize: 12, padding: '5px 10px', background: IDE.inputBg, color: IDE.text, border: `1px solid ${IDE.inputBdr}`, borderRadius: 5, ...MONO, boxSizing: 'border-box', outline: 'none' }} />
        </div>
        <div style={{ flex: 2, minWidth: 0 }}>
          <div style={{ ...MONO, fontSize: 9, color: '#6e7191', marginBottom: 3, letterSpacing: '0.1em' }}>
            REQUIREMENTS <span style={{ color: '#45475a' }}>(optional — pip packages)</span>
          </div>
          <input value={requirements} onChange={e => setRequirements(e.target.value)} placeholder="e.g. requests, pandas>=2.0"
            style={{ width: '100%', fontSize: 12, padding: '5px 10px', background: IDE.inputBg, color: IDE.text, border: `1px solid ${IDE.inputBdr}`, borderRadius: 5, ...MONO, boxSizing: 'border-box', outline: 'none' }} />
        </div>
      </div>

      {/*
        Code area — single scroll container handles BOTH axes.
        Line numbers are `position: sticky; left: 0` so they stay visible
        during horizontal scroll without any JS sync.
        The code content is `min-width: max-content` so the container grows
        to fit long lines and the native scrollbar appears automatically.
      */}
      {/*
        Single scroll container for BOTH axes.
        overflow: auto creates the scrollable viewport.
        Line numbers use position: sticky left: 0 — they pin during H scroll.
        Code content uses minWidth: 100% (fills container when code is short)
        and width: max-content (grows wider than container when lines are long),
        which is what makes the H scrollbar appear.
      */}
      {/* Editor + AI panel side by side */}
      <div className="tools-editor-body" style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0, width: '100%' }}>

        {/* Editor column */}
        <div className="tools-editor-main" style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, maxWidth: '100%' }}>

          {/* Code area */}
          <div className="tools-editor-code-scroll" style={{ flex: 1, overflow: 'auto', minHeight: 0, minWidth: 0, background: IDE.bg, WebkitOverflowScrolling: 'touch' }}>
            <div style={{ display: 'inline-flex', minWidth: '100%', minHeight: '100%' }}>
              <div style={{
                ...FONT,
                position: 'sticky', left: 0, zIndex: 3,
                padding: '14px 12px 14px 14px',
                color: IDE.lineNum, background: IDE.gutter,
                borderRight: `1px solid ${IDE.border}`,
                userSelect: 'none', flexShrink: 0,
                minWidth: 48, textAlign: 'right',
              }}>
                {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <div style={{ position: 'relative', flex: 1 }}>
                <pre
                  aria-hidden
                  style={{
                    ...FONT,
                    padding: '14px 32px 14px 16px',
                    margin: 0, color: IDE.text,
                    background: 'transparent',
                    pointerEvents: 'none',
                    width: 'max-content',
                    minWidth: '100%',
                  }}
                  dangerouslySetInnerHTML={{ __html: highlightPython(code) + '\n' }}
                />
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  spellCheck={false}
                  style={{
                    ...FONT,
                    padding: '14px 32px 14px 16px',
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    color: 'transparent', caretColor: IDE.text,
                    background: 'transparent',
                    border: 'none', outline: 'none', resize: 'none',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Tab') {
                      e.preventDefault()
                      const el = e.currentTarget
                      const start = el.selectionStart; const end = el.selectionEnd
                      const next = code.slice(0, start) + '    ' + code.slice(end)
                      setCode(next)
                      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 4 })
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Status bar */}
          <div style={{ background: '#1D5FFA', padding: '3px 16px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            <span style={{ ...MONO, fontSize: 10, color: '#ffffffcc' }}>Python</span>
            <span style={{ ...MONO, fontSize: 10, color: '#ffffff77' }}>UTF-8</span>
            <span style={{ ...MONO, fontSize: 10, color: '#ffffff77' }}>Tab: 4 spaces</span>
          </div>

          {/* Footer */}
          <div className="tools-editor-footer" style={{ padding: '10px 16px', background: IDE.gutter, borderTop: `1px solid ${IDE.border}`, flexShrink: 0 }}>
            {error && (
              <div style={{ ...MONO, fontSize: 11, color: '#EF4444', marginBottom: 8, padding: '7px 10px', background: '#EF444420', border: '1px solid #EF444440', borderRadius: 6 }}>
                {error}
              </div>
            )}
            {warnings.length > 0 && (
              <div style={{ ...MONO, fontSize: 11, color: '#F59E0B', marginBottom: 8, padding: '7px 10px', background: '#F59E0B20', border: '1px solid #F59E0B40', borderRadius: 6 }}>
                ⚠ {warnings.join(' · ')}
              </div>
            )}
            <div className="tools-editor-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                className="tools-submit-btn"
                onClick={submit} disabled={!code.trim() || uploading}
                style={{
                  ...MONO, fontSize: 12, padding: '7px 22px',
                  background: !code.trim() || uploading ? '#313244' : '#1D5FFA',
                  color: !code.trim() || uploading ? IDE.lineNum : '#fff',
                  border: 'none', borderRadius: 6,
                  cursor: !code.trim() || uploading ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                }}
              >{uploading ? (editMode ? 'Saving…' : 'Uploading…') : editMode ? 'Save Changes' : 'Submit for Review'}</button>
              {editMode && onCancel && (
                <button
                  onClick={onCancel}
                  disabled={uploading}
                  style={{
                    ...MONO, fontSize: 12, padding: '7px 16px',
                    background: 'transparent', color: IDE.lineNum,
                    border: `1px solid ${IDE.border}`, borderRadius: 6,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                  }}
                >Cancel</button>
              )}
              <span style={{ ...MONO, fontSize: 10, color: IDE.lineNum }}>{lines.length} lines · Tab = 4 spaces</span>
            </div>
          </div>

        </div>

        {/* AI panel */}
        {aiOpen && (
          <div className="tools-editor-ai" style={{ width: 400, flexShrink: 0 }}>
            <ToolAiPanel
              code={code} onCodeUpdate={setCode} onRequirementsUpdate={setRequirements} onFilenameUpdate={setFilename}
              provider={aiProvider} setProvider={setAiProvider}
              modelId={aiModelId} setModelId={setAiModelId}
              messages={aiMessages} setMessages={setAiMessages}
            />
          </div>
        )}

      </div>
    </div>
  )
}
