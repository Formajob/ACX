import { createClient } from '@/lib/supabase-server'
import NotesClient from './NotesClient'

export default async function NotesPage() {
  const supabase = await createClient()

  const [
    { data: classes },
    { data: subjects },
    { data: grades },
  ] = await Promise.all([
    supabase.from('classes').select('id, name, level').order('name'),
    supabase.from('subjects').select('id, name, coefficient, level').order('name'),
    supabase.from('grades').select('*, students(full_name)'),
  ])

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Notes et Bulletins
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Saisie des notes par classe et matiere
        </p>
      </div>
      <NotesClient classes={classes ?? []} subjects={subjects ?? []} grades={grades ?? []} />
    </div>
  )
}