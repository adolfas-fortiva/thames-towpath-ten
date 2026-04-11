'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import ErrorBoundary from './components/ErrorBoundary'

const ZonesTab       = dynamic(() => import('./components/ZonesTab'),       { ssr: false })
const FieldTab       = dynamic(() => import('./components/FieldTab'),        { ssr: false })
const SuppliersTab   = dynamic(() => import('./components/SuppliersTab'),    { ssr: false })
const PrizesTab      = dynamic(() => import('./components/PrizesTab'),       { ssr: false })
const MileMarkersTab = dynamic(() => import('./components/MileMarkersTab'),  { ssr: false })
const InspectionTab  = dynamic(() => import('./components/InspectionTab'),   { ssr: false })
const SOSTab         = dynamic(() => import('./components/SOSTab'),          { ssr: false })
const DataTab        = dynamic(() => import('./components/DataTab'),         { ssr: false })
const BriefTab       = dynamic(() => import('./components/BriefTab'),        { ssr: false })
const InventoryTab   = dynamic(() => import('./components/InventoryTab'),    { ssr: false })
const MapTab         = dynamic(() => import('./components/MapTab'),          { ssr: false })

const YELLOW = '#FECB00'
const NAVY   = '#1B2869'
const AUTH_KEY = 'ttt_auth'

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onAuth }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [err,  setErr]  = useState(false)
  const [show, setShow] = useState(false)

  const attempt = () => {
    if (user.trim().toLowerCase() === 'ttt' && pass === 'olddearpark2026') {
      sessionStorage.setItem(AUTH_KEY, '1')
      onAuth()
    } else {
      setErr(true)
      setTimeout(() => setErr(false), 2000)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0c1535 0%, #111e50 50%, #0c1535 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <img src="/logo.png" alt="West 4 Harriers" style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'contain', background: NAVY, marginBottom: 28 }} />
      <div style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Thames Towpath Ten</div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 36 }}>Race Director Portal · 12 April 2026</div>
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input value={user} onChange={e => setUser(e.target.value)} onKeyDown={e => e.key === 'Enter' && attempt()}
          placeholder="Username" autoCapitalize="none" autoCorrect="off"
          style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${err ? '#ef4444' : 'rgba(255,255,255,0.15)'}`, borderRadius: 10, padding: '13px 16px', fontSize: 15, color: '#fff', outline: 'none', fontFamily: 'inherit' }} />
        <div style={{ position: 'relative' }}>
          <input value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && attempt()}
            placeholder="Password" type={show ? 'text' : 'password'}
            style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${err ? '#ef4444' : 'rgba(255,255,255,0.15)'}`, borderRadius: 10, padding: '13px 48px 13px 16px', fontSize: 15, color: '#fff', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} />
          <button onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 12 }}>{show ? 'hide' : 'show'}</button>
        </div>
        {err && <div style={{ fontSize: 13, color: '#ef4444', textAlign: 'center' }}>Incorrect username or password</div>}
        <button onClick={attempt} style={{ marginTop: 4, padding: 14, borderRadius: 10, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Sign in</button>
      </div>
      <div style={{ marginTop: 40, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>West 4 Harriers · Restricted access</div>
    </div>
  )
}

// ─── PORTAL ───────────────────────────────────────────────────────────────────
const ROW1 = [
  { id: 'zones',     label: 'Zones',     Component: ZonesTab },
  { id: 'field',     label: 'Field',     Component: FieldTab },
  { id: 'suppliers', label: 'Suppliers', Component: SuppliersTab },
  { id: 'prizes',    label: 'Prizes',    Component: PrizesTab },
  { id: 'miles',     label: 'Miles',     Component: MileMarkersTab },
]
const ROW2 = [
  { id: 'inventory', label: 'Inventory', Component: InventoryTab },
  { id: 'inspect',   label: 'Inspect',   Component: InspectionTab },
  { id: 'brief',     label: 'Brief',     Component: BriefTab },
  { id: 'sos',       label: 'SOS',       Component: SOSTab },
  { id: 'data',      label: 'Data',      Component: DataTab },
]
const ROW3 = [
  { id: 'map', label: '🗺 Map', Component: MapTab },
]
const ALL_TABS = [...ROW1, ...ROW2, ...ROW3]

const TabBtn = ({ t, active, onClick }) => (
  <button onClick={onClick} style={{
    flex: 1, padding: '9px 4px', border: 'none', background: 'transparent',
    color: active ? YELLOW : 'rgba(255,255,255,0.4)',
    cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 400,
    borderBottom: active ? `2px solid ${YELLOW}` : '2px solid transparent',
    transition: 'all 0.15s', whiteSpace: 'nowrap',
  }}>{t.label}</button>
)

function Portal() {
  const [tab, setTab] = useState('zones')
  const active = ALL_TABS.find(t => t.id === tab)
  const isMap = tab === 'map'

  return (
    <div style={{ maxWidth: isMap ? '100%' : 720, margin: '0 auto', minHeight: '100vh', background: 'linear-gradient(160deg, #0c1535 0%, #111e50 50%, #0c1535 100%)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(12,21,53,0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ padding: '10px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="West 4 Harriers" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'contain', background: NAVY, flexShrink: 0 }} />
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '-0.3px' }}>Thames Towpath Ten</div>
          </div>
          <button onClick={() => { sessionStorage.removeItem(AUTH_KEY); window.location.reload() }}
            style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
            sign out
          </button>
        </div>
        <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {ROW1.map(t => <TabBtn key={t.id} t={t} active={tab === t.id} onClick={() => setTab(t.id)} />)}
        </div>
        <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {ROW2.map(t => <TabBtn key={t.id} t={t} active={tab === t.id} onClick={() => setTab(t.id)} />)}
          <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 0' }} />
          {ROW3.map(t => <TabBtn key={t.id} t={t} active={tab === t.id} onClick={() => setTab(t.id)} />)}
        </div>
      </div>
      <div style={{ padding: isMap ? 12 : 16 }}>
        {active && (
          <ErrorBoundary key={active.id}>
            <active.Component />
          </ErrorBoundary>
        )}
      </div>
    </div>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function Page() {
  const [authed, setAuthed] = useState(null)
  useEffect(() => { setAuthed(sessionStorage.getItem(AUTH_KEY) === '1') }, [])
  if (authed === null) return null
  if (!authed) return <LoginScreen onAuth={() => setAuthed(true)} />
  return <Portal />
}
