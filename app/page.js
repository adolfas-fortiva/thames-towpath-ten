'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import ErrorBoundary from './components/ErrorBoundary'
import { ThemeProvider, useTheme, YELLOW, NAVY } from './theme'

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

const AUTH_KEY = 'ttt_auth'

const GROUPS = [
  {
    id: 'ops', label: 'Race Day', emoji: '🏃',
    tabs: [
      { id: 'zones',     label: 'Zones',     Component: ZonesTab },
      { id: 'field',     label: 'Field',     Component: FieldTab },
      { id: 'miles',     label: 'Miles',     Component: MileMarkersTab },
      { id: 'sos',       label: 'SOS',       Component: SOSTab },
    ],
  },
  {
    id: 'logistics', label: 'Logistics', emoji: '📦',
    tabs: [
      { id: 'inventory', label: 'Inventory', Component: InventoryTab },
      { id: 'suppliers', label: 'Suppliers', Component: SuppliersTab },
      { id: 'inspect',   label: 'Inspect',   Component: InspectionTab },
      { id: 'brief',     label: 'Brief',     Component: BriefTab },
    ],
  },
  {
    id: 'results', label: 'Results', emoji: '🏆',
    tabs: [
      { id: 'prizes', label: 'Prizes', Component: PrizesTab },
    ],
  },
  {
    id: 'admin', label: 'Admin', emoji: '⚙️',
    tabs: [
      { id: 'data', label: 'Data',   Component: DataTab },
      { id: 'map',  label: '🗺 Map', Component: MapTab },
    ],
  },
]

const ALL_TABS = GROUPS.flatMap(g => g.tabs)

function LoginScreen({ onAuth }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [err,  setErr]  = useState(false)
  const [show, setShow] = useState(false)

  const attempt = () => {
    if (user.trim().toLowerCase() === 'ttt' && pass === 'olddearpark2026') {
      sessionStorage.setItem(AUTH_KEY, '1'); onAuth()
    } else { setErr(true); setTimeout(() => setErr(false), 2000) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0c1535 0%, #111e50 50%, #0c1535 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <img src="/logo.png" alt="West 4 Harriers" style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'contain', background: NAVY, marginBottom: 28 }} />
      <div style={{ color: '#fff', fontWeight: 700, fontSize: 22, marginBottom: 6 }}>Thames Towpath Ten</div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 36 }}>Race Director Portal · 12 April 2026</div>
      <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input value={user} onChange={e => setUser(e.target.value)} onKeyDown={e => e.key === 'Enter' && attempt()}
          placeholder="Username" autoCapitalize="none" autoCorrect="off"
          style={{ background: 'rgba(255,255,255,0.1)', border: `1.5px solid ${err ? '#ef4444' : 'rgba(255,255,255,0.2)'}`, borderRadius: 12, padding: '14px 18px', fontSize: 16, color: '#fff', outline: 'none', fontFamily: 'inherit' }} />
        <div style={{ position: 'relative' }}>
          <input value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && attempt()}
            placeholder="Password" type={show ? 'text' : 'password'}
            style={{ background: 'rgba(255,255,255,0.1)', border: `1.5px solid ${err ? '#ef4444' : 'rgba(255,255,255,0.2)'}`, borderRadius: 12, padding: '14px 52px 14px 18px', fontSize: 16, color: '#fff', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} />
          <button onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13 }}>{show ? 'hide' : 'show'}</button>
        </div>
        {err && <div style={{ fontSize: 14, color: '#ef4444', textAlign: 'center' }}>Incorrect username or password</div>}
        <button onClick={attempt} style={{ marginTop: 4, padding: 16, borderRadius: 12, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>Sign in</button>
      </div>
    </div>
  )
}

function Portal() {
  const { theme, toggle } = useTheme()
  const [group,  setGroup]  = useState('ops')
  const [tab,    setTab]    = useState('zones')
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const activeGroup = GROUPS.find(g => g.id === group) || GROUPS[0]
  const activeTab   = ALL_TABS.find(t => t.id === tab) || ALL_TABS[0]
  const isMap       = tab === 'map'
  const isDark      = theme.name === 'dark'
  const accentColor = isDark ? YELLOW : NAVY

  const switchGroup = (gid) => {
    setGroup(gid)
    const g = GROUPS.find(x => x.id === gid)
    if (g && !g.tabs.find(t => t.id === tab)) setTab(g.tabs[0].id)
  }

  return (
    <div data-theme={theme.name}
      style={{ maxWidth: isMap ? '100%' : 760, margin: '0 auto', minHeight: '100vh', background: theme.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ── Sticky nav ── */}
      <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 10, background: theme.nav, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${theme.navBorder}`, boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.08)' }}>

        {/* Header row */}
        <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="West 4 Harriers" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'contain', background: NAVY, flexShrink: 0 }} />
          {!mobile && <div style={{ color: theme.text, fontWeight: 700, fontSize: 14, flex: 1 }}>Thames Towpath Ten</div>}
          {mobile && <div style={{ flex: 1 }} />}

          {/* ☀️ / 🌙 outdoor mode toggle */}
          <button onClick={toggle} title={isDark ? 'Outdoor mode (light)' : 'Dark mode'}
            style={{ width: 40, height: 40, borderRadius: 10, background: isDark ? 'rgba(255,203,0,0.15)' : 'rgba(27,40,105,0.1)', border: `1px solid ${isDark ? 'rgba(254,203,0,0.3)' : 'rgba(27,40,105,0.2)'}`, cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isDark ? '☀️' : '🌙'}
          </button>

          {/* Print */}
          <button onClick={() => window.print()} title="Print"
            style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(128,128,128,0.1)', border: `1px solid ${theme.cardBorder}`, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            🖨️
          </button>

          {/* Sign out */}
          <button onClick={() => { sessionStorage.removeItem(AUTH_KEY); window.location.reload() }}
            style={{ fontSize: 11, color: theme.textDim, background: 'none', border: `1px solid ${theme.cardBorder}`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer', height: 40 }}>
            {mobile ? '↩' : 'Sign out'}
          </button>
        </div>

        {/* Group tabs */}
        <div className="tab-row" style={{ borderTop: `1px solid ${theme.navBorder}` }}>
          {GROUPS.map(g => {
            const active = g.id === group
            return (
              <button key={g.id} className="tab-btn" onClick={() => switchGroup(g.id)}
                style={{
                  color:        active ? accentColor : theme.tabInactive,
                  borderBottom: `3px solid ${active ? accentColor : 'transparent'}`,
                  fontWeight:   active ? 700 : 500,
                  background:   active && !isDark ? 'rgba(27,40,105,0.05)' : 'transparent',
                  fontSize:     mobile ? 11 : 13,
                }}>
                {mobile ? g.emoji : `${g.emoji} ${g.label}`}
              </button>
            )
          })}
        </div>

        {/* Sub-tabs */}
        <div className="tab-row" style={{ borderTop: `1px solid ${theme.navBorder}` }}>
          {activeGroup.tabs.map(t => {
            const active = t.id === tab
            return (
              <button key={t.id} className="tab-btn" onClick={() => setTab(t.id)}
                style={{
                  color:        active ? accentColor : theme.tabInactive,
                  borderBottom: `3px solid ${active ? accentColor : 'transparent'}`,
                  fontWeight:   active ? 700 : 400,
                  fontSize:     mobile ? 11 : 13,
                  minHeight:    44,
                }}>
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Print header — hidden on screen, shown when printing */}
      <div className="print-header" style={{ display: 'none' }}>
        Thames Towpath Ten 2026 — {activeTab.label}
      </div>

      {/* Content */}
      <div style={{ padding: isMap ? 10 : 16 }}>
        {activeTab && (
          <ErrorBoundary key={activeTab.id}>
            <activeTab.Component />
          </ErrorBoundary>
        )}
      </div>
    </div>
  )
}

export default function Page() {
  const [authed, setAuthed] = useState(null)
  useEffect(() => { setAuthed(sessionStorage.getItem(AUTH_KEY) === '1') }, [])
  if (authed === null) return null
  if (!authed) return <LoginScreen onAuth={() => setAuthed(true)} />
  return (
    <ThemeProvider>
      <Portal />
    </ThemeProvider>
  )
}
