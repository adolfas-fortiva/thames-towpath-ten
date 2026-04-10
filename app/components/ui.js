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

export const Pill = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{ padding: '7px 16px', borderRadius: 20, border: `1.5px solid ${active ? YELLOW : 'rgba(255,255,255,0.15)'}`, background: active ? YELLOW : 'transparent', color: active ? NAVY : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400, transition: 'all 0.15s' }}>{children}</button>
)

export const Tick = ({ done, onClick, size = 28 }) => (
  <button onClick={e => { e.stopPropagation(); onClick() }} style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, border: `2px solid ${done ? YELLOW : 'rgba(255,255,255,0.2)'}`, background: done ? YELLOW : 'transparent', color: NAVY, cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>{done ? '✓' : ''}</button>
)

export const inputStyle = {
  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff',
  width: '100%', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
}

export const validatePhone = raw => {
  const d = raw.replace(/\D/g, '')
  if (d.length !== 11) return 'Must be 11 digits'
  if (!d.startsWith('07')) return 'Must start with 07'
  return null
}
export const formatPhone = raw => raw.replace(/\D/g, '')

const selStyle = { flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#fff', outline: 'none', appearance: 'none', WebkitAppearance: 'none' }

// Person row — arrived tick, swap, remove
export function PersonRow({ person, roleId, onRemove, onToggle, swapOpen, onSwapToggle, volunteers, onSwap }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ flex: 1, minWidth: 0, opacity: person.arrived ? 0.45 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {person.is_lead && <span style={{ fontSize: 9, fontWeight: 700, color: NAVY, background: YELLOW, borderRadius: 3, padding: '1px 5px', flexShrink: 0 }}>LEAD</span>}
            <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{person.volunteer_name}</span>
          </div>
          {person.volunteer_phone && (
            <a href={`tel:${person.volunteer_phone}`} onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: YELLOW, display: 'block', marginTop: 1 }}>{person.volunteer_phone}</a>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          <button onClick={onSwapToggle}
            style={{ fontSize: 11, color: swapOpen ? YELLOW : 'rgba(255,255,255,0.3)', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
            swap
          </button>
          <button onClick={() => onRemove(person.id, roleId)}
            style={{ fontSize: 18, color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
          <Tick done={person.arrived} onClick={() => onToggle(person.id, person.arrived)} />
        </div>
      </div>
      {swapOpen && (
        <div style={{ padding: '8px 16px', display: 'flex', gap: 8, borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(254,203,0,0.04)' }}>
          <SwapSelect roleId={roleId} volunteers={volunteers} person={person} onSwap={onSwap} onCancel={onSwapToggle} />
        </div>
      )}
    </>
  )
}

function SwapSelect({ roleId, volunteers, person, onSwap, onCancel }) {
  const [volId, setVolId] = useState('')
  return (
    <>
      <select value={volId} onChange={e => setVolId(e.target.value)} style={selStyle}>
        <option value="">— replace with —</option>
        {volunteers.map(v => <option key={v.id} value={v.id}>{v.name}{v.phone ? ` · ${v.phone}` : ''}</option>)}
      </select>
      <button onClick={() => { const vol = volunteers.find(v => v.id === volId); if (vol) onSwap(person, vol) }}
        style={{ padding: '7px 12px', borderRadius: 8, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Swap</button>
      <button onClick={onCancel}
        style={{ padding: '7px', borderRadius: 8, background: 'none', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 13, cursor: 'pointer' }}>✕</button>
    </>
  )
}

// Add volunteer with lead checkbox
export function AddRow({ roleId, volunteers, onAdd, label = '+ Add volunteer' }) {
  const [open,   setOpen]   = useState(false)
  const [volId,  setVolId]  = useState('')
  const [isLead, setIsLead] = useState(false)

  const doAdd = () => {
    if (!volId) return
    const vol = volunteers.find(v => v.id === volId)
    if (vol) { onAdd(roleId, vol, isLead); setOpen(false); setVolId(''); setIsLead(false) }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{ display: 'block', width: '100%', padding: '7px 16px', textAlign: 'left', background: 'none', border: 'none', color: YELLOW, fontSize: 12, cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      {label}
    </button>
  )
  return (
    <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <select value={volId} onChange={e => setVolId(e.target.value)} style={{ ...selStyle, flex: 'unset', width: '100%' }}>
        <option value="">— select volunteer —</option>
        {volunteers.map(v => <option key={v.id} value={v.id}>{v.name}{v.phone ? ` · ${v.phone}` : ''}</option>)}
      </select>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>
        <input type="checkbox" checked={isLead} onChange={e => setIsLead(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: YELLOW }} />
        Mark as lead
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={doAdd} style={{ flex: 1, padding: 8, borderRadius: 8, background: volId ? YELLOW : 'rgba(255,255,255,0.08)', color: volId ? NAVY : 'rgba(255,255,255,0.3)', border: 'none', fontWeight: 700, fontSize: 13, cursor: volId ? 'pointer' : 'not-allowed' }}>Add</button>
        <button onClick={() => { setOpen(false); setVolId(''); setIsLead(false) }}
          style={{ padding: '8px 14px', borderRadius: 8, background: 'none', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 13, cursor: 'pointer' }}>✕</button>
      </div>
    </div>
  )
}
