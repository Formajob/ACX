import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import ElevesClient from './ElevesClient'

export default async function ElevesPage() {
  const supabase = await createClient()

  const { data: eleves, error } = await supabase
    .from('students')
    .select('*, class_students(classes(name, level))')
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Erreur chargement eleves:', error)
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
            Eleves
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
            {eleves?.length ?? 0} eleve{(eleves?.length ?? 0) > 1 ? 's' : ''} inscrits
          </p>
        </div>
        <Link
          href="/dashboard/eleves/nouveau"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#2563EB',
            color: '#fff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 500,
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          <i className="ti ti-user-plus" style={{ fontSize: '16px' }} />
          Ajouter un eleve
        </Link>
      </div>

      <ElevesClient eleves={eleves ?? []} />
    </div>
  )
}
