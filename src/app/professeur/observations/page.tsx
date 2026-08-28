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
  const [selectedClass, setSelectedClass] = useState<any>(null)
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
    // Charger les classes avec les matières enseignées
    const { data: slots } = await supabase
      .from('timetable_slots')
      .select('class_id, subject_id, classes(id, name, level), subjects(id, name)')
      .eq('teacher_id', uid)

    // Dédupliquer par classe
    const classMap: Record<string, any> = {}
    slots?.forEach((s: any) => {
      if (!classMap[s.class_id]) {
        classMap[s.class_id] = {
          id:      s.classes?.id ?? s.class_id,
          name:    s.classes?.name,
          level:   s.classes?.level,
          subjects: [],
        }
      }
      if (s.subjects && !classMap[s.class_id].subjects.find((x: any) => x.id === s.subject_id)) {
        classMap[s.class_id].subjects.push({ id: s.subject_id, name: s.subjects?.name })
      }
    })

    // Si pas de slots, fallback sur classes assignées
    if (Object.keys(classMap).length === 0) {
      const { data: cls } = await supabase.from('classes').select('id, name, level').eq('teacher_id', uid)
      cls?.forEach(c => { classMap[c.id] = { ...c, subjects: [] } })
    }

    setClasses(Object.values(classMap))
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

  const [selectedSubject, setSelectedSubject] = useState<any>(null)

  if (loading) return <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>Chargement...</div>

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Observations hebdomadaires
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Évaluez vos élèves par matière chaque semaine
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '14px' }}>

        {/* Panneau gauche — sélection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Classe */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Mes classes
            </div>
            {classes.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>Aucune classe assignée</div>
            ) : (
              classes.map(cls => (
                <div
                  key={cls.id}
                  onClick={() => { setSelectedClass(cls); loadStudents(cls.id); setSelectedSubject(cls.subjects?.[0] ?? null) }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', background: selectedClass?.id === cls.id ? '#EFF6FF' : 'transparent' }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>{cls.name}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>{cls.level}</div>
                  </div>
                  {selectedClass?.id === cls.id && <i className="ti ti-chevron-right" style={{ color: '#2563EB', fontSize: '14px' }} />}
                </div>
              ))
            )}
          </div>

          {/* Matière */}
          {selectedClass?.subjects?.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Ma matière
              </div>
              {selectedClass.subjects.map((s: any) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedSubject(s)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', background: selectedSubject?.id === s.id ? '#EFF6FF' : 'transparent' }}
                >
                  <i className="ti ti-book" style={{ color: selectedSubject?.id === s.id ? '#2563EB' : '#94A3B8', fontSize: '16px' }} />
                  <span style={{ fontSize: '13px', fontWeight: selectedSubject?.id === s.id ? 600 : 400, color: '#1E293B' }}>{s.name}</span>
                  {selectedSubject?.id === s.id && <i className="ti ti-check" style={{ color: '#2563EB', fontSize: '14px', marginLeft: 'auto' }} />}
                </div>
              ))}
            </div>
          )}

          {/* Élèves */}
          {students.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {students.length} élève{students.length > 1 ? 's' : ''}
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {students.map((s: any) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedStudent(s)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', background: selectedStudent?.id === s.id ? '#EFF6FF' : 'transparent' }}
                  >
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: selectedStudent?.id === s.id ? '#BFDBFE' : '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, flexShrink: 0 }}>
                      {s.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: selectedStudent?.id === s.id ? 600 : 400, color: '#1E293B' }}>{s.full_name}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>{s.gender === 'M' ? 'Garçon' : 'Fille'}</div>
                    </div>
                    {selectedStudent?.id === s.id && <i className="ti ti-chevron-right" style={{ color: '#2563EB', fontSize: '14px' }} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Panneau droit — observations */}
        {selectedStudent && selectedClass ? (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem', padding: '12px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600 }}>
                {selectedStudent.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', fontFamily: 'Syne, sans-serif' }}>{selectedStudent.full_name}</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  {selectedClass.name}
                  {selectedSubject && <span> · <i className="ti ti-book" style={{ fontSize: '11px' }} /> {selectedSubject.name}</span>}
                </div>
              </div>
            </div>

            <ObservationsView
              studentId={selectedStudent.id}
              readOnly={false}
              classId={selectedClass.id}
              teacherId={userId}
              subjectId={selectedSubject?.id}
              subjectName={selectedSubject?.name}
              studentName={selectedStudent.full_name}
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '5rem', color: '#94A3B8', fontSize: '14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
            <i className="ti ti-arrow-left" style={{ fontSize: '28px', display: 'block', marginBottom: '12px' }} />
            Sélectionnez une classe puis un élève
          </div>
        )}
      </div>
    </div>
  )
}