import { createClient } from '@/lib/supabase-server'
import PointageClient from './PointageClient'

export default async function PointagePage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]

  const { data: todayAttendance } = await supabase
    .from('teacher_attendance')
    .select('*, teacher_attendance_events(*)')
    .eq('teacher_id', userData.user!.id)
    .eq('date', today)
    .maybeSingle()

  const { data: history } = await supabase
    .from('teacher_attendance')
    .select('*, teacher_attendance_events(*)')
    .eq('teacher_id', userData.user!.id)
    .order('date', { ascending: false })
    .limit(10)

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
        teacherId={userData.user!.id}
        todayAttendance={todayAttendance}
        history={history ?? []}
      />
    </div>
  )
}