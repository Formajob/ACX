'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

const COLORS = [
  { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E3A8A' },
  { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
  { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' },
  { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
  { bg: '#F5F3FF', border: '#DDD6FE', text: '#4C1D95' },
  { bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412' },
  { bg: '#F0FDF4', border: '#BBF7D0', text: '#14532D' },
  { bg: '#FDF2F8', border: '#FBCFE8', text: '#831843' },
]

interface Classe  { id: string; name: string; level: string }
interface Subject { id: string; name: string; coefficient: number }
interface Teacher { id: string; full_name: string }
interface Slot {
  id: string
  class_id: string
  subject_id: string
  teacher_id: string | null
  day_of_week: number
  start_time: string
  end_time: string
  room: string | null
  classes:  { name: string; level: string } | null
  subjects: { name: string } | null
  users:    { full_name: string } | null
}

export default function EmploisPage() {
  const supabase = createClient()
  const router = useRouter()

  const [classes,  setClasses]  = useState<Classe[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [slots,    setSlots]    = useState<Slot[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  // Vue
  const [viewMode,       setViewMode]       = useState<'classe' | 'prof'>('classe')
  const [selectedClass,  setSelectedClass]  = useState('')
  const [selectedTeacher,setSelectedTeacher]= useState('')
  const [tab,            setTab]            = useState<'grille' | 'ajouter'>('grille')

  // Formulaire
  const [form, setForm] = useState({
    class_id:    '',
    subject_id:  '',
    teacher_id:  '',
    day_of_week: '1',
    start_time:  '08:00',
    end_time:    '10:00',
    room:        '',
  })

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    loadData(user.school_id)
  }, [])

  async function loadData(schoolId: string) {
    const [{ data: cls }, { data: subs }, { data: tchs }, { data: slotsData }] = await Promise.all([
      supabase.from('classes').select('id, name, level').eq('school_id', schoolId).order('level').order('name'),
      supabase.from('subjects').select('id, name, coefficient').eq('school_id', schoolId).order('name'),
      supabase.from('users').select('id, full_name').eq('school_id', schoolId).eq('role', 'teacher').order('full_name'),
      supabase.from('timetable_slots')
        .select('*, classes(name, level), subjects(name), users(full_name)')
        .in('class_id', (await supabase.from('classes').select('id').eq('school_id', schoolId)).data?.map(c => c.id) ?? [])
        .order('day_of_week').order('start_time'),
    ])
    setClasses(cls ?? [])
    setSubjects(subs ?? [])
    setTeachers(tchs ?? [])
    setSlots(slotsData ?? [])
    if (cls && cls.length > 0) setSelectedClass(cls[0].id)
    if (tchs && tchs.length > 0) setSelectedTeacher(tchs[0].id)
    setLoading(false)
  }

  async function handleAddSlot() {
    if (!form.class_id || !form.subject_id) { setError('Classe et matière sont obligatoires'); return }
    if (form.start_time >= form.end_time)   { setError('L\'heure de fin doit être après l\'heure de début'); return }
    setSaving(true); setError(''); setSuccess('')

    const { error: err } = await supabase.from('timetable_slots').insert({
      class_id:    form.class_id,
      subject_id:  form.subject_id,
      teacher_id:  form.teacher_id || null,
      day_of_week: parseInt(form.day_of_week),
      start_time:  form.start_time,
      end_time:    form.end_time,
      room:        form.room || null,
    })

    if (err) { setError('Erreur: ' + err.message); setSaving(false); return }
    setSuccess('Créneau ajouté')
    setForm(p => ({ ...p, room: '' }))
    setSaving(false)
    const stored = localStorage.getItem('acx_user')
    if (stored) loadData(JSON.parse(stored).school_id)
    setTimeout(() => { setSuccess(''); setTab('grille') }, 1000)
  }

  async function handleDeleteSlot(id: string) {
    if (!confirm('Supprimer ce créneau ?')) return
    await supabase.from('timetable_slots').delete().eq('id', id)
    const stored = localStorage.getItem('acx_user')
    if (stored) loadData(JSON.parse(stored).school_id)
  }

  // Filtrer les slots selon la vue
  const visibleSlots = slots.filter(s => {
    if (viewMode === 'classe')  return s.class_id   === selectedClass
    if (viewMode === 'prof')    return s.teacher_id  === selectedTeacher
    return true
  })

  function getSlot(day: number, hour: string) {
    return visibleSlots.find(s =>
      s.day_of_week === day + 1 &&
      s.start_time?.slice(0, 5) === hour
    )
  }

  // Couleur par matière
  const subjectColorMap: Record<string, number> = {}
  let colorIdx = 0
  visibleSlots.forEach(s => {
    if (!(s.subject_id in subjectColorMap)) {
      subjectColorMap[s.subject_id] = colorIdx % COLORS.length
      colorIdx++
    }
  })

  function getColor(subjectId: string) {
    return COLORS[subjectColorMap[subjectId] ?? 0]
  }

  // Stats
  const totalSlots    = visibleSlots.length
  const totalHeures   = visibleSlots.reduce((s, slot) => {
    const [sh, sm] = slot.start_time.split(':').map(Number)
    const [eh, em] = slot.end_time.split(':').map(Number)
    return s + (eh * 60 + em - sh * 60 - sm) / 60
  }, 0)
  const uniqueSubjects = [...new Set(visibleSlots.map(s => s.subject_id))].length
  const uniqueDays     = [...new Set(visibleSlots.map(s => s.day_of_week))].length

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

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
            Emplois du temps
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
            {slots.length} créneau{slots.length > 1 ? 'x' : ''} configuré{slots.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setTab(tab === 'grille' ? 'ajouter' : 'grille')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#2563EB', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >
          <i className={tab === 'grille' ? 'ti ti-plus' : 'ti ti-calendar'} />
          {tab === 'grille' ? 'Ajouter un créneau' : 'Voir la grille'}
        </button>
      </div>

      {/* Sélecteur vue + filtre */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Toggle classe / prof */}
        <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', padding: '4px', borderRadius: '10px' }}>
          {([
            { key: 'classe', label: 'Par classe', icon: 'ti-school' },
            { key: 'prof',   label: 'Par prof',   icon: 'ti-user'   },
          ] as const).map(v => (
            <button key={v.key} onClick={() => setViewMode(v.key)} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', background: viewMode === v.key ? '#fff' : 'transparent', color: viewMode === v.key ? '#1E293B' : '#64748B', boxShadow: viewMode === v.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              <i className={'ti ' + v.icon} style={{ fontSize: '13px' }} /> {v.label}
            </button>
          ))}
        </div>

        {/* Filtre classe ou prof */}
        {viewMode === 'classe' ? (
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: '180px' }}>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.level}</option>)}
          </select>
        ) : (
          <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: '200px' }}>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
        )}
      </div>

      {/* Stats rapides */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.25rem' }}>
        {[
          { label: 'Créneaux',     value: totalSlots,                        color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Heures/sem',   value: totalHeures.toFixed(0) + 'h',     color: '#10B981', bg: '#ECFDF5' },
          { label: 'Matières',     value: uniqueSubjects,                    color: '#7C3AED', bg: '#F5F3FF' },
          { label: 'Jours actifs', value: uniqueDays + '/6',                 color: '#F59E0B', bg: '#FFFBEB' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ══ TAB GRILLE ══ */}
      {tab === 'grille' && (
        <div>
          {visibleSlots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#94A3B8', fontSize: '14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
              <i className="ti ti-calendar-off" style={{ fontSize: '36px', display: 'block', marginBottom: '10px' }} />
              Aucun créneau configuré pour cette {viewMode === 'classe' ? 'classe' : 'professeur'}
              <br />
              <button onClick={() => setTab('ajouter')} style={{ marginTop: '12px', padding: '8px 18px', border: 'none', borderRadius: '8px', background: '#2563EB', color: '#fff', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                Ajouter un créneau
              </button>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'left', borderBottom: '1px solid #E2E8F0', width: '70px' }}>
                      Heure
                    </th>
                    {DAYS.map((day, di) => {
                      const daySlots = visibleSlots.filter(s => s.day_of_week === di + 1)
                      return (
                        <th key={day} style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 500, color: daySlots.length > 0 ? '#1E293B' : '#94A3B8', textAlign: 'center', borderBottom: '1px solid #E2E8F0' }}>
                          {day}
                          {daySlots.length > 0 && (
                            <div style={{ fontSize: '10px', fontWeight: 400, color: '#94A3B8', marginTop: '2px' }}>
                              {daySlots.length} créneau{daySlots.length > 1 ? 'x' : ''}
                            </div>
                          )}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {HOURS.map((hour, hi) => (
                    <tr key={hour} style={{ borderBottom: hi < HOURS.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                      <td style={{ padding: '6px 14px', fontSize: '12px', color: '#94A3B8', fontWeight: 500, whiteSpace: 'nowrap' as const }}>
                        {hour}
                      </td>
                      {DAYS.map((_, di) => {
                        const slot = getSlot(di, hour)
                        const color = slot ? getColor(slot.subject_id) : null
                        return (
                          <td key={di} style={{ padding: '4px 6px', minWidth: '120px', verticalAlign: 'top' }}>
                            {slot ? (
                              <div
                                style={{ background: color?.bg, border: '1px solid ' + color?.border, borderRadius: '8px', padding: '6px 8px', position: 'relative', cursor: 'default' }}
                                title={`${slot.subjects?.name} — ${slot.start_time?.slice(0, 5)} à ${slot.end_time?.slice(0, 5)}`}
                              >
                                <div style={{ fontSize: '12px', fontWeight: 600, color: color?.text }}>
                                  {slot.subjects?.name}
                                </div>
                                {viewMode === 'classe' && slot.users && (
                                  <div style={{ fontSize: '10px', color: color?.text, opacity: 0.8, marginTop: '1px' }}>
                                    {slot.users.full_name}
                                  </div>
                                )}
                                {viewMode === 'prof' && slot.classes && (
                                  <div style={{ fontSize: '10px', color: color?.text, opacity: 0.8, marginTop: '1px' }}>
                                    {slot.classes.name}
                                  </div>
                                )}
                                <div style={{ fontSize: '10px', color: color?.text, opacity: 0.7, marginTop: '1px' }}>
                                  {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                                  {slot.room && ' · ' + slot.room}
                                </div>
                                <button
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  style={{ position: 'absolute', top: '4px', right: '4px', width: '16px', height: '16px', border: 'none', borderRadius: '4px', background: 'rgba(0,0,0,0.1)', color: color?.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', opacity: 0, transition: 'opacity 0.15s' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0'}
                                >
                                  <i className="ti ti-x" />
                                </button>
                              </div>
                            ) : (
                              <div style={{ height: '52px' }} />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Légende matières */}
          {Object.keys(subjectColorMap).length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.entries(subjectColorMap).map(([subjectId, colorIndex]) => {
                const subj = subjects.find(s => s.id === subjectId)
                const color = COLORS[colorIndex]
                if (!subj) return null
                return (
                  <div key={subjectId} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#64748B' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: color.bg, border: '1px solid ' + color.border }} />
                    {subj.name}
                  </div>
                )
              })}
            </div>
          )}

          {/* Liste des créneaux */}
          {visibleSlots.length > 0 && (
            <div style={{ marginTop: '14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '13px', fontWeight: 500, color: '#64748B' }}>
                Détail des créneaux ({visibleSlots.length})
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    {['Jour', 'Matière', viewMode === 'classe' ? 'Professeur' : 'Classe', 'Horaire', 'Salle', 'Action'].map(h => (
                      <th key={h} style={{ padding: '9px 14px', fontSize: '11px', fontWeight: 500, color: '#64748B', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleSlots.map((slot, index) => {
                    const color = getColor(slot.subject_id)
                    return (
                      <tr key={slot.id} style={{ borderBottom: index < visibleSlots.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                        <td style={{ padding: '9px 14px', fontSize: '13px', color: '#1E293B', fontWeight: 500 }}>
                          {DAYS[slot.day_of_week - 1]}
                        </td>
                        <td style={{ padding: '9px 14px' }}>
                          <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '10px', background: color.bg, color: color.text, fontWeight: 500 }}>
                            {slot.subjects?.name}
                          </span>
                        </td>
                        <td style={{ padding: '9px 14px', fontSize: '13px', color: '#475569' }}>
                          {viewMode === 'classe' ? (slot.users?.full_name ?? '—') : (slot.classes?.name ?? '—')}
                        </td>
                        <td style={{ padding: '9px 14px', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' as const }}>
                          {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                        </td>
                        <td style={{ padding: '9px 14px', fontSize: '13px', color: '#475569' }}>
                          {slot.room ?? '—'}
                        </td>
                        <td style={{ padding: '9px 14px' }}>
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', color: '#EF4444', cursor: 'pointer', fontSize: '13px' }}
                          >
                            <i className="ti ti-trash" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB AJOUTER ══ */}
      {tab === 'ajouter' && (
        <div style={{ maxWidth: '560px' }}>
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>
                <i className="ti ti-plus" />
              </div>
              Nouveau créneau
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Classe *</label>
                  <select value={form.class_id} onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))} style={inputStyle}>
                    <option value="">Sélectionnez</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.level}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Matière *</label>
                  <select value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))} style={inputStyle}>
                    <option value="">Sélectionnez</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Professeur</label>
                <select value={form.teacher_id} onChange={e => setForm(p => ({ ...p, teacher_id: e.target.value }))} style={inputStyle}>
                  <option value="">Aucun</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Jour *</label>
                <select value={form.day_of_week} onChange={e => setForm(p => ({ ...p, day_of_week: e.target.value }))} style={inputStyle}>
                  {DAYS.map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Heure de début *</label>
                  <select value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} style={inputStyle}>
                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Heure de fin *</label>
                  <select value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} style={inputStyle}>
                    {['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'].map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Salle (optionnel)</label>
                <input
                  type="text"
                  value={form.room}
                  onChange={e => setForm(p => ({ ...p, room: e.target.value }))}
                  placeholder="Ex: A1, Salle Info, Gymnase..."
                  style={inputStyle}
                />
              </div>

              {error   && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}
              {success && <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>{success}</div>}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setTab('grille')} style={{ flex: 1, padding: '10px', border: '1px solid #E2E8F0', borderRadius: '9px', background: '#fff', color: '#64748B', fontSize: '14px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  Annuler
                </button>
                <button
                  onClick={handleAddSlot}
                  disabled={saving}
                  style={{ flex: 2, padding: '10px', border: 'none', borderRadius: '9px', background: saving ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                >
                  {saving ? 'Enregistrement...' : 'Ajouter le créneau'}
                </button>
              </div>
            </div>
          </div>

          {/* Aperçu des créneaux existants pour la classe sélectionnée */}
          {form.class_id && (
            <div style={{ marginTop: '14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 500, color: '#64748B' }}>
                Créneaux existants — {classes.find(c => c.id === form.class_id)?.name}
              </div>
              {slots.filter(s => s.class_id === form.class_id).length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                  Aucun créneau pour cette classe
                </div>
              ) : (
                slots.filter(s => s.class_id === form.class_id).map((s, i, arr) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 16px', borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none', fontSize: '13px' }}>
                    <span style={{ width: '70px', color: '#64748B', flexShrink: 0 }}>{DAYS[s.day_of_week - 1]}</span>
                    <span style={{ flex: 1, color: '#1E293B', fontWeight: 500 }}>{s.subjects?.name}</span>
                    <span style={{ color: '#94A3B8', fontSize: '12px' }}>{s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}</span>
                    <button
                      onClick={() => handleDeleteSlot(s.id)}
                      style={{ width: '24px', height: '24px', border: '1px solid #E2E8F0', borderRadius: '5px', background: '#fff', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}
                    >
                      <i className="ti ti-x" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}