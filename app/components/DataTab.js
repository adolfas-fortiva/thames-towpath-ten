'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Card, SectionHead, Pill, YELLOW, CYAN, NAVY, inputStyle, validatePhone, formatPhone } from './ui'

// ─── VOLUNTEERS ───────────────────────────────────────────────────────────────
function EditRow({ vol, onSave, onCancel }) {
  const [name,  setName]  = useState(vol?.name  || '')
  const [phone, setPhone] = useState(vol?.phone || '')
  const [err,   setErr]   = useState('')
  const save = () => {
    if (!name.trim()) { setErr('Name required'); return }
    const e = validatePhone(phone); if (e) { setErr(e); return }
    onSave({ name: name.trim(), phone: formatPhone(phone) })
  }
  return (
    <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <input value={name}  onChange={e => { setName(e.target.value);  setErr('') }} placeholder="Full name"     style={inputStyle} />
      <input value={phone} onChange={e => { setPhone(e.target.value); setErr('') }} placeholder="07xxx xxxxxx" style={{ ...inputStyle, borderColor: err ? '#ef4444' : undefined }} />
      {err && <div style={{ fontSize: 11, color: '#ef4444' }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} style={{ flex: 1, padding: 8, borderRadius: 8, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Save</button>
        <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

function VolunteersView() {
  const [volunteers,   setVolunteers]   = useState([])
  const [assignCounts, setAssignCounts] = useState({}) // { name: count }
  const [editing,      setEditing]      = useState(null)
  const [search,       setSearch]       = useState('')

  useEffect(() => {
    supabase.from('volunteers').select('*').order('name').then(({ data }) => { if (data) setVolunteers(data) })
    // Count from role_assignments
    supabase.from('role_assignments').select('volunteer_name').then(({ data }) => {
      if (!data) return
      const counts = {}
      data.forEach(r => { counts[r.volunteer_name] = (counts[r.volunteer_name] || 0) + 1 })
      setAssignCounts(counts)
    })
    const ch = supabase.channel('vol_data_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'volunteers' }, () => {
        supabase.from('volunteers').select('*').order('name').then(({ data }) => { if (data) setVolunteers(data) })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_assignments' }, () => {
        supabase.from('role_assignments').select('volunteer_name').then(({ data }) => {
          if (!data) return
          const counts = {}
          data.forEach(r => { counts[r.volunteer_name] = (counts[r.volunteer_name] || 0) + 1 })
          setAssignCounts(counts)
        })
      })
      .subscribe()
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

  const filtered    = volunteers.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || v.phone?.includes(search))
  const unassigned  = volunteers.filter(v => !(assignCounts[v.name] > 0))
  const over2       = volunteers.filter(v => (assignCounts[v.name] || 0) > 2)

  return (
    <>
      <Card style={{ marginBottom: 12 }}>
        <SectionHead title="Overview" right={`${volunteers.length} total`} />
        <div style={{ padding: '10px 16px 14px', display: 'flex', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: YELLOW }}>{volunteers.length - unassigned.length}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>assigned</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: unassigned.length > 0 ? '#ef4444' : YELLOW }}>{unassigned.length}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>unassigned</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: over2.length > 0 ? '#f59e0b' : YELLOW }}>{over2.length}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>3+ roles</div>
          </div>
        </div>
      </Card>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ ...inputStyle, marginBottom: 10 }} />
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
          const count  = assignCounts[v.name] || 0
          const isEdit = editing === v.id
          const isLast = i === filtered.length - 1
          const isUnassigned = count === 0
          return (
            <div key={v.id} style={{ borderBottom: isLast && !isEdit ? 'none' : '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: isUnassigned ? '#ef4444' : 'rgba(255,255,255,0.9)' }}>{v.name}</span>
                    {count === 2 && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: 'rgba(254,203,0,0.15)', color: YELLOW, border: '1px solid rgba(254,203,0,0.3)' }}>2×</span>}
                    {count >= 3 && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>{count}×</span>}
                    {isUnassigned && <span style={{ fontSize: 10, color: '#ef4444', opacity: 0.7 }}>unassigned</span>}
                  </div>
                  <div style={{ fontSize: 12, color: CYAN, marginTop: 2 }}>{v.phone}</div>
                </div>
                <button onClick={() => setEditing(isEdit ? null : v.id)}
                  style={{ fontSize: 11, color: isEdit ? YELLOW : 'rgba(255,255,255,0.3)', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', flexShrink: 0 }}>
                  {isEdit ? 'cancel' : 'edit'}
                </button>
              </div>
              {isEdit && <EditRow vol={v} onSave={d => saveEdit(v.id, d)} onCancel={() => setEditing(null)} />}
            </div>
          )
        })}
      </Card>
    </>
  )
}

// ─── LOCATIONS ────────────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
      <div style={{ background: '#1a2060', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: 24, maxWidth: 340, width: '100%' }}>
        <div style={{ fontSize: 15, color: '#fff', marginBottom: 20, lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onConfirm} style={{ flex: 1, padding: 12, borderRadius: 10, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Yes, save</button>
          <button onClick={onCancel}  style={{ flex: 1, padding: 12, borderRadius: 10, background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.2)', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function LocationsView() {
  const [locs,    setLocs]    = useState([])
  const [editing, setEditing] = useState(null) // { id?, name, w3w, description } or 'new'
  const [pending, setPending] = useState(null) // confirm modal state
  const [delConfirm, setDelConfirm] = useState(null)
  const [cat,     setCat]     = useState('all')

  useEffect(() => {
    supabase.from('locations').select('*').order('sort_order').then(({ data }) => { if (data) setLocs(data) })
  }, [])

  const openEdit = (loc) => setEditing({ id: loc.id, name: loc.name, w3w: loc.w3w || '', description: loc.description || '' })
  const openNew  = ()    => setEditing({ id: null, name: '', w3w: '', description: '' })

  const commitSave = async () => {
    if (!editing) return
    if (editing.id) {
      await supabase.from('locations').update({ name: editing.name, w3w: editing.w3w || null, description: editing.description || null }).eq('id', editing.id)
      setLocs(prev => prev.map(l => l.id === editing.id ? { ...l, ...editing } : l))
    } else {
      const maxOrder = locs.length ? Math.max(...locs.map(l => l.sort_order || 0)) + 10 : 10
      const { data } = await supabase.from('locations').insert({ name: editing.name, w3w: editing.w3w || null, description: editing.description || null, sort_order: maxOrder }).select().single()
      if (data) setLocs(prev => [...prev, data])
    }
    setEditing(null); setPending(null)
  }

  const commitDelete = async () => {
    if (!delConfirm) return
    await supabase.from('locations').delete().eq('id', delConfirm)
    setLocs(prev => prev.filter(l => l.id !== delConfirm))
    setDelConfirm(null)
  }

  const cats = ['all', 'mile_marker', 'signage']
  const filtered = locs.filter(l => cat === 'all' || l.category === cat)

  return (
    <>
      {pending && <ConfirmModal message={`Save changes to "${pending}"?`} onConfirm={commitSave} onCancel={() => setPending(null)} />}
      {delConfirm && <ConfirmModal message="Delete this location? This cannot be undone." onConfirm={commitDelete} onCancel={() => setDelConfirm(null)} />}

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {cats.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{ padding: '5px 14px', borderRadius: 16, border: `1px solid ${cat === c ? YELLOW : 'rgba(255,255,255,0.15)'}`, background: cat === c ? YELLOW : 'transparent', color: cat === c ? NAVY : 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}>
            {c === 'all' ? 'All' : c === 'mile_marker' ? 'Mile markers' : 'Signage'}
          </button>
        ))}
      </div>

      <button onClick={openNew}
        style={{ width: '100%', padding: 12, borderRadius: 12, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 12 }}>
        + Add location
      </button>

      {editing && !editing.id && (
        <Card style={{ marginBottom: 12 }}>
          <SectionHead title="New location" />
          <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} placeholder="Name (e.g. Mile 1)" style={inputStyle} />
            <input value={editing.w3w} onChange={e => setEditing(p => ({ ...p, w3w: e.target.value }))} placeholder="word.word.word" style={inputStyle} />
            <textarea value={editing.description} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} placeholder="Description" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPending(editing.name || 'new location')} style={{ flex: 1, padding: 8, borderRadius: 8, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Save</button>
              <button onClick={() => setEditing(null)} style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </Card>
      )}

      {filtered.map((loc, i) => {
        const isEdit = editing?.id === loc.id
        return (
          <Card key={loc.id}>
            {isEdit ? (
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} placeholder="Name" style={inputStyle} />
                <input value={editing.w3w} onChange={e => setEditing(p => ({ ...p, w3w: e.target.value }))} placeholder="word.word.word" style={inputStyle} />
                <textarea value={editing.description} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} placeholder="Description" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setPending(editing.name)} style={{ flex: 1, padding: 8, borderRadius: 8, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Save</button>
                  <button onClick={() => setDelConfirm(loc.id)} style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontSize: 13, cursor: 'pointer' }}>Delete</button>
                  <button onClick={() => setEditing(null)} style={{ padding: '8px 12px', borderRadius: 8, background: 'transparent', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 13, cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{loc.name}</div>
                  {loc.w3w && <a href={`https://w3w.co/${loc.w3w}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#e74c3c', display: 'block', marginBottom: 4 }}>///{loc.w3w}</a>}
                  {loc.description && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{loc.description}</div>}
                </div>
                <button onClick={() => openEdit(loc)}
                  style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', flexShrink: 0 }}>
                  edit
                </button>
              </div>
            )}
          </Card>
        )
      })}
    </>
  )
}

// ─── DATA TAB (combined) ──────────────────────────────────────────────────────
export default function DataTab() {
  const [view, setView] = useState('volunteers')
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <Pill active={view === 'volunteers'} onClick={() => setView('volunteers')}>Volunteers</Pill>
        <Pill active={view === 'locations'}  onClick={() => setView('locations')}>Locations</Pill>
      </div>
      {view === 'volunteers' && <VolunteersView />}
      {view === 'locations'  && <LocationsView />}
    </div>
  )
}
