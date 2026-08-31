'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface Teacher { id: string; full_name: string; email: string }
interface Event { id: string; event_type: string; timestamp: string; note: string | null }
interface Attendance {
  id: string
  date: string
  status: string
  teacher_id: string
  users: { full_name: string } | null
  teacher_attendance_events: Event[]
}

interface Props {
  teachers: Teacher[]
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  present: { label: 'Present',   bg: '#DCFCE7', color: '#166534' },
  late:    { label: 'En retard', bg: '#FEF3C7', color: '#92400E' },
  absent:  { label: 'Absent',    bg: '#FEF2F2', color: '#DC2626' },
}

const TAG_COLORS = {
  travail: { label: 'Travail',  color: '#166534', bg: '#DCFCE7', rgb: [22, 163, 74]  as [number, number, number] },
  pause:   { label: 'Pause',    color: '#92400E', bg: '#FFFBEB', rgb: [217, 119, 6]  as [number, number, number] },
  reunion: { label: 'Reunion',  color: '#4C1D95', bg: '#F5F3FF', rgb: [124, 58, 237] as [number, number, number] },
}

function formatDuration(ms: number | null) {
  if (ms === null || ms < 0) return '-'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h${String(m).padStart(2, '0')}`
}

function formatTotal(ms: number) {
  const clamped = Math.max(0, ms || 0)
  const h = Math.floor(clamped / 3600000)
  const m = Math.floor((clamped % 3600000) / 60000)
  return `${h}h${String(m).padStart(2, '0')}`
}

function getWorkDuration(events: Event[]) {
  const arrive = events.find(e => e.event_type === 'arrive')
  const depart = events.find(e => e.event_type === 'depart')
  if (!arrive || !depart) return null
  const start = new Date(arrive.timestamp).getTime()
  const end = new Date(depart.timestamp).getTime()
  let pauseTime = 0
  events.filter(e => e.event_type === 'pause_debut').forEach(p => {
    const pStart = new Date(p.timestamp).getTime()
    const pEnd = events.find(e => e.event_type === 'pause_fin' && new Date(e.timestamp) > new Date(p.timestamp))
    if (pEnd) pauseTime += new Date(pEnd.timestamp).getTime() - pStart
  })
  return Math.max(0, end - start - pauseTime)
}

// Present inclut desormais la reunion : present = effectif (tout le temps hors pause)
function getTagDurations(events: Event[]) {
  let pauseMs = 0
  events.filter(e => e.event_type === 'pause_debut').forEach(p => {
    const pStart = new Date(p.timestamp).getTime()
    const pEnd = events.find(e => e.event_type === 'pause_fin' && new Date(e.timestamp) > new Date(p.timestamp))
    if (pEnd) pauseMs += new Date(pEnd.timestamp).getTime() - pStart
  })
  let reunionMs = 0
  events.filter(e => e.event_type === 'reunion_debut').forEach(r => {
    const rStart = new Date(r.timestamp).getTime()
    const rEnd = events.find(e => e.event_type === 'reunion_fin' && new Date(e.timestamp) > new Date(r.timestamp))
    if (rEnd) reunionMs += new Date(rEnd.timestamp).getTime() - rStart
  })
  const effectifMs = getWorkDuration(events)
  const presentMs = effectifMs // present = effectif, inclut la reunion
  return { effectifMs, presentMs, pauseMs, reunionMs }
}

function getArriveTime(events: Event[]) {
  const e = events.find(e => e.event_type === 'arrive')
  return e ? new Date(e.timestamp).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' }) : '-'
}

function getDepartTime(events: Event[]) {
  const e = events.find(e => e.event_type === 'depart')
  return e ? new Date(e.timestamp).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' }) : '-'
}

// --- Graphique repartition du temps ---
// Segments mutuellement exclusifs pour un empilement visuel correct :
// Travail (= present hors reunion) + Reunion + Pause. Leur somme = effectif + pause.
interface ChartRow { name: string; effectifMs: number; pauseMs: number; reunionMs: number }

function TagDistributionChart({ rows }: { rows: ChartRow[] }) {
  if (rows.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8', fontSize: '13px' }}>Pas de donnees a afficher pour cette periode</div>
  }

  const maxTotal = Math.max(...rows.map(r => r.effectifMs + r.pauseMs), 1)
  const rowHeight = 34
  const barMaxWidth = 560
  const labelWidth = 140
  const svgHeight = rows.length * rowHeight + 20
  const svgWidth = labelWidth + barMaxWidth + 20

  return (
    <div>
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', fontFamily: 'DM Sans, sans-serif' }}>
        {rows.map((r, i) => {
          const travailMs = Math.max(0, r.effectifMs - r.reunionMs)
          const total = r.effectifMs + r.pauseMs
          const scale = total > 0 ? (barMaxWidth * (total / maxTotal)) / total : 0
          const wTravail = travailMs * scale
          const wReunion = r.reunionMs * scale
          const wPause = r.pauseMs * scale
          const y = i * rowHeight + 8

          return (
            <g key={r.name}>
              <text x={0} y={y + 14} fontSize="11" fill="#475569">
                {r.name.length > 18 ? r.name.slice(0, 17) + '…' : r.name}
              </text>
              <rect x={labelWidth} y={y} width={barMaxWidth} height={20} rx={4} fill="#F1F5F9" />
              <rect x={labelWidth} y={y} width={wTravail} height={20} fill={TAG_COLORS.travail.color} />
              <rect x={labelWidth + wTravail} y={y} width={wReunion} height={20} fill={TAG_COLORS.reunion.color} />
              <rect x={labelWidth + wTravail + wReunion} y={y} width={wPause} height={20} fill={TAG_COLORS.pause.color} />
              <text x={labelWidth + barMaxWidth + 8} y={y + 14} fontSize="10" fill="#94A3B8">
                {formatTotal(total)}
              </text>
            </g>
          )
        })}
      </svg>
      <div style={{ display: 'flex', gap: '16px', marginTop: '12px', justifyContent: 'center' }}>
        {Object.values(TAG_COLORS).map(t => (
          <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: t.color, display: 'inline-block' }} />
            {t.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RapportPointage({ teachers }: Props) {
  const supabase = createClient()

  const today = new Date().toISOString().split('T')[0]
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const [dateFrom, setDateFrom] = useState(firstDay)
  const [dateTo, setDateTo] = useState(today)
  const [filterTeacher, setFilterTeacher] = useState('tous')
  const [filterStatus, setFilterStatus] = useState('tous')
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [saving, setSaving] = useState(false)

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('teacher_attendance')
      .select('*, users(full_name), teacher_attendance_events(*)')
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('date', { ascending: false })
    setAttendances(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = attendances.filter(a => {
    const matchTeacher = filterTeacher === 'tous' || a.teacher_id === filterTeacher
    const matchStatus = filterStatus === 'tous' || a.status === filterStatus
    return matchTeacher && matchStatus
  })

  const allDates: string[] = []
  const start = new Date(dateFrom)
  const end = new Date(dateTo)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0) allDates.push(d.toISOString().split('T')[0])
  }

  interface Row {
    id: string | null
    teacher_id: string
    teacher_name: string
    date: string
    status: string
    arrive: string
    depart: string
    isAbsent: boolean
    effectifMs: number | null
    presentMs: number | null
    pauseMs: number
    reunionMs: number
  }

  const tableRows: Row[] = []

  if (filterTeacher !== 'tous') {
    const teacher = teachers.find(t => t.id === filterTeacher)
    if (teacher) {
      allDates.forEach(date => {
        const att = filtered.find(a => a.teacher_id === filterTeacher && a.date === date)
        if (att) {
          const evts = att.teacher_attendance_events ?? []
          tableRows.push({
            id: att.id, teacher_id: teacher.id, teacher_name: teacher.full_name, date,
            status: att.status, arrive: getArriveTime(evts), depart: getDepartTime(evts),
            isAbsent: false, ...getTagDurations(evts),
          })
        } else {
          tableRows.push({
            id: null, teacher_id: teacher.id, teacher_name: teacher.full_name, date,
            status: 'absent', arrive: '-', depart: '-', isAbsent: true,
            effectifMs: null, presentMs: null, pauseMs: 0, reunionMs: 0,
          })
        }
      })
    }
  } else {
    filtered.forEach(att => {
      const evts = att.teacher_attendance_events ?? []
      tableRows.push({
        id: att.id, teacher_id: att.teacher_id, teacher_name: att.users?.full_name ?? '-', date: att.date,
        status: att.status, arrive: getArriveTime(evts), depart: getDepartTime(evts),
        isAbsent: false, ...getTagDurations(evts),
      })
    })
  }

  const finalRows = tableRows.filter(r => filterStatus === 'tous' || r.status === filterStatus)
  const isMultiDay = dateFrom !== dateTo

  const stats = {
    total: finalRows.length,
    presents: finalRows.filter(r => r.status === 'present').length,
    retards: finalRows.filter(r => r.status === 'late').length,
    absents: finalRows.filter(r => r.status === 'absent').length,
  }

  const tagTotals = useMemo(() => finalRows.reduce((acc, r) => ({
    effectif: acc.effectif + (r.effectifMs ?? 0),
    present: acc.present + (r.presentMs ?? 0),
    pause: acc.pause + r.pauseMs,
    reunion: acc.reunion + r.reunionMs,
  }), { effectif: 0, present: 0, pause: 0, reunion: 0 }), [finalRows])

  const perTeacherTotals = useMemo(() => {
    const map = new Map<string, { teacher_id: string; name: string; effectif: number; present: number; pause: number; reunion: number; jours: number; retards: number; absences: number }>()
    finalRows.forEach(r => {
      if (!map.has(r.teacher_id)) {
        map.set(r.teacher_id, { teacher_id: r.teacher_id, name: r.teacher_name, effectif: 0, present: 0, pause: 0, reunion: 0, jours: 0, retards: 0, absences: 0 })
      }
      const t = map.get(r.teacher_id)!
      t.effectif += r.effectifMs ?? 0
      t.present += r.presentMs ?? 0
      t.pause += r.pauseMs
      t.reunion += r.reunionMs
      if (r.status === 'present') t.jours += 1
      if (r.status === 'late') { t.jours += 1; t.retards += 1 }
      if (r.status === 'absent') t.absences += 1
    })
    return Array.from(map.values()).sort((a, b) => b.effectif - a.effectif)
  }, [finalRows])

  const chartRows: ChartRow[] = filterTeacher === 'tous'
    ? perTeacherTotals.map(t => ({ name: t.name, effectifMs: t.effectif, pauseMs: t.pause, reunionMs: t.reunion }))
    : [{ name: teachers.find(t => t.id === filterTeacher)?.full_name ?? '-', effectifMs: tagTotals.effectif, pauseMs: tagTotals.pause, reunionMs: tagTotals.reunion }]

  async function handleSaveEdit(row: Row) {
    setSaving(true)
    if (row.id) {
      await supabase.from('teacher_attendance').update({ status: editStatus }).eq('id', row.id)
    } else {
      const { data: userProfile } = await supabase.from('users').select('school_id').eq('id', row.teacher_id).single()
      await supabase.from('teacher_attendance').insert({
        teacher_id: row.teacher_id, school_id: userProfile!.school_id, date: row.date, status: editStatus,
      })
    }
    setEditingId(null)
    setSaving(false)
    fetchData()
  }

  async function exportExcel() {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    const detailData = [
      ['Professeur', 'Date', 'Statut', 'Arrivee', 'Depart', 'Effectif', 'Present', 'Pause', 'Reunion'],
      ...finalRows.map(r => [
        r.teacher_name, new Date(r.date).toLocaleDateString('fr-MA'), STATUS_CONFIG[r.status]?.label ?? r.status,
        r.arrive, r.depart, formatDuration(r.effectifMs), formatDuration(r.presentMs), formatTotal(r.pauseMs), formatTotal(r.reunionMs),
      ])
    ]
    const wsDetail = XLSX.utils.aoa_to_sheet(detailData)
    wsDetail['!cols'] = [{ wch: 25 }, { wch: 14 }, { wch: 12 }, { wch: 9 }, { wch: 9 }, { wch: 10 }, { wch: 10 }, { wch: 9 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail')

    const totalsData = [
      ['Totaux periode', ''],
      ['Effectif total', formatTotal(tagTotals.effectif)],
      ['Present total', formatTotal(tagTotals.present)],
      ['Pause total', formatTotal(tagTotals.pause)],
      ['Reunion total', formatTotal(tagTotals.reunion)],
      [],
      ['Professeur', 'Effectif', 'Present', 'Pause', 'Reunion', 'Jours presence', 'Retards', 'Absences'],
      ...perTeacherTotals.map(t => [t.name, formatTotal(t.effectif), formatTotal(t.present), formatTotal(t.pause), formatTotal(t.reunion), t.jours, t.retards, t.absences]),
    ]
    const wsTotals = XLSX.utils.aoa_to_sheet(totalsData)
    wsTotals['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, wsTotals, 'Totaux')

    XLSX.writeFile(wb, `rapport-pointage-${dateFrom}-${dateTo}.xlsx`)
  }

  async function exportPDF() {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'landscape' })

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('ACX — Rapport de Pointage des Professeurs', 14, 16)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Periode : ${new Date(dateFrom).toLocaleDateString('fr-MA')} au ${new Date(dateTo).toLocaleDateString('fr-MA')}`, 14, 24)
    doc.text(`Genere le : ${new Date().toLocaleDateString('fr-MA')} a ${new Date().toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}`, 14, 30)
    doc.text(`Presents: ${stats.presents}  |  En retard: ${stats.retards}  |  Absents: ${stats.absents}  |  Total: ${stats.total}`, 14, 36)

    doc.setFont('helvetica', 'bold')
    doc.text(`Totaux — Effectif: ${formatTotal(tagTotals.effectif)}   Present: ${formatTotal(tagTotals.present)}   Pause: ${formatTotal(tagTotals.pause)}   Reunion: ${formatTotal(tagTotals.reunion)}`, 14, 43)
    doc.setFont('helvetica', 'normal')

    const chartStartY = 50
    const barX = 60
    const barMaxWidth = 200
    const barHeight = 5
    const rowGap = 8
    const maxTotalMs = Math.max(...chartRows.map(r => r.effectifMs + r.pauseMs), 1)

    doc.setFontSize(9)
    chartRows.slice(0, 12).forEach((r, i) => {
      const y = chartStartY + i * rowGap
      const travailMs = Math.max(0, r.effectifMs - r.reunionMs)
      const total = r.effectifMs + r.pauseMs
      const scale = total > 0 ? (barMaxWidth * (total / maxTotalMs)) / total : 0
      const wTravail = travailMs * scale
      const wReunion = r.reunionMs * scale
      const wPause = r.pauseMs * scale

      doc.setTextColor(71, 85, 105)
      doc.text(r.name.length > 22 ? r.name.slice(0, 21) + '…' : r.name, 14, y + 3.5)

      doc.setFillColor(241, 245, 249)
      doc.rect(barX, y, barMaxWidth, barHeight, 'F')

      let x = barX
      doc.setFillColor(...TAG_COLORS.travail.rgb)
      doc.rect(x, y, wTravail, barHeight, 'F')
      x += wTravail
      doc.setFillColor(...TAG_COLORS.reunion.rgb)
      doc.rect(x, y, wReunion, barHeight, 'F')
      x += wReunion
      doc.setFillColor(...TAG_COLORS.pause.rgb)
      doc.rect(x, y, wPause, barHeight, 'F')

      doc.setTextColor(148, 163, 184)
      doc.text(formatTotal(total), barX + barMaxWidth + 4, y + 3.5)
    })

    const legendY = chartStartY + Math.min(chartRows.length, 12) * rowGap + 6
    let legendX = barX
    ;[TAG_COLORS.travail, TAG_COLORS.reunion, TAG_COLORS.pause].forEach(t => {
      doc.setFillColor(...t.rgb)
      doc.rect(legendX, legendY - 3, 3, 3, 'F')
      doc.setTextColor(100, 116, 139)
      doc.text(t.label, legendX + 5, legendY)
      legendX += 30
    })

    const nextY = legendY + 10

    autoTable(doc, {
      startY: nextY,
      head: [['Professeur', 'Date', 'Statut', 'Arrivee', 'Depart', 'Effectif', 'Present', 'Pause', 'Reunion']],
      body: finalRows.map(r => [
        r.teacher_name, new Date(r.date).toLocaleDateString('fr-MA'), STATUS_CONFIG[r.status]?.label ?? r.status,
        r.arrive, r.depart, formatDuration(r.effectifMs), formatDuration(r.presentMs), formatTotal(r.pauseMs), formatTotal(r.reunionMs),
      ]),
      styles: { fontSize: 8.5, cellPadding: 3.5, font: 'helvetica' },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data: any) => {
        if (data.column.index === 2 && data.section === 'body') {
          const val = data.cell.text[0]
          if (val === 'Present')   data.cell.styles.textColor = [22, 101, 52]
          if (val === 'En retard') data.cell.styles.textColor = [146, 64, 14]
          if (val === 'Absent')    data.cell.styles.textColor = [220, 38, 38]
        }
      },
    })

    if (filterTeacher === 'tous' && perTeacherTotals.length > 0 && isMultiDay) {
      const afterDetailY = (doc as any).lastAutoTable.finalY + 10
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text('Totaux par professeur', 14, afterDetailY)

      autoTable(doc, {
        startY: afterDetailY + 4,
        head: [['Professeur', 'Effectif total', 'Present', 'Pause', 'Reunion', 'Jours presence', 'Retards', 'Absences']],
        body: perTeacherTotals.map(t => [t.name, formatTotal(t.effectif), formatTotal(t.present), formatTotal(t.pause), formatTotal(t.reunion), String(t.jours), String(t.retards), String(t.absences)]),
        styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      })
    }

    doc.save(`rapport-pointage-${dateFrom}-${dateTo}.pdf`)
  }

  const inputStyle = {
    padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px',
    fontFamily: 'DM Sans, sans-serif', outline: 'none', color: '#1E293B', background: '#fff',
  }

  return (
    <div>
      {/* Filtres */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px' }}>Du</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px' }}>Au</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px' }}>Professeur</label>
            <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} style={inputStyle}>
              <option value="tous">Tous les professeurs</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px' }}>Statut</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={inputStyle}>
              <option value="tous">Tous</option>
              <option value="present">Present</option>
              <option value="late">En retard</option>
              <option value="absent">Absent</option>
            </select>
          </div>
          <button onClick={fetchData} style={{ padding: '8px 18px', border: 'none', borderRadius: '8px', background: '#2563EB', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            <i className="ti ti-search" /> Filtrer
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button onClick={exportExcel} style={{ padding: '8px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', color: '#166534', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-file-spreadsheet" /> Excel
            </button>
            <button onClick={exportPDF} style={{ padding: '8px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', color: '#DC2626', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-file-type-pdf" /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Stats presence */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '10px' }}>
        {[
          { label: 'Total enregistrements', value: stats.total,    color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Presents',              value: stats.presents, color: '#166534', bg: '#DCFCE7' },
          { label: 'En retard',             value: stats.retards,  color: '#92400E', bg: '#FEF3C7' },
          { label: 'Absents',               value: stats.absents,  color: '#DC2626', bg: '#FEF2F2' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.875rem 1rem' }}>
            <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: '#0F172A' }}>{s.value}</div>
            <div style={{ fontSize: '11px', marginTop: '3px', background: s.bg, color: s.color, display: 'inline-block', padding: '1px 8px', borderRadius: '20px' }}>
              {dateFrom === dateTo ? "Aujourd'hui" : 'Periode'}
            </div>
          </div>
        ))}
      </div>

      {/* Totaux par tag */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.25rem' }}>
        {[
          { label: 'Temps effectif total', value: formatTotal(tagTotals.effectif), color: '#1E293B', bg: '#F1F5F9' },
          { label: 'Present total',        value: formatTotal(tagTotals.present),  color: TAG_COLORS.travail.color, bg: TAG_COLORS.travail.bg },
          { label: 'Pause total',          value: formatTotal(tagTotals.pause),    color: TAG_COLORS.pause.color,   bg: TAG_COLORS.pause.bg },
          { label: 'Reunion total',        value: formatTotal(tagTotals.reunion),  color: TAG_COLORS.reunion.color, bg: TAG_COLORS.reunion.bg },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: '1px solid ' + s.bg, borderRadius: '10px', padding: '0.875rem 1rem' }}>
            <div style={{ fontSize: '11px', color: s.color, marginBottom: '4px', opacity: 0.85 }}>{s.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Graphique repartition du temps */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '1rem' }}>
          Repartition du temps {filterTeacher === 'tous' ? 'par professeur' : ''}
        </div>
        <TagDistributionChart rows={chartRows} />
      </div>

      {/* Totaux par professeur — seulement si periode > 1 jour, sinon doublon avec le tableau detail */}
      {filterTeacher === 'tous' && perTeacherTotals.length > 0 && isMultiDay && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.25rem' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
            Totaux par professeur
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Professeur', 'Effectif', 'Present', 'Pause', 'Reunion', 'Jours presence', 'Retards', 'Absences'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perTeacherTotals.map((t, i) => (
                <tr key={t.teacher_id} style={{ borderBottom: i < perTeacherTotals.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                  <td style={{ padding: '9px 14px', fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{t.name}</td>
                  <td style={{ padding: '9px 14px', fontSize: '13px', color: '#1E293B', fontWeight: 500 }}>{formatTotal(t.effectif)}</td>
                  <td style={{ padding: '9px 14px', fontSize: '13px', color: TAG_COLORS.travail.color }}>{formatTotal(t.present)}</td>
                  <td style={{ padding: '9px 14px', fontSize: '13px', color: TAG_COLORS.pause.color }}>{formatTotal(t.pause)}</td>
                  <td style={{ padding: '9px 14px', fontSize: '13px', color: TAG_COLORS.reunion.color }}>{formatTotal(t.reunion)}</td>
                  <td style={{ padding: '9px 14px', fontSize: '13px', color: '#475569' }}>{t.jours}</td>
                  <td style={{ padding: '9px 14px', fontSize: '13px', color: '#92400E' }}>{t.retards}</td>
                  <td style={{ padding: '9px 14px', fontSize: '13px', color: '#DC2626' }}>{t.absences}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tableau detail (unique) */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px' }}>Chargement...</div>
        ) : finalRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px' }}>
            <i className="ti ti-clipboard-off" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
            Aucun enregistrement pour cette periode
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Professeur', 'Date', 'Statut', 'Arrivee', 'Depart', 'Effectif', 'Present', 'Pause', 'Reunion', 'Modifier'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {finalRows.map((row, index) => {
                const isEditing = editingId === (row.id ?? row.date + row.teacher_id)
                const statusCfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.absent
                return (
                  <tr key={row.id ?? row.date + row.teacher_id} style={{ borderBottom: index < finalRows.length - 1 ? '1px solid #F1F5F9' : 'none', background: row.isAbsent ? '#FFFAFA' : isEditing ? '#F0F9FF' : 'transparent' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500, flexShrink: 0 }}>
                          {row.teacher_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{row.teacher_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' }}>
                      {new Date(row.date).toLocaleDateString('fr-MA', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {isEditing ? (
                        <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #2563EB', borderRadius: '6px', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', outline: 'none' }}>
                          <option value="present">Present</option>
                          <option value="late">En retard</option>
                          <option value="absent">Absent</option>
                        </select>
                      ) : (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: '#475569' }}>{row.arrive}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: '#475569' }}>{row.depart}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{formatDuration(row.effectifMs)}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: TAG_COLORS.travail.color }}>{formatDuration(row.presentMs)}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: TAG_COLORS.pause.color }}>{row.pauseMs > 0 ? formatTotal(row.pauseMs) : '-'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: TAG_COLORS.reunion.color }}>{row.reunionMs > 0 ? formatTotal(row.reunionMs) : '-'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => handleSaveEdit(row)} disabled={saving} style={{ padding: '4px 10px', border: 'none', borderRadius: '6px', background: '#2563EB', color: '#fff', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                            {saving ? '...' : 'OK'}
                          </button>
                          <button onClick={() => setEditingId(null)} style={{ padding: '4px 8px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', color: '#64748B', fontSize: '12px', cursor: 'pointer' }}>
                            <i className="ti ti-x" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingId(row.id ?? row.date + row.teacher_id); setEditStatus(row.status) }} style={{ padding: '4px 10px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', color: '#2563EB', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <i className="ti ti-pencil" /> Modifier
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: '0.75rem', fontSize: '12px', color: '#94A3B8' }}>
        {finalRows.length} enregistrement{finalRows.length > 1 ? 's' : ''} · Periode du {new Date(dateFrom).toLocaleDateString('fr-MA')} au {new Date(dateTo).toLocaleDateString('fr-MA')}
      </div>
    </div>
  )
}