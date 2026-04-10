'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

export function useAssignments(roleIds) {
  const [asgn,       setAsgn]       = useState({})
  const [volunteers, setVolunteers] = useState([])

  const load = useCallback(async () => {
    if (!roleIds.length) return
    const { data } = await supabase.from('role_assignments').select('*').in('role_id', roleIds).order('is_lead', { ascending: false }).order('slot_order')
    if (!data) return
    const map = {}
    data.forEach(r => { if (!map[r.role_id]) map[r.role_id] = []; map[r.role_id].push(r) })
    setAsgn(map)
  }, [roleIds.join(',')])

  useEffect(() => {
    load()
    supabase.from('volunteers').select('id,name,phone').order('name').then(({ data }) => { if (data) setVolunteers(data) })
    const ch = supabase.channel(`asgn_${roleIds.join('_').slice(0, 40)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_assignments' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  const toggleArrived = async (rowId, current) => {
    setAsgn(prev => {
      const next = {}
      for (const k in prev) next[k] = prev[k].map(r => r.id === rowId ? { ...r, arrived: !current } : r)
      return next
    })
    await supabase.from('role_assignments').update({ arrived: !current }).eq('id', rowId)
  }

  const removeAsgn = async (rowId, roleId) => {
    setAsgn(prev => ({ ...prev, [roleId]: (prev[roleId] || []).filter(r => r.id !== rowId) }))
    await supabase.from('role_assignments').delete().eq('id', rowId)
  }

  const addAsgn = async (roleId, vol, isLead) => {
    const { data } = await supabase.from('role_assignments')
      .upsert({ role_id: roleId, volunteer_name: vol.name, volunteer_phone: vol.phone || null, slot_order: (asgn[roleId] || []).length, is_lead: !!isLead }, { onConflict: 'role_id,volunteer_name' })
      .select().single()
    if (data) setAsgn(prev => {
      const existing = (prev[roleId] || []).filter(r => r.volunteer_name !== vol.name)
      const sorted = [...existing, data].sort((a, b) => (b.is_lead ? 1 : 0) - (a.is_lead ? 1 : 0) || a.slot_order - b.slot_order)
      return { ...prev, [roleId]: sorted }
    })
  }

  const swapAsgn = async (roleId, oldPerson, newVol) => {
    await supabase.from('role_assignments').delete().eq('id', oldPerson.id)
    const { data } = await supabase.from('role_assignments')
      .upsert({ role_id: roleId, volunteer_name: newVol.name, volunteer_phone: newVol.phone || null, slot_order: oldPerson.slot_order, is_lead: oldPerson.is_lead || false }, { onConflict: 'role_id,volunteer_name' })
      .select().single()
    if (data) setAsgn(prev => {
      const without = (prev[roleId] || []).filter(r => r.id !== oldPerson.id && r.volunteer_name !== newVol.name)
      const sorted = [...without, data].sort((a, b) => (b.is_lead ? 1 : 0) - (a.is_lead ? 1 : 0) || a.slot_order - b.slot_order)
      return { ...prev, [roleId]: sorted }
    })
  }

  return { asgn, volunteers, toggleArrived, removeAsgn, addAsgn, swapAsgn }
}
