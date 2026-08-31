'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface Classe {
  id: string; name: string; level: string; teacher_id: string | null
  users: { full_name: string } | null
}
interface Student { id: string; full_name: string; gender: string; matricule: string }
interface Teacher {
  id: string; full_name: string; email: string; phone: string | null
  school_id: string; role: string
}

const LEVELS = ['Maternelle', 'Primaire', 'College', 'Lycee']
const LEVEL_COLORS: Record<string, { bg: string; color: string }> = {
  Maternelle: { bg: '#FEF3C7', color: '#92400E' },
  Primaire:   { bg: '#EFF6FF', color: '#1E3A8A' },
  College:    { bg: '#F0FDF4', color: '#166534' },
  Lycee:      { bg: '#F5F3FF', color: '#4C1D95' },
}

export default function ClassesPage() {
  const supabase = createClient()

  // ── DATA ──
  const [classes,  setClasses]  = useState<Classe[]>([])
  const [students, setStudents] = useState<Record<string, Student[]>>({})
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading,  setLoading]  = useState(true)
  const [schoolId, setSchoolId] = useState('')

  // ── TABS ──
  const [mainTab, setMainTab] = useState<'classes' | 'professeurs'>('classes')
  const [classTab, setClassTab] = useState<'liste' | 'ajouter'>('liste')

  // ── CLASSES ──
  const [selectedClass, setSelectedClass]   = useState<string | null>(null)
  const [filterLevel,   setFilterLevel]     = useState('tous')
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [availableStudents, setAvailableStudents] = useState<Student[]>([])
  const [selectedStudentId,  setSelectedStudentId] = useState('')
  const [classForm, setClassForm] = useState({ name: '', level: 'Primaire', teacher_id: '' })

  // ── PROFS ──
  const [profTab,    setProfTab]    = useState<'liste' | 'ajouter' | 'modifier'>('liste')
  const [editingProf, setEditingProf] = useState<Teacher | null>(null)
  const [profForm, setProfForm] = useState({ full_name: '', email: '', phone: '', password: 'acx123456' })

  // ── SHARED ──
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) return
    const user = JSON.parse(stored)
    setSchoolId(user.school_id)
    loadData(user.school_id)
  }, [])

  async function loadData(sid: string) {
    const [{ data: cls }, { data: tch }] = await Promise.all([
      supabase.from('classes').select('*, users(full_name)').eq('school_id', sid).order('level').order('name'),
      supabase.from('users').select('id, full_name, email, phone, school_id, role').eq('school_id', sid).eq('role', 'teacher').order('full_name'),
    ])
    setClasses(cls ?? [])
    setTeachers(tch ?? [])

    if (cls && cls.length > 0) {
      const { data: cs } = await supabase
        .from('class_students')
        .select('class_id, students(id, full_name, gender, matricule)')
        .in('class_id', cls.map(c => c.id))
      const grouped: Record<string, Student[]> = {}
      cs?.forEach((c: any) => {
        if (!grouped[c.class_id]) grouped[c.class_id] = []
        if (c.students) grouped[c.class_id].push(c.students)
      })
      setStudents(grouped)
    }
    setLoading(false)
  }

  // ════════════════════════════════
  // CLASSES — actions
  // ════════════════════════════════

  async function handleAddClass() {
    if (!classForm.name.trim()) { setError('Le nom est obligatoire'); return }
    setSaving(true); setError(''); setSuccess('')

    const { data: year } = await supabase.from('school_years').select('id').eq('school_id', schoolId).eq('is_active', true).single()

    const { error: err } = await supabase.from('classes').insert({
      name:           classForm.name.trim(),
      level:          classForm.level,
      teacher_id:     classForm.teacher_id || null,
      school_id:      schoolId,
      school_year_id: year?.id ?? null,
    })
    if (err) { setError('Erreur: ' + err.message); setSaving(false); return }
    setSuccess('Classe créée')
    setClassForm({ name: '', level: 'Primaire', teacher_id: '' })
    setSaving(false)
    loadData(schoolId)
    setTimeout(() => { setSuccess(''); setClassTab('liste') }, 1000)
  }

  async function handleAssignTeacher(classId: string, teacherId: string) {
    await supabase.from('classes').update({ teacher_id: teacherId || null }).eq('id', classId)
    loadData(schoolId)
  }

  async function loadAvailableStudents(classId: string) {
    const existing = students[classId]?.map(s => s.id) ?? []
    const { data } = await supabase.from('students').select('id, full_name, gender, matricule').eq('school_id', schoolId).order('full_name')
    setAvailableStudents((data ?? []).filter(s => !existing.includes(s.id)))
  }

  async function handleAddStudentToClass(classId: string) {
    if (!selectedStudentId) return
    setSaving(true)
    await supabase.from('class_students').insert({ class_id: classId, student_id: selectedStudentId })
    setSelectedStudentId(''); setShowAddStudent(false); setSaving(false)
    loadData(schoolId)
  }

  async function handleRemoveStudent(classId: string, studentId: string) {
    if (!confirm('Retirer cet élève de la classe ?')) return
    await supabase.from('class_students').delete().eq('class_id', classId).eq('student_id', studentId)
    loadData(schoolId)
  }

  async function handleDeleteClass(classId: string) {
    if (!confirm('Supprimer cette classe ?')) return
    await supabase.from('class_students').delete().eq('class_id', classId)
    await supabase.from('classes').delete().eq('id', classId)
    setSelectedClass(null); loadData(schoolId)
  }

  // ════════════════════════════════
  // PROFESSEURS — actions
  // ════════════════════════════════

  function resetProfForm() {
    setProfForm({ full_name: '', email: '', phone: '', password: 'acx123456' })
    setEditingProf(null)
    setError(''); setSuccess('')
  }

  function startEdit(prof: Teacher) {
    setEditingProf(prof)
    setProfForm({ full_name: prof.full_name, email: prof.email, phone: prof.phone ?? '', password: '' })
    setProfTab('modifier')
  }

  async function handleSaveProf() {
    if (!profForm.full_name.trim() || !profForm.email.trim()) { setError('Nom et email sont obligatoires'); return }
    setSaving(true); setError(''); setSuccess('')

    if (editingProf) {
      // Modification
      const { error: err } = await supabase.from('users').update({
        full_name: profForm.full_name.trim(),
        email:     profForm.email.trim().toLowerCase(),
        phone:     profForm.phone || null,
      }).eq('id', editingProf.id)
      if (err) { setError('Erreur: ' + err.message); setSaving(false); return }
      setSuccess('Professeur modifié')
    } else {
      // Vérifier doublon email
      const { data: existing } = await supabase.from('users').select('id').eq('email', profForm.email.trim().toLowerCase()).limit(1)
      if (existing && existing.length > 0) { setError('Cet email est déjà utilisé'); setSaving(false); return }

      // Créer
      const { error: err } = await supabase.from('users').insert({
        school_id:   schoolId,
        school_name: classes[0]?.users?.full_name ?? '',
        role:        'teacher',
        full_name:   profForm.full_name.trim(),
        email:       profForm.email.trim().toLowerCase(),
        phone:       profForm.phone || null,
      })
      if (err) { setError('Erreur: ' + err.message); setSaving(false); return }
      setSuccess('Professeur créé — mot de passe : acx123456')
    }

    setSaving(false)
    loadData(schoolId)
    setTimeout(() => { setSuccess(''); resetProfForm(); setProfTab('liste') }, 2000)
  }

  async function handleDeleteProf(prof: Teacher) {
    if (!confirm(`Supprimer ${prof.full_name} ? Cette action est irréversible.`)) return
    await supabase.from('classes').update({ teacher_id: null }).eq('teacher_id', prof.id)
    await supabase.from('users').delete().eq('id', prof.id)
    loadData(schoolId)
  }

  // ── STYLES ──
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0',
    borderRadius: '8px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
    outline: 'none', color: '#1E293B', background: '#fff', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px' }

  if (loading) return <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>Chargement...</div>

  const filteredClasses = classes.filter(c => filterLevel === 'tous' || c.level === filterLevel)
  const selectedClassData = classes.find(c => c.id === selectedClass)
  const selectedClassStudents = selectedClass ? (students[selectedClass] ?? []) : []

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Classes & Professeurs
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          {classes.length} classe{classes.length > 1 ? 's' : ''} · {teachers.length} professeur{teachers.length > 1 ? 's' : ''} · {Object.values(students).flat().length} élèves
        </p>
      </div>

      {/* ── MAIN TABS ── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', background: '#F1F5F9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {([
          { key: 'classes',     label: 'Classes',      icon: 'ti-school'    },
          { key: 'professeurs', label: 'Professeurs',  icon: 'ti-users'     },
        ] as const).map(t => (
          <button key={t.key} onClick={() => { setMainTab(t.key); setError(''); setSuccess('') }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 20px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', background: mainTab === t.key ? '#fff' : 'transparent', color: mainTab === t.key ? '#1E293B' : '#64748B', boxShadow: mainTab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            <i className={'ti ' + t.icon} style={{ fontSize: '15px' }} /> {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════
          TAB CLASSES
      ══════════════════════════════════ */}
      {mainTab === 'classes' && (
        <div>
          {/* Stats niveaux */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.25rem' }}>
            {LEVELS.map(level => {
              const cls = classes.filter(c => c.level === level)
              const nb  = cls.reduce((s, c) => s + (students[c.id]?.length ?? 0), 0)
              const lc  = LEVEL_COLORS[level]
              return (
                <div key={level} onClick={() => setFilterLevel(filterLevel === level ? 'tous' : level)} style={{ background: '#fff', border: '1px solid ' + (filterLevel === level ? '#2563EB' : '#E2E8F0'), borderRadius: '10px', padding: '0.875rem 1rem', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: lc.bg, color: lc.color }}>{level}</span>
                    <span style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A' }}>{cls.length}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>{nb} élève{nb > 1 ? 's' : ''}</div>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: '13px', color: '#64748B' }}>{filteredClasses.length} classe{filteredClasses.length > 1 ? 's' : ''}</span>
            <button onClick={() => setClassTab(classTab === 'liste' ? 'ajouter' : 'liste')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#2563EB', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '9px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              <i className={classTab === 'liste' ? 'ti ti-plus' : 'ti ti-list'} />
              {classTab === 'liste' ? 'Nouvelle classe' : 'Voir les classes'}
            </button>
          </div>

          {/* Formulaire nouvelle classe */}
          {classTab === 'ajouter' && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.25rem', maxWidth: '480px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '1rem' }}>Nouvelle classe</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Nom *</label>
                  <input type="text" value={classForm.name} onChange={e => setClassForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: 1AC-A, Terminale S..." style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Niveau</label>
                  <select value={classForm.level} onChange={e => setClassForm(p => ({ ...p, level: e.target.value }))} style={inputStyle}>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Professeur principal</label>
                  <select value={classForm.teacher_id} onChange={e => setClassForm(p => ({ ...p, teacher_id: e.target.value }))} style={inputStyle}>
                    <option value="">Aucun</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>
                {error   && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '9px 12px', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}
                {success && <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '9px 12px', borderRadius: '8px', fontSize: '13px' }}>{success}</div>}
                <button onClick={handleAddClass} disabled={saving} style={{ padding: '10px', border: 'none', borderRadius: '9px', background: saving ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  {saving ? 'Création...' : 'Créer la classe'}
                </button>
              </div>
            </div>
          )}

          {/* Grille classes + détail */}
          {classTab === 'liste' && (
            <div style={{ display: 'grid', gridTemplateColumns: selectedClass ? '1fr 1.3fr' : '1fr', gap: '14px' }}>

              {/* Grille */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: '10px', alignContent: 'start' }}>
                {filteredClasses.length === 0 ? (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                    <i className="ti ti-school" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
                    Aucune classe
                  </div>
                ) : filteredClasses.map(cls => {
                  const lc = LEVEL_COLORS[cls.level] ?? { bg: '#F1F5F9', color: '#64748B' }
                  const nb = students[cls.id]?.length ?? 0
                  const isSelected = selectedClass === cls.id
                  return (
                    <div key={cls.id} onClick={() => { setSelectedClass(isSelected ? null : cls.id); setShowAddStudent(false); setSelectedStudentId('') }} style={{ background: '#fff', border: '2px solid ' + (isSelected ? '#2563EB' : '#E2E8F0'), borderRadius: '12px', padding: '1.25rem', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{cls.name}</span>
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: lc.bg, color: lc.color }}>{cls.level}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '4px' }}>
                        <i className="ti ti-users" style={{ marginRight: '4px' }} />{nb} élève{nb > 1 ? 's' : ''}
                      </div>
                      {cls.users ? (
                        <div style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="ti ti-user-check" style={{ color: '#10B981' }} />{cls.users.full_name}
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="ti ti-alert-triangle" /> Aucun prof assigné
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Panneau détail */}
              {selectedClass && selectedClassData && (
                <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>

                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>{selectedClassData.name}</div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>
                        {selectedClassData.level} · {selectedClassStudents.length} élève{selectedClassStudents.length > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => setSelectedClass(null)} style={{ width: '32px', height: '32px', border: '1px solid #E2E8F0', borderRadius: '7px', background: '#fff', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                        <i className="ti ti-x" />
                      </button>
                      <button onClick={() => handleDeleteClass(selectedClass)} style={{ padding: '6px 10px', border: '1px solid #FCA5A5', borderRadius: '7px', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <i className="ti ti-trash" /> Supprimer
                      </button>
                    </div>
                  </div>

                  {/* Assigner prof */}
                  <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '10px', marginBottom: '1rem' }}>
                    <label style={{ ...labelStyle, fontSize: '13px', color: '#0F172A', marginBottom: '7px' }}>
                      <i className="ti ti-user-check" style={{ marginRight: '5px', color: '#2563EB' }} />
                      Professeur principal
                    </label>
                    <select value={selectedClassData.teacher_id ?? ''} onChange={e => handleAssignTeacher(selectedClass, e.target.value)} style={inputStyle}>
                      <option value="">Aucun professeur</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                    </select>
                  </div>

                  {/* Élèves */}
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="ti ti-users" style={{ color: '#2563EB' }} />
                    Élèves ({selectedClassStudents.length})
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '260px', overflowY: 'auto', marginBottom: '10px' }}>
                    {selectedClassStudents.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontSize: '13px' }}>
                        Aucun élève dans cette classe
                      </div>
                    ) : selectedClassStudents.map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: '#F8FAFC', borderRadius: '8px' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 600, flexShrink: 0 }}>
                          {s.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', color: '#1E293B', fontWeight: 500 }}>{s.full_name}</div>
                          {s.matricule && <div style={{ fontSize: '10px', color: '#94A3B8' }}>{s.matricule}</div>}
                        </div>
                        <span style={{ fontSize: '10px', color: '#94A3B8', background: '#F1F5F9', padding: '1px 6px', borderRadius: '10px' }}>{s.gender === 'M' ? 'Garçon' : 'Fille'}</span>
                        <button onClick={() => handleRemoveStudent(selectedClass, s.id)} style={{ width: '24px', height: '24px', border: '1px solid #E2E8F0', borderRadius: '5px', background: '#fff', color: '#EF4444', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="ti ti-x" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Ajouter élève */}
                  {showAddStudent ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                        <option value="">Sélectionnez un élève</option>
                        {availableStudents.map(s => (
                          <option key={s.id} value={s.id}>{s.full_name} {s.matricule ? '(' + s.matricule + ')' : ''}</option>
                        ))}
                      </select>
                      <button onClick={() => handleAddStudentToClass(selectedClass)} disabled={!selectedStudentId || saving} style={{ padding: '9px 14px', border: 'none', borderRadius: '8px', background: !selectedStudentId ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '13px', cursor: !selectedStudentId ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' as const }}>
                        Ajouter
                      </button>
                      <button onClick={() => { setShowAddStudent(false); setSelectedStudentId('') }} style={{ padding: '9px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', color: '#64748B', cursor: 'pointer', fontSize: '14px' }}>
                        <i className="ti ti-x" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setShowAddStudent(true); loadAvailableStudents(selectedClass) }} style={{ width: '100%', padding: '9px', border: '1px dashed #BFDBFE', borderRadius: '8px', background: '#EFF6FF', color: '#2563EB', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <i className="ti ti-user-plus" /> Ajouter un élève
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════
          TAB PROFESSEURS
      ══════════════════════════════════ */}
      {mainTab === 'professeurs' && (
        <div>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', padding: '4px', borderRadius: '10px' }}>
              {(['liste', 'ajouter'] as const).map(t => (
                <button key={t} onClick={() => { setProfTab(t); resetProfForm() }} style={{ padding: '7px 18px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', background: profTab === t ? '#fff' : 'transparent', color: profTab === t ? '#1E293B' : '#64748B', boxShadow: profTab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                  {t === 'liste' ? 'Liste des professeurs' : 'Ajouter un professeur'}
                </button>
              ))}
              {profTab === 'modifier' && (
                <button style={{ padding: '7px 18px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', background: '#fff', color: '#1E293B', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  Modifier
                </button>
              )}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B' }}>
              {teachers.length} professeur{teachers.length > 1 ? 's' : ''}
            </div>
          </div>

          {/* Liste professeurs */}
          {profTab === 'liste' && (
            <div>
              {teachers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#94A3B8', fontSize: '14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                  <i className="ti ti-users" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
                  Aucun professeur enregistré
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                  {teachers.map(prof => {
                    const profClasses = classes.filter(c => c.teacher_id === prof.id)
                    return (
                      <div key={prof.id} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 600, flexShrink: 0 }}>
                            {prof.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '2px' }}>{prof.full_name}</div>
                            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '2px' }}>
                              <i className="ti ti-mail" style={{ marginRight: '4px' }} />{prof.email}
                            </div>
                            {prof.phone && (
                              <div style={{ fontSize: '12px', color: '#64748B' }}>
                                <i className="ti ti-phone" style={{ marginRight: '4px' }} />{prof.phone}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Classes assignées */}
                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '6px', fontWeight: 500 }}>
                            Classes assignées ({profClasses.length})
                          </div>
                          {profClasses.length > 0 ? (
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              {profClasses.map(c => {
                                const lc = LEVEL_COLORS[c.level] ?? { bg: '#F1F5F9', color: '#64748B' }
                                return (
                                  <span key={c.id} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: lc.bg, color: lc.color, fontWeight: 500 }}>
                                    {c.name}
                                  </span>
                                )
                              })}
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <i className="ti ti-alert-triangle" /> Aucune classe
                            </span>
                          )}
                        </div>

                        {/* Mot de passe */}
                        <div style={{ marginTop: '8px', fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="ti ti-lock" />
                          Connexion : <strong style={{ color: '#64748B' }}>{prof.email}</strong> / acx123456
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                          <button onClick={() => startEdit(prof)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '7px', border: '1px solid #E2E8F0', borderRadius: '7px', background: '#fff', color: '#2563EB', cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>
                            <i className="ti ti-pencil" /> Modifier
                          </button>
                          <button onClick={() => handleDeleteProf(prof)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '7px', border: '1px solid #FCA5A5', borderRadius: '7px', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>
                            <i className="ti ti-trash" /> Supprimer
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Formulaire ajouter / modifier */}
          {(profTab === 'ajouter' || profTab === 'modifier') && (
            <div style={{ maxWidth: '480px' }}>
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem' }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                    <i className={'ti ' + (editingProf ? 'ti-pencil' : 'ti-user-plus')} />
                  </div>
                  {editingProf ? 'Modifier ' + editingProf.full_name : 'Nouveau professeur'}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Nom complet *</label>
                    <input type="text" value={profForm.full_name} onChange={e => setProfForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Prénom Nom" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email *</label>
                    <input type="email" value={profForm.email} onChange={e => setProfForm(p => ({ ...p, email: e.target.value }))} placeholder="prof@ecole.ma" style={inputStyle} disabled={!!editingProf} />
                    {editingProf && <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>L'email ne peut pas être modifié</div>}
                  </div>
                  <div>
                    <label style={labelStyle}>Téléphone</label>
                    <input type="tel" value={profForm.phone} onChange={e => setProfForm(p => ({ ...p, phone: e.target.value }))} placeholder="06XXXXXXXX" style={inputStyle} />
                  </div>

                  {!editingProf && (
                    <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="ti ti-lock" style={{ fontSize: '14px' }} />
                      Mot de passe par défaut : <strong>acx123456</strong>
                    </div>
                  )}

                  {error   && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}
                  {success && <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>{success}</div>}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { resetProfForm(); setProfTab('liste') }} style={{ flex: 1, padding: '10px', border: '1px solid #E2E8F0', borderRadius: '9px', background: '#fff', color: '#64748B', fontSize: '14px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      Annuler
                    </button>
                    <button onClick={handleSaveProf} disabled={saving} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: '9px', background: saving ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      {saving ? 'Enregistrement...' : editingProf ? 'Sauvegarder les modifications' : 'Créer le professeur'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}