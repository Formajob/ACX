'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

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

function formatDuration(ms: number) {
  if (!ms || ms < 0) return '-'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h${String(m).padStart(2, '0')}`
}

function getWorkDuration(events: Event[]) {
  const arrive = events.find(e => e.event_type === 'arrive')
  const depart = events.find(e => e.event_type === 'depart')
  if (!arrive) return null
  const start = new Date(arrive.timestamp).getTime()
  const end = depart ? new Date(depart.timestamp).getTime() : null
  if (!end) return null
  let pauseTime = 0
  events.filter(e => e.event_type === 'pause_debut').forEach(p => {
    const pStart = new Date(p.timestamp).getTime()
    const pEnd = events.find(e => e.event_type === 'pause_fin' && new Date(e.timestamp) > new Date(p.timestamp))
    if (pEnd) pauseTime += new Date(pEnd.timestamp).getTime() - pStart
  })
  return end - start - pauseTime
}

function getArriveTime(events: Event[]) {
  const e = events.find(e => e.event_type === 'arrive')
  return e ? new Date(e.timestamp).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' }) : '-'
}

function getDepartTime(events: Event[]) {
  const e = events.find(e => e.event_type === 'depart')
  return e ? new Date(e.timestamp).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' }) : '-'
}

export default function RapportPointage({ teachers }: Props) {
  const supabase = createClient()
  const router = useRouter()

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
  const [editNote, setEditNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function fetchData() {
    setLoading(true)
    let query = supabase
      .from('teacher_attendance')
      .select('*, users(full_name), teacher_attendance_events(*)')
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('date', { ascending: false })

    const { data } = await query
    setAttendances(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filtered = attendances.filter(a => {
    const matchTeacher = filterTeacher === 'tous' || a.teacher_id === filterTeacher
    const matchStatus = filterStatus === 'tous' || a.status === filterStatus
    return matchTeacher && matchStatus
  })

  // Ajouter les absents (profs sans pointage sur la période)
  const allDates: string[] = []
  const start = new Date(dateFrom)
  const end = new Date(dateTo)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0) allDates.push(d.toISOString().split('T')[0])
  }

  const tableRows: Array<{
    id: string | null
    teacher_id: string
    teacher_name: string
    date: string
    status: string
    arrive: string
    depart: string
    duration: string | null
    pauses: number
    reunions: number
    events: Event[]
    isAbsent: boolean
  }> = []

  if (filterTeacher !== 'tous') {
    const teacher = teachers.find(t => t.id === filterTeacher)
    if (teacher) {
      allDates.forEach(date => {
        const att = filtered.find(a => a.teacher_id === filterTeacher && a.date === date)
        if (att) {
          const evts = att.teacher_attendance_events ?? []
          const dur = getWorkDuration(evts)
          tableRows.push({
            id: att.id,
            teacher_id: teacher.id,
            teacher_name: teacher.full_name,
            date,
            status: att.status,
            arrive: getArriveTime(evts),
            depart: getDepartTime(evts),
            duration: dur ? formatDuration(dur) : '-',
            pauses: evts.filter(e => e.event_type === 'pause_debut').length,
            reunions: evts.filter(e => e.event_type === 'reunion_debut').length,
            events: evts,
            isAbsent: false,
          })
        } else {
          tableRows.push({
            id: null,
            teacher_id: teacher.id,
            teacher_name: teacher.full_name,
            date,
            status: 'absent',
            arrive: '-',
            depart: '-',
            duration: '-',
            pauses: 0,
            reunions: 0,
            events: [],
            isAbsent: true,
          })
        }
      })
    }
  } else {
    filtered.forEach(att => {
      const evts = att.teacher_attendance_events ?? []
      const dur = getWorkDuration(evts)
      tableRows.push({
        id: att.id,
        teacher_id: att.teacher_id,
        teacher_name: att.users?.full_name ?? '-',
        date: att.date,
        status: att.status,
        arrive: getArriveTime(evts),
        depart: getDepartTime(evts),
        duration: dur ? formatDuration(dur) : '-',
        pauses: evts.filter(e => e.event_type === 'pause_debut').length,
        reunions: evts.filter(e => e.event_type === 'reunion_debut').length,
        events: evts,
        isAbsent: false,
      })
    })
  }

  const finalRows = tableRows.filter(r => filterStatus === 'tous' || r.status === filterStatus)

  // Stats résumé
  const stats = {
    total: finalRows.length,
    presents: finalRows.filter(r => r.status === 'present').length,
    retards: finalRows.filter(r => r.status === 'late').length,
    absents: finalRows.filter(r => r.status === 'absent').length,
  }

  async function handleSaveEdit(row: typeof tableRows[0]) {
    setSaving(true)
    if (row.id) {
      await supabase
        .from('teacher_attendance')
        .update({ status: editStatus })
        .eq('id', row.id)
    } else {
      const { data: userProfile } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', row.teacher_id)
        .single()

      await supabase.from('teacher_attendance').insert({
        teacher_id: row.teacher_id,
        school_id: userProfile!.school_id,
        date: row.date,
        status: editStatus,
      })
    }
    setEditingId(null)
    setSaving(false)
    fetchData()
  }

  async function exportExcel() {
    const XLSX = await import('xlsx')
    const data = [
      ['Professeur', 'Date', 'Statut', 'Arrivee', 'Depart', 'Temps effectif', 'Pauses', 'Reunions'],
      ...finalRows.map(r => [
        r.teacher_name,
        new Date(r.date).toLocaleDateString('fr-MA'),
        STATUS_CONFIG[r.status]?.label ?? r.status,
        r.arrive,
        r.depart,
        r.duration ?? '-',
        r.pauses,
        r.reunions,
      ])
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pointage')

    ws['!cols'] = [{ wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 8 }, { wch: 10 }]

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

    doc.setFontSize(10)
    doc.text(`Presents: ${stats.presents}  |  En retard: ${stats.retards}  |  Absents: ${stats.absents}  |  Total: ${stats.total}`, 14, 38)

    autoTable(doc, {
      startY: 44,
      head: [['Professeur', 'Date', 'Statut', 'Arrivee', 'Depart', 'Temps effectif', 'Pauses', 'Reunions']],
      body: finalRows.map(r => [
        r.teacher_name,
        new Date(r.date).toLocaleDateString('fr-MA'),
        STATUS_CONFIG[r.status]?.label ?? r.status,
        r.arrive,
        r.depart,
        r.duration ?? '-',
        r.pauses > 0 ? r.pauses + ' pause(s)' : '-',
        r.reunions > 0 ? r.reunions + ' reunion(s)' : '-',
      ]),
      styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data: any) => {
        if (data.column.index === 2 && data.section === 'body') {
          const val = data.cell.text[0]
          if (val === 'Present')   { data.cell.styles.textColor = [22, 101, 52] }
          if (val === 'En retard') { data.cell.styles.textColor = [146, 64, 14] }
          if (val === 'Absent')    { data.cell.styles.textColor = [220, 38, 38] }
        }
      },
    })

    doc.save(`rapport-pointage-${dateFrom}-${dateTo}.pdf`)
  }

  const inputStyle = {
    padding: '8px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: 'DM Sans, sans-serif',
    outline: 'none',
    color: '#1E293B',
    background: '#fff',
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
          <button
            onClick={fetchData}
            style={{ padding: '8px 18px', border: 'none', borderRadius: '8px', background: '#2563EB', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            <i className="ti ti-search" /> Filtrer
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button
              onClick={exportExcel}
              style={{ padding: '8px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', color: '#166534', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <i className="ti ti-file-spreadsheet" /> Excel
            </button>
            <button
              onClick={exportPDF}
              style={{ padding: '8px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', color: '#DC2626', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <i className="ti ti-file-type-pdf" /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Stats résumé */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.25rem' }}>
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
              {dateFrom === dateTo ? 'Aujourd\'hui' : 'Periode'}
            </div>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px' }}>
            Chargement...
          </div>
        ) : finalRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px' }}>
            <i className="ti ti-clipboard-off" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
            Aucun enregistrement pour cette periode
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Professeur', 'Date', 'Statut', 'Arrivee', 'Depart', 'Temps effectif', 'Pauses', 'Reunions', 'Modifier'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'left', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {finalRows.map((row, index) => {
                const isEditing = editingId === (row.id ?? row.date + row.teacher_id)
                const statusCfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.absent
                return (
                  <tr
                    key={row.id ?? row.date + row.teacher_id}
                    style={{ borderBottom: index < finalRows.length - 1 ? '1px solid #F1F5F9' : 'none', background: row.isAbsent ? '#FFFAFA' : isEditing ? '#F0F9FF' : 'transparent' }}
                  >
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
                        <select
                          value={editStatus}
                          onChange={e => setEditStatus(e.target.value)}
                          style={{ padding: '4px 8px', border: '1px solid #2563EB', borderRadius: '6px', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
                        >
                          <option value="present">Present</option>
                          <option value="late">En retard</option>
                          <option value="absent">Absent</option>
                        </select>
                      ) : (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: statusCfg.bg, color: statusCfg.color }}>
                          {statusCfg.label}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: '#475569' }}>{row.arrive}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: '#475569' }}>{row.depart}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{row.duration ?? '-'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: '#475569' }}>
                      {row.pauses > 0 ? (
                        <span style={{ background: '#FFFBEB', color: '#92400E', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 500 }}>
                          {row.pauses}x
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: '#475569' }}>
                      {row.reunions > 0 ? (
                        <span style={{ background: '#F5F3FF', color: '#4C1D95', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 500 }}>
                          {row.reunions}x
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => handleSaveEdit(row)}
                            disabled={saving}
                            style={{ padding: '4px 10px', border: 'none', borderRadius: '6px', background: '#2563EB', color: '#fff', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                          >
                            {saving ? '...' : 'OK'}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{ padding: '4px 8px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', color: '#64748B', fontSize: '12px', cursor: 'pointer' }}
                          >
                            <i className="ti ti-x" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(row.id ?? row.date + row.teacher_id)
                            setEditStatus(row.status)
                            setEditNote('')
                          }}
                          style={{ padding: '4px 10px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', color: '#2563EB', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
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