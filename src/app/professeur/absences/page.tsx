import { createClient } from '@/lib/supabase-server'
import AbsencesClient from '../../dashboard/absences/AbsencesClient'

export default async function ProfAbsencesPage() {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('users').select('id').eq('role', 'teacher').limit(1).single()

  const { data: classes } = await supabase
    .from('classes').select('id, name, level').eq('teacher_id', profile!.id).order('name')

  const classIds = classes?.map(c => c.id) ?? []

  const { data: absences } = await supabase
    .from('absences')
    .select('*, students(full_name), classes(name, level)')
    .in('class_id', classIds.length > 0 ? classIds : ['none'])
    .order('absence_date', { ascending: false })

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Absences — Mes classes
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Absences des eleves de vos classes uniquement
        </p>
      </div>
      <AbsencesClient absences={absences ?? []} classes={classes ?? []} />
    </div>
  )
}