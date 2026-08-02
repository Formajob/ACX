import { createClient } from '@/lib/supabase-server'
import PresenceAdminWrapper from './PresenceAdminWrapper'

export default async function PresenceAdminPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { data: teachers },
    { data: todayAttendances },
    { data: alerts },
  ] = await Promise.all([
    supabase.from('users').select('id, full_name, email').eq('role', 'teacher'),
    supabase
      .from('teacher_attendance')
      .select('*, users(full_name), teacher_attendance_events(*)')
      .eq('date', today),
    supabase
      .from('attendance_alerts')
      .select('*, users(full_name)')
      .eq('read', false)
      .order('created_at', { ascending: false }),
  ])

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Presence des professeurs
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          {new Date().toLocaleDateString('fr-MA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <PresenceAdminWrapper
        teachers={teachers ?? []}
        todayAttendances={todayAttendances ?? []}
        alerts={alerts ?? []}
      />
    </div>
  )
}