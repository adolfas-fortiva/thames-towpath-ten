'use client'
import { EMERGENCY } from '../data'
import { Card, SectionHead, CYAN } from './ui'

export default function SOSTab() {
  return (
    <div>
      <Card style={{ marginBottom: 14, borderColor: 'rgba(239,68,68,0.35)' }}>
        <SectionHead title="Emergency protocol" />
        <div style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
          Only the Race Director contacts 999. All marshals escalate to their Zone Lead first, who contacts Cristina or Andy Heale.
        </div>
      </Card>

      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 4px 6px' }}>Priority contacts</div>
      <Card style={{ marginBottom: 14 }}>
        {EMERGENCY.filter(c => c.priority).map((c, i, arr) => (
          <div key={c.phone} style={{ padding: '13px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{c.role}</div>
              </div>
              <a href={`tel:${c.phone}`} style={{ fontSize: 18, fontWeight: 700, color: '#ef4444', textDecoration: 'none', flexShrink: 0 }}>{c.phone}</a>
            </div>
          </div>
        ))}
      </Card>

      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 4px 6px' }}>Zone leads & key roles</div>
      <Card>
        {EMERGENCY.filter(c => !c.priority).map((c, i, arr) => (
          <div key={c.phone} style={{ padding: '13px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{c.role}</div>
              </div>
              <a href={`tel:${c.phone}`} style={{ fontSize: 14, fontWeight: 600, color: CYAN, textDecoration: 'none', flexShrink: 0 }}>{c.phone}</a>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}
