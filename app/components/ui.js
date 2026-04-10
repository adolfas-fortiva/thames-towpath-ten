'use client'
import { useState } from 'react'

export const YELLOW = '#FECB00'
export const NAVY   = '#1B2869'
export const CYAN   = '#00B5E2'

export const Card = ({ children, style = {} }) => (
  <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, marginBottom: 8, overflow: 'hidden', ...style }}>{children}</div>
)

export const SectionHead = ({ title, right }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px 6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
    <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</span>
    {right && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{right}</span>}
  </div>
)

export const Pill = ({ active, onClick, children, color }) => (
  <button onClick={onClick} style={{ padding: '7px 16px', borderRadius: 20, border: `1.5px solid ${active ? (color || YELLOW) : 'rgba(255,255,255,0.15)'}`, background: active ? (color || YELLOW) : 'transparent', color: active ? NAVY : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400, transition: 'all 0.15s' }}>{children}</button>
)

export const Tick = ({ done, onClick, size = 28 }) => (
  <button onClick={e => { e.stopPropagation(); onClick() }} style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, border: `2px solid ${done ? YELLOW : 'rgba(255,255,255,0.2)'}`, background: done ? YELLOW : 'transparent', color: NAVY, cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>{done ? '✓' : ''}</button>
)

export const inputStyle = {
  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff',
  width: '100%', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
}

export const selectStyle = {
  ...inputStyle,
  appearance: 'none', WebkitAppearance: 'none',
}

export function SwapDropdown({ currentName, allVolunteers, usedNames = [], onSave, onCancel }) {
  const [selected, setSelected] = useState('')
  const [custom, setCustom]     = useState('')
  const [warn, setWarn]         = useState(null)

  const pickName = selected === '__new__' ? custom.trim() : selected

  const handleConfirm = () => {
    if (!pickName) return
    if (!warn) {
      const dup = usedNames.find(u => u.name === pickName && u.name !== currentName)
      if (dup) { setWarn(dup); return }
    }
    onSave(pickName)
  }

  return (
    <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <select value={selected} onChange={e => { setSelected(e.target.value); setWarn(null) }} style={selectStyle}>
        <option value="">— select replacement —</option>
        {allVolunteers.map(v => (
          <option key={v.name} value={v.name}>{v.name}{v.phone ? ` · ${v.phone}` : ''}</option>
        ))}
        <option value="__new__">+ New person…</option>
      </select>

      {selected === '__new__' && (
        <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Full name" style={inputStyle} />
      )}

      {warn && (
        <div style={{ fontSize: 12, color: YELLOW, background: 'rgba(254,203,0,0.1)', border: '1px solid rgba(254,203,0,0.25)', borderRadius: 8, padding: '8px 10px', lineHeight: 1.5 }}>
          {warn.name} is also assigned to <strong>{warn.role}</strong>. Some people have dual roles — confirm if intentional.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleConfirm} disabled={!pickName}
          style={{ flex: 1, padding: 8, borderRadius: 8, background: pickName ? YELLOW : 'rgba(255,255,255,0.08)', color: pickName ? NAVY : 'rgba(255,255,255,0.3)', border: 'none', fontWeight: 700, fontSize: 13, cursor: pickName ? 'pointer' : 'not-allowed' }}>
          {warn ? 'Confirm anyway' : 'Confirm swap'}
        </button>
        <button onClick={onCancel}
          style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 13, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
