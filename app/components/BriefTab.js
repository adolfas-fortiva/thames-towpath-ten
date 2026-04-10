'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Card, SectionHead, YELLOW, NAVY, CYAN } from './ui'

export default function BriefTab() {
  const [text,    setText]    = useState('')
  const [saved,   setSaved]   = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [loaded,  setLoaded]  = useState(false)

  useEffect(() => {
    supabase.from('event_config').select('value').eq('key', 'race_brief').single().then(({ data }) => {
      if (data) setText(data.value || '')
      setLoaded(true)
    })
  }, [])

  const save = async () => {
    setSaving(true)
    await supabase.from('event_config').upsert({ key: 'race_brief', value: text }, { onConflict: 'key' })
    setSaving(false)
    setSaved(true)
  }

  if (!loaded) return <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading…</div>

  return (
    <div>
      <Card style={{ marginBottom: 14 }}>
        <SectionHead title="Pre-race brief" right={saving ? 'Saving…' : saved ? 'Saved ✓' : 'Unsaved'} />
        <div style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
          Edit the marshal and volunteer brief below. This is visible to anyone with the portal link.
        </div>
      </Card>

      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setSaved(false) }}
        placeholder={`Race morning brief — Sunday 12 April 2026\n\nStart time: 08:30\nMarshal briefing: 07:45 at race HQ\n\nKey points:\n• All marshals to be in position by 08:15\n• Do not call 999 — contact Jamie Cox (07511 782590) for medical\n• Lost runners escalate to Zone Lead, Zone Lead contacts Cristina\n• Course closes 10:30 — inform tail runner\n\n...add your notes here`}
        style={{
          width: '100%', minHeight: 420, boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 14, padding: 16, fontSize: 14, color: '#fff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          lineHeight: 1.7, outline: 'none', resize: 'vertical',
        }}
      />

      <button
        onClick={save}
        disabled={saved || saving}
        style={{
          width: '100%', marginTop: 10, padding: 14, borderRadius: 12,
          background: saved ? 'rgba(255,255,255,0.06)' : YELLOW,
          color: saved ? 'rgba(255,255,255,0.25)' : NAVY,
          border: `1px solid ${saved ? 'rgba(255,255,255,0.1)' : YELLOW}`,
          fontSize: 14, fontWeight: 700,
          cursor: saved ? 'default' : 'pointer',
          transition: 'all 0.2s',
        }}>
        {saving ? 'Saving…' : saved ? 'Saved' : 'Save brief'}
      </button>
    </div>
  )
}
