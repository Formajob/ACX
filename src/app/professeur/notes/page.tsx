'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

interface Classe { id: string; name: string; level: string }
interface Subject { id: string; name: string; coefficient: number; level: string }
interface Student { id: string; full_name: string }

export default function ProfNotesPage() {
  const supabase = createClient()
  const router = useRouter()

  const [classes, setClasses] = useState<Classe[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [grades, setGrades] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedTerm, setSelectedTerm] = useState(1)
  const [noteValues, setNoteValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    loadInitial(user.id)
  }, [])

  async function loadInitial(userId: string) {
    const [{ data: cls }, { data: subs }] = await Promise.all([
      supabase.from('classes').select('id, name, level').eq('teacher_id', userId).order('name'),
      supabase.from('subjects').select('id, name, coefficient, level').order('name'),
    ])
    setClasses(cls ?? [])
    setSubjects(subs ?? [])
    setLoading(false)
  }

  async function loadStudents(classId: string) {
    setLoadingStudents(true)
    const { data } = await supabase
      .from('class_students')
      .select('students(id, full_name)')
      .eq('class_id', classId)
    const list = data?.map((d: any) => d.students).filter(Boolean) ?? []
    setStudents(list)

    const existingNotes: Record<string, string> = {}
    list.forEach((s: Student) => {
      const existing = grades.find(g => g.student_id === s.id && g.subject_id === selectedSubject && g.class_id === classId && g.term === selectedTerm)
      if (existing) existingNotes[s.id] = String(existing.value)
    })
    setNoteValues(existingNotes)
    setLoadingStudents(false)
  }

  async function loadGrades(classId: string) {
    const { data } = await supabase.from('grades').select('*').eq('class_id', classId)
    setGrades(data ?? [])
  }

  async function handleSave() {
    if (!selectedClass || !selectedSubject) { setError('Selectionnez une classe et une matiere'); return }
    setSaving(true)
    setError('')
    setSuccess('')

    const upserts = students
      .filter(s => noteValues[s.id] !== undefined && noteValues[s.id] !== '')
      .map(s => ({
        student_id: s.id,
        subject_id: selectedSubject,
        class_id: selectedClass,
        term: selectedTerm,
        value: parseFloat(noteValues[s.id]),
        type: 'exam',
      }))

    if (upserts.length === 0) { setError('Aucune note a enregistrer'); setSaving(false); return }

    const { error: upsertError } = await supabase
      .from('grades')
      .upsert(upserts, { onConflict: 'student_id,subject_id,class_id,term,type' })

    if (upsertError) { setError('Erreur: ' + upsertError.message); setSaving(false); return }
    setSuccess(upserts.length + ' notes enregistrees')
    setSaving(false)
    loadGrades(selectedClass)
  }

  function getMoyenne(studentId: string) {
    const sg = grades.filter(g => g.student_id === studentId && g.class_id === selectedClass && g.term === selectedTerm)
    if (sg.length === 0) return null
    const total = sg.reduce((sum: number, g: any) => {
      const subj = subjects.find(s => s.id === g.subject_id)
      return sum + g.value * (subj?.coefficient ?? 1)
    }, 0)
    const totalCoeff = sg.reduce((sum: number, g: any) => {
      const subj = subjects.find(s => s.id === g.subject_id)
      return sum + (subj?.coefficient ?? 1)
    }, 0)
    return totalCoeff > 0 ? (total / totalCoeff).toFixed(2) : null
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'DM Sans, sans-serif',
    outline: 'none',
    color: '#1E293B',
    background: '#fff',
    boxSizing: 'border-box' as const,
  }

  if (loading) return <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px' }}>Chargement...</div>

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>Notes — Mes classes</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>Saisie des notes pour vos eleves uniquement</p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Classe</label>
            <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setStudents([]); setNoteValues({}); if (e.target.value) { loadStudents(e.target.value); loadGrades(e.target.value) } }} style={inputStyle}>
              <option value="">Selectionnez une classe</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.level}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Matiere</label>
            <select value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); if (selectedClass) loadStudents(selectedClass) }} style={inputStyle}>
              <option value="">Selectionnez une matiere</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name} (coeff. {s.coefficient})</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Trimestre</label>
            <select value={selectedTerm} onChange={e => setSelectedTerm(Number(e.target.value))} style={inputStyle}>
              <option value={1}>Trimestre 1</option>
              <option value={2}>Trimestre 2</option>
              <option value={3}>Trimestre 3</option>
            </select>
          </div>
        </div>
      </div>

      {selectedClass && selectedSubject ? (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>
              {students.length} eleve{students.length > 1 ? 's' : ''} · {subjects.find(s => s.id === selectedSubject)?.name} · T{selectedTerm}
            </div>
            <button onClick={handleSave} disabled={saving} style={{ padding: '7px 16px', border: 'none', borderRadius: '8px', background: saving ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Enregistrement...' : 'Enregistrer les notes'}
            </button>
          </div>

          {loadingStudents ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px' }}>Chargement des eleves...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {['Eleve', 'Note /20', 'Appreciation', 'Moyenne generale'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px' }}>Aucun eleve dans cette classe</td></tr>
                ) : (
                  students.map((student, index) => {
                    const note = parseFloat(noteValues[student.id] ?? '')
                    const moy = getMoyenne(student.id)
                    const appreciation = isNaN(note) ? '-' : note >= 16 ? 'Tres bien' : note >= 14 ? 'Bien' : note >= 12 ? 'Assez bien' : note >= 10 ? 'Passable' : 'Insuffisant'
                    const noteColor = isNaN(note) ? '#94A3B8' : note >= 14 ? '#166534' : note >= 10 ? '#92400E' : '#DC2626'
                    return (
                      <tr key={student.id} style={{ borderBottom: index < students.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500 }}>
                              {student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontSize: '13px', color: '#1E293B' }}>{student.full_name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <input
                            type="number" min="0" max="20" step="0.5"
                            value={noteValues[student.id] ?? ''}
                            onChange={e => setNoteValues(prev => ({ ...prev, [student.id]: e.target.value }))}
                            placeholder="—"
                            style={{ width: '80px', padding: '6px 10px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', outline: 'none', color: noteColor, fontWeight: 500 }}
                          />
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: isNaN(note) ? '#F1F5F9' : note >= 14 ? '#DCFCE7' : note >= 10 ? '#FEF3C7' : '#FEF2F2', color: isNaN(note) ? '#94A3B8' : noteColor }}>
                            {appreciation}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>
                          {moy ? moy + '/20' : '-'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}

          {(error || success) && (
            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #E2E8F0' }}>
              {error && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '8px 12px', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}
              {success && <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '8px 12px', borderRadius: '8px', fontSize: '13px' }}>{success}</div>}
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94A3B8', fontSize: '14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          <i className="ti ti-file-text" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
          Selectionnez une classe et une matiere pour saisir les notes
        </div>
      )}
    </div>
  )
}