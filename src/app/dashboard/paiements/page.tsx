import { createClient } from '@/lib/supabase-server'
import PaiementsClient from './PaiementsClient'

export default async function PaiementsPage() {
  const supabase = await createClient()

  const [
    { data: paiements },
    { data: eleves },
  ] = await Promise.all([
    supabase
      .from('payments')
      .select('*, students(full_name)')
      .order('due_date', { ascending: false }),
    supabase
      .from('students')
      .select('id, full_name')
      .order('full_name', { ascending: true }),
  ])

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Paiements
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Suivi des frais de scolarite
        </p>
      </div>
      <PaiementsClient paiements={paiements ?? []} eleves={eleves ?? []} />
    </div>
  )
}