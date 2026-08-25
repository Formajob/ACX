'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import ObservationsView from '@/components/shared/ObservationsView'

export default function ProfObservationsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [classes, setClasses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    setUserId(user.id)
    loadClasses(user.id)
  }, [])

  async function loadClasses(uid: string) {
    const { data } = await supabase.from('classes').select('id, name, level').eq('teacher_id', uid).order('name')
    setClasses(data ?? [])
    setLoading(false)
  }

  async function loadStudents(classId: string) {
    const { data } = await supabase
      .from('class_students')
      .select('students(id, full_name, gender)')
      .eq('class_id', classId)
    setStudents(data?.map((d: any) => d.students).filter(Boolean) ?? [])
    setSelectedStudent(null)
  }

  if (loading) return <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>Chargement...</div>

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Observations hebdomadaires
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Suivez et evaluez vos eleves chaque semaine
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedStudent ? '280px 1fr' : '1fr', gap: '14px' }}>

        {/* Sélection classe + élève */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px' }}>Classe</label>
            <select
              value={selectedClass}
              onChange={e => { setSelectedClass(e.target.value); loadStudents(e.target.value) }}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', outline: 'none', background: '#fff', color: '#1E293B' }}
            >
              <option value="">Selectionnez une classe</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.level}</option>)}
            </select>
          </div>

          {students.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 500, color: '#64748B' }}>
                {students.length} eleve{students.length > 1 ? 's' : ''}
              </div>
              {students.map((s: any) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', background: selectedStudent?.id === s.id ? '#EFF6FF' : 'transparent', transition: 'background 0.1s' }}
                >
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: selectedStudent?.id === s.id ? '#BFDBFE' : '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>
                    {s.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: selectedStudent?.id === s.id ? 600 : 400, color: '#1E293B' }}>{s.full_name}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>{s.gender === 'M' ? 'Garcon' : 'Fille'}</div>
                  </div>
                  {selectedStudent?.id === s.id && <i className="ti ti-chevron-right" style={{ color: '#2563EB', fontSize: '14px' }} />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Observations */}
        {selectedStudent && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600 }}>
                {selectedStudent.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', fontFamily: 'Syne, sans-serif' }}>{selectedStudent.full_name}</div>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>Observations de la semaine</div>
              </div>
            </div>
            <ObservationsView
              studentId={selectedStudent.id}
              readOnly={false}
              classId={selectedClass}
              teacherId={userId}
            />
          </div>
        )}

        {!selectedStudent && selectedClass && (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94A3B8', fontSize: '14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
            <i className="ti ti-user-search" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
            Selectionnez un eleve pour voir ou ajouter des observations
          </div>
        )}
      </div>
    </div>
  )
}