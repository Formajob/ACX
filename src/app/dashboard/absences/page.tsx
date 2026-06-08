import { createClient } from '@/lib/supabase-server'
import AbsencesClient from './AbsencesClient'

export default async function AbsencesPage() {
  const supabase = await createClient()

  const [
    { data: absences },
    { data: classes },
  ] = await Promise.all([
    supabase
      .from('absences')
      .select('*, students(full_name), classes(name, level)')
      .order('absence_date', { ascending: false })
      .limit(100),
    supabase
      .from('classes')
      .select('id, name, level')
      .order('name', { ascending: true }),
  ])

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Absences
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Suivi des absences par classe
        </p>
      </div>
      <AbsencesClient absences={absences ?? []} classes={classes ?? []} />
    </div>
  )
}