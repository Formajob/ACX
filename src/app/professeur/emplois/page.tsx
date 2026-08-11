'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
const COLORS = [
  { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E3A8A' },
  { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
  { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' },
  { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
  { bg: '#F5F3FF', border: '#DDD6FE', text: '#4C1D95' },
  { bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412' },
]

export default function ProfEmploisPage() {
  const supabase = createClient()
  const router = useRouter()
  const [slots, setSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    loadData(user.id)
  }, [])

  async function loadData(userId: string) {
    const { data } = await supabase
      .from('timetable_slots')
      .select('*, subjects(name), classes(name, level)')
      .eq('teacher_id', userId)
      .order('day_of_week')
    setSlots(data ?? [])
    setLoading(false)
  }

  function getSlot(day: number, hour: string) {
    return slots.find(s => s.day_of_week === day + 1 && s.start_time?.slice(0, 5) === hour)
  }

  function getColor(subjectName: string) {
    const names = [...new Set(slots.map((s: any) => s.subjects?.name))]
    return COLORS[names.indexOf(subjectName) % COLORS.length]
  }

  if (loading) return <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px' }}>Chargement...</div>

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>Mon emploi du temps</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>Planning hebdomadaire — lecture seule</p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'left', borderBottom: '1px solid #E2E8F0', width: '70px' }}>Heure</th>
              {DAYS.map(day => (
                <th key={day} style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'center', borderBottom: '1px solid #E2E8F0' }}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour, hi) => (
              <tr key={hour} style={{ borderBottom: hi < HOURS.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                <td style={{ padding: '8px 14px', fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>{hour}</td>
                {DAYS.map((_, di) => {
                  const slot = getSlot(di, hour)
                  const color = slot ? getColor(slot.subjects?.name ?? '') : null
                  return (
                    <td key={di} style={{ padding: '4px 6px', minWidth: '110px' }}>
                      {slot ? (
                        <div style={{ background: color?.bg, border: '1px solid ' + color?.border, borderRadius: '6px', padding: '6px 8px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 500, color: color?.text }}>{slot.subjects?.name}</div>
                          <div style={{ fontSize: '10px', color: color?.text, opacity: 0.8, marginTop: '2px' }}>{slot.classes?.name}</div>
                          <div style={{ fontSize: '10px', color: color?.text, opacity: 0.7 }}>{slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}</div>
                        </div>
                      ) : (
                        <div style={{ height: '44px' }} />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {slots.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px' }}>
            <i className="ti ti-calendar" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
            Aucun creneau assigne
          </div>
        )}
      </div>
    </div>
  )
}