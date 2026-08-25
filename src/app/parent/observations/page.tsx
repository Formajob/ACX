'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import ObservationsView from '@/components/shared/ObservationsView'

export default function ParentObservationsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    loadStudents(user.email)
  }, [])

  async function loadStudents(email: string) {
    const { data } = await supabase
      .from('students')
      .select('id, full_name, level, class_students(classes(name))')
      .eq('parent_email', email)
    setStudents(data ?? [])
    if (data && data.length === 1) setSelectedStudent(data[0])
    setLoading(false)
  }

  if (loading) return <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>Chargement...</div>

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Observations
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Suivi hebdomadaire de vos enfants par leurs professeurs
        </p>
      </div>

      {/* Sélecteur enfant si plusieurs */}
      {students.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {students.map((s: any) => (
            <button
              key={s.id}
              onClick={() => setSelectedStudent(s)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: '1px solid ' + (selectedStudent?.id === s.id ? '#2563EB' : '#E2E8F0'), borderRadius: '20px', background: selectedStudent?.id === s.id ? '#EFF6FF' : '#fff', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: selectedStudent?.id === s.id ? 600 : 400, color: selectedStudent?.id === s.id ? '#1E3A8A' : '#1E293B' }}
            >
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 600 }}>
                {s.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              {s.full_name}
            </button>
          ))}
        </div>
      )}

      {selectedStudent ? (
        <div>
          {students.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', padding: '10px 14px', background: '#EFF6FF', borderRadius: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#BFDBFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>
                {selectedStudent.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E3A8A' }}>{selectedStudent.full_name}</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  {selectedStudent.class_students?.[0]?.classes?.name} · {selectedStudent.level}
                </div>
              </div>
            </div>
          )}
          <ObservationsView studentId={selectedStudent.id} readOnly={true} />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94A3B8', fontSize: '14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          <i className="ti ti-user-off" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
          Aucun enfant associe a ce compte
        </div>
      )}
    </div>
  )
}