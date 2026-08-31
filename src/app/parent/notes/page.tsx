'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function ParentNotesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [students, setStudents] = useState<any[]>([])
  const [grades, setGrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTerm, setSelectedTerm] = useState(1)

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    loadData(user.email)
  }, [])

  async function loadData(email: string) {
    const { data: studentsList } = await supabase
      .from('students')
      .select('id, full_name, level, class_students(classes(name))')
      .eq('parent_email', email)

    const ids = studentsList?.map(s => s.id) ?? []
    setStudents(studentsList ?? [])

    if (ids.length > 0) {
      const { data: grd } = await supabase
        .from('grades')
        .select('*, subjects(name, coefficient)')
        .in('student_id', ids)
        .order('term')
      setGrades(grd ?? [])
    }
    setLoading(false)
  }

  function getAverage(studentId: string, term: number) {
    const sg = grades.filter(g => g.student_id === studentId && g.term === term)
    if (sg.length === 0) return null
    const total = sg.reduce((s, g) => s + g.value * (g.subjects?.coefficient ?? 1), 0)
    const coeff = sg.reduce((s, g) => s + (g.subjects?.coefficient ?? 1), 0)
    return coeff > 0 ? (total / coeff).toFixed(2) : null
  }

  function getGeneralAvg(studentId: string) {
    const sg = grades.filter(g => g.student_id === studentId)
    if (sg.length === 0) return null
    const total = sg.reduce((s, g) => s + g.value * (g.subjects?.coefficient ?? 1), 0)
    const coeff = sg.reduce((s, g) => s + (g.subjects?.coefficient ?? 1), 0)
    return coeff > 0 ? (total / coeff).toFixed(1) : null
  }

  function getAppreciation(avg: string | null) {
    if (!avg) return null
    const v = parseFloat(avg)
    if (v >= 16) return { label: 'Tres bien', color: '#166534', bg: '#DCFCE7' }
    if (v >= 14) return { label: 'Bien', color: '#166534', bg: '#DCFCE7' }
    if (v >= 12) return { label: 'Assez bien', color: '#92400E', bg: '#FEF3C7' }
    if (v >= 10) return { label: 'Passable', color: '#92400E', bg: '#FEF3C7' }
    return { label: 'Insuffisant', color: '#DC2626', bg: '#FEF2F2' }
  }

  if (loading) return <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>Chargement...</div>

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>Notes et Bulletins</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>Resultats scolaires par semestre</p>
      </div>

      {/* Sélecteur semestre */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', background: '#F1F5F9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {[1, 2].map(t => (
          <button key={t} onClick={() => setSelectedTerm(t)} style={{ padding: '7px 20px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', background: selectedTerm === t ? '#fff' : 'transparent', color: selectedTerm === t ? '#1E293B' : '#64748B', boxShadow: selectedTerm === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            semestre {t}
          </button>
        ))}
      </div>

      {students.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94A3B8', fontSize: '14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          <i className="ti ti-user-off" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
          Aucun enfant associe a ce compte
        </div>
      ) : (
        students.map((student: any) => {
          const termGrades = grades.filter(g => g.student_id === student.id && g.term === selectedTerm)
          const avg = getAverage(student.id, selectedTerm)
          const genAvg = getGeneralAvg(student.id)
          const appre = getAppreciation(avg)
          const classe = student.class_students?.[0]?.classes

          return (
            <div key={student.id} style={{ marginBottom: '1.5rem' }}>
              {/* Header élève */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px 12px 0 0', padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600 }}>
                    {student.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>{student.full_name}</div>
                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>{classe?.name ?? 'Classe non assignee'} · {student.level}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {avg && (
                    <div style={{ textAlign: 'center', padding: '8px 16px', background: parseFloat(avg) >= 10 ? '#DCFCE7' : '#FEF2F2', borderRadius: '10px' }}>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: parseFloat(avg) >= 10 ? '#166534' : '#DC2626', lineHeight: 1 }}>{avg}</div>
                      <div style={{ fontSize: '10px', color: parseFloat(avg) >= 10 ? '#166534' : '#DC2626', marginTop: '2px' }}>Moy. T{selectedTerm}</div>
                    </div>
                  )}
                  {genAvg && (
                    <div style={{ textAlign: 'center', padding: '8px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>{genAvg}</div>
                      <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>Moy. generale</div>
                    </div>
                  )}
                  {appre && (
                    <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', fontWeight: 600, background: appre.bg, color: appre.color }}>
                      {appre.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Tableau des notes */}
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
                {termGrades.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8', fontSize: '13px' }}>
                    Aucune note pour le semestre {selectedTerm}
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        {['Matiere', 'Coefficient', 'Note /20', 'Appreciation'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {termGrades.map((g: any, index: number) => {
                        const a = getAppreciation(String(g.value))
                        return (
                          <tr key={g.id} style={{ borderBottom: index < termGrades.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                            <td style={{ padding: '11px 16px', fontSize: '14px', fontWeight: 500, color: '#1E293B' }}>{g.subjects?.name}</td>
                            <td style={{ padding: '11px 16px', fontSize: '13px', color: '#64748B' }}>
                              <span style={{ background: '#F1F5F9', padding: '2px 8px', borderRadius: '10px' }}>coeff. {g.subjects?.coefficient}</span>
                            </td>
                            <td style={{ padding: '11px 16px' }}>
                              <span style={{ fontSize: '18px', fontWeight: 700, color: g.value >= 10 ? '#166534' : '#DC2626' }}>{g.value}</span>
                              <span style={{ fontSize: '12px', color: '#94A3B8' }}>/20</span>
                            </td>
                            <td style={{ padding: '11px 16px' }}>
                              {a && <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', fontWeight: 500, background: a.bg, color: a.color }}>{a.label}</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}