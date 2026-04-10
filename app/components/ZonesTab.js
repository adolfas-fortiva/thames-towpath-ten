'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { ZONES } from '../data'
import { Card, SectionHead, Pill, Tick, SwapDropdown, YELLOW, CYAN } from './ui'

// flat list of all volunteers for the dropdown
const ALL_VOLUNTEERS = ZONES.flatMap(z => [
  { name: z.lead, phone: z.leadPhone, role: `${z.name} lead` },
  ...z.marshals.map(m => ({ name: m.name, phone: m.phone, role: m.id }))
])

export default function ZonesTab() {
  const [zone, setZone]         = useState(0)
  const [expanded, setExpanded] = useState({})
  const [swapping, setSwapping] = useState({})
  const [status, setStatus]     = useState({})

  useEffect(() => {
    supabase.from('marshal_status').select('*').then(({ data }) => {
      if (!data) return
      const map = {}
      data.forEach(r => { map[r.marshal_id] = { arrived: r.arrived, swap_name: r.swap_name } })
      setStatus(map)
    })
    const ch = supabase.channel('zones_marshal_status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marshal_status' }, ({ new: r }) => {
        setStatus(prev => ({ ...prev, [r.marshal_id]: { arrived: r.arrived, swap_name: r.swap_name } }))
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const toggleArrived = async (id) => {
    const cur = status[id]?.arrived || false
    setStatus(prev => ({ ...prev, [id]: { ...prev[id], arrived: !cur } }))
    await supabase.from('marshal_status').upsert({ marshal_id: id, arrived: !cur, swap_name: status[id]?.swap_name || null }, { onConflict: 'marshal_id' })
  }

  const saveSwap = async (id, name) => {
    setStatus(prev => ({ ...prev, [id]: { ...prev[id], swap_name: name || null } }))
    setSwapping(prev => ({ ...prev, [id]: false }))
    await supabase.from('marshal_status').upsert({ marshal_id: id, arrived: status[id]?.arrived || false, swap_name: name || null }, { onConflict: 'marshal_id' })
  }

  const allMarshals   = ZONES.flatMap(z => z.marshals)
  const arrivedCount  = allMarshals.filter(m => status[m.id]?.arrived).length
  const filtered      = zone === 0 ? ZONES : ZONES.filter(z => z.id === zone)

  // build used names list for duplicate detection
  const usedNames = allMarshals.map(m => ({
    name: status[m.id]?.swap_name || m.name,
    role: m.id,
  }))

  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <SectionHead title="Marshal arrivals" right={`${arrivedCount} / ${allMarshals.length}`} />
        <div style={{ padding: '10px 16px 14px' }}>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {allMarshals.map(m => (
              <div key={m.id} style={{ width: 10, height: 10, borderRadius: 2, background: status[m.id]?.arrived ? YELLOW : 'rgba(255,255,255,0.12)' }} />
            ))}
          </div>
          <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 3 }}>
            <div style={{ background: YELLOW, borderRadius: 4, height: 3, width: `${Math.round(arrivedCount / allMarshals.length * 100)}%`, transition: 'width 0.4s' }} />
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <Pill active={zone === 0} onClick={() => setZone(0)}>All</Pill>
        {ZONES.map(z => <Pill key={z.id} active={zone === z.id} onClick={() => setZone(z.id)}>Zone {z.id}</Pill>)}
      </div>

      {filtered.map(z => {
        const zArrived = z.marshals.filter(m => status[m.id]?.arrived).length
        return (
          <div key={z.id} style={{ marginBottom: 20 }}>
            <Card>
              <SectionHead title={z.name} right={`${zArrived}/${z.marshals.length}`} />
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500, fontSize: 14 }}>{z.lead}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Zone lead</div>
                </div>
                <a href={`tel:${z.leadPhone.split('/')[0].trim().replace(/\s/g,'')}`} style={{ color: CYAN, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>{z.leadPhone.split('/')[0].trim()}</a>
              </div>
            </Card>

            <Card>
              {z.marshals.map((m, i) => {
                const st       = status[m.id] || {}
                const hasSwap  = st.swap_name?.trim()
                const isLast   = i === z.marshals.length - 1
                const isSwap   = swapping[m.id]
                const isExpand = expanded[m.id]

                return (
                  <div key={m.id} style={{ borderBottom: isLast && !isSwap && !isExpand ? 'none' : '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#1B2869', background: YELLOW, borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>{m.id}</span>
                          <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {hasSwap ? st.swap_name : m.name}
                          </span>
                        </div>
                        <a href={`tel:${m.phone.split('/')[0].trim().replace(/\s/g,'')}`} style={{ fontSize: 12, color: CYAN, display: 'block' }}>{m.phone.split('/')[0].trim()}</a>
                        <a href={`https://w3w.co/${m.w3w}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#e74c3c', display: 'block', marginTop: 2 }}>///{m.w3w}</a>
                        {hasSwap && <div style={{ fontSize: 11, color: YELLOW, marginTop: 3 }}>↔ swapped from {m.name}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                        <button onClick={() => setSwapping(p => ({ ...p, [m.id]: !p[m.id] }))}
                          style={{ fontSize: 11, color: isSwap ? YELLOW : 'rgba(255,255,255,0.35)', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
                          swap
                        </button>
                        <Tick done={st.arrived} onClick={() => toggleArrived(m.id)} />
                      </div>
                    </div>

                    {isSwap && (
                      <SwapDropdown
                        currentName={m.name}
                        allVolunteers={ALL_VOLUNTEERS}
                        usedNames={usedNames}
                        onSave={name => saveSwap(m.id, name)}
                        onCancel={() => setSwapping(p => ({ ...p, [m.id]: false }))}
                      />
                    )}

                    <button onClick={() => setExpanded(p => ({ ...p, [m.id]: !p[m.id] }))}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '4px 16px 10px', fontSize: 11, color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {isExpand ? '− hide instructions' : '+ instructions'}
                    </button>
                    {isExpand && (
                      <div style={{ padding: '0 16px 12px', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{m.instructions}</div>
                    )}
                  </div>
                )
              })}
            </Card>
          </div>
        )
      })}
    </div>
  )
}
