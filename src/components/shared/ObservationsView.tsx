'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface Observation {
  id: string
  week_start: string
  effort: number
  performance: number
  behavior: string
  malus: number
  malus_reason: string | null
  comment: string | null
  users: { full_name: string } | null
}

interface Props {
  studentId: string
  readOnly?: boolean
  classId?: string
  teacherId?: string
}

const BEHAVIOR_CONFIG: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  excellent: { label: 'Excellent',  bg: '#DCFCE7', color: '#166534', icon: 'ti-star' },
  good:      { label: 'Bien',       bg: '#EFF6FF', color: '#1E3A8A', icon: 'ti-thumb-up' },
  average:   { label: 'Passable',   bg: '#FEF3C7', color: '#92400E', icon: 'ti-minus' },
  poor:      { label: 'Insuffisant',bg: '#FEF2F2', color: '#DC2626', icon: 'ti-thumb-down' },
}

function Stars({ value, max = 5, color = '#2563EB' }: { value: number; max?: number; color?: string }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {Array.from({ length: max }).map((_, i) => (
        <i key={i} className={i < value ? 'ti ti-star-filled' : 'ti ti-star'} style={{ fontSize: '14px', color: i < value ? color : '#E2E8F0' }} />
      ))}
    </div>
  )
}

export default function ObservationsView({ studentId, readOnly = true, classId, teacherId }: Props) {
  const supabase = createClient()
  const [observations, setObservations] = useState<Observation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    week_start: getMonday(new Date()),
    effort: 3,
    performance: 3,
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

  useEffect(() => {
    loadObservations()
  }, [studentId])

  async function loadObservations() {
    const { data } = await supabase
      .from('student_observations')
      .select('*, users(full_name)')
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
        student_id:   studentId,
        class_id:     classId,
        teacher_id:   teacherId,
        school_id:    user.school_id,
        week_start:   form.week_start,
        effort:       form.effort,
        performance:  form.performance,
        behavior:     form.behavior,
        malus:        form.malus,
        malus_reason: form.malus_reason || null,
        comment:      form.comment || null,
      }, { onConflict: 'student_id,class_id,teacher_id,week_start' })

    if (err) { setError('Erreur: ' + err.message); setSaving(false); return }

    setSuccess('Observation enregistree')
    setShowForm(false)
    setSaving(false)
    setForm({ week_start: getMonday(new Date()), effort: 3, performance: 3, behavior: 'good', malus: 0, malus_reason: '', comment: '' })
    loadObservations()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0',
    borderRadius: '8px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
    outline: 'none', color: '#1E293B', background: '#fff', boxSizing: 'border-box',
  }

  if (loading) return <div style={{ padding: '1rem', color: '#94A3B8', fontSize: '13px' }}>Chargement...</div>

  const avgEffort = observations.length > 0 ? (observations.reduce((s, o) => s + o.effort, 0) / observations.length).toFixed(1) : null
  const avgPerf   = observations.length > 0 ? (observations.reduce((s, o) => s + o.performance, 0) / observations.length).toFixed(1) : null
  const totalMalus = observations.reduce((s, o) => s + o.malus, 0)

  const trend = observations.length >= 2
    ? (() => {
        const recent = observations.slice(0, 2)
        const diffEffort = recent[0].effort - recent[1].effort
        const diffPerf   = recent[0].performance - recent[1].performance
        if (diffEffort + diffPerf > 0) return { label: 'En progression', icon: 'ti-trending-up', color: '#166534', bg: '#DCFCE7' }
        if (diffEffort + diffPerf < 0) return { label: 'En baisse', icon: 'ti-trending-down', color: '#DC2626', bg: '#FEF2F2' }
        return { label: 'Stable', icon: 'ti-minus', color: '#92400E', bg: '#FEF3C7' }
      })()
    : null

  return (
    <div>
      {/* Résumé */}
      {observations.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1rem' }}>
          <div style={{ background: '#EFF6FF', borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#1E3A8A', marginBottom: '4px' }}>Moy. effort</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1E3A8A' }}>{avgEffort}<span style={{ fontSize: '12px' }}>/5</span></div>
          </div>
          <div style={{ background: '#ECFDF5', borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#166534', marginBottom: '4px' }}>Moy. performance</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#166534' }}>{avgPerf}<span style={{ fontSize: '12px' }}>/5</span></div>
          </div>
          <div style={{ background: totalMalus > 0 ? '#FEF2F2' : '#F1F5F9', borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: totalMalus > 0 ? '#DC2626' : '#64748B', marginBottom: '4px' }}>Total malus</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: totalMalus > 0 ? '#DC2626' : '#64748B' }}>{totalMalus}</div>
          </div>
          {trend && (
            <div style={{ background: trend.bg, borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: trend.color, marginBottom: '4px' }}>Tendance</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: trend.color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <i className={'ti ' + trend.icon} /> {trend.label}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bouton ajouter */}
      {!readOnly && (
        <div style={{ marginBottom: '1rem' }}>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: 'none', borderRadius: '8px', background: '#2563EB', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            <i className={showForm ? 'ti ti-x' : 'ti ti-plus'} />
            {showForm ? 'Annuler' : 'Ajouter une observation'}
          </button>
        </div>
      )}

      {/* Formulaire */}
      {!readOnly && showForm && (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '1rem' }}>
            Nouvelle observation de la semaine
          </div>

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

          {/* Effort + Performance sliders */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '8px' }}>
                Effort &nbsp;<span style={{ fontWeight: 700, color: '#2563EB' }}>{form.effort}/5</span>
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map(v => (
                  <button key={v} onClick={() => setForm(p => ({ ...p, effort: v }))} style={{ width: '32px', height: '32px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: v <= form.effort ? '#2563EB' : '#E2E8F0', color: v <= form.effort ? '#fff' : '#94A3B8', fontWeight: 600, fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '8px' }}>
                Performance &nbsp;<span style={{ fontWeight: 700, color: '#10B981' }}>{form.performance}/5</span>
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map(v => (
                  <button key={v} onClick={() => setForm(p => ({ ...p, performance: v }))} style={{ width: '32px', height: '32px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: v <= form.performance ? '#10B981' : '#E2E8F0', color: v <= form.performance ? '#fff' : '#94A3B8', fontWeight: 600, fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Malus */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px' }}>Malus disciplinaire</label>
              <input type="number" min="0" max="10" value={form.malus} onChange={e => setForm(p => ({ ...p, malus: parseInt(e.target.value) || 0 }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px' }}>Motif du malus</label>
              <input type="text" value={form.malus_reason} onChange={e => setForm(p => ({ ...p, malus_reason: e.target.value }))} placeholder="Ex: Bavardage, devoir non rendu..." style={inputStyle} disabled={form.malus === 0} />
            </div>
          </div>

          {/* Commentaire */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px' }}>Commentaire</label>
            <textarea value={form.comment} onChange={e => setForm(p => ({ ...p, comment: e.target.value }))} rows={3} placeholder="Observations sur le comportement, la progression, les points a ameliorer..." style={{ ...inputStyle, resize: 'vertical' as const }} />
          </div>

          {error && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '10px' }}>{error}</div>}
          {success && <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '10px' }}>{success}</div>}

          <button onClick={handleSubmit} disabled={saving} style={{ padding: '9px 20px', border: 'none', borderRadius: '8px', background: saving ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      )}

      {/* Liste observations */}
      {observations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8', fontSize: '13px', background: '#F8FAFC', borderRadius: '10px' }}>
          <i className="ti ti-note-off" style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }} />
          Aucune observation enregistree
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {observations.map((obs, index) => {
            const bCfg = BEHAVIOR_CONFIG[obs.behavior]
            const weekEnd = new Date(obs.week_start)
            weekEnd.setDate(weekEnd.getDate() + 4)
            const isFirst = index === 0
            const prevObs = observations[index + 1]
            const effortUp = prevObs ? obs.effort > prevObs.effort : false
            const effortDown = prevObs ? obs.effort < prevObs.effort : false
            const perfUp = prevObs ? obs.performance > prevObs.performance : false
            const perfDown = prevObs ? obs.performance < prevObs.performance : false

            return (
              <div key={obs.id} style={{ background: '#fff', border: '1px solid ' + (isFirst ? '#BFDBFE' : '#E2E8F0'), borderRadius: '12px', padding: '1.25rem', position: 'relative' }}>
                {isFirst && (
                  <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '10px', background: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                    Derniere semaine
                  </div>
                )}

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    Semaine du {new Date(obs.week_start).toLocaleDateString('fr-MA', { day: 'numeric', month: 'long' })} au {weekEnd.toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  {obs.users && <span style={{ fontSize: '11px', color: '#94A3B8' }}>· {obs.users.full_name}</span>}
                </div>

                {/* Métriques */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: obs.comment ? '12px' : '0' }}>
                  <div style={{ textAlign: 'center', padding: '8px', background: '#F8FAFC', borderRadius: '8px' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '6px' }}>Effort</div>
                    <Stars value={obs.effort} color="#2563EB" />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', marginTop: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#2563EB' }}>{obs.effort}/5</span>
                      {effortUp   && <i className="ti ti-arrow-up"   style={{ fontSize: '12px', color: '#10B981' }} />}
                      {effortDown && <i className="ti ti-arrow-down" style={{ fontSize: '12px', color: '#EF4444' }} />}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', background: '#F8FAFC', borderRadius: '8px' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '6px' }}>Performance</div>
                    <Stars value={obs.performance} color="#10B981" />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', marginTop: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#10B981' }}>{obs.performance}/5</span>
                      {perfUp   && <i className="ti ti-arrow-up"   style={{ fontSize: '12px', color: '#10B981' }} />}
                      {perfDown && <i className="ti ti-arrow-down" style={{ fontSize: '12px', color: '#EF4444' }} />}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', background: bCfg.bg, borderRadius: '8px' }}>
                    <div style={{ fontSize: '10px', color: bCfg.color, marginBottom: '6px' }}>Comportement</div>
                    <i className={'ti ' + bCfg.icon} style={{ fontSize: '18px', color: bCfg.color, display: 'block', marginBottom: '3px' }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: bCfg.color }}>{bCfg.label}</span>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', background: obs.malus > 0 ? '#FEF2F2' : '#F1F5F9', borderRadius: '8px' }}>
                    <div style={{ fontSize: '10px', color: obs.malus > 0 ? '#DC2626' : '#64748B', marginBottom: '6px' }}>Malus</div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: obs.malus > 0 ? '#DC2626' : '#94A3B8', lineHeight: 1 }}>{obs.malus}</div>
                    {obs.malus_reason && <div style={{ fontSize: '10px', color: '#DC2626', marginTop: '3px' }}>{obs.malus_reason}</div>}
                  </div>
                </div>

                {/* Commentaire */}
                {obs.comment && (
                  <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '10px 12px', borderLeft: '3px solid #2563EB' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px', fontWeight: 500 }}>
                      <i className="ti ti-message" style={{ marginRight: '4px' }} />
                      Commentaire du professeur
                    </div>
                    <div style={{ fontSize: '13px', color: '#1E293B', lineHeight: 1.6, fontStyle: 'italic' }}>{obs.comment}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}