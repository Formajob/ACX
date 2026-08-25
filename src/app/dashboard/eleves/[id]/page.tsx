'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import ObservationsView from '@/components/shared/ObservationsView'

export default function EleveFichePage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [eleve, setEleve] = useState<any>(null)
  const [classe, setClasse] = useState<any>(null)
  const [absences, setAbsences] = useState<any[]>([])
  const [grades, setGrades] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) loadData()
  }, [id])

  async function loadData() {
    const [
      { data: eleveData },
      { data: absData },
      { data: gradesData },
      { data: paymentsData },
      { data: classData },
    ] = await Promise.all([
      supabase.from('students').select('*').eq('id', id).single(),
      supabase.from('absences').select('*').eq('student_id', id).order('absence_date', { ascending: false }).limit(10),
      supabase.from('grades').select('*, subjects(name, coefficient)').eq('student_id', id).order('term'),
      supabase.from('payments').select('*').eq('student_id', id).order('due_date', { ascending: false }),
      supabase.from('class_students').select('classes(name, level)').eq('student_id', id).limit(1),
    ])

    if (!eleveData) { router.push('/dashboard/eleves'); return }
    setEleve(eleveData)
    setAbsences(absData ?? [])
    setGrades(gradesData ?? [])
    setPayments(paymentsData ?? [])
    setClasse((classData as any)?.[0]?.classes ?? null)
    setLoading(false)
  }

  function getAverage(term: number) {
    const tg = grades.filter((g: any) => g.term === term)
    if (tg.length === 0) return null
    const total = tg.reduce((s: number, g: any) => s + g.value * (g.subjects?.coefficient ?? 1), 0)
    const coeff = tg.reduce((s: number, g: any) => s + (g.subjects?.coefficient ?? 1), 0)
    return coeff > 0 ? (total / coeff).toFixed(2) : null
  }

  const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
    active:      { label: 'Actif',     bg: '#DCFCE7', color: '#166534' },
    inactive:    { label: 'Inactif',   bg: '#F1F5F9', color: '#64748B' },
    transferred: { label: 'Transfere', bg: '#FEF3C7', color: '#92400E' },
    graduated:   { label: 'Diplome',   bg: '#EFF6FF', color: '#2563EB' },
  }

  const field = (label: string, value: any) => (
    <div key={label} style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: value ? '#1E293B' : '#CBD5E1' }}>{value || '—'}</div>
    </div>
  )

  const sectionTitle = (title: string) => (
    <div key={title} style={{ fontSize: '11px', fontWeight: 600, color: '#2563EB', textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '1.25rem 0 0.75rem', paddingBottom: '6px', borderBottom: '2px solid #EFF6FF' }}>
      {title}
    </div>
  )

  if (loading) return (
    <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>
      Chargement...
    </div>
  )

  if (!eleve) return null

  const statusCfg = statusConfig[eleve.status ?? 'active']

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', maxWidth: '900px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <Link href="/dashboard/eleves" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#64748B', textDecoration: 'none', marginBottom: '0.75rem' }}>
            <i className="ti ti-arrow-left" /> Retour aux eleves
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 600 }}>
              {eleve.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A', marginBottom: '4px' }}>
                {eleve.full_name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {eleve.matricule && (
                  <span style={{ fontSize: '12px', background: '#F1F5F9', color: '#64748B', padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
                    {eleve.matricule}
                  </span>
                )}
                {classe && (
                  <span style={{ fontSize: '12px', background: '#DBEAFE', color: '#1E3A8A', padding: '2px 8px', borderRadius: '6px' }}>
                    {classe.name} · {classe.level}
                  </span>
                )}
                <span style={{ fontSize: '12px', background: statusCfg.bg, color: statusCfg.color, padding: '2px 8px', borderRadius: '6px', fontWeight: 500 }}>
                  {statusCfg.label}
                </span>
              </div>
            </div>
          </div>
        </div>
        <Link
          href={'/dashboard/eleves/' + id + '/modifier'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#2563EB', color: '#fff', padding: '9px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}
        >
          <i className="ti ti-pencil" /> Modifier
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

        {/* Infos personnelles */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
          {sectionTitle('Informations personnelles')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            {field('Nom complet', eleve.full_name)}
            {field('Genre', eleve.gender === 'M' ? 'Masculin' : eleve.gender === 'F' ? 'Feminin' : null)}
            {field('Date de naissance', eleve.birth_date ? new Date(eleve.birth_date).toLocaleDateString('fr-MA') : null)}
            {field('Lieu de naissance', eleve.birth_place)}
            {field('Nationalite', eleve.nationality)}
            {field('Ville', eleve.city)}
            {field('Adresse', eleve.address)}
          </div>

          {sectionTitle('Scolarite')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            {field('Niveau', eleve.level)}
            {field('Classe', classe?.name)}
            {field('Date inscription', eleve.enrollment_date ? new Date(eleve.enrollment_date).toLocaleDateString('fr-MA') : null)}
            {field('Ecole precedente', eleve.previous_school)}
          </div>

          {sectionTitle('Services')}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'Transport', value: eleve.has_transport, icon: 'ti-bus' },
              { label: 'Cantine',   value: eleve.has_canteen,   icon: 'ti-tools-kitchen-2' },
              { label: 'Internat',  value: eleve.has_boarding,  icon: 'ti-building' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', background: s.value ? '#DCFCE7' : '#F1F5F9', color: s.value ? '#166534' : '#94A3B8', fontSize: '12px' }}>
                <i className={'ti ' + s.icon} />
                {s.label}
                <i className={'ti ' + (s.value ? 'ti-check' : 'ti-x')} style={{ fontSize: '11px' }} />
              </div>
            ))}
          </div>
          {eleve.transport_route && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748B' }}>
              <i className="ti ti-route" /> {eleve.transport_route}
            </div>
          )}
        </div>

        {/* Parents + Santé */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
            {sectionTitle('Parent / Tuteur 1')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {field('Nom', eleve.parent_name)}
              {field('Relation', eleve.parent_relation)}
              {field('Telephone', eleve.parent_phone)}
              {field('Email', eleve.parent_email)}
              {field('CIN', eleve.cin_parent)}
              {field('Tel urgence', eleve.emergency_phone)}
            </div>

            {eleve.parent2_name && (
              <>
                {sectionTitle('Parent / Tuteur 2')}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  {field('Nom', eleve.parent2_name)}
                  {field('Relation', eleve.parent2_relation)}
                  {field('Telephone', eleve.parent2_phone)}
                  {field('Email', eleve.parent2_email)}
                </div>
              </>
            )}
          </div>

          {(eleve.health_notes || eleve.allergies) && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '1.25rem' }}>
              {sectionTitle('Sante')}
              {field('Notes medicales', eleve.health_notes)}
              {field('Allergies', eleve.allergies)}
            </div>
          )}

          {eleve.notes && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '1.25rem' }}>
              {sectionTitle('Notes internes')}
              <div style={{ fontSize: '13px', color: '#92400E' }}>{eleve.notes}</div>
            </div>
          )}
        </div>
      </div>

      {/* Notes trimestres */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', marginTop: '14px' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '1rem' }}>
          Notes par trimestre
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[1, 2, 3].map(term => {
            const tg = grades.filter((g: any) => g.term === term)
            const avg = getAverage(term)
            return (
              <div key={term} style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>Trimestre {term}</span>
                  {avg && (
                    <span style={{ fontSize: '16px', fontWeight: 600, color: parseFloat(avg) >= 10 ? '#166534' : '#DC2626' }}>
                      {avg}/20
                    </span>
                  )}
                </div>
                {tg.length > 0 ? tg.map((g: any) => (
                  <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #F1F5F9', color: '#475569' }}>
                    <span>{g.subjects?.name}</span>
                    <span style={{ fontWeight: 500, color: g.value >= 10 ? '#166534' : '#DC2626' }}>{g.value}/20</span>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#94A3B8', fontSize: '12px' }}>Pas de notes</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Absences */}
      {absences.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', marginTop: '14px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '1rem' }}>
            Absences ({absences.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {absences.map((a: any) => (
              <span key={a.id} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: a.justified ? '#DCFCE7' : '#FEF3C7', color: a.justified ? '#166534' : '#92400E' }}>
                {new Date(a.absence_date).toLocaleDateString('fr-MA')} · {a.justified ? 'Justifiee' : 'Non justifiee'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Paiements */}
      {payments.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', marginTop: '14px', marginBottom: '2rem' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '1rem' }}>
            Historique paiements
          </div>
          {payments.map((p: any, index: number) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: index < payments.length - 1 ? '1px solid #F1F5F9' : 'none', fontSize: '13px' }}>
              <div style={{ color: '#475569' }}>
                {p.type === 'tuition' ? 'Scolarite' : p.type === 'registration' ? 'Inscription' : 'Autre'}
                <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '6px' }}>
                  Echeance : {new Date(p.due_date).toLocaleDateString('fr-MA')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 500 }}>{p.amount} MAD</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500,
                  background: p.status === 'paid' ? '#DCFCE7' : p.status === 'late' ? '#FEF2F2' : '#FEF3C7',
                  color: p.status === 'paid' ? '#166534' : p.status === 'late' ? '#DC2626' : '#92400E'
                }}>
                  {p.status === 'paid' ? 'Paye' : p.status === 'late' ? 'En retard' : 'En attente'}
                </span>
              </div>
            </div>
          ))}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', marginTop: '14px', marginBottom: '2rem' }}>
  <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '1rem' }}>
    <i className="ti ti-notes" style={{ marginRight: '6px', color: '#2563EB' }} />
    Observations hebdomadaires
  </div>
  <ObservationsView studentId={id} readOnly={true} />
</div>
        </div>

        
      )}
    </div>
  )
}