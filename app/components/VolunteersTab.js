'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { ZONES, FIELD_TEAMS } from '../data'
import { Card, SectionHead, YELLOW, CYAN, NAVY, inputStyle, validatePhone, formatPhone } from './ui'

// Build assignment map from static data
function buildAssignments() {
  const map = {}
  const add = (name, role) => {
    if (!name) return
    // handle "Name1 + Name2" style entries
    name.split(/\s*[+&]\s*/).forEach(n => {
      const clean = n.trim().replace(/\s*\(.*?\)/g, '').trim()
      if (!clean) return
      if (!map[clean]) map[clean] = []
      map[clean].push(role)
    })
  }
  ZONES.forEach(z => {
    add(z.lead, `${z.name} lead`)
    z.marshals.forEach(m => add(m.name, m.id))
  })
  FIELD_TEAMS.forEach(t => {
    add(t.lead, t.role)
    if (t.members) t.members.split(',').forEach(m => add(m.trim(), t.role))
  })
  return map
}

function EditRow({ vol, onSave, onCancel }) {
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
      <input value={name}  onChange={e => { setName(e.target.value);  setErr('') }} placeholder="Full name"            style={inputStyle} />
      <input value={phone} onChange={e => { setPhone(e.target.value); setErr('') }} placeholder="07xxx xxxxxx" style={{ ...inputStyle, borderColor: err && err.includes('digit') ? '#ef4444' : 'rgba(255,255,255,0.15)' }} />
      {err && <div style={{ fontSize: 11, color: '#ef4444' }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} style={{ flex: 1, padding: 8, borderRadius: 8, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Save</button>
        <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

export default function VolunteersTab() {
  const [volunteers, setVolunteers] = useState([])
  const [editing,    setEditing]    = useState(null) // id or 'new'
  const [search,     setSearch]     = useState('')

  const assignments = buildAssignments()

  useEffect(() => {
    supabase.from('volunteers').select('*').order('name').then(({ data }) => {
      if (data) setVolunteers(data)
    })
    const ch = supabase.channel('volunteers_ch')
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

  const filtered = volunteers.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || v.phone.includes(search))

  // Count assignments per volunteer
  const getCount = (name) => {
    const roles = assignments[name] || []
    return roles.length
  }

  const unassigned = volunteers.filter(v => getCount(v.name) === 0)
  const overassigned = volunteers.filter(v => getCount(v.name) > 2)

  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <SectionHead title="Volunteers" right={`${volunteers.length} total`} />
        <div style={{ padding: '10px 16px 14px', display: 'flex', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: YELLOW }}>{volunteers.length - unassigned.length}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>assigned</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: unassigned.length > 0 ? 'rgba(255,255,255,0.4)' : YELLOW }}>{unassigned.length}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>unassigned</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: overassigned.length > 0 ? '#f59e0b' : YELLOW }}>{overassigned.length}</div>
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
          <EditRow vol={null} onSave={saveNew} onCancel={() => setEditing(null)} />
        </Card>
      )}

      <Card>
        {filtered.map((v, i) => {
          const count   = getCount(v.name)
          const roles   = assignments[v.name] || []
          const isEdit  = editing === v.id
          const isLast  = i === filtered.length - 1

          return (
            <div key={v.id} style={{ borderBottom: isLast && !isEdit ? 'none' : '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{v.name}</span>
                    {count > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: count > 2 ? 'rgba(245,158,11,0.2)' : 'rgba(254,203,0,0.12)', color: count > 2 ? '#f59e0b' : YELLOW, border: `1px solid ${count > 2 ? 'rgba(245,158,11,0.3)' : 'rgba(254,203,0,0.25)'}` }}>
                        {count}×
                      </span>
                    )}
                    {count === 0 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>unassigned</span>}
                  </div>
                  <div style={{ fontSize: 12, color: CYAN, marginTop: 2 }}>{v.phone}</div>
                  {roles.length > 0 && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2, lineHeight: 1.4 }}>{roles.join(' · ')}</div>
                  )}
                </div>
                <button onClick={() => setEditing(isEdit ? null : v.id)}
                  style={{ fontSize: 11, color: isEdit ? YELLOW : 'rgba(255,255,255,0.3)', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', flexShrink: 0 }}>
                  {isEdit ? 'cancel' : 'edit'}
                </button>
              </div>
              {isEdit && (
                <EditRow vol={v} onSave={d => saveEdit(v.id, d)} onCancel={() => setEditing(null)} />
              )}
            </div>
          )
        })}
      </Card>
    </div>
  )
}
