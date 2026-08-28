'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface Observation {
  id: string
  week_start: string
  note: number
  behavior: string
  malus: number
  malus_reason: string | null
  comment: string | null
  users: { full_name: string } | null
  subjects: { name: string } | null
}

interface Props {
  studentId: string
  readOnly?: boolean
  classId?: string
  teacherId?: string
  subjectId?: string
  subjectName?: string
  parentPhone?: string
  studentName?: string
  schoolName?: string
}

const BEHAVIOR_CONFIG: Record<string, { label: string; bg: string; color: string; icon: string; val: number }> = {
  excellent: { label: 'Excellent',   bg: '#DCFCE7', color: '#166534', icon: 'ti-star-filled', val: 4 },
  good:      { label: 'Bien',        bg: '#EFF6FF', color: '#1E3A8A', icon: 'ti-thumb-up',    val: 3 },
  average:   { label: 'Passable',    bg: '#FEF3C7', color: '#92400E', icon: 'ti-minus',        val: 2 },
  poor:      { label: 'Insuffisant', bg: '#FEF2F2', color: '#DC2626', icon: 'ti-thumb-down',   val: 1 },
}

function NoteGauge({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const pct = (value / 10) * 100
  const color = value >= 8 ? '#10B981' : value >= 6 ? '#2563EB' : value >= 4 ? '#F59E0B' : '#EF4444'
  const sizes = { sm: 48, md: 64, lg: 80 }
  const r = sizes[size]
  const fontSize = { sm: '16px', md: '20px', lg: '26px' }
  const subFontSize = { sm: '9px', md: '10px', lg: '12px' }

  const circumference = 2 * Math.PI * (r / 2 - 8)
  const strokeDash = (pct / 100) * circumference

  return (
    <div style={{ position: 'relative', width: r, height: r }}>
      <svg width={r} height={r} viewBox={`0 0 ${r} ${r}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={r/2} cy={r/2} r={r/2 - 8} fill="none" stroke="#F1F5F9" strokeWidth="6" />
        <circle cx={r/2} cy={r/2} r={r/2 - 8} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${strokeDash} ${circumference}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
        <div style={{ fontSize: fontSize[size], fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: subFontSize[size], color: '#94A3B8' }}>/10</div>
      </div>
    </div>
  )
}

function MiniChart({ data }: { data: { week: string; note: number; subject: string }[] }) {
  if (data.length < 2) return null
  const max = 10
  const w = 280
  const h = 80
  const padX = 10
  const padY = 10
  const chartW = w - padX * 2
  const chartH = h - padY * 2

  // Group by subject for colors
  const subjects = [...new Set(data.map(d => d.subject))]
  const subjectColors: Record<string, string> = {
    [subjects[0]]: '#2563EB',
    [subjects[1]]: '#10B981',
    [subjects[2]]: '#F59E0B',
    [subjects[3]]: '#EF4444',
    [subjects[4]]: '#7C3AED',
  }

  // Group by subject
  const bySubject: Record<string, typeof data> = {}
  data.forEach(d => {
    if (!bySubject[d.subject]) bySubject[d.subject] = []
    bySubject[d.subject].push(d)
  })

  // Unique weeks sorted
  const weeks = [...new Set(data.map(d => d.week))].sort()

  return (
    <div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
        Évolution des notes
      </div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {/* Grid */}
        {[0, 2, 4, 6, 8, 10].map(v => {
          const y = padY + chartH - (v / max) * chartH
          return (
            <g key={v}>
              <line x1={padX} y1={y} x2={w - padX} y2={y} stroke="#F1F5F9" strokeWidth="1" />
              <text x={padX - 2} y={y + 3} fontSize="7" fill="#94A3B8" textAnchor="end">{v}</text>
            </g>
          )
        })}

        {/* Lines per subject */}
        {Object.entries(bySubject).map(([subj, pts]) => {
          const sortedPts = [...pts].sort((a, b) => a.week.localeCompare(b.week))
          const color = subjectColors[subj] ?? '#94A3B8'
          const points = sortedPts.map((d, i) => {
            const weekIdx = weeks.indexOf(d.week)
            const x = padX + (weekIdx / Math.max(weeks.length - 1, 1)) * chartW
            const y = padY + chartH - (d.note / max) * chartH
            return `${x},${y}`
          }).join(' ')

          return (
            <g key={subj}>
              <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {sortedPts.map((d, i) => {
                const weekIdx = weeks.indexOf(d.week)
                const x = padX + (weekIdx / Math.max(weeks.length - 1, 1)) * chartW
                const y = padY + chartH - (d.note / max) * chartH
                return <circle key={i} cx={x} cy={y} r="3" fill={color} />
              })}
            </g>
          )
        })}
      </svg>

      {/* Légende */}
      {subjects.length > 1 && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
          {subjects.map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B' }}>
              <div style={{ width: '12px', height: '3px', borderRadius: '2px', background: subjectColors[s] ?? '#94A3B8' }} />
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ObservationsView({
  studentId, readOnly = true,
  classId, teacherId, subjectId, subjectName,
  studentName, schoolName
}: Props) {
  const supabase = createClient()
  const [observations, setObservations] = useState<Observation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    week_start: getMonday(new Date()),
    note: 7,
    behavior: 'good',
    malus: 0,
    malus_reason: '',
    comment: '',
  })

  function getMonday(date: Date) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    return d.toISOString().split('T')[0]
  }

  useEffect(() => { loadObservations() }, [studentId])

  async function loadObservations() {
    const { data } = await supabase
      .from('student_observations')
      .select('*, users(full_name), subjects(name)')
      .eq('student_id', studentId)
      .order('week_start', { ascending: false })
    setObservations(data ?? [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!classId || !teacherId) return
    setSaving(true)
    setError('')
    setSuccess('')

    const stored = localStorage.getItem('acx_user')
    if (!stored) return
    const user = JSON.parse(stored)

    const { error: err } = await supabase
      .from('student_observations')
      .upsert({
        student_id:  studentId,
        class_id:    classId,
        teacher_id:  teacherId,
        subject_id:  subjectId || null,
        school_id:   user.school_id,
        week_start:  form.week_start,
        note:        form.note,
        behavior:    form.behavior,
        malus:       form.malus,
        malus_reason:form.malus_reason || null,
        comment:     form.comment || null,
      }, { onConflict: 'student_id,class_id,teacher_id,subject_id,week_start' })

    if (err) { setError('Erreur: ' + err.message); setSaving(false); return }
    setSuccess('Observation enregistrée')
    setShowForm(false)
    setSaving(false)
    setForm({ week_start: getMonday(new Date()), note: 7, behavior: 'good', malus: 0, malus_reason: '', comment: '' })
    loadObservations()
  }

  // Données pour le graphique
  const chartData = [...observations]
    .sort((a, b) => a.week_start.localeCompare(b.week_start))
    .map(o => ({
      week:    o.week_start,
      note:    o.note,
      subject: o.subjects?.name ?? 'Général',
    }))

  // Stats agrégées
  const avgNote   = observations.length > 0 ? (observations.reduce((s, o) => s + o.note, 0) / observations.length).toFixed(1) : null
  const totalMalus = observations.reduce((s, o) => s + o.malus, 0)
  const lastObs    = observations[0]
  const prevObs    = observations[1]
  const trend      = lastObs && prevObs
    ? lastObs.note > prevObs.note ? 'up' : lastObs.note < prevObs.note ? 'down' : 'stable'
    : null

  // Group by week for display
  const byWeek: Record<string, Observation[]> = {}
  observations.forEach(o => {
    if (!byWeek[o.week_start]) byWeek[o.week_start] = []
    byWeek[o.week_start].push(o)
  })
  const weeksSorted = Object.keys(byWeek).sort((a, b) => b.localeCompare(a))

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0',
    borderRadius: '8px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
    outline: 'none', color: '#1E293B', background: '#fff', boxSizing: 'border-box',
  }

  if (loading) return <div style={{ padding: '1rem', color: '#94A3B8', fontSize: '13px' }}>Chargement...</div>

  return (
    <div>
      {/* Résumé global */}
      {observations.length > 0 && (
        <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {avgNote && <NoteGauge value={parseFloat(avgNote)} size="lg" />}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Moyenne générale</div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {trend === 'up'     && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', background: '#DCFCE7', color: '#166534', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}><i className="ti ti-trending-up" />En progression</span>}
                {trend === 'down'   && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', background: '#FEF2F2', color: '#DC2626', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}><i className="ti ti-trending-down" />En baisse</span>}
                {trend === 'stable' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', background: '#FEF3C7', color: '#92400E', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}><i className="ti ti-minus" />Stable</span>}
                {totalMalus > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', background: '#FEF2F2', color: '#DC2626', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}><i className="ti ti-alert-triangle" />{totalMalus} malus</span>}
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                {observations.length} observation{observations.length > 1 ? 's' : ''} · {weeksSorted.length} semaine{weeksSorted.length > 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <MiniChart data={chartData} />
        </div>
      )}

      {/* Bouton ajouter */}
      {!readOnly && (
        <div style={{ marginBottom: '1rem' }}>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: 'none', borderRadius: '8px', background: '#2563EB', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            <i className={'ti ' + (showForm ? 'ti-x' : 'ti-plus')} />
            {showForm ? 'Annuler' : 'Ajouter une observation' + (subjectName ? ' — ' + subjectName : '')}
          </button>
        </div>
      )}

      {/* Formulaire */}
      {!readOnly && showForm && (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
          {subjectName && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#EFF6FF', color: '#2563EB', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, marginBottom: '1rem' }}>
              <i className="ti ti-book" /> {subjectName}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px' }}>Semaine du</label>
              <input type="date" value={form.week_start} onChange={e => setForm(p => ({ ...p, week_start: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px' }}>Comportement</label>
              <select value={form.behavior} onChange={e => setForm(p => ({ ...p, behavior: e.target.value }))} style={inputStyle}>
                <option value="excellent">Excellent</option>
                <option value="good">Bien</option>
                <option value="average">Passable</option>
                <option value="poor">Insuffisant</option>
              </select>
            </div>
          </div>

          {/* Note /10 */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '8px' }}>
              Note globale &nbsp;
              <span style={{ fontWeight: 700, fontSize: '16px', color: form.note >= 8 ? '#10B981' : form.note >= 6 ? '#2563EB' : form.note >= 4 ? '#F59E0B' : '#EF4444' }}>
                {form.note}/10
              </span>
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => {
                const color = v >= 8 ? '#10B981' : v >= 6 ? '#2563EB' : v >= 4 ? '#F59E0B' : '#EF4444'
                const isSelected = v <= form.note
                return (
                  <button
                    key={v}
                    onClick={() => setForm(p => ({ ...p, note: v }))}
                    style={{ width: '34px', height: '34px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: isSelected ? color : '#E2E8F0', color: isSelected ? '#fff' : '#94A3B8', fontWeight: 600, fontSize: '13px', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.1s' }}
                  >
                    {v}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Malus */}
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px' }}>Malus</label>
              <input type="number" min="0" max="10" value={form.malus} onChange={e => setForm(p => ({ ...p, malus: parseInt(e.target.value) || 0 }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px' }}>Motif</label>
              <input type="text" value={form.malus_reason} onChange={e => setForm(p => ({ ...p, malus_reason: e.target.value }))} placeholder="Bavardage, devoir non rendu..." style={inputStyle} disabled={form.malus === 0} />
            </div>
          </div>

          {/* Commentaire */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px' }}>Commentaire</label>
            <textarea value={form.comment} onChange={e => setForm(p => ({ ...p, comment: e.target.value }))} rows={3} placeholder="Observations, points positifs, axes d'amélioration..." style={{ ...inputStyle, resize: 'vertical' as const }} />
          </div>

          {error && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '10px' }}>{error}</div>}
          {success && <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '10px' }}>{success}</div>}

          <button onClick={handleSubmit} disabled={saving} style={{ padding: '9px 20px', border: 'none', borderRadius: '8px', background: saving ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      )}

      {/* Observations groupées par semaine */}
      {weeksSorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8', fontSize: '13px', background: '#F8FAFC', borderRadius: '10px' }}>
          <i className="ti ti-note-off" style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }} />
          Aucune observation enregistrée
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {weeksSorted.map((week, wi) => {
            const weekObs = byWeek[week]
            const weekEnd = new Date(week)
            weekEnd.setDate(weekEnd.getDate() + 4)
            const avgWeekNote = weekObs.reduce((s, o) => s + o.note, 0) / weekObs.length
            const prevWeek = weeksSorted[wi + 1]
            const prevWeekObs = prevWeek ? byWeek[prevWeek] : null
            const prevAvg = prevWeekObs ? prevWeekObs.reduce((s, o) => s + o.note, 0) / prevWeekObs.length : null
            const weekTrend = prevAvg !== null ? (avgWeekNote > prevAvg ? 'up' : avgWeekNote < prevAvg ? 'down' : 'stable') : null

            return (
              <div key={week} style={{ background: '#fff', border: '1px solid ' + (wi === 0 ? '#BFDBFE' : '#E2E8F0'), borderRadius: '12px', overflow: 'hidden' }}>
                {/* Header semaine */}
                <div style={{ background: wi === 0 ? '#EFF6FF' : '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {wi === 0 && <span style={{ fontSize: '10px', background: '#2563EB', color: '#fff', padding: '1px 8px', borderRadius: '10px', fontWeight: 600 }}>Dernière semaine</span>}
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                      Semaine du {new Date(week).toLocaleDateString('fr-MA', { day: 'numeric', month: 'long' })} au {weekEnd.toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {weekTrend === 'up'     && <span style={{ fontSize: '11px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '3px' }}><i className="ti ti-arrow-up" /> +{(avgWeekNote - prevAvg!).toFixed(1)}</span>}
                    {weekTrend === 'down'   && <span style={{ fontSize: '11px', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '3px' }}><i className="ti ti-arrow-down" /> {(avgWeekNote - prevAvg!).toFixed(1)}</span>}
                    {weekTrend === 'stable' && <span style={{ fontSize: '11px', color: '#94A3B8' }}>=</span>}
                    <NoteGauge value={Math.round(avgWeekNote)} size="sm" />
                    <span style={{ fontSize: '11px', color: '#64748B' }}>moy. semaine</span>
                  </div>
                </div>

                {/* Observations par matière */}
                <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {weekObs.map(obs => {
                    const bCfg = BEHAVIOR_CONFIG[obs.behavior] ?? BEHAVIOR_CONFIG.good
                    return (
                      <div key={obs.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'start', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                        <NoteGauge value={obs.note} size="sm" />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                            {obs.subjects?.name && (
                              <span style={{ fontSize: '11px', background: '#EFF6FF', color: '#1E3A8A', padding: '1px 8px', borderRadius: '10px', fontWeight: 600 }}>
                                <i className="ti ti-book" style={{ marginRight: '3px' }} />{obs.subjects.name}
                              </span>
                            )}
                            <span style={{ fontSize: '11px', background: bCfg.bg, color: bCfg.color, padding: '1px 8px', borderRadius: '10px', fontWeight: 500 }}>
                              <i className={'ti ' + bCfg.icon} style={{ marginRight: '3px' }} />{bCfg.label}
                            </span>
                            {obs.malus > 0 && (
                              <span style={{ fontSize: '11px', background: '#FEF2F2', color: '#DC2626', padding: '1px 8px', borderRadius: '10px', fontWeight: 600 }}>
                                <i className="ti ti-alert-triangle" style={{ marginRight: '3px' }} />{obs.malus} malus {obs.malus_reason ? '· ' + obs.malus_reason : ''}
                              </span>
                            )}
                          </div>
                          {obs.comment && (
                            <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', lineHeight: 1.5 }}>
                              "{obs.comment}"
                            </div>
                          )}
                          {obs.users && (
                            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>
                              <i className="ti ti-user" style={{ marginRight: '3px' }} />{obs.users.full_name}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}