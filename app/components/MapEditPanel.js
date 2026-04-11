'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { ICONS, PRESET_COLORS } from './mapUtils'

const YELLOW = '#FECB00'
const NAVY   = '#1B2869'
const CYAN   = '#00B5E2'

const inputCss = { width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 7, padding: '7px 10px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
const labelCss = { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4, display: 'block' }

export default function MapEditPanel({ overlay, onClose, onSave, onDelete }) {
  const [form,       setForm]       = useState(null)
  const [volunteers, setVolunteers] = useState([])
  const [assigned,   setAssigned]   = useState([]) // role_assignments rows
  const [adding,     setAdding]     = useState(false)
  const [addVol,     setAddVol]     = useState('')
  const [isLead,     setIsLead]     = useState(false)
  const [swapping,   setSwapping]   = useState(null) // row id
  const [swapVol,    setSwapVol]    = useState('')
  const [saving,     setSaving]     = useState(false)

  const roleId = overlay ? `MAP_${overlay.id}` : null

  useEffect(() => {
    if (!overlay) return
    setForm({
      label:             overlay.label,
      icon:              overlay.icon || 'custom',
      width_m:           overlay.width_m,
      height_m:          overlay.height_m,
      rotation_degrees:  overlay.rotation_degrees || 0,
      color:             overlay.color,
      w3w:               overlay.w3w || '',
      notes:             overlay.notes || '',
    })
    supabase.from('volunteers').select('id,name,phone').order('name').then(({ data }) => { if (data) setVolunteers(data) })
    supabase.from('role_assignments').select('*').eq('role_id', `MAP_${overlay.id}`).order('is_lead', { ascending: false }).order('slot_order').then(({ data }) => { if (data) setAssigned(data) })
  }, [overlay?.id])

  if (!overlay || !form) return null

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const saveOverlay = async () => {
    setSaving(true)
    const { data } = await supabase.from('map_overlays').update({
      label:            form.label,
      icon:             form.icon,
      width_m:          Number(form.width_m),
      height_m:         Number(form.height_m),
      rotation_degrees: Number(form.rotation_degrees),
      color:            form.color,
      w3w:              form.w3w || null,
      notes:            form.notes || null,
    }).eq('id', overlay.id).select().single()
    setSaving(false)
    if (data) onSave(data)
  }

  const addVolunteer = async () => {
    const vol = volunteers.find(v => v.id === addVol)
    if (!vol) return
    const { data } = await supabase.from('role_assignments')
      .upsert({ role_id: roleId, volunteer_name: vol.name, volunteer_phone: vol.phone || null, slot_order: assigned.length, is_lead: isLead }, { onConflict: 'role_id,volunteer_name' })
      .select().single()
    if (data) setAssigned(prev => [...prev.filter(r => r.volunteer_name !== vol.name), data].sort((a,b) => (b.is_lead?1:0)-(a.is_lead?1:0)||a.slot_order-b.slot_order))
    setAdding(false); setAddVol(''); setIsLead(false)
  }

  const removeVol = async (rowId) => {
    await supabase.from('role_assignments').delete().eq('id', rowId)
    setAssigned(prev => prev.filter(r => r.id !== rowId))
  }

  const swapVolunteer = async (row) => {
    const vol = volunteers.find(v => v.id === swapVol)
    if (!vol) return
    await supabase.from('role_assignments').delete().eq('id', row.id)
    const { data } = await supabase.from('role_assignments')
      .upsert({ role_id: roleId, volunteer_name: vol.name, volunteer_phone: vol.phone || null, slot_order: row.slot_order, is_lead: row.is_lead }, { onConflict: 'role_id,volunteer_name' })
      .select().single()
    if (data) setAssigned(prev => [...prev.filter(r => r.id !== row.id && r.volunteer_name !== vol.name), data].sort((a,b) => (b.is_lead?1:0)-(a.is_lead?1:0)||a.slot_order-b.slot_order))
    setSwapping(null); setSwapVol('')
  }

  const selCss = { ...inputCss, appearance: 'none', WebkitAppearance: 'none' }

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 320, background: '#111e50', borderLeft: '1px solid rgba(255,255,255,0.12)', zIndex: 300, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.4)', overflowY: 'auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Edit item</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>

        {/* Name */}
        <div>
          <span style={labelCss}>Name</span>
          <input value={form.label} onChange={e => setF('label', e.target.value)} style={inputCss} />
        </div>

        {/* Icon */}
        <div>
          <span style={labelCss}>Icon</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {Object.entries(ICONS).map(([key, ic]) => (
              <button key={key} onClick={() => setF('icon', key)} title={ic.label}
                style={{ width: 36, height: 36, borderRadius: 8, border: `2px solid ${form.icon === key ? YELLOW : 'rgba(255,255,255,0.12)'}`, background: form.icon === key ? 'rgba(254,203,0,0.15)' : 'rgba(255,255,255,0.05)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {ic.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Dimensions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <span style={labelCss}>Width (m)</span>
            <input type="number" value={form.width_m} onChange={e => setF('width_m', e.target.value)} style={inputCss} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={labelCss}>Depth (m)</span>
            <input type="number" value={form.height_m} onChange={e => setF('height_m', e.target.value)} style={inputCss} />
          </div>
        </div>

        {/* Rotation */}
        <div>
          <span style={labelCss}>Rotation — {form.rotation_degrees}°</span>
          <input type="range" min={0} max={359} value={form.rotation_degrees} onChange={e => setF('rotation_degrees', e.target.value)} style={{ width: '100%', accentColor: YELLOW }} />
        </div>

        {/* Colour */}
        <div>
          <span style={labelCss}>Colour</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={() => setF('color', c)}
                style={{ width: 22, height: 22, borderRadius: 4, background: c, border: `2px solid ${form.color === c ? '#fff' : 'transparent'}`, cursor: 'pointer', padding: 0 }} />
            ))}
            <input type="color" value={form.color} onChange={e => setF('color', e.target.value)}
              style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }} />
          </div>
        </div>

        {/* W3W */}
        <div>
          <span style={labelCss}>what3words</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={form.w3w} onChange={e => setF('w3w', e.target.value.replace(/^\/+/,''))} placeholder="word.word.word" style={{ ...inputCss, flex: 1 }} />
            {form.w3w && <a href={`https://w3w.co/${form.w3w}`} target="_blank" rel="noopener noreferrer"
              style={{ padding: '7px 10px', borderRadius: 7, background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: '1px solid rgba(231,76,60,0.3)', fontSize: 12, textDecoration: 'none', flexShrink: 0 }}>Open</a>}
          </div>
        </div>

        {/* Notes */}
        <div>
          <span style={labelCss}>Notes</span>
          <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2}
            style={{ ...inputCss, resize: 'vertical', minHeight: 52 }} />
        </div>

        {/* Volunteers */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ ...labelCss, marginBottom: 0 }}>Volunteers</span>
            <button onClick={() => setAdding(a => !a)}
              style={{ fontSize: 11, color: YELLOW, background: 'none', border: '1px solid rgba(254,203,0,0.3)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}>+ Add</button>
          </div>

          {adding && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8, padding: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
              <select value={addVol} onChange={e => setAddVol(e.target.value)} style={selCss}>
                <option value="">— select volunteer —</option>
                {volunteers.map(v => <option key={v.id} value={v.id}>{v.name}{v.phone ? ` · ${v.phone}` : ''}</option>)}
              </select>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={isLead} onChange={e => setIsLead(e.target.checked)} style={{ accentColor: YELLOW }} />
                Mark as lead
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={addVolunteer} disabled={!addVol}
                  style={{ flex: 1, padding: 7, borderRadius: 7, background: addVol ? YELLOW : 'rgba(255,255,255,0.08)', color: addVol ? NAVY : 'rgba(255,255,255,0.3)', border: 'none', fontWeight: 700, fontSize: 12, cursor: addVol ? 'pointer' : 'not-allowed' }}>Add</button>
                <button onClick={() => { setAdding(false); setAddVol(''); setIsLead(false) }}
                  style={{ padding: '7px 10px', borderRadius: 7, background: 'transparent', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 12, cursor: 'pointer' }}>✕</button>
              </div>
            </div>
          )}

          {assigned.length === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>None assigned</div>}

          {assigned.map(row => (
            <div key={row.id} style={{ marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                {row.is_lead && <span style={{ fontSize: 9, fontWeight: 700, color: NAVY, background: YELLOW, borderRadius: 3, padding: '1px 5px', flexShrink: 0 }}>LEAD</span>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{row.volunteer_name}</div>
                  {row.volunteer_phone && <a href={`tel:${row.volunteer_phone}`} style={{ fontSize: 11, color: YELLOW }}>{row.volunteer_phone}</a>}
                </div>
                <button onClick={() => setSwapping(swapping === row.id ? null : row.id)}
                  style={{ fontSize: 11, color: swapping === row.id ? YELLOW : 'rgba(255,255,255,0.3)', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '2px 7px', cursor: 'pointer' }}>swap</button>
                <button onClick={() => removeVol(row.id)}
                  style={{ fontSize: 16, color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
              </div>
              {swapping === row.id && (
                <div style={{ display: 'flex', gap: 6, marginTop: 4, padding: '6px 10px', background: 'rgba(254,203,0,0.06)', borderRadius: 7 }}>
                  <select value={swapVol} onChange={e => setSwapVol(e.target.value)} style={{ ...selCss, flex: 1 }}>
                    <option value="">— replace with —</option>
                    {volunteers.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  <button onClick={() => swapVolunteer(row)} disabled={!swapVol}
                    style={{ padding: '6px 10px', borderRadius: 7, background: swapVol ? YELLOW : 'rgba(255,255,255,0.08)', color: swapVol ? NAVY : 'rgba(255,255,255,0.3)', border: 'none', fontWeight: 700, fontSize: 12, cursor: swapVol ? 'pointer' : 'not-allowed' }}>Swap</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={saveOverlay} disabled={saving}
          style={{ flex: 2, padding: 12, borderRadius: 10, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button onClick={() => onDelete(overlay.id)}
          style={{ flex: 1, padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          Remove
        </button>
      </div>
    </div>
  )
}
