'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAssignments } from './useAssignments'
import { Card, SectionHead, Pill, Tick, PersonRow, AddRow, YELLOW, NAVY, CYAN, inputStyle } from './ui'

const PHASES = [
  { id: 'prerace', label: 'Pre-race check', desc: 'Verify all items are present before loading' },
  { id: 'loading', label: 'Loading',        desc: 'Confirm items loaded into van morning of race' },
]
const INV_ROLE_IDS = PHASES.map(p => `INV_${p.id.toUpperCase()}`)

function QtyBadge({ required, actual }) {
  const ok = actual !== null && actual !== undefined && actual >= required
  const color = actual === null || actual === undefined ? 'rgba(255,255,255,0.2)' : ok ? YELLOW : '#ef4444'
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '2px 8px', border: `1px solid ${color}`, flexShrink: 0 }}>
      {actual !== null && actual !== undefined ? `${actual} / ${required}` : `need ${required}`}
    </span>
  )
}

export default function InventoryTab() {
  const [phase,   setPhase]   = useState('prerace')
  const [items,   setItems]   = useState([])
  const [checks,  setChecks]  = useState({}) // { itemId: check row }
  const [adding,  setAdding]  = useState(false)
  const [newItem, setNewItem] = useState({ name: '', quantity_required: 1, has_quantity: true, notes: '' })
  const [swapping, setSwapping] = useState({})

  const activePhase = PHASES.find(p => p.id === phase)
  const roleId      = `INV_${phase.toUpperCase()}`
  const { asgn, volunteers, toggleArrived, removeAsgn, addAsgn, swapAsgn } = useAssignments(INV_ROLE_IDS)
  const checkers = asgn[roleId] || []

  useEffect(() => {
    supabase.from('inventory_items').select('*').order('sort_order').then(({ data }) => { if (data) setItems(data) })
    supabase.from('inventory_checks').select('*').then(({ data }) => {
      if (!data) return
      const map = {}
      data.forEach(r => { map[`${r.item_id}_${r.phase}`] = r })
      setChecks(map)
    })
    const ch = supabase.channel('inv_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_checks' }, ({ new: r }) => {
        setChecks(prev => ({ ...prev, [`${r.item_id}_${r.phase}`]: r }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
        supabase.from('inventory_items').select('*').order('sort_order').then(({ data }) => { if (data) setItems(data) })
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const getCheck = (itemId) => checks[`${itemId}_${phase}`] || null

  const toggleCheck = async (item) => {
    const existing = getCheck(item.id)
    const cur      = existing?.checked || false
    const payload  = { item_id: item.id, phase, checked: !cur, quantity_actual: existing?.quantity_actual ?? null }
    const { data } = await supabase.from('inventory_checks').upsert(payload, { onConflict: 'item_id,phase' }).select().single()
    if (data) setChecks(prev => ({ ...prev, [`${item.id}_${phase}`]: data }))
  }

  const setQty = async (item, val) => {
    const n = parseInt(val)
    if (isNaN(n) && val !== '') return
    const existing = getCheck(item.id)
    const payload  = { item_id: item.id, phase, checked: existing?.checked || false, quantity_actual: val === '' ? null : n }
    const { data } = await supabase.from('inventory_checks').upsert(payload, { onConflict: 'item_id,phase' }).select().single()
    if (data) setChecks(prev => ({ ...prev, [`${item.id}_${phase}`]: data }))
  }

  const addItem = async () => {
    if (!newItem.name.trim()) return
    const maxOrder = items.length ? Math.max(...items.map(i => i.sort_order || 0)) + 10 : 10
    const { data } = await supabase.from('inventory_items').insert({ ...newItem, name: newItem.name.trim(), sort_order: maxOrder }).select().single()
    if (data) setItems(prev => [...prev, data])
    setAdding(false)
    setNewItem({ name: '', quantity_required: 1, has_quantity: true, notes: '' })
  }

  const removeItem = async (id) => {
    await supabase.from('inventory_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const doneCount = items.filter(i => getCheck(i.id)?.checked).length

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {PHASES.map(p => <Pill key={p.id} active={phase === p.id} onClick={() => setPhase(p.id)}>{p.label}</Pill>)}
      </div>

      {/* Phase checkers */}
      <Card style={{ marginBottom: 14 }}>
        <SectionHead title={`${activePhase.label} — assigned`} />
        <div style={{ padding: '8px 16px 0', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{activePhase.desc}</div>
        {checkers.length === 0 && <div style={{ padding: '8px 16px', fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>No one assigned</div>}
        {checkers.map(p => (
          <PersonRow key={p.id} person={p} roleId={roleId}
            onToggle={toggleArrived} onRemove={removeAsgn}
            swapOpen={!!swapping[p.id]} onSwapToggle={() => setSwapping(s => ({ ...s, [p.id]: !s[p.id] }))}
            volunteers={volunteers} onSwap={(old, vol) => { swapAsgn(roleId, old, vol); setSwapping(s => ({ ...s, [old.id]: false })) }}
          />
        ))}
        <AddRow roleId={roleId} volunteers={volunteers} onAdd={addAsgn} />
      </Card>

      {/* Progress */}
      <Card style={{ marginBottom: 14 }}>
        <SectionHead title="Inventory check" right={`${doneCount} / ${items.length}`} />
        <div style={{ padding: '10px 16px 14px' }}>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {items.map(i => (
              <div key={i.id} style={{ width: 10, height: 10, borderRadius: 2, background: getCheck(i.id)?.checked ? YELLOW : 'rgba(255,255,255,0.12)' }} />
            ))}
          </div>
          <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 3 }}>
            <div style={{ background: YELLOW, borderRadius: 4, height: 3, width: items.length ? `${Math.round(doneCount / items.length * 100)}%` : '0%', transition: 'width 0.3s' }} />
          </div>
        </div>
      </Card>

      {/* Item list */}
      <Card style={{ marginBottom: 10 }}>
        {items.map((item, i) => {
          const check  = getCheck(item.id)
          const isDone = check?.checked || false
          const isLast = i === items.length - 1
          return (
            <div key={item.id} style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.07)', opacity: isDone ? 0.45 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', textDecoration: isDone ? 'line-through' : 'none' }}>{item.name}</div>
                  {item.notes && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{item.notes}</div>}
                  {item.has_quantity && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <input
                        type="number"
                        value={check?.quantity_actual ?? ''}
                        onChange={e => setQty(item, e.target.value)}
                        placeholder={`need ${item.quantity_required}`}
                        style={{ width: 80, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: '#fff', outline: 'none' }}
                      />
                      <QtyBadge required={item.quantity_required} actual={check?.quantity_actual} />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <button onClick={() => removeItem(item.id)}
                    style={{ fontSize: 18, color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
                  <Tick done={isDone} onClick={() => toggleCheck(item)} />
                </div>
              </div>
            </div>
          )
        })}
      </Card>

      {/* Add item */}
      {!adding ? (
        <button onClick={() => setAdding(true)}
          style={{ width: '100%', padding: 12, borderRadius: 12, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          + Add item
        </button>
      ) : (
        <Card>
          <SectionHead title="New item" />
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} placeholder="Item name" style={inputStyle} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={newItem.has_quantity} onChange={e => setNewItem(p => ({ ...p, has_quantity: e.target.checked }))} style={{ accentColor: YELLOW }} />
              Track quantity
            </label>
            {newItem.has_quantity && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Required qty</span>
                <input type="number" value={newItem.quantity_required} onChange={e => setNewItem(p => ({ ...p, quantity_required: parseInt(e.target.value) || 1 }))}
                  style={{ width: 80, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '6px 8px', fontSize: 13, color: '#fff', outline: 'none' }} />
              </div>
            )}
            <input value={newItem.notes} onChange={e => setNewItem(p => ({ ...p, notes: e.target.value }))} placeholder="Notes (optional)" style={inputStyle} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addItem} style={{ flex: 1, padding: 10, borderRadius: 8, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Add</button>
              <button onClick={() => setAdding(false)} style={{ padding: '10px 16px', borderRadius: 8, background: 'transparent', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
