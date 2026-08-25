'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ParentPage() {
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [absences, setAbsences] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [grades, setGrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    if (user.role !== 'parent') { router.push('/login'); return }
    setProfile(user)
    loadData(user.email, user.id)
  }, [])

  async function loadData(email: string, userId: string) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, full_name, school_id')
      .eq('id', userId)
      .single()

    const { data: studentsList } = await supabase
      .from('students')
      .select('id, full_name, gender, birth_date, level, matricule, class_students(classes(name, level))')
      .eq('parent_email', email)

    const ids = studentsList?.map(s => s.id) ?? []
    setStudents(studentsList ?? [])

    if (ids.length === 0) { setLoading(false); return }

    const [
      { data: abs },
      { data: pays },
      { data: grd },
    ] = await Promise.all([
      supabase.from('absences').select('id, absence_date, justified, students(full_name)').in('student_id', ids).order('absence_date', { ascending: false }).limit(5),
      supabase.from('payments').select('id, amount, status, due_date, students(full_name)').in('student_id', ids).order('due_date', { ascending: false }).limit(5),
      supabase.from('grades').select('id, value, term, student_id, subjects(name, coefficient)').in('student_id', ids),
    ])

    setAbsences(abs ?? [])
    setPayments(pays ?? [])
    setGrades(grd ?? [])
    setLoading(false)
  }

  function getAvgGrade(studentId: string) {
    const sg = grades.filter(g => g.student_id === studentId)
    if (sg.length === 0) return null
    const total = sg.reduce((s, g) => s + g.value * (g.subjects?.coefficient ?? 1), 0)
    const coeff = sg.reduce((s, g) => s + (g.subjects?.coefficient ?? 1), 0)
    return coeff > 0 ? (total / coeff).toFixed(1) : null
  }

  const totalAbsences = absences.length
  const unjustified   = absences.filter(a => !a.justified).length
  const pendingPay    = payments.filter(p => p.status === 'pending' || p.status === 'late').length
  const totalDue      = payments.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amount, 0)

  if (loading) return <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>Chargement...</div>

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Bonjour{profile?.full_name ? ', ' + profile.full_name.split(' ')[0] : ''} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Suivi scolaire de {students.length === 1 ? 'votre enfant' : 'vos enfants'} — Annee 2024-25
        </p>
      </div>

      {/* Enfants */}
      {students.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {students.map((s: any) => {
            const classe = s.class_students?.[0]?.classes
            const avg = getAvgGrade(s.id)
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px 16px', flex: '1', minWidth: '200px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 600, flexShrink: 0 }}>
                  {s.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{s.full_name}</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                    {classe?.name ?? 'Classe non assignee'} · {s.level ?? ''}
                  </div>
                </div>
                {avg && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: parseFloat(avg) >= 10 ? '#166534' : '#DC2626' }}>{avg}</div>
                    <div style={{ fontSize: '10px', color: '#94A3B8' }}>/20</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
        {[
          { label: 'Absences total',     value: totalAbsences,           color: '#2563EB', bg: '#EFF6FF', href: '/parent/absences' },
          { label: 'Non justifiees',     value: unjustified,             color: '#EF4444', bg: '#FEF2F2', href: '/parent/absences' },
          { label: 'Paiements en cours', value: pendingPay,              color: '#F59E0B', bg: '#FFFBEB', href: '/parent/paiements' },
          { label: 'Reste a payer',      value: totalDue + ' MAD',       color: '#EF4444', bg: '#FEF2F2', href: '/parent/paiements' },
        ].map(s => (
          <Link key={s.label} href={s.href} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', textDecoration: 'none', display: 'block', transition: 'border-color 0.15s' }}>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>{s.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#0F172A', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '11px', marginTop: '6px', background: s.bg, color: s.color, display: 'inline-block', padding: '2px 8px', borderRadius: '20px' }}>
              Voir detail
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

        {/* Absences récentes */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>Dernieres absences</div>
            <Link href="/parent/absences" style={{ fontSize: '12px', color: '#2563EB', textDecoration: 'none' }}>Voir tout</Link>
          </div>
          {absences.length > 0 ? absences.map((a: any, index: number) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: index < absences.length - 1 ? '1px solid #F1F5F9' : 'none', fontSize: '13px' }}>
              <div>
                <div style={{ fontWeight: 500, color: '#1E293B' }}>{a.students?.full_name}</div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>{new Date(a.absence_date).toLocaleDateString('fr-MA', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
              </div>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: a.justified ? '#DCFCE7' : '#FEF3C7', color: a.justified ? '#166534' : '#92400E' }}>
                {a.justified ? 'Justifiee' : 'Non justifiee'}
              </span>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontSize: '13px' }}>
              <i className="ti ti-check-circle" style={{ fontSize: '24px', display: 'block', marginBottom: '6px', color: '#10B981' }} />
              Aucune absence
            </div>
          )}
        </div>

        {/* Paiements récents */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>Derniers paiements</div>
            <Link href="/parent/paiements" style={{ fontSize: '12px', color: '#2563EB', textDecoration: 'none' }}>Voir tout</Link>
          </div>
          {payments.length > 0 ? payments.map((p: any, index: number) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: index < payments.length - 1 ? '1px solid #F1F5F9' : 'none', fontSize: '13px' }}>
              <div>
                <div style={{ fontWeight: 500, color: '#1E293B' }}>{p.amount} MAD</div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>Echeance : {new Date(p.due_date).toLocaleDateString('fr-MA')}</div>
              </div>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: p.status === 'paid' ? '#DCFCE7' : p.status === 'late' ? '#FEF2F2' : '#FEF3C7', color: p.status === 'paid' ? '#166534' : p.status === 'late' ? '#DC2626' : '#92400E' }}>
                {p.status === 'paid' ? 'Paye' : p.status === 'late' ? 'En retard' : 'En attente'}
              </span>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontSize: '13px' }}>
              Aucun paiement
            </div>
          )}
        </div>
      </div>

      {/* Accès rapides */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '14px' }}>
        {[
          { label: 'Voir les notes',    icon: 'ti-file-text',    href: '/parent/notes',     color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Voir les absences', icon: 'ti-calendar-off', href: '/parent/absences',  color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Voir les paiements',icon: 'ti-credit-card',  href: '/parent/paiements', color: '#EF4444', bg: '#FEF2F2' },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', textDecoration: 'none', color: '#1E293B', fontSize: '13px', fontWeight: 500 }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <i className={'ti ' + item.icon} />
            </div>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  )
}