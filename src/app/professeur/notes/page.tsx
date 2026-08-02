import { createClient } from '@/lib/supabase-server'
import NotesClient from '../../dashboard/notes/NotesClient'

export default async function ProfNotesPage() {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('users').select('id').eq('role', 'teacher').limit(1).single()

  const { data: classes } = await supabase
    .from('classes').select('id, name, level').eq('teacher_id', profile!.id).order('name')

  const { data: subjects } = await supabase
    .from('subjects').select('id, name, coefficient, level').order('name')

  const { data: grades } = await supabase
    .from('grades').select('*, students(full_name)')

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Notes — Mes classes
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Saisie des notes pour vos eleves uniquement
        </p>
      </div>
      <NotesClient classes={classes ?? []} subjects={subjects ?? []} grades={grades ?? []} />
    </div>
  )
}