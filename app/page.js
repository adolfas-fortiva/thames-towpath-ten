'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'

const ZonesTab       = dynamic(() => import('./components/ZonesTab'))
const FieldTab       = dynamic(() => import('./components/FieldTab'))
const SuppliersTab   = dynamic(() => import('./components/SuppliersTab'))
const PrizesTab      = dynamic(() => import('./components/PrizesTab'))
const MileMarkersTab = dynamic(() => import('./components/MileMarkersTab'))
const InspectionTab  = dynamic(() => import('./components/InspectionTab'))
const SOSTab         = dynamic(() => import('./components/SOSTab'))
const VolunteersTab  = dynamic(() => import('./components/VolunteersTab'))

const YELLOW = '#FECB00'
const NAVY   = '#1B2869'

const TABS = [
  { id: 'zones',     label: 'Zones',      Component: ZonesTab },
  { id: 'field',     label: 'Field',      Component: FieldTab },
  { id: 'suppliers', label: 'Suppliers',  Component: SuppliersTab },
  { id: 'prizes',    label: 'Prizes',     Component: PrizesTab },
  { id: 'miles',     label: 'Miles',      Component: MileMarkersTab },
  { id: 'inspect',   label: 'Inspect',    Component: InspectionTab },
  { id: 'sos',       label: 'SOS',        Component: SOSTab },
  { id: 'volunteers',label: 'Volunteers', Component: VolunteersTab },
]

export default function Page() {
  const [tab, setTab] = useState('zones')
  const active = TABS.find(t => t.id === tab)

  return (
    <div style={{
      maxWidth: 540, margin: '0 auto', minHeight: '100vh',
      background: 'linear-gradient(160deg, #0c1535 0%, #111e50 50%, #0c1535 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(12,21,53,0.9)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ padding: '12px 16px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="West 4 Harriers" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'contain', background: NAVY, flexShrink: 0 }} />
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px' }}>Thames Towpath Ten</div>
        </div>
        <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '10px 4px', border: 'none', background: 'transparent',
              color: tab === t.id ? YELLOW : 'rgba(255,255,255,0.35)',
              cursor: 'pointer', fontSize: 11, fontWeight: tab === t.id ? 700 : 400,
              borderBottom: tab === t.id ? `2px solid ${YELLOW}` : '2px solid transparent',
              transition: 'all 0.15s', whiteSpace: 'nowrap', minWidth: 0, flexShrink: 1,
            }}>{t.label}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: 16 }}>
        {active && <active.Component />}
      </div>
    </div>
  )
}
