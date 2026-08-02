import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import ProfElevesClient from './ProfElevesClient'

export default async function ProfElevesPage() {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('users').select('id, full_name').eq('role', 'teacher').limit(1).single()

  if (!profile) return <div style={{ padding: '2rem', color: '#64748B' }}>Profil introuvable</div>

  const { data: mesClasses } = await supabase
    .from('classes').select('id, name, level').eq('teacher_id', profile.id)

  const classIds = mesClasses?.map(c => c.id) ?? []

  const { data: classStudents } = await supabase
    .from('class_students')
    .select('class_id, students(id, full_name, birth_date, gender, parent_phone, parent_email)')
    .in('class_id', classIds.length > 0 ? classIds : ['none'])

  const eleves = classStudents?.map((cs: any) => ({
    ...cs.students,
    classe: mesClasses?.find(c => c.id === cs.class_id),
  })) ?? []

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Mes eleves
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          {eleves.length} eleve{eleves.length > 1 ? 's' : ''} dans {mesClasses?.length ?? 0} classe{(mesClasses?.length ?? 0) > 1 ? 's' : ''}
        </p>
      </div>
      <ProfElevesClient eleves={eleves} classes={mesClasses ?? []} />
    </div>
  )
}