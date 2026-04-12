'use client'
import { useState } from 'react'
import { useTheme, YELLOW, NAVY, CYAN } from '../theme'

export { YELLOW, NAVY, CYAN }

export const Card = ({ children, style = {} }) => {
  const { theme } = useTheme()
  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 14, marginBottom: 8, overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

export const SectionHead = ({ title, right }) => {
  const { theme } = useTheme()
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px 6px', borderBottom: `1px solid ${theme.divider}`, background: theme.sectionHead }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: theme.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</span>
      {right && <span style={{ fontSize: 11, color: theme.textMuted }}>{right}</span>}
    </div>
  )
}

export const Pill = ({ active, onClick, children }) => {
  const { theme } = useTheme()
  return (
    <button onClick={onClick} style={{ padding: '8px 18px', borderRadius: 20, border: `1.5px solid ${active ? YELLOW : theme.cardBorder}`, background: active ? YELLOW : 'transparent', color: active ? NAVY : theme.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400, transition: 'all 0.15s' }}>
      {children}
    </button>
  )
}

export const Tick = ({ done, onClick, size = 28 }) => (
  <button onClick={e => { e.stopPropagation(); onClick() }} style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, border: `2px solid ${done ? YELLOW : 'rgba(128,128,128,0.4)'}`, background: done ? YELLOW : 'transparent', color: NAVY, cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>{done ? '✓' : ''}</button>
)

export const useInputStyle = () => {
  const { theme } = useTheme()
  return {
    background: theme.input, border: `1px solid ${theme.inputBorder}`,
    borderRadius: 8, padding: '8px 12px', fontSize: 14, color: theme.text,
    width: '100%', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  }
}

// Legacy export — components that import inputStyle directly
export const inputStyle = {
  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 8, padding: '8px 12px', fontSize: 14, color: '#fff',
  width: '100%', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
}

export const validatePhone = raw => {
  const d = raw.replace(/\D/g, '')
  if (d.length !== 11) return 'Must be 11 digits'
  if (!d.startsWith('07')) return 'Must start with 07'
  return null
}
export const formatPhone = raw => raw.replace(/\D/g, '')

// Person row — theme-aware
export function PersonRow({ person, roleId, onRemove, onToggle, swapOpen, onSwapToggle, volunteers, onSwap }) {
  const { theme } = useTheme()
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', gap: 10, borderBottom: `1px solid ${theme.divider}` }}>
        <div style={{ flex: 1, minWidth: 0, opacity: person.arrived ? 0.45 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {person.is_lead && <span style={{ fontSize: 9, fontWeight: 700, color: NAVY, background: YELLOW, borderRadius: 3, padding: '1px 5px', flexShrink: 0 }}>LEAD</span>}
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{person.volunteer_name}</span>
          </div>
          {person.volunteer_phone && (
            <a href={`tel:${person.volunteer_phone}`} onClick={e => e.stopPropagation()} style={{ fontSize: 13, color: YELLOW, display: 'block', marginTop: 1, fontWeight: 600 }}>{person.volunteer_phone}</a>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          <button onClick={onSwapToggle}
            style={{ fontSize: 12, color: swapOpen ? YELLOW : theme.textDim, background: 'none', border: `1px solid ${theme.cardBorder}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', minHeight: 32 }}>
            swap
          </button>
          <button onClick={() => onRemove(person.id, roleId)}
            style={{ fontSize: 20, color: theme.textFaint, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', lineHeight: 1, minHeight: 32 }}>×</button>
          <Tick done={person.arrived} onClick={() => onToggle(person.id, person.arrived)} />
        </div>
      </div>
      {swapOpen && (
        <SwapSelect theme={theme} roleId={roleId} volunteers={volunteers} person={person} onSwap={onSwap} onCancel={onSwapToggle} />
      )}
    </>
  )
}

function SwapSelect({ theme, roleId, volunteers, person, onSwap, onCancel }) {
  const [volId, setVolId] = useState('')
  const selCss = { flex: 1, background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, color: theme.text, outline: 'none', appearance: 'none', WebkitAppearance: 'none' }
  return (
    <div style={{ padding: '8px 16px', display: 'flex', gap: 8, borderTop: `1px solid ${theme.divider}`, background: theme.name === 'light' ? 'rgba(254,203,0,0.06)' : 'rgba(254,203,0,0.04)' }}>
      <select value={volId} onChange={e => setVolId(e.target.value)} style={selCss}>
        <option value="">— replace with —</option>
        {volunteers.map(v => <option key={v.id} value={v.id}>{v.name}{v.phone ? ` · ${v.phone}` : ''}</option>)}
      </select>
      <button onClick={() => { const vol = volunteers.find(v => v.id === volId); if (vol) onSwap(person, vol) }}
        style={{ padding: '7px 12px', borderRadius: 8, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', minHeight: 40 }}>Swap</button>
      <button onClick={onCancel}
        style={{ padding: '7px', borderRadius: 8, background: 'none', color: theme.textDim, border: `1px solid ${theme.cardBorder}`, fontSize: 13, cursor: 'pointer', minHeight: 40 }}>✕</button>
    </div>
  )
}

// Add volunteer with lead checkbox
export function AddRow({ roleId, volunteers, onAdd, label = '+ Add volunteer' }) {
  const { theme } = useTheme()
  const [open,   setOpen]   = useState(false)
  const [volId,  setVolId]  = useState('')
  const [isLead, setIsLead] = useState(false)
  const selCss = { width: '100%', background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, color: theme.text, outline: 'none', appearance: 'none', WebkitAppearance: 'none' }

  const doAdd = () => {
    if (!volId) return
    const vol = volunteers.find(v => v.id === volId)
    if (vol) { onAdd(roleId, vol, isLead); setOpen(false); setVolId(''); setIsLead(false) }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{ display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', color: YELLOW, fontSize: 13, cursor: 'pointer', borderTop: `1px solid ${theme.divider}`, fontWeight: 600, minHeight: 44 }}>
      {label}
    </button>
  )
  return (
    <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: `1px solid ${theme.divider}` }}>
      <select value={volId} onChange={e => setVolId(e.target.value)} style={selCss}>
        <option value="">— select volunteer —</option>
        {volunteers.map(v => <option key={v.id} value={v.id}>{v.name}{v.phone ? ` · ${v.phone}` : ''}</option>)}
      </select>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>
        <input type="checkbox" checked={isLead} onChange={e => setIsLead(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: YELLOW }} />
        Mark as lead
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={doAdd} style={{ flex: 1, padding: 10, borderRadius: 8, background: volId ? YELLOW : theme.divider, color: volId ? NAVY : theme.textDim, border: 'none', fontWeight: 700, fontSize: 14, cursor: volId ? 'pointer' : 'not-allowed', minHeight: 44 }}>Add</button>
        <button onClick={() => { setOpen(false); setVolId(''); setIsLead(false) }}
          style={{ padding: '10px 16px', borderRadius: 8, background: 'none', color: theme.textDim, border: `1px solid ${theme.cardBorder}`, fontSize: 13, cursor: 'pointer', minHeight: 44 }}>✕</button>
      </div>
    </div>
  )
}
