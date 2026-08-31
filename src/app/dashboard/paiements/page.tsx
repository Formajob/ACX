'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import PaiementsClient from './PaiementsClient'

export default function PaiementsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [paiements, setPaiements] = useState<any[]>([])
  const [eleves, setEleves] = useState<any[]>([])
  const [schoolName, setSchoolName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    setSchoolName(user.school_name ?? '')
    loadData(user.school_id)
  }, [])

  async function loadData(schoolId: string) {
    const [{ data: pays }, { data: studs }] = await Promise.all([
      supabase
        .from('payments')
        .select('*, students(full_name, parent_phone, parent_email, matricule, parent_name)')
        .eq('school_id', schoolId)
        .order('due_date', { ascending: false }),
      supabase
        .from('students')
        .select('id, full_name')
        .eq('school_id', schoolId)
        .order('full_name'),
    ])
    setPaiements(pays ?? [])
    setEleves(studs ?? [])
    setLoading(false)
  }

  if (loading) return (
    <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>
      Chargement...
    </div>
  )

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Paiements
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Suivi des frais de scolarité et gestion financière
        </p>
      </div>
      <PaiementsClient
        paiements={paiements}
        eleves={eleves}
        schoolName={schoolName}
        onRefresh={() => {
          const stored = localStorage.getItem('acx_user')
          if (stored) loadData(JSON.parse(stored).school_id)
        }}
      />
    </div>
  )
}