'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import PointageClient from './PointageClient'

export default function PointagePage() {
  const supabase = createClient()
  const router = useRouter()
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [todayAttendance, setTodayAttendance] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    setTeacherId(user.id)
    loadData(user.id)
  }, [])

  async function loadData(userId: string) {
    const today = new Date().toISOString().split('T')[0]

    const [{ data: todayAtt }, { data: hist }] = await Promise.all([
      supabase
        .from('teacher_attendance')
        .select('*, teacher_attendance_events(*)')
        .eq('teacher_id', userId)
        .eq('date', today)
        .maybeSingle(),
      supabase
        .from('teacher_attendance')
        .select('*, teacher_attendance_events(*)')
        .eq('teacher_id', userId)
        .order('date', { ascending: false })
        .limit(10),
    ])

    setTodayAttendance(todayAtt)
    setHistory(hist ?? [])
    setLoading(false)
  }

  if (loading) return <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px' }}>Chargement...</div>
  if (!teacherId) return null

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Mon Pointage
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          {new Date().toLocaleDateString('fr-MA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
      <PointageClient
        teacherId={teacherId}
        todayAttendance={todayAttendance}
        history={history}
      />
    </div>
  )
}