'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

interface Classe  { id: string; name: string; level: string }
interface Subject { id: string; name: string; coefficient: number; level: string }
interface Grade   { id: string; value: number; term: number; student_id: string; subject_id: string; class_id: string }
interface Student { id: string; full_name: string; birth_date: string; gender: string; matricule: string; parent_name: string; parent_phone: string }
interface Observation { student_id: string; note: number; behavior: string; comment: string | null; week_start: string; subjects: { name: string } | null; users: { full_name: string } | null }

export default function NotesPage() {
  const supabase = createClient()
  const router = useRouter()

  const [classes, setClasses]       = useState<Classe[]>([])
  const [subjects, setSubjects]     = useState<Subject[]>([])
  const [grades, setGrades]         = useState<Grade[]>([])
  const [observations, setObs]      = useState<Observation[]>([])
  const [schoolInfo, setSchoolInfo] = useState<any>(null)
  const [loading, setLoading]       = useState(true)

  // Saisie notes
  const [selectedClass,   setSelectedClass]   = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedTerm,    setSelectedTerm]    = useState(1)
  const [students,        setStudents]        = useState<Student[]>([])
  const [noteValues,      setNoteValues]      = useState<Record<string, string>>({})
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState('')
  const [error,   setError]   = useState('')

  // Bulletins
  const [tab,          setTab]          = useState<'notes' | 'bulletins'>('notes')
  const [bulletinClass,   setBulletinClass]   = useState('')
  const [bulletinTerm,    setBulletinTerm]    = useState<'S1' | 'S2' | 'annual'>('S1')
  const [appreciation,    setAppreciation]    = useState('')
  const [bulletinStudents,setBulletinStudents]= useState<Student[]>([])
  const [selectedIds,     setSelectedIds]     = useState<string[]>([])
  const [bulletinGrades,  setBulletinGrades]  = useState<Grade[]>([])
  const [loadingBulletin, setLoadingBulletin] = useState(false)
  const [generating,      setGenerating]      = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    loadInitial(user.school_id)
  }, [])

  async function loadInitial(schoolId: string) {
    const [{ data: cls }, { data: subs }, { data: grd }, { data: school }, { data: obs }] = await Promise.all([
      supabase.from('classes').select('id, name, level').eq('school_id', schoolId).order('name'),
      supabase.from('subjects').select('id, name, coefficient, level').eq('school_id', schoolId).order('name'),
      supabase.from('grades').select('id, value, term, student_id, subject_id, class_id').in('class_id', []),
      supabase.from('schools').select('*').eq('id', schoolId).single(),
      supabase.from('student_observations').select('student_id, note, behavior, comment, week_start, subjects(name), users(full_name)'),
    ])
    setClasses(cls ?? [])
    setSubjects(subs ?? [])
    setSchoolInfo(school)
    setObs((obs ?? []).map((o: any) => ({
      ...o,
      subjects: o.subjects ? { name: o.subjects.name } : null,
      users: o.users ? { full_name: o.users.full_name } : null,
    })))

    // Load all grades for this school
    const classIds = cls?.map(c => c.id) ?? []
    if (classIds.length > 0) {
      const { data: allGrades } = await supabase
        .from('grades')
        .select('id, value, term, student_id, subject_id, class_id')
        .in('class_id', classIds)
      setGrades(allGrades ?? [])
    }
    setLoading(false)
  }

  // ── SAISIE NOTES ──

  async function fetchStudents(classId: string) {
    if (!classId) return
    setLoadingStudents(true)
    const { data } = await supabase
      .from('class_students')
      .select('students(id, full_name, birth_date, gender, matricule, parent_name, parent_phone)')
      .eq('class_id', classId)
    const list = data?.map((d: any) => d.students).filter(Boolean) ?? []
    setStudents(list)
    const existingNotes: Record<string, string> = {}
    list.forEach((s: Student) => {
      const existing = grades.find(g =>
        g.student_id === s.id && g.subject_id === selectedSubject &&
        g.class_id === classId && g.term === selectedTerm
      )
      if (existing) existingNotes[s.id] = String(existing.value)
    })
    setNoteValues(existingNotes)
    setLoadingStudents(false)
  }

  async function handleSave() {
    if (!selectedClass || !selectedSubject) { setError('Selectionnez une classe et une matiere'); return }
    setSaving(true); setError(''); setSuccess('')
    const upserts = students
      .filter(s => noteValues[s.id] !== undefined && noteValues[s.id] !== '')
      .map(s => ({ student_id: s.id, subject_id: selectedSubject, class_id: selectedClass, term: selectedTerm, value: parseFloat(noteValues[s.id]), type: 'exam' }))
    if (upserts.length === 0) { setError('Aucune note a enregistrer'); setSaving(false); return }
    const { error: upsertError } = await supabase.from('grades').upsert(upserts, { onConflict: 'student_id,subject_id,class_id,term,type' })
    if (upsertError) { setError('Erreur: ' + upsertError.message); setSaving(false); return }
    setSuccess(upserts.length + ' notes enregistrees')
    setSaving(false)
    // Refresh grades
    const stored = localStorage.getItem('acx_user')
    if (stored) {
      const user = JSON.parse(stored)
      const classIds = classes.map(c => c.id)
      const { data: allGrades } = await supabase.from('grades').select('id, value, term, student_id, subject_id, class_id').in('class_id', classIds)
      setGrades(allGrades ?? [])
    }
  }

  function getMoyenne(studentId: string) {
    const sg = grades.filter(g => g.student_id === studentId && g.class_id === selectedClass && g.term === selectedTerm)
    if (sg.length === 0) return null
    const total = sg.reduce((s, g) => { const subj = subjects.find(x => x.id === g.subject_id); return s + g.value * (subj?.coefficient ?? 1) }, 0)
    const coeff = sg.reduce((s, g) => { const subj = subjects.find(x => x.id === g.subject_id); return s + (subj?.coefficient ?? 1) }, 0)
    return coeff > 0 ? (total / coeff).toFixed(2) : null
  }

  // ── BULLETINS ──

  async function loadBulletinClass(classId: string) {
    setLoadingBulletin(true)
    const { data } = await supabase
      .from('class_students')
      .select('students(id, full_name, birth_date, gender, matricule, parent_name, parent_phone)')
      .eq('class_id', classId)
    const list = data?.map((d: any) => d.students).filter(Boolean) ?? []
    setBulletinStudents(list)
    setSelectedIds(list.map((s: Student) => s.id))

    const ids = list.map((s: Student) => s.id)
    const { data: grd } = await supabase.from('grades').select('id, value, term, student_id, subject_id, class_id').in('student_id', ids).eq('class_id', classId)
    setBulletinGrades(grd ?? [])
    setLoadingBulletin(false)
  }

  function getBulletinAvg(studentId: string, term?: number) {
    const sg = bulletinGrades.filter(g => g.student_id === studentId && (term === undefined || g.term === term))
    if (sg.length === 0) return null
    const total = sg.reduce((s, g) => { const subj = subjects.find(x => x.id === g.subject_id); return s + g.value * (subj?.coefficient ?? 1) }, 0)
    const coeff = sg.reduce((s, g) => { const subj = subjects.find(x => x.id === g.subject_id); return s + (subj?.coefficient ?? 1) }, 0)
    return coeff > 0 ? total / coeff : null
  }

  function getRank(studentId: string, term?: number) {
    const avgs = bulletinStudents.map(s => ({ id: s.id, avg: getBulletinAvg(s.id, term) ?? 0 }))
    avgs.sort((a, b) => b.avg - a.avg)
    return avgs.findIndex(a => a.id === studentId) + 1
  }

  function getAppreciation(avg: number | null) {
    if (avg === null) return '—'
    if (avg >= 16) return 'Excellent'
    if (avg >= 14) return 'Très bien'
    if (avg >= 12) return 'Bien'
    if (avg >= 10) return 'Assez bien'
    if (avg >= 8)  return 'Passable'
    return 'Insuffisant'
  }

  function getStudentObs(studentId: string) {
    return observations.filter(o => o.student_id === studentId).slice(0, 3)
  }

  async function generateBulletins() {
    if (!bulletinClass || selectedIds.length === 0) return
    setGenerating(true)

    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const termLabel = bulletinTerm === 'S1' ? 'Semestre 1' : bulletinTerm === 'S2' ? 'Semestre 2' : 'Annuel'
    const termNum   = bulletinTerm === 'S1' ? 1 : bulletinTerm === 'S2' ? 2 : undefined
    const cls       = classes.find(c => c.id === bulletinClass)
    const studentsToGen = bulletinStudents.filter(s => selectedIds.includes(s.id))

    const BEHAVIOR_LABELS: Record<string, string> = { excellent: 'Excellent', good: 'Bien', average: 'Passable', poor: 'Insuffisant' }

    studentsToGen.forEach((student, si) => {
      if (si > 0) doc.addPage()

      const avg = termNum !== undefined ? getBulletinAvg(student.id, termNum) : getBulletinAvg(student.id)
      const s1Avg = getBulletinAvg(student.id, 1)
      const s2Avg = getBulletinAvg(student.id, 2)
      const annualAvg = s1Avg !== null && s2Avg !== null ? (s1Avg + s2Avg) / 2 : (s1Avg ?? s2Avg)
      const displayAvg = bulletinTerm === 'annual' ? annualAvg : avg
      const rank = getRank(student.id, termNum)
      const lastObs = getStudentObs(student.id)
      const obsAvg = lastObs.length > 0 ? lastObs.reduce((s, o) => s + o.note, 0) / lastObs.length : null

      // ── EN-TÊTE ──
      doc.setFillColor(23, 37, 84)
      doc.rect(0, 0, pageW, 34, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(20)
      doc.setTextColor(255, 255, 255)
      doc.text('ACX', 12, 14)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(147, 197, 253)
      doc.text('Plateforme de gestion scolaire', 12, 19)
      doc.text('acx.ma', 12, 23)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(255, 255, 255)
      doc.text(schoolInfo?.name ?? '', pageW / 2, 12, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(147, 197, 253)
      if (schoolInfo?.city)  doc.text(schoolInfo.city,         pageW / 2, 17, { align: 'center' })
      if (schoolInfo?.phone) doc.text('Tél: ' + schoolInfo.phone, pageW / 2, 22, { align: 'center' })

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(255, 255, 255)
      doc.text('Année scolaire 2024-2025', pageW - 12, 10, { align: 'right' })
      doc.setFontSize(9)
      doc.setTextColor(147, 197, 253)
      doc.text(cls?.name ?? '', pageW - 12, 16, { align: 'right' })
      doc.text(cls?.level ?? '', pageW - 12, 22, { align: 'right' })

      // ── TITRE ──
      doc.setFillColor(239, 246, 255)
      doc.rect(0, 34, pageW, 10, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(23, 37, 84)
      doc.text('BULLETIN DE NOTES — ' + termLabel.toUpperCase(), pageW / 2, 41, { align: 'center' })

      // ── INFOS ÉLÈVE ──
      doc.setFillColor(248, 250, 252)
      doc.rect(8, 46, pageW - 16, 24, 'F')
      doc.setDrawColor(226, 232, 240)
      doc.rect(8, 46, pageW - 16, 24)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(15, 23, 42)
      doc.text(student.full_name, 13, 53)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      const dob = student.birth_date ? new Date(student.birth_date).toLocaleDateString('fr-MA') : '—'
      doc.text('Né(e) le : ' + dob, 13, 59)
      if (student.matricule) doc.text('Matricule : ' + student.matricule, 13, 64)
      if (student.parent_name) doc.text('Parent : ' + student.parent_name, 13, 69)

      doc.text('Effectif classe : ' + bulletinStudents.length + ' élèves', pageW / 2, 53)
      doc.text('Rang : ' + rank + ' / ' + bulletinStudents.length, pageW / 2, 59)
      if (student.parent_phone) doc.text('Tél : ' + student.parent_phone, pageW / 2, 64)

      // Badge moyenne
      const avgColor = displayAvg !== null ? (displayAvg >= 14 ? [22, 101, 52] : displayAvg >= 10 ? [23, 37, 84] : [185, 28, 28]) : [100, 116, 139]
      doc.setFillColor(avgColor[0], avgColor[1], avgColor[2])
      doc.roundedRect(pageW - 42, 46, 34, 24, 2, 2, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(255, 255, 255)
      doc.text(displayAvg !== null ? displayAvg.toFixed(2) : '—', pageW - 25, 57, { align: 'center' })
      doc.setFontSize(7)
      doc.setTextColor(200, 220, 255)
      doc.text('/20', pageW - 25, 63, { align: 'center' })
      doc.text(getAppreciation(displayAvg), pageW - 25, 68, { align: 'center' })

      // ── TABLEAU NOTES ──
      const subjectMap: Record<string, { name: string; coeff: number; s1: number | null; s2: number | null }> = {}
      bulletinGrades.filter(g => g.student_id === student.id).forEach(g => {
        const subj = subjects.find(x => x.id === g.subject_id)
        const name = subj?.name ?? 'Autre'
        if (!subjectMap[name]) subjectMap[name] = { name, coeff: subj?.coefficient ?? 1, s1: null, s2: null }
        if (g.term === 1) subjectMap[name].s1 = g.value
        if (g.term === 2) subjectMap[name].s2 = g.value
      })

      const rows: any[] = Object.values(subjectMap).map(s => {
        if (bulletinTerm === 'annual') {
          const an = s.s1 !== null && s.s2 !== null ? (s.s1 + s.s2) / 2 : null
          return [s.name, s.coeff, s.s1 !== null ? s.s1.toFixed(2) : '—', s.s2 !== null ? s.s2.toFixed(2) : '—', an !== null ? an.toFixed(2) : '—', getAppreciation(an)]
        }
        const note = bulletinTerm === 'S1' ? s.s1 : s.s2
        return [s.name, s.coeff, note !== null ? note.toFixed(2) : '—', getAppreciation(note)]
      })

      const head = bulletinTerm === 'annual'
        ? [['Matière', 'Coeff', 'S1 /20', 'S2 /20', 'Moy /20', 'Appréciation']]
        : [['Matière', 'Coeff', 'Note /20', 'Appréciation']]

      const foot = bulletinTerm === 'annual'
        ? [['Moyenne générale', '', s1Avg?.toFixed(2) ?? '—', s2Avg?.toFixed(2) ?? '—', annualAvg?.toFixed(2) ?? '—', getAppreciation(annualAvg ?? null)]]
        : [['Moyenne générale', '', displayAvg?.toFixed(2) ?? '—', getAppreciation(displayAvg ?? null)]]

      autoTable(doc, {
        startY: 72,
        head, body: rows, foot,
        styles: { fontSize: 9, cellPadding: 3, font: 'helvetica' },
        headStyles: { fillColor: [23, 37, 84], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        footStyles: { fillColor: [239, 246, 255], textColor: [23, 37, 84], fontStyle: 'bold' },
        columnStyles: bulletinTerm === 'annual'
          ? { 0: { cellWidth: 60 }, 1: { cellWidth: 14, halign: 'center' }, 2: { cellWidth: 20, halign: 'center' }, 3: { cellWidth: 20, halign: 'center' }, 4: { cellWidth: 22, halign: 'center', fontStyle: 'bold' }, 5: { cellWidth: 40, halign: 'center' } }
          : { 0: { cellWidth: 80 }, 1: { cellWidth: 18, halign: 'center' }, 2: { cellWidth: 28, halign: 'center', fontStyle: 'bold' }, 3: { cellWidth: 60, halign: 'center' } },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      })

      let y = (doc as any).lastAutoTable.finalY + 6

      // ── RÉSUMÉ STATS ──
      doc.setFillColor(239, 246, 255)
      doc.roundedRect(8, y, pageW - 16, 10, 2, 2, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(23, 37, 84)
      doc.text('Rang : ' + rank + ' / ' + bulletinStudents.length, 14, y + 7)
      doc.text('Mention : ' + getAppreciation(displayAvg ?? null), pageW / 2, y + 7, { align: 'center' })
      if (obsAvg !== null) doc.text('Comportement moyen : ' + obsAvg.toFixed(1) + '/10', pageW - 14, y + 7, { align: 'right' })
      y += 14

      // ── OBSERVATIONS PROFS ──
      if (lastObs.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(23, 37, 84)
        doc.text('OBSERVATIONS DES PROFESSEURS', 8, y)
        y += 4

        autoTable(doc, {
          startY: y,
          head: [['Matière', 'Semaine', 'Note /10', 'Comportement', 'Observation', 'Professeur']],
          body: lastObs.map(o => [
            o.subjects?.name ?? 'Général',
            new Date(o.week_start).toLocaleDateString('fr-MA', { day: 'numeric', month: 'short' }),
            o.note + '/10',
            BEHAVIOR_LABELS[o.behavior] ?? o.behavior,
            o.comment ?? '—',
            o.users?.full_name ?? '—',
          ]),
          styles: { fontSize: 7.5, cellPadding: 2.5, font: 'helvetica' },
          headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 7 },
          columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 18, halign: 'center' }, 2: { cellWidth: 16, halign: 'center', fontStyle: 'bold' }, 3: { cellWidth: 22, halign: 'center' }, 4: { cellWidth: 60 }, 5: { cellWidth: 35 } },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        })
        y = (doc as any).lastAutoTable.finalY + 6
      }

      // ── APPRÉCIATION DIRECTION ──
      doc.setDrawColor(226, 232, 240)
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(8, y, pageW - 16, 20, 2, 2, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(23, 37, 84)
      doc.text('APPRÉCIATION GÉNÉRALE DE LA DIRECTION', 13, y + 6)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(30, 41, 59)
      const appText = appreciation || 'Élève sérieux(se), continuez vos efforts pour le prochain semestre.'
      const splitApp = doc.splitTextToSize(appText, pageW - 28)
      doc.text(splitApp, 13, y + 13)
      y += 26

      // ── SIGNATURES ──
      const sigY = Math.max(y + 4, pageH - 36)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text('Le Directeur / La Directrice', 20, sigY)
      doc.line(14, sigY + 13, 76, sigY + 13)
      doc.text('Signature du Parent', pageW / 2, sigY, { align: 'center' })
      doc.line(pageW / 2 - 30, sigY + 13, pageW / 2 + 30, sigY + 13)
      doc.text('Cachet établissement', pageW - 20, sigY, { align: 'right' })
      doc.roundedRect(pageW - 58, sigY + 1, 44, 14, 2, 2)

      // ── PIED DE PAGE ──
      doc.setFillColor(23, 37, 84)
      doc.rect(0, pageH - 10, pageW, 10, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(147, 197, 253)
      doc.text('ACX — Gestion scolaire | acx.ma   ·   ' + (schoolInfo?.name ?? ''), pageW / 2, pageH - 4, { align: 'center' })
    })

    const filename = 'Bulletins-' + (cls?.name ?? 'classe') + '-' + termLabel.replace(/ /g, '-') + '.pdf'
    doc.save(filename)
    setGenerating(false)
  }

  // ── STYLES ──
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0',
    borderRadius: '8px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
    outline: 'none', color: '#1E293B', background: '#fff', boxSizing: 'border-box',
  }

  if (loading) return <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>Chargement...</div>

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>Notes et Bulletins</h1>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>Saisie des notes et génération des bulletins PDF</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', background: '#F1F5F9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {([
          { key: 'notes',     label: 'Saisie des notes',   icon: 'ti-pencil'   },
          { key: 'bulletins', label: 'Bulletins PDF',       icon: 'ti-file-text'},
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', background: tab === t.key ? '#fff' : 'transparent', color: tab === t.key ? '#1E293B' : '#64748B', boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            <i className={'ti ' + t.icon} style={{ fontSize: '14px' }} /> {t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB SAISIE NOTES ══ */}
      {tab === 'notes' && (
        <div>
          {/* Filtres */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Classe</label>
                <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setStudents([]); setNoteValues({}); if (e.target.value) fetchStudents(e.target.value) }} style={inputStyle}>
                  <option value="">Selectionnez une classe</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.level}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Matiere</label>
                <select value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); if (selectedClass) fetchStudents(selectedClass) }} style={inputStyle}>
                  <option value="">Selectionnez une matiere</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name} (coeff. {s.coefficient})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Semestre</label>
                <select value={selectedTerm} onChange={e => setSelectedTerm(Number(e.target.value))} style={inputStyle}>
                  <option value={1}>Semestre 1</option>
                  <option value={2}>Semestre 2</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tableau saisie */}
          {selectedClass && selectedSubject ? (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>
                  {students.length} élève{students.length > 1 ? 's' : ''} · {subjects.find(s => s.id === selectedSubject)?.name} · S{selectedTerm}
                </div>
                <button onClick={handleSave} disabled={saving} style={{ padding: '7px 16px', border: 'none', borderRadius: '8px', background: saving ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Enregistrement...' : 'Enregistrer les notes'}
                </button>
              </div>

              {loadingStudents ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>Chargement...</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      {['Élève', 'Note /20', 'Appréciation', 'Moyenne générale'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>Aucun élève</td></tr>
                    ) : students.map((student, index) => {
                      const note = parseFloat(noteValues[student.id] ?? '')
                      const moy = getMoyenne(student.id)
                      const appre = isNaN(note) ? '-' : note >= 16 ? 'Très bien' : note >= 14 ? 'Bien' : note >= 12 ? 'Assez bien' : note >= 10 ? 'Passable' : 'Insuffisant'
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
                            <input type="number" min="0" max="20" step="0.5" value={noteValues[student.id] ?? ''} onChange={e => setNoteValues(prev => ({ ...prev, [student.id]: e.target.value }))} placeholder="—" style={{ width: '80px', padding: '6px 10px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', outline: 'none', color: noteColor, fontWeight: 500 }} />
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: isNaN(note) ? '#F1F5F9' : note >= 14 ? '#DCFCE7' : note >= 10 ? '#FEF3C7' : '#FEF2F2', color: isNaN(note) ? '#94A3B8' : noteColor }}>
                              {appre}
                            </span>
                          </td>
                          <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{moy ? moy + '/20' : '-'}</td>
                        </tr>
                      )
                    })}
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
              Sélectionnez une classe et une matière pour saisir les notes
            </div>
          )}
        </div>
      )}

      {/* ══ TAB BULLETINS ══ */}
      {tab === 'bulletins' && (
        <div>
          {/* Config */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Classe</label>
                <select value={bulletinClass} onChange={e => { setBulletinClass(e.target.value); if (e.target.value) loadBulletinClass(e.target.value) }} style={inputStyle}>
                  <option value="">Sélectionnez une classe</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.level}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Type de bulletin</label>
                <select value={bulletinTerm} onChange={e => setBulletinTerm(e.target.value as any)} style={inputStyle}>
                  <option value="S1">Semestre 1</option>
                  <option value="S2">Semestre 2</option>
                  <option value="annual">Bulletin annuel (S1 + S2)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Appréciation direction</label>
                <input type="text" value={appreciation} onChange={e => setAppreciation(e.target.value)} placeholder="Ex: Bon semestre, continuez ainsi..." style={inputStyle} />
              </div>
            </div>

            {/* Sélection élèves */}
            {bulletinStudents.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>
                    Élèves à inclure ({selectedIds.length}/{bulletinStudents.length})
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setSelectedIds(bulletinStudents.map(s => s.id))} style={{ padding: '4px 12px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', color: '#2563EB', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      Tout sélectionner
                    </button>
                    <button onClick={() => setSelectedIds([])} style={{ padding: '4px 12px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', color: '#64748B', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      Tout désélectionner
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {bulletinStudents.map(s => {
                    const isSelected = selectedIds.includes(s.id)
                    const avg = getBulletinAvg(s.id, bulletinTerm === 'S1' ? 1 : bulletinTerm === 'S2' ? 2 : undefined)
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedIds(prev => isSelected ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', border: '1px solid ' + (isSelected ? '#2563EB' : '#E2E8F0'), borderRadius: '20px', background: isSelected ? '#EFF6FF' : '#fff', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: isSelected ? '#1E3A8A' : '#64748B' }}
                      >
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: isSelected ? '#BFDBFE' : '#F1F5F9', color: isSelected ? '#1E3A8A' : '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 600 }}>
                          {s.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        {s.full_name}
                        {avg !== null && (
                          <span style={{ fontSize: '11px', fontWeight: 600, color: avg >= 10 ? '#166534' : '#DC2626' }}>
                            {avg.toFixed(1)}
                          </span>
                        )}
                        {isSelected && <i className="ti ti-check" style={{ fontSize: '11px', color: '#2563EB' }} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Aperçu stats */}
          {bulletinStudents.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.25rem' }}>
              {[
                { label: 'Élèves sélectionnés', value: selectedIds.length },
                { label: 'Avec des notes',       value: bulletinStudents.filter(s => getBulletinAvg(s.id) !== null).length },
                { label: 'Moy. classe',          value: (() => { const avgs = bulletinStudents.map(s => getBulletinAvg(s.id)).filter(Boolean) as number[]; return avgs.length > 0 ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(2) : '—' })() },
                { label: 'Pages PDF',            value: selectedIds.length },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>{s.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: 600, color: '#0F172A' }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Bouton générer */}
          {bulletinClass ? (
            loadingBulletin ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>Chargement des données...</div>
            ) : (
              <button
                onClick={generateBulletins}
                disabled={generating || selectedIds.length === 0}
                style={{ width: '100%', padding: '14px', border: 'none', borderRadius: '12px', background: generating || selectedIds.length === 0 ? '#94A3B8' : '#172554', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: generating || selectedIds.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              >
                <i className="ti ti-file-type-pdf" style={{ fontSize: '20px' }} />
                {generating
                  ? 'Génération en cours...'
                  : `Générer ${selectedIds.length} bulletin${selectedIds.length > 1 ? 's' : ''} PDF — ${bulletinTerm === 'S1' ? 'Semestre 1' : bulletinTerm === 'S2' ? 'Semestre 2' : 'Bulletin annuel'}`
                }
              </button>
            )
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#94A3B8', fontSize: '14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
              <i className="ti ti-file-text" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
              Sélectionnez une classe pour générer les bulletins
            </div>
          )}
        </div>
      )}
    </div>
  )
}