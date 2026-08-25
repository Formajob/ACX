'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function ParentAbsencesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [absences, setAbsences] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStudent, setFilterStudent] = useState('tous')
  const [filterStatus, setFilterStatus] = useState('tous')

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    loadData(user.email)
  }, [])

  async function loadData(email: string) {
    const { data: studentsList } = await supabase
      .from('students')
      .select('id, full_name')
      .eq('parent_email', email)

    setStudents(studentsList ?? [])
    const ids = studentsList?.map(s => s.id) ?? []

    if (ids.length > 0) {
      const { data: abs } = await supabase
        .from('absences')
        .select('*, students(full_name), classes(name)')
        .in('student_id', ids)
        .order('absence_date', { ascending: false })
      setAbsences(abs ?? [])
    }
    setLoading(false)
  }

  const filtered = absences.filter(a => {
    const matchStudent = filterStudent === 'tous' || a.student_id === filterStudent
    const matchStatus = filterStatus === 'tous' || (filterStatus === 'justified' && a.justified) || (filterStatus === 'unjustified' && !a.justified)
    return matchStudent && matchStatus
  })

  const total     = absences.length
  const justified = absences.filter(a => a.justified).length
  const unjust    = total - justified

  if (loading) return <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>Chargement...</div>

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>Absences</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>Historique complet des absences</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total absences',  value: total,   color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Justifiees',      value: justified, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Non justifiees',  value: unjust,  color: '#EF4444', bg: '#FEF2F2' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#0F172A' }}>{s.value}</div>
            <div style={{ fontSize: '11px', marginTop: '4px', background: s.bg, color: s.color, display: 'inline-block', padding: '2px 8px', borderRadius: '20px' }}>Annee 2024-25</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {students.length > 1 && (
          <select value={filterStudent} onChange={e => setFilterStudent(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', outline: 'none', background: '#fff', color: '#1E293B' }}>
            <option value="tous">Tous les enfants</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        )}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', outline: 'none', background: '#fff', color: '#1E293B' }}>
          <option value="tous">Tous les statuts</option>
          <option value="justified">Justifiees</option>
          <option value="unjustified">Non justifiees</option>
        </select>
      </div>

      {/* Liste */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              {['Enfant', 'Classe', 'Date', 'Statut', 'Motif'].map(h => (
                <th key={h} style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px' }}>Aucune absence</td></tr>
            ) : (
              filtered.map((a: any, index: number) => (
                <tr key={a.id} style={{ borderBottom: index < filtered.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500 }}>
                        {a.students?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{a.students?.full_name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569' }}>{a.classes?.name ?? '-'}</td>
                  <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569' }}>
                    {new Date(a.absence_date).toLocaleDateString('fr-MA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: a.justified ? '#DCFCE7' : '#FEF3C7', color: a.justified ? '#166534' : '#92400E' }}>
                      {a.justified ? 'Justifiee' : 'Non justifiee'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569' }}>{a.reason ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '0.75rem', fontSize: '12px', color: '#94A3B8' }}>{filtered.length} absence{filtered.length > 1 ? 's' : ''}</div>
    </div>
  )
}