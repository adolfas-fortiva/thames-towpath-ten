'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { ZONES, FIELD_TEAMS, MILE_MARKERS } from '../data'
import { Card, SectionHead, Pill, YELLOW, CYAN, NAVY, inputStyle, validatePhone, formatPhone } from './ui'

function buildAssignments() {
  const map = {}
  const add = (nameStr, role) => {
    if (!nameStr) return
    nameStr.split(/\s*[+&]\s*/).forEach(n => {
      const clean = n.trim().replace(/\s*\(.*?\)/g, '').trim()
      if (clean) { if (!map[clean]) map[clean] = []; map[clean].push(role) }
    })
  }
  ZONES.forEach(z => { add(z.lead, `${z.name} lead`); z.marshals.forEach(m => add(m.name, m.id)) })
  FIELD_TEAMS.forEach(t => { add(t.lead, t.role); if (t.members) t.members.split(',').forEach(m => add(m.trim(), t.role)) })
  return map
}

function EditVolunteerRow({ vol, onSave, onCancel }) {
  const [name,  setName]  = useState(vol?.name  || '')
  const [phone, setPhone] = useState(vol?.phone || '')
  const [err,   setErr]   = useState('')

  const save = () => {
    if (!name.trim()) { setErr('Name required'); return }
    const phoneErr = validatePhone(phone)
    if (phoneErr) { setErr(phoneErr); return }
    onSave({ name: name.trim(), phone: formatPhone(phone) })
  }

  return (
    <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <input value={name}  onChange={e => { setName(e.target.value);  setErr('') }} placeholder="Full name"      style={inputStyle} />
      <input value={phone} onChange={e => { setPhone(e.target.value); setErr('') }} placeholder="07xxx xxxxxx"  style={{ ...inputStyle, borderColor: err ? '#ef4444' : 'rgba(255,255,255,0.15)' }} />
      {err && <div style={{ fontSize: 11, color: '#ef4444' }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} style={{ flex: 1, padding: 8, borderRadius: 8, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Save</button>
        <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

function LocationsTab() {
  const [markerData, setMarkerData] = useState({})
  const [saving,     setSaving]     = useState({})

  useEffect(() => {
    supabase.from('mile_markers').select('marker_id,w3w').then(({ data }) => {
      if (!data) return
      const map = {}
      data.forEach(r => { map[r.marker_id] = r.w3w || '' })
      setMarkerData(map)
    })
  }, [])

  const save = async (id, val) => {
    const clean = val.trim().replace(/^\/+/, '')
    setSaving(p => ({ ...p, [id]: true }))
    setMarkerData(prev => ({ ...prev, [id]: clean }))
    await supabase.from('mile_markers').upsert({ marker_id: id, w3w: clean }, { onConflict: 'marker_id' })
    setSaving(p => ({ ...p, [id]: false }))
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 10, paddingLeft: 4 }}>
        Edit what3words for each mile marker. These appear as links in the Miles tab.
      </div>
      <Card>
        {MILE_MARKERS.map((m, i) => (
          <div key={m.id} style={{ padding: '12px 16px', borderBottom: i < MILE_MARKERS.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: NAVY, background: YELLOW, borderRadius: 4, padding: '2px 8px', flexShrink: 0 }}>{m.label}</span>
              <input
                value={markerData[m.id] ?? ''}
                onChange={e => setMarkerData(prev => ({ ...prev, [m.id]: e.target.value }))}
                onBlur={e => save(m.id, e.target.value)}
                placeholder="word.word.word"
                style={{ ...inputStyle, fontSize: 12, padding: '5px 8px', borderColor: saving[m.id] ? CYAN : 'rgba(255,255,255,0.15)' }}
              />
            </div>
            {markerData[m.id] && (
              <a href={`https://w3w.co/${markerData[m.id]}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: '#e74c3c', display: 'block', marginTop: 4, marginLeft: 64 }}>
                ///{markerData[m.id]}
              </a>
            )}
          </div>
        ))}
      </Card>
    </div>
  )
}

export default function VolunteersTab() {
  const [view,       setView]       = useState('volunteers')
  const [volunteers, setVolunteers] = useState([])
  const [editing,    setEditing]    = useState(null)
  const [search,     setSearch]     = useState('')

  const assignments = buildAssignments()

  useEffect(() => {
    supabase.from('volunteers').select('*').order('name').then(({ data }) => { if (data) setVolunteers(data) })
    const ch = supabase.channel('vol_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'volunteers' }, () => {
        supabase.from('volunteers').select('*').order('name').then(({ data }) => { if (data) setVolunteers(data) })
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const saveNew = async ({ name, phone }) => {
    const { data } = await supabase.from('volunteers').insert({ name, phone }).select().single()
    if (data) setVolunteers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setEditing(null)
  }

  const saveEdit = async (id, { name, phone }) => {
    await supabase.from('volunteers').update({ name, phone }).eq('id', id)
    setVolunteers(prev => prev.map(v => v.id === id ? { ...v, name, phone } : v))
    setEditing(null)
  }

  const filtered   = volunteers.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || v.phone.includes(search))
  const unassigned = volunteers.filter(v => !(assignments[v.name]?.length > 0))
  const over3      = volunteers.filter(v => (assignments[v.name]?.length || 0) > 2)

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <Pill active={view === 'volunteers'} onClick={() => setView('volunteers')}>Volunteers</Pill>
        <Pill active={view === 'locations'}  onClick={() => setView('locations')}>Locations</Pill>
      </div>

      {view === 'locations' && <LocationsTab />}

      {view === 'volunteers' && (
        <>
          <Card style={{ marginBottom: 12 }}>
            <SectionHead title="Volunteer overview" right={`${volunteers.length} total`} />
            <div style={{ padding: '10px 16px 14px', display: 'flex', gap: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: YELLOW }}>{volunteers.length - unassigned.length}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>assigned</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: unassigned.length > 0 ? 'rgba(255,255,255,0.35)' : YELLOW }}>{unassigned.length}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>unassigned</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: over3.length > 0 ? '#f59e0b' : YELLOW }}>{over3.length}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>3+ roles</div>
              </div>
            </div>
          </Card>

          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or number…" style={{ ...inputStyle, marginBottom: 10 }} />

          <button onClick={() => setEditing('new')}
            style={{ width: '100%', padding: 12, borderRadius: 12, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 12 }}>
            + Add volunteer
          </button>

          {editing === 'new' && (
            <Card style={{ marginBottom: 12 }}>
              <SectionHead title="New volunteer" />
              <EditVolunteerRow vol={null} onSave={saveNew} onCancel={() => setEditing(null)} />
            </Card>
          )}

          <Card>
            {filtered.map((v, i) => {
              const roles  = assignments[v.name] || []
              const count  = roles.length
              const isEdit = editing === v.id
              const isLast = i === filtered.length - 1

              return (
                <div key={v.id} style={{ borderBottom: isLast && !isEdit ? 'none' : '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{v.name}</span>
                        {count > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: count > 2 ? 'rgba(245,158,11,0.2)' : 'rgba(254,203,0,0.12)', color: count > 2 ? '#f59e0b' : YELLOW, border: `1px solid ${count > 2 ? 'rgba(245,158,11,0.3)' : 'rgba(254,203,0,0.25)'}` }}>{count}×</span>
                        )}
                        {count === 0 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>unassigned</span>}
                      </div>
                      <div style={{ fontSize: 12, color: CYAN, marginTop: 2 }}>{v.phone}</div>
                      {roles.length > 0 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{roles.join(' · ')}</div>}
                    </div>
                    <button onClick={() => setEditing(isEdit ? null : v.id)}
                      style={{ fontSize: 11, color: isEdit ? YELLOW : 'rgba(255,255,255,0.3)', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', flexShrink: 0 }}>
                      {isEdit ? 'cancel' : 'edit'}
                    </button>
                  </div>
                  {isEdit && <EditVolunteerRow vol={v} onSave={d => saveEdit(v.id, d)} onCancel={() => setEditing(null)} />}
                </div>
              )
            })}
          </Card>
        </>
      )}
    </div>
  )
}
