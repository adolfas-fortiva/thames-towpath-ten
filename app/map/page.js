'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const MapTab = dynamic(() => import('../components/MapTab'), { ssr: false })

const YELLOW = '#FECB00'
const NAVY   = '#1B2869'
const AUTH_KEY = 'ttt_auth'

export default function MapPage() {
  const [authed, setAuthed] = useState(null)

  useEffect(() => {
    setAuthed(sessionStorage.getItem(AUTH_KEY) === '1')
  }, [])

  if (authed === null) return null
  if (!authed) {
    if (typeof window !== 'undefined') window.location.href = '/'
    return null
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(160deg, #0c1535 0%, #111e50 50%, #0c1535 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ background: 'rgba(12,21,53,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <a href="/" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '4px 10px' }}>← Portal</a>
        <img src="/logo.png" alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'contain', background: NAVY }} />
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Thames Towpath Ten — Map</div>
      </div>
      {/* Map fills remaining height */}
      <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column' }}>
        <MapTab />
      </div>
    </div>
  )
}
