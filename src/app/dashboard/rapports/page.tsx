'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function RapportsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [data, setData] = useState<any>({})
  const [schoolInfo, setSchoolInfo] = useState<any>(null)
  const [activeRapport, setActiveRapport] = useState<string | null>(null)

  // Filtres
  const [filterClass, setFilterClass] = useState('')
  const [filterTerm,  setFilterTerm]  = useState('1')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo,   setFilterDateTo]   = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    loadAll(user.school_id)
  }, [])

  async function loadAll(schoolId: string) {
    const [
      { data: school },
      { data: students },
      { data: classes },
      { data: teachers },
      { data: absences },
      { data: payments },
      { data: expenses },
      { data: grades },
      { data: attendance },
      { data: obs },
    ] = await Promise.all([
      supabase.from('schools').select('*').eq('id', schoolId).single(),
      supabase.from('students').select('*, class_students(classes(name,level))').eq('school_id', schoolId),
      supabase.from('classes').select('*, users(full_name)').eq('school_id', schoolId),
      supabase.from('users').select('*').eq('school_id', schoolId).eq('role', 'teacher'),
      supabase.from('absences').select('*, students(full_name), classes(name)').in('class_id', (await supabase.from('classes').select('id').eq('school_id', schoolId)).data?.map(c => c.id) ?? []),
      supabase.from('payments').select('*').eq('school_id', schoolId),
      supabase.from('expenses').select('*').eq('school_id', schoolId),
      supabase.from('grades').select('*, subjects(name, coefficient), students(full_name)').in('class_id', (await supabase.from('classes').select('id').eq('school_id', schoolId)).data?.map(c => c.id) ?? []),
      supabase.from('teacher_attendance').select('*, users(full_name), teacher_attendance_events(event_type)').eq('school_id', schoolId).order('date', { ascending: false }),
      supabase.from('student_observations').select('*, students(full_name), subjects(name), users(full_name)').eq('school_id', schoolId),
    ])

    setSchoolInfo(school)
    setData({ students, classes, teachers, absences, payments, expenses, grades, attendance, obs })
    setLoading(false)
  }

  // ── Génération PDF ──
  async function generatePDF(type: string) {
    setGenerating(type)
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const today = new Date().toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' })

    // En-tête commune
    const header = (title: string, subtitle?: string) => {
      doc.setFillColor(23, 37, 84)
      doc.rect(0, 0, pageW, 28, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(255, 255, 255)
      doc.text('ACX', 12, 13)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(147, 197, 253)
      doc.text('acx.ma', 12, 18)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(255, 255, 255)
      doc.text(schoolInfo?.name ?? '', pageW / 2, 12, { align: 'center' })
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(147, 197, 253)
      doc.text(today, pageW / 2, 18, { align: 'center' })
      doc.setFillColor(239, 246, 255)
      doc.rect(0, 28, pageW, 10, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(23, 37, 84)
      doc.text(title.toUpperCase(), pageW / 2, 35, { align: 'center' })
      if (subtitle) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 116, 139)
        doc.text(subtitle, pageW / 2, 42, { align: 'center' })
      }
    }

    const footer = () => {
      doc.setFillColor(23, 37, 84)
      doc.rect(0, pageH - 8, pageW, 8, 'F')
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(147, 197, 253)
      doc.text('ACX — ' + schoolInfo?.name + ' | acx.ma | Généré le ' + today, pageW / 2, pageH - 3, { align: 'center' })
    }

    // ── RAPPORT FINANCIER ──
    if (type === 'financier') {
      const recettes = (data.payments ?? []).filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + p.amount, 0)
      const depenses = (data.expenses ?? []).reduce((s: number, e: any) => s + e.amount, 0)
      const solde    = recettes - depenses

      header('Rapport financier', 'Recettes, dépenses et solde de caisse')
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139)
      doc.text('Période : Année scolaire 2024-2025', 14, 48)

      autoTable(doc, {
        startY: 52,
        head: [['Indicateur', 'Montant (MAD)']],
        body: [
          ['Total recettes encaissées', recettes.toLocaleString('fr-MA') + ' MAD'],
          ['Total dépenses', depenses.toLocaleString('fr-MA') + ' MAD'],
          ['Solde caisse', solde.toLocaleString('fr-MA') + ' MAD'],
          ['Paiements en attente', (data.payments ?? []).filter((p: any) => p.status === 'pending').reduce((s: number, p: any) => s + p.amount, 0).toLocaleString('fr-MA') + ' MAD'],
          ['Paiements en retard', (data.payments ?? []).filter((p: any) => p.status === 'late').reduce((s: number, p: any) => s + p.amount, 0).toLocaleString('fr-MA') + ' MAD'],
        ],
        styles: { fontSize: 10, font: 'helvetica' },
        headStyles: { fillColor: [23, 37, 84], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' } },
        footStyles: { fillColor: [239, 246, 255], textColor: [23, 37, 84], fontStyle: 'bold' },
        foot: [['SOLDE NET', solde.toLocaleString('fr-MA') + ' MAD']],
      })

      let y = (doc as any).lastAutoTable.finalY + 10
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(23, 37, 84)
      doc.text('Dépenses par catégorie', 14, y); y += 5

      const cats: Record<string, number> = {}
      ;(data.expenses ?? []).forEach((e: any) => { cats[e.category] = (cats[e.category] ?? 0) + e.amount })

      autoTable(doc, {
        startY: y,
        head: [['Catégorie', 'Total (MAD)', '% des dépenses']],
        body: Object.entries(cats).map(([cat, total]) => [
          cat.charAt(0).toUpperCase() + cat.slice(1),
          (total as number).toLocaleString('fr-MA') + ' MAD',
          depenses > 0 ? Math.round((total as number) / depenses * 100) + '%' : '0%',
        ]),
        styles: { fontSize: 9, font: 'helvetica' },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      })

      footer()
      doc.save('Rapport-Financier-' + today.replace(/ /g, '-') + '.pdf')
    }

    // ── RAPPORT ÉLÈVES ──
    if (type === 'eleves') {
      header('Rapport des élèves', 'Liste complète et statistiques')
      const students = data.students ?? []

      autoTable(doc, {
        startY: 46,
        head: [['N°', 'Nom', 'Genre', 'Classe', 'Niveau', 'Matricule', 'Statut']],
        body: students.map((s: any, i: number) => [
          i + 1,
          s.full_name,
          s.gender === 'M' ? 'Garçon' : 'Fille',
          s.class_students?.[0]?.classes?.name ?? '—',
          s.class_students?.[0]?.classes?.level ?? s.level ?? '—',
          s.matricule ?? '—',
          s.status === 'active' ? 'Actif' : 'Inactif',
        ]),
        styles: { fontSize: 8, font: 'helvetica', cellPadding: 2.5 },
        headStyles: { fillColor: [23, 37, 84], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        columnStyles: { 0: { cellWidth: 10, halign: 'center' } },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      })

      footer()
      doc.save('Rapport-Eleves-' + today.replace(/ /g, '-') + '.pdf')
    }

    // ── RAPPORT ABSENCES ──
    if (type === 'absences') {
      header('Rapport des absences', 'Toutes les absences enregistrées')
      const absences = data.absences ?? []

      autoTable(doc, {
        startY: 46,
        head: [['Élève', 'Classe', 'Date', 'Statut', 'Motif']],
        body: absences.map((a: any) => [
          a.students?.full_name ?? '—',
          a.classes?.name ?? '—',
          new Date(a.absence_date).toLocaleDateString('fr-MA'),
          a.justified ? 'Justifiée' : 'Non justifiée',
          a.reason ?? '—',
        ]),
        styles: { fontSize: 8, font: 'helvetica', cellPadding: 2.5 },
        headStyles: { fillColor: [23, 37, 84], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 25 }, 2: { cellWidth: 28 }, 3: { cellWidth: 28, halign: 'center' }, 4: { cellWidth: 55 } },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      })

      footer()
      doc.save('Rapport-Absences-' + today.replace(/ /g, '-') + '.pdf')
    }

    // ── RAPPORT POINTAGE PROFS ──
    if (type === 'pointage') {
      header('Rapport de pointage des professeurs', 'Présences, absences et retards')
      const att = data.attendance ?? []

      const byTeacher: Record<string, any> = {}
      att.forEach((a: any) => {
        const name = a.users?.full_name ?? 'Inconnu'
        if (!byTeacher[name]) byTeacher[name] = { name, present: 0, absent: 0, late: 0 }
        if (a.status === 'present') byTeacher[name].present++
        else if (a.status === 'absent') byTeacher[name].absent++
        else if (a.status === 'late') byTeacher[name].late++
      })

      autoTable(doc, {
        startY: 46,
        head: [['Professeur', 'Présences', 'Absences', 'Retards', 'Total jours', 'Taux présence']],
        body: Object.values(byTeacher).map((t: any) => {
          const total = t.present + t.absent + t.late
          return [
            t.name,
            t.present,
            t.absent,
            t.late,
            total,
            total > 0 ? Math.round((t.present / total) * 100) + '%' : '—',
          ]
        }),
        styles: { fontSize: 9, font: 'helvetica' },
        headStyles: { fillColor: [23, 37, 84], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center', fontStyle: 'bold' } },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      })

      footer()
      doc.save('Rapport-Pointage-' + today.replace(/ /g, '-') + '.pdf')
    }

    // ── RAPPORT PAIEMENTS ──
    if (type === 'paiements') {
      header('Rapport des paiements', 'Historique et statuts des paiements')
      const pays = data.payments ?? []

      autoTable(doc, {
        startY: 46,
        head: [['Élève', 'Type', 'Montant', 'Échéance', 'Statut']],
        body: pays.map((p: any) => [
          p.student_id ?? '—',
          p.type === 'tuition' ? 'Scolarité' : p.type === 'registration' ? 'Inscription' : 'Autre',
          p.amount.toLocaleString('fr-MA') + ' MAD',
          new Date(p.due_date).toLocaleDateString('fr-MA'),
          p.status === 'paid' ? 'Payé' : p.status === 'late' ? 'En retard' : 'En attente',
        ]),
        styles: { fontSize: 8, font: 'helvetica', cellPadding: 2.5 },
        headStyles: { fillColor: [23, 37, 84], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      })

      footer()
      doc.save('Rapport-Paiements-' + today.replace(/ /g, '-') + '.pdf')
    }

    // ── RAPPORT NOTES ──
    if (type === 'notes') {
      const termNum = parseInt(filterTerm)
      header('Rapport des notes', 'Semestre ' + filterTerm + ' — Toutes classes')
      const grades = (data.grades ?? []).filter((g: any) => g.term === termNum)
      const students = data.students ?? []

      const byStudent: Record<string, { name: string; notes: any[] }> = {}
      grades.forEach((g: any) => {
        if (!byStudent[g.student_id]) byStudent[g.student_id] = { name: g.students?.full_name ?? '—', notes: [] }
        byStudent[g.student_id].notes.push(g)
      })

      autoTable(doc, {
        startY: 46,
        head: [['Élève', 'Matière', 'Note /20', 'Coeff.', 'Semestre']],
        body: grades.map((g: any) => [
          g.students?.full_name ?? '—',
          g.subjects?.name ?? '—',
          g.value.toFixed(2),
          g.subjects?.coefficient ?? 1,
          'S' + g.term,
        ]),
        styles: { fontSize: 8, font: 'helvetica', cellPadding: 2.5 },
        headStyles: { fillColor: [23, 37, 84], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        columnStyles: { 2: { halign: 'center', fontStyle: 'bold' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      })

      footer()
      doc.save('Rapport-Notes-S' + filterTerm + '-' + today.replace(/ /g, '-') + '.pdf')
    }

    setGenerating(null)
  }

  // ── Génération Excel ──
  async function generateExcel(type: string) {
    setGenerating(type + '_excel')
    const { utils, writeFile } = await import('xlsx')

    let wb = utils.book_new()

    if (type === 'financier') {
      const recettes = (data.payments ?? []).filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + p.amount, 0)
      const depenses = (data.expenses ?? []).reduce((s: number, e: any) => s + e.amount, 0)

      const wsRecettes = utils.json_to_sheet((data.payments ?? []).map((p: any) => ({
        'Montant (MAD)': p.amount,
        'Type':          p.type === 'tuition' ? 'Scolarité' : 'Inscription',
        'Statut':        p.status === 'paid' ? 'Payé' : p.status === 'late' ? 'En retard' : 'En attente',
        'Échéance':      p.due_date,
        'Payé le':       p.paid_at ?? '—',
      })))
      const wsDepenses = utils.json_to_sheet((data.expenses ?? []).map((e: any) => ({
        'Catégorie':  e.category,
        'Libellé':    e.label,
        'Montant':    e.amount,
        'Date':       e.date,
        'Payé à':     e.paid_to ?? '—',
        'Notes':      e.notes ?? '',
      })))
      const wsSummary = utils.json_to_sheet([
        { 'Indicateur': 'Total Recettes',  'Montant (MAD)': recettes },
        { 'Indicateur': 'Total Dépenses',  'Montant (MAD)': depenses },
        { 'Indicateur': 'Solde Caisse',    'Montant (MAD)': recettes - depenses },
      ])

      utils.book_append_sheet(wb, wsSummary,   'Résumé')
      utils.book_append_sheet(wb, wsRecettes,  'Recettes')
      utils.book_append_sheet(wb, wsDepenses,  'Dépenses')
      writeFile(wb, 'Rapport-Financier.xlsx')
    }

    if (type === 'eleves') {
      const ws = utils.json_to_sheet((data.students ?? []).map((s: any) => ({
        'Nom complet':  s.full_name,
        'Genre':        s.gender === 'M' ? 'Garçon' : 'Fille',
        'Date de naissance': s.birth_date ?? '—',
        'Classe':       s.class_students?.[0]?.classes?.name ?? '—',
        'Niveau':       s.class_students?.[0]?.classes?.level ?? s.level ?? '—',
        'Matricule':    s.matricule ?? '—',
        'Transport':    s.has_transport ? 'Oui' : 'Non',
        'Cantine':      s.has_canteen ? 'Oui' : 'Non',
        'Statut':       s.status === 'active' ? 'Actif' : 'Inactif',
        'Parent':       s.parent_name ?? '—',
        'Tél parent':   s.parent_phone ?? '—',
        'Email parent': s.parent_email ?? '—',
      })))
      utils.book_append_sheet(wb, ws, 'Élèves')
      writeFile(wb, 'Rapport-Eleves.xlsx')
    }

    if (type === 'absences') {
      const ws = utils.json_to_sheet((data.absences ?? []).map((a: any) => ({
        'Élève':     a.students?.full_name ?? '—',
        'Classe':    a.classes?.name ?? '—',
        'Date':      a.absence_date,
        'Justifiée': a.justified ? 'Oui' : 'Non',
        'Motif':     a.reason ?? '—',
      })))
      utils.book_append_sheet(wb, ws, 'Absences')
      writeFile(wb, 'Rapport-Absences.xlsx')
    }

    if (type === 'pointage') {
      const ws = utils.json_to_sheet((data.attendance ?? []).map((a: any) => ({
        'Professeur': a.users?.full_name ?? '—',
        'Date':       a.date,
        'Statut':     a.status === 'present' ? 'Présent' : a.status === 'late' ? 'Retard' : 'Absent',
      })))
      utils.book_append_sheet(wb, ws, 'Pointage')
      writeFile(wb, 'Rapport-Pointage.xlsx')
    }

    if (type === 'paiements') {
      const ws = utils.json_to_sheet((data.payments ?? []).map((p: any) => ({
        'Montant (MAD)': p.amount,
        'Type':          p.type === 'tuition' ? 'Scolarité' : 'Inscription',
        'Échéance':      p.due_date,
        'Payé le':       p.paid_at ?? '—',
        'Statut':        p.status === 'paid' ? 'Payé' : p.status === 'late' ? 'En retard' : 'En attente',
      })))
      utils.book_append_sheet(wb, ws, 'Paiements')
      writeFile(wb, 'Rapport-Paiements.xlsx')
    }

    if (type === 'notes') {
      const termNum = parseInt(filterTerm)
      const ws = utils.json_to_sheet((data.grades ?? []).filter((g: any) => g.term === termNum).map((g: any) => ({
        'Élève':    g.students?.full_name ?? '—',
        'Matière':  g.subjects?.name ?? '—',
        'Note /20': g.value,
        'Coeff.':   g.subjects?.coefficient ?? 1,
        'Semestre': 'S' + g.term,
      })))
      utils.book_append_sheet(wb, ws, 'Notes S' + filterTerm)
      writeFile(wb, 'Rapport-Notes-S' + filterTerm + '.xlsx')
    }

    setGenerating(null)
  }

  const RAPPORTS = [
    {
      key:   'financier',
      title: 'Rapport financier',
      desc:  'Recettes vs dépenses, solde caisse, par catégorie',
      icon:  'ti-chart-pie',
      color: '#2563EB',
      bg:    '#EFF6FF',
      stats: [
        { label: 'Recettes',  value: (data.payments ?? []).filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + p.amount, 0).toLocaleString('fr-MA') + ' MAD' },
        { label: 'Dépenses',  value: (data.expenses ?? []).reduce((s: number, e: any) => s + e.amount, 0).toLocaleString('fr-MA') + ' MAD' },
      ],
    },
    {
      key:   'eleves',
      title: 'Rapport élèves',
      desc:  'Liste complète avec infos, niveaux et statistiques',
      icon:  'ti-users',
      color: '#10B981',
      bg:    '#ECFDF5',
      stats: [
        { label: 'Total',   value: (data.students ?? []).length + ' élèves' },
        { label: 'Actifs',  value: (data.students ?? []).filter((s: any) => s.status === 'active').length + ' élèves' },
      ],
    },
    {
      key:   'absences',
      title: 'Rapport absences',
      desc:  'Toutes les absences par élève, classe et période',
      icon:  'ti-calendar-off',
      color: '#F59E0B',
      bg:    '#FFFBEB',
      stats: [
        { label: 'Total',          value: (data.absences ?? []).length + ' absences' },
        { label: 'Non justifiées', value: (data.absences ?? []).filter((a: any) => !a.justified).length + ' absences' },
      ],
    },
    {
      key:   'pointage',
      title: 'Rapport pointage profs',
      desc:  'Présences, retards, absences par professeur',
      icon:  'ti-fingerprint',
      color: '#7C3AED',
      bg:    '#F5F3FF',
      stats: [
        { label: 'Professeurs',  value: (data.teachers ?? []).length + ' profs' },
        { label: 'Jours pointés', value: (data.attendance ?? []).length + ' jours' },
      ],
    },
    {
      key:   'notes',
      title: 'Rapport notes',
      desc:  'Notes et moyennes par classe et par semestre',
      icon:  'ti-file-text',
      color: '#EC4899',
      bg:    '#FDF2F8',
      hasFilter: 'term',
      stats: [
        { label: 'Notes saisies', value: (data.grades ?? []).length + ' notes' },
        { label: 'Classes',       value: (data.classes ?? []).length + ' classes' },
      ],
    },
    {
      key:   'paiements',
      title: 'Rapport paiements',
      desc:  'Payés, impayés, retards — historique complet',
      icon:  'ti-credit-card',
      color: '#EF4444',
      bg:    '#FEF2F2',
      stats: [
        { label: 'Payés',    value: (data.payments ?? []).filter((p: any) => p.status === 'paid').length + ' paiements' },
        { label: 'En retard', value: (data.payments ?? []).filter((p: any) => p.status === 'late').length + ' paiements' },
      ],
    },
  ]

  const inputStyle: React.CSSProperties = {
    padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: '7px',
    fontSize: '13px', fontFamily: 'DM Sans, sans-serif', outline: 'none',
    color: '#1E293B', background: '#fff',
  }

  if (loading) return <div style={{ padding: '2rem', color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}>Chargement...</div>

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>Rapports</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Générez vos rapports en PDF ou Excel
        </p>
      </div>

      {/* Grille des rapports */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
        {RAPPORTS.map(rapport => {
          const isPdfGen = generating === rapport.key
          const isXlsGen = generating === rapport.key + '_excel'
          return (
            <div key={rapport.key} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
              {/* Bande colorée */}
              <div style={{ height: '5px', background: rapport.color }} />

              <div style={{ padding: '1.25rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '1rem' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: rapport.bg, color: rapport.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                    <i className={'ti ' + rapport.icon} />
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '3px' }}>{rapport.title}</div>
                    <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>{rapport.desc}</div>
                  </div>
                </div>

                {/* Stats rapides */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  {rapport.stats.map(s => (
                    <div key={s.label} style={{ flex: 1, padding: '8px 10px', background: rapport.bg, borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: rapport.color, marginBottom: '2px', opacity: 0.8 }}>{s.label}</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: rapport.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Filtre semestre pour notes */}
                {rapport.hasFilter === 'term' && (
                  <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B' }}>
                    <span>Semestre :</span>
                    <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)} style={inputStyle}>
                      <option value="1">Semestre 1</option>
                      <option value="2">Semestre 2</option>
                    </select>
                  </div>
                )}

                {/* Boutons export */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => generatePDF(rapport.key)}
                    disabled={!!generating}
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px', border: 'none', borderRadius: '8px', background: isPdfGen ? '#94A3B8' : rapport.color, color: '#fff', fontSize: '13px', fontWeight: 500, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    <i className="ti ti-file-type-pdf" style={{ fontSize: '15px' }} />
                    {isPdfGen ? 'Génération...' : 'PDF'}
                  </button>
                  <button
                    onClick={() => generateExcel(rapport.key)}
                    disabled={!!generating}
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px', border: '1px solid ' + rapport.color, borderRadius: '8px', background: '#fff', color: rapport.color, fontSize: '13px', fontWeight: 500, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    <i className="ti ti-file-spreadsheet" style={{ fontSize: '15px' }} />
                    {isXlsGen ? 'Export...' : 'Excel'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Rapport complet */}
      <div style={{ marginTop: '14px', background: '#172554', border: '1px solid #1E3A8A', borderRadius: '14px', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', fontFamily: 'Syne, sans-serif', marginBottom: '4px' }}>
            <i className="ti ti-package" style={{ marginRight: '8px', color: '#93C5FD' }} />
            Rapport complet — Toutes données
          </div>
          <div style={{ fontSize: '13px', color: '#93C5FD' }}>
            Élèves + Notes + Absences + Paiements + Dépenses + Pointage en un seul fichier Excel
          </div>
        </div>
        <button
          onClick={async () => {
            setGenerating('complet')
            const { utils, writeFile } = await import('xlsx')
            const wb = utils.book_new()

            utils.book_append_sheet(wb, utils.json_to_sheet((data.students ?? []).map((s: any) => ({ 'Nom': s.full_name, 'Genre': s.gender, 'Classe': s.class_students?.[0]?.classes?.name ?? '—', 'Niveau': s.level ?? '—', 'Matricule': s.matricule ?? '—' }))), 'Élèves')
            utils.book_append_sheet(wb, utils.json_to_sheet((data.grades ?? []).map((g: any) => ({ 'Élève': g.students?.full_name, 'Matière': g.subjects?.name, 'Note': g.value, 'Semestre': 'S' + g.term }))), 'Notes')
            utils.book_append_sheet(wb, utils.json_to_sheet((data.absences ?? []).map((a: any) => ({ 'Élève': a.students?.full_name, 'Classe': a.classes?.name, 'Date': a.absence_date, 'Justifiée': a.justified ? 'Oui' : 'Non' }))), 'Absences')
            utils.book_append_sheet(wb, utils.json_to_sheet((data.payments ?? []).map((p: any) => ({ 'Montant': p.amount, 'Type': p.type, 'Statut': p.status, 'Échéance': p.due_date }))), 'Paiements')
            utils.book_append_sheet(wb, utils.json_to_sheet((data.expenses ?? []).map((e: any) => ({ 'Catégorie': e.category, 'Libellé': e.label, 'Montant': e.amount, 'Date': e.date }))), 'Dépenses')
            utils.book_append_sheet(wb, utils.json_to_sheet((data.attendance ?? []).map((a: any) => ({ 'Professeur': a.users?.full_name, 'Date': a.date, 'Statut': a.status }))), 'Pointage')

            writeFile(wb, 'Rapport-Complet-' + schoolInfo?.name?.replace(/ /g, '-') + '.xlsx')
            setGenerating(null)
          }}
          disabled={!!generating}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 22px', border: 'none', borderRadius: '10px', background: generating === 'complet' ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' as const }}
        >
          <i className="ti ti-download" style={{ fontSize: '17px' }} />
          {generating === 'complet' ? 'Export...' : 'Exporter tout en Excel'}
        </button>
      </div>
    </div>
  )
}