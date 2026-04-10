'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import ErrorBoundary from './components/ErrorBoundary'

const ZonesTab       = dynamic(() => import('./components/ZonesTab'),       { ssr: false })
const FieldTab       = dynamic(() => import('./components/FieldTab'),        { ssr: false })
const SuppliersTab   = dynamic(() => import('./components/SuppliersTab'),    { ssr: false })
const PrizesTab      = dynamic(() => import('./components/PrizesTab'),       { ssr: false })
const MileMarkersTab = dynamic(() => import('./components/MileMarkersTab'),  { ssr: false })
const InspectionTab  = dynamic(() => import('./components/InspectionTab'),   { ssr: false })
const SOSTab         = dynamic(() => import('./components/SOSTab'),          { ssr: false })
const VolunteersTab  = dynamic(() => import('./components/VolunteersTab'),   { ssr: false })
const BriefTab       = dynamic(() => import('./components/BriefTab'),        { ssr: false })

const YELLOW = '#FECB00'
const NAVY   = '#1B2869'

const ROW1 = [
  { id: 'zones',     label: 'Zones',     Component: ZonesTab },
  { id: 'field',     label: 'Field',     Component: FieldTab },
  { id: 'suppliers', label: 'Suppliers', Component: SuppliersTab },
  { id: 'prizes',    label: 'Prizes',    Component: PrizesTab },
  { id: 'miles',     label: 'Miles',     Component: MileMarkersTab },
]
const ROW2 = [
  { id: 'inspect',    label: 'Inspect',    Component: InspectionTab },
  { id: 'brief',      label: 'Brief',      Component: BriefTab },
  { id: 'sos',        label: 'SOS',        Component: SOSTab },
  { id: 'volunteers', label: 'Volunteers', Component: VolunteersTab },
]
const ALL_TABS = [...ROW1, ...ROW2]

const TabBtn = ({ t, active, onClick }) => (
  <button onClick={onClick} style={{
    flex: 1, padding: '9px 4px', border: 'none', background: 'transparent',
    color: active ? YELLOW : 'rgba(255,255,255,0.4)',
    cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 400,
    borderBottom: active ? `2px solid ${YELLOW}` : '2px solid transparent',
    transition: 'all 0.15s', whiteSpace: 'nowrap',
  }}>{t.label}</button>
)

export default function Page() {
  const [tab, setTab] = useState('zones')
  const active = ALL_TABS.find(t => t.id === tab)

  return (
    <div style={{
      maxWidth: 720, margin: '0 auto', minHeight: '100vh',
      background: 'linear-gradient(160deg, #0c1535 0%, #111e50 50%, #0c1535 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(12,21,53,0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="West 4 Harriers" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'contain', background: NAVY, flexShrink: 0 }} />
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>Thames Towpath Ten</div>
        </div>
        <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {ROW1.map(t => <TabBtn key={t.id} t={t} active={tab === t.id} onClick={() => setTab(t.id)} />)}
        </div>
        <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {ROW2.map(t => <TabBtn key={t.id} t={t} active={tab === t.id} onClick={() => setTab(t.id)} />)}
        </div>
      </div>
      <div style={{ padding: 16 }}>
        {active && (
          <ErrorBoundary key={active.id}>
            <active.Component />
          </ErrorBoundary>
        )}
      </div>
    </div>
  )
}
