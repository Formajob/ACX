'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface Classe {
  id: string
  name: string
  level: string
  teacher_id: string | null
  users: { full_name: string } | null
  school_years: { label: string } | null
}

interface Student {
  id: string
  full_name: string
  gender: string
  matricule: string
}

export default function ClassesPage() {
  const supabase = createClient()

  const [classes, setClasses] = useState<Classe[]>([])
  const [students, setStudents] = useState<Record<string, Student[]>>({})
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [tab, setTab] = useState<'liste' | 'ajouter'>('liste')
  const [filterLevel, setFilterLevel] = useState('tous')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [availableStudents, setAvailableStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')

  const [form, setForm] = useState({
    name: '',
    level: 'Primaire',
    teacher_id: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [
      { data: classesData },
      { data: teachersData },
    ] = await Promise.all([
      supabase
        .from('classes')
        .select('*, users(full_name), school_years(label)')
        .order('level')
        .order('name'),
      supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'teacher')
        .order('full_name'),
    ])

    setClasses(classesData ?? [])
    setTeachers(teachersData ?? [])

    // Charger les élèves de chaque classe
    if (classesData && classesData.length > 0) {
      const classIds = classesData.map(c => c.id)
      const { data: classStudents } = await supabase
        .from('class_students')
        .select('class_id, students(id, full_name, gender, matricule)')
        .in('class_id', classIds)

      const grouped: Record<string, Student[]> = {}
      classStudents?.forEach((cs: any) => {
        if (!grouped[cs.class_id]) grouped[cs.class_id] = []
        if (cs.students) grouped[cs.class_id].push(cs.students)
      })
      setStudents(grouped)
    }

    setLoading(false)
  }

  async function handleAddClass() {
    if (!form.name.trim()) { setError('Le nom de la classe est obligatoire'); return }
    setSaving(true)
    setError('')
    setSuccess('')

    const stored = localStorage.getItem('acx_user')
    if (!stored) return
    const user = JSON.parse(stored)

    const { data: userProfile } = await supabase
      .from('users')
      .select('school_id')
      .eq('id', user.id)
      .single()

    if (!userProfile?.school_id) { setError('Ecole introuvable'); setSaving(false); return }

    const { data: schoolYear } = await supabase
      .from('school_years')
      .select('id')
      .eq('school_id', userProfile.school_id)
      .eq('is_active', true)
      .single()

    const { error: insertError } = await supabase.from('classes').insert({
      name: form.name.trim(),
      level: form.level,
      teacher_id: form.teacher_id || null,
      school_id: userProfile.school_id,
      school_year_id: schoolYear?.id ?? null,
    })

    if (insertError) { setError('Erreur: ' + insertError.message); setSaving(false); return }

    setSuccess('Classe creee avec succes')
    setForm({ name: '', level: 'Primaire', teacher_id: '' })
    setSaving(false)
    loadData()
    setTimeout(() => setTab('liste'), 1000)
  }

  async function handleAssignTeacher(classId: string, teacherId: string) {
    await supabase.from('classes').update({ teacher_id: teacherId || null }).eq('id', classId)
    loadData()
  }

  async function loadAvailableStudents(classId: string) {
    const existing = students[classId]?.map(s => s.id) ?? []
    const { data } = await supabase
      .from('students')
      .select('id, full_name, gender, matricule')
      .order('full_name')
    const available = (data ?? []).filter(s => !existing.includes(s.id))
    setAvailableStudents(available)
  }

  async function handleAddStudentToClass(classId: string) {
    if (!selectedStudentId) return
    setSaving(true)
    const { error: insertError } = await supabase.from('class_students').insert({
      class_id: classId,
      student_id: selectedStudentId,
    })
    if (!insertError) {
      setSelectedStudentId('')
      setShowAddStudent(false)
      loadData()
    }
    setSaving(false)
  }

  async function handleRemoveStudent(classId: string, studentId: string) {
    if (!confirm('Retirer cet eleve de la classe ?')) return
    await supabase.from('class_students').delete().eq('class_id', classId).eq('student_id', studentId)
    loadData()
  }

  async function handleDeleteClass(classId: string) {
    if (!confirm('Supprimer cette classe ? Les eleves seront desinscrits.')) return
    await supabase.from('class_students').delete().eq('class_id', classId)
    await supabase.from('classes').delete().eq('id', classId)
    setSelectedClass(null)
    loadData()
  }

  const LEVELS = ['Maternelle', 'Primaire', 'College', 'Lycee']

  const levelColors: Record<string, { bg: string; color: string }> = {
    Maternelle: { bg: '#FEF3C7', color: '#92400E' },
    Primaire:   { bg: '#EFF6FF', color: '#1E3A8A' },
    College:    { bg: '#F0FDF4', color: '#166534' },
    Lycee:      { bg: '#F5F3FF', color: '#4C1D95' },
  }

  const filtered = classes.filter(c =>
    filterLevel === 'tous' || c.level === filterLevel
  )

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0',
    borderRadius: '8px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
    outline: 'none', color: '#1E293B', background: '#fff', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px',
  }

  if (loading) return (
    <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>
      Chargement...
    </div>
  )

  const selectedClassData = classes.find(c => c.id === selectedClass)
  const selectedClassStudents = selectedClass ? (students[selectedClass] ?? []) : []

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
            Classes
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
            {classes.length} classe{classes.length > 1 ? 's' : ''} — {Object.values(students).flat().length} eleves au total
          </p>
        </div>
        <button
          onClick={() => setTab(tab === 'liste' ? 'ajouter' : 'liste')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#2563EB', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >
          <i className={tab === 'liste' ? 'ti ti-plus' : 'ti ti-list'} style={{ fontSize: '16px' }} />
          {tab === 'liste' ? 'Nouvelle classe' : 'Voir les classes'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.25rem' }}>
        {LEVELS.map(level => {
          const cls = classes.filter(c => c.level === level)
          const nb = cls.reduce((sum, c) => sum + (students[c.id]?.length ?? 0), 0)
          const lc = levelColors[level]
          return (
            <div key={level} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.875rem 1rem', cursor: 'pointer', outline: filterLevel === level ? '2px solid #2563EB' : 'none' }} onClick={() => setFilterLevel(filterLevel === level ? 'tous' : level)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: lc.bg, color: lc.color }}>{level}</span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A' }}>{cls.length}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>{nb} eleve{nb > 1 ? 's' : ''}</div>
            </div>
          )
        })}
      </div>

      {/* Tab Ajouter */}
      {tab === 'ajouter' && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.25rem', maxWidth: '500px' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A', marginBottom: '1rem' }}>Nouvelle classe</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Nom de la classe *</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: 6eme A, 1AC-2, Terminale S..." style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Niveau</label>
              <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))} style={inputStyle}>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Professeur principal (optionnel)</label>
              <select value={form.teacher_id} onChange={e => setForm(p => ({ ...p, teacher_id: e.target.value }))} style={inputStyle}>
                <option value="">Aucun</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>

            {error && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}
            {success && <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>{success}</div>}

            <button
              onClick={handleAddClass}
              disabled={saving}
              style={{ padding: '10px', border: 'none', borderRadius: '10px', background: saving ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}
            >
              {saving ? 'Enregistrement...' : 'Creer la classe'}
            </button>
          </div>
        </div>
      )}

      {/* Liste classes + détail */}
      {tab === 'liste' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedClass ? '1fr 1.2fr' : '1fr', gap: '14px' }}>

          {/* Grille des classes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', alignContent: 'start' }}>
            {filtered.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                <i className="ti ti-school" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
                Aucune classe
              </div>
            ) : (
              filtered.map(classe => {
                const lc = levelColors[classe.level] ?? { bg: '#F1F5F9', color: '#64748B' }
                const nbEleves = students[classe.id]?.length ?? 0
                const isSelected = selectedClass === classe.id
                return (
                  <div
                    key={classe.id}
                    onClick={() => setSelectedClass(isSelected ? null : classe.id)}
                    style={{ background: '#fff', border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 600, color: '#0F172A' }}>{classe.name}</span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: lc.bg, color: lc.color }}>{classe.level}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '4px' }}>
                      <i className="ti ti-users" style={{ marginRight: '4px' }} />
                      {nbEleves} eleve{nbEleves > 1 ? 's' : ''}
                    </div>
                    {classe.users && (
                      <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                        <i className="ti ti-user" style={{ marginRight: '4px' }} />
                        {classe.users.full_name}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Détail classe sélectionnée */}
          {selectedClass && selectedClassData && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>{selectedClassData.name}</div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>{selectedClassData.level} · {selectedClassStudents.length} eleve{selectedClassStudents.length > 1 ? 's' : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setSelectedClass(null)}
                    style={{ padding: '6px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', color: '#64748B', cursor: 'pointer', fontSize: '16px' }}
                  >
                    <i className="ti ti-x" />
                  </button>
                  <button
                    onClick={() => handleDeleteClass(selectedClass)}
                    style={{ padding: '6px 10px', border: '1px solid #FCA5A5', borderRadius: '6px', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    <i className="ti ti-trash" />
                  </button>
                </div>
              </div>

              {/* Assigner prof */}
              <div style={{ marginBottom: '1rem', padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                <label style={{ ...labelStyle, marginBottom: '6px' }}>Professeur principal</label>
                <select
                  value={selectedClassData.teacher_id ?? ''}
                  onChange={e => handleAssignTeacher(selectedClass, e.target.value)}
                  style={{ ...inputStyle, background: '#fff' }}
                >
                  <option value="">Aucun</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>

              {/* Liste élèves */}
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '8px' }}>
                Eleves de la classe
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto', marginBottom: '10px' }}>
                {selectedClassStudents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontSize: '13px' }}>
                    Aucun eleve dans cette classe
                  </div>
                ) : (
                  selectedClassStudents.map((s: Student) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: '#F8FAFC', borderRadius: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500, flexShrink: 0 }}>
                        {s.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', color: '#1E293B', fontWeight: 500 }}>{s.full_name}</div>
                        {s.matricule && <div style={{ fontSize: '11px', color: '#94A3B8' }}>{s.matricule}</div>}
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>{s.gender === 'M' ? 'G' : 'F'}</span>
                      <button
                        onClick={() => handleRemoveStudent(selectedClass, s.id)}
                        style={{ padding: '3px 6px', border: '1px solid #E2E8F0', borderRadius: '4px', background: '#fff', color: '#EF4444', cursor: 'pointer', fontSize: '12px' }}
                        title="Retirer de la classe"
                      >
                        <i className="ti ti-x" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Ajouter élève */}
              {showAddStudent ? (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select
                    value={selectedStudentId}
                    onChange={e => setSelectedStudentId(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  >
                    <option value="">Selectionnez un eleve</option>
                    {availableStudents.map(s => (
                      <option key={s.id} value={s.id}>{s.full_name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAddStudentToClass(selectedClass)}
                    disabled={!selectedStudentId || saving}
                    style={{ padding: '9px 14px', border: 'none', borderRadius: '8px', background: '#2563EB', color: '#fff', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' as const }}
                  >
                    Ajouter
                  </button>
                  <button
                    onClick={() => { setShowAddStudent(false); setSelectedStudentId('') }}
                    style={{ padding: '9px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', color: '#64748B', cursor: 'pointer', fontSize: '14px' }}
                  >
                    <i className="ti ti-x" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setShowAddStudent(true); loadAvailableStudents(selectedClass) }}
                  style={{ width: '100%', padding: '9px', border: '1px dashed #BFDBFE', borderRadius: '8px', background: '#EFF6FF', color: '#2563EB', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}
                >
                  <i className="ti ti-user-plus" /> Ajouter un eleve
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}