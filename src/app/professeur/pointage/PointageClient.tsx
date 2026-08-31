'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

interface Event {
  id: string
  event_type: string
  timestamp: string
  note: string | null
}

interface Attendance {
  id: string
  date: string
  status: string
  teacher_attendance_events: Event[]
}

interface Props {
  teacherId: string
  todayAttendance: Attendance | null
  history: Attendance[]
}

const EVENT_CONFIG: Record<string, { label: string; icon: string; bg: string; color: string; border: string }> = {
  arrive:        { label: 'Arrivee',       icon: 'ti-login',        bg: '#ECFDF5', color: '#166534', border: '#86EFAC' },
  pause_debut:   { label: 'Debut pause',   icon: 'ti-coffee',       bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  pause_fin:     { label: 'Fin pause',     icon: 'ti-coffee-off',   bg: '#EFF6FF', color: '#1E3A8A', border: '#BFDBFE' },
  reunion_debut: { label: 'Debut reunion', icon: 'ti-users',        bg: '#F5F3FF', color: '#4C1D95', border: '#DDD6FE' },
  reunion_fin:   { label: 'Fin reunion',   icon: 'ti-users-minus',  bg: '#EFF6FF', color: '#1E3A8A', border: '#BFDBFE' },
  depart:        { label: 'Depart',        icon: 'ti-logout',       bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
}

function formatDuration(ms: number) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getWorkDuration(events: Event[]) {
  const arrive = events.find(e => e.event_type === 'arrive')
  const depart = events.find(e => e.event_type === 'depart')
  if (!arrive) return null
  const start = new Date(arrive.timestamp).getTime()
  const end = depart ? new Date(depart.timestamp).getTime() : Date.now()

  let pauseTime = 0
  const pauses = events.filter(e => e.event_type === 'pause_debut')
  pauses.forEach(p => {
    const pStart = new Date(p.timestamp).getTime()
    const pEnd = events.find(e => e.event_type === 'pause_fin' && new Date(e.timestamp) > new Date(p.timestamp))
    const pEndTime = pEnd ? new Date(pEnd.timestamp).getTime() : Date.now()
    pauseTime += pEndTime - pStart
  })

  return end - start - pauseTime
}

export default function PointageClient({ teacherId, todayAttendance, history }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [attendance, setAttendance] = useState<Attendance | null>(todayAttendance)
  const [loading, setLoading] = useState('')
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [tab, setTab] = useState<'today' | 'history'>('today')

  const events = attendance?.teacher_attendance_events ?? []
  const lastEvent = events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).at(-1)
  const hasArrived = events.some(e => e.event_type === 'arrive')
  const hasDeparted = events.some(e => e.event_type === 'depart')
  const isOnPause = events.filter(e => e.event_type === 'pause_debut').length > events.filter(e => e.event_type === 'pause_fin').length
  const isInMeeting = events.filter(e => e.event_type === 'reunion_debut').length > events.filter(e => e.event_type === 'reunion_fin').length

  // Presence: signale que le prof a l'app ouverte
useEffect(() => {
  let schoolId: string | null = null

  const setup = async () => {
    const { data } = await supabase.from('users').select('school_id, full_name').eq('id', teacherId).single()
    schoolId = data?.school_id ?? null
    if (!schoolId) return

    const channel = supabase.channel(`presence:school-${schoolId}`, {
      config: { presence: { key: teacherId } },
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ teacher_id: teacherId, full_name: data?.full_name, online_at: new Date().toISOString() })
      }
    })

    return () => { supabase.removeChannel(channel) }
  }

  const cleanupPromise = setup()
  return () => { cleanupPromise.then(fn => fn && fn()) }
}, [teacherId, supabase])

// Realtime: recoit les tags forces par l'admin, sans reload
useEffect(() => {
  if (!attendance?.id) return
  const channel = supabase
    .channel(`teacher_attendance_events-${attendance.id}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'teacher_attendance_events', filter: `teacher_attendance_id=eq.${attendance.id}` },
      (payload) => {
        const newEvent = payload.new as Event
        setAttendance(prev => prev ? {
          ...prev,
          teacher_attendance_events: prev.teacher_attendance_events.some(e => e.id === newEvent.id)
            ? prev.teacher_attendance_events
            : [...prev.teacher_attendance_events, newEvent],
        } : prev)
        if (newEvent.note === 'Modifie par admin') router.refresh()
      }
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [attendance?.id, supabase, router])

  async function handleEvent(eventType: string) {
    setLoading(eventType)
    let currentAttendance = attendance

    if (!currentAttendance) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', teacherId)
        .single()

      const { data: newAttendance } = await supabase
        .from('teacher_attendance')
        .insert({
          teacher_id: teacherId,
          school_id: userProfile!.school_id,
          date: new Date().toISOString().split('T')[0],
          status: eventType === 'arrive' ? 'present' : 'absent',
        })
        .select()
        .single()

      currentAttendance = { ...newAttendance, teacher_attendance_events: [] }
      setAttendance(currentAttendance)
    }

    if (eventType === 'arrive') {
      await supabase.from('teacher_attendance')
        .update({ status: isLate() ? 'late' : 'present' })
        .eq('id', currentAttendance!.id)
    }

    const { data: newEvent } = await supabase
      .from('teacher_attendance_events')
      .insert({
        teacher_attendance_id: currentAttendance!.id,
        event_type: eventType,
        note: note || null,
      })
      .select()
      .single()

    setAttendance(prev => prev ? {
      ...prev,
      teacher_attendance_events: [...(prev.teacher_attendance_events ?? []), newEvent],
    } : null)

    setNote('')
    setShowNote('')
    setLoading('')
    router.refresh()
  }

  function isLate() {
    const now = new Date()
    return now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 15)
  }

  function getAvailableActions() {
    if (!hasArrived) return ['arrive']
    if (hasDeparted) return []
    const actions = []
    if (!isOnPause && !isInMeeting) actions.push('pause_debut')
    if (isOnPause) actions.push('pause_fin')
    if (!isInMeeting && !isOnPause) actions.push('reunion_debut')
    if (isInMeeting) actions.push('reunion_fin')
    if (!isOnPause && !isInMeeting) actions.push('depart')
    return actions
  }

  const availableActions = getAvailableActions()
  const workDuration = getWorkDuration(events)

  const statusInfo = hasDeparted
    ? { label: 'Parti', bg: '#FEF2F2', color: '#DC2626' }
    : isOnPause
    ? { label: 'En pause', bg: '#FFFBEB', color: '#92400E' }
    : isInMeeting
    ? { label: 'En reunion', bg: '#F5F3FF', color: '#4C1D95' }
    : hasArrived
    ? { label: 'Present', bg: '#DCFCE7', color: '#166534' }
    : { label: 'Non pointe', bg: '#F1F5F9', color: '#64748B' }

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.25rem', background: '#F1F5F9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {(['today', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 18px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#1E293B' : '#64748B', boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            {t === 'today' ? "Aujourd'hui" : 'Historique'}
          </button>
        ))}
      </div>

      {tab === 'today' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

          {/* Statut + Timer */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>Statut actuel</div>
              <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', fontWeight: 500, background: statusInfo.bg, color: statusInfo.color }}>
                {statusInfo.label}
              </span>
            </div>

            {/* Timer */}
            {hasArrived && (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Temps de travail effectif
                </div>
                <div style={{ fontSize: '38px', fontWeight: 600, color: '#0F172A', fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>
                  {formatDuration(hasDeparted && workDuration ? workDuration : elapsed)}
                </div>
                {isOnPause && (
                  <div style={{ fontSize: '12px', color: '#92400E', marginTop: '6px', background: '#FFFBEB', padding: '3px 10px', borderRadius: '20px', display: 'inline-block' }}>
                    Pause en cours...
                  </div>
                )}
                {isInMeeting && (
                  <div style={{ fontSize: '12px', color: '#4C1D95', marginTop: '6px', background: '#F5F3FF', padding: '3px 10px', borderRadius: '20px', display: 'inline-block' }}>
                    Reunion en cours...
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            {!hasDeparted && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {availableActions.map(action => {
                  const cfg = EVENT_CONFIG[action]
                  return (
                    <div key={action}>
                      <button
                        onClick={() => showNote === action ? handleEvent(action) : setShowNote(showNote === action ? '' : action)}
                        disabled={loading === action}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: '1px solid ' + cfg.border, borderRadius: '10px', background: cfg.bg, color: cfg.color, fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                      >
                        <i className={'ti ' + cfg.icon} style={{ fontSize: '18px' }} />
                        {loading === action ? 'Enregistrement...' : cfg.label}
                        <i className="ti ti-chevron-right" style={{ marginLeft: 'auto', fontSize: '14px', opacity: 0.6 }} />
                      </button>
                      {showNote === action && (
                        <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
                          <input
                            type="text"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="Note optionnelle..."
                            style={{ flex: 1, padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
                          />
                          <button
                            onClick={() => handleEvent(action)}
                            style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', background: '#2563EB', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                          >
                            OK
                          </button>
                          <button
                            onClick={() => setShowNote('')}
                            style={{ padding: '8px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', color: '#64748B', fontSize: '13px', cursor: 'pointer' }}
                          >
                            <i className="ti ti-x" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}

                {hasDeparted && (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#94A3B8', fontSize: '13px' }}>
                    Journee terminee
                  </div>
                )}
              </div>
            )}

            {hasDeparted && (
              <div style={{ textAlign: 'center', padding: '1rem', color: '#94A3B8', fontSize: '13px', background: '#F8FAFC', borderRadius: '8px' }}>
                <i className="ti ti-check-circle" style={{ fontSize: '24px', color: '#10B981', display: 'block', marginBottom: '6px' }} />
                Journee enregistree
              </div>
            )}
          </div>

          {/* Timeline des events */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '1.25rem' }}>
              Timeline du jour
            </div>

            {events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '13px' }}>
                <i className="ti ti-clock" style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }} />
                Aucun pointage aujourd'hui
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {[...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((event, index) => {
                  const cfg = EVENT_CONFIG[event.event_type]
                  return (
                    <div key={event.id} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: cfg.bg, border: '2px solid ' + cfg.border, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, fontSize: '14px', flexShrink: 0, zIndex: 1 }}>
                          <i className={'ti ' + cfg.icon} />
                        </div>
                        {index < events.length - 1 && (
                          <div style={{ width: '2px', flex: 1, background: '#E2E8F0', minHeight: '24px' }} />
                        )}
                      </div>
                      <div style={{ paddingBottom: index < events.length - 1 ? '16px' : '0', flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: cfg.color }}>{cfg.label}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                          {new Date(event.timestamp).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        {event.note && (
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', fontStyle: 'italic' }}>
                            {event.note}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Date', 'Statut', 'Arrivee', 'Depart', 'Temps effectif', 'Pauses', 'Reunions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px' }}>
                    Aucun historique disponible
                  </td>
                </tr>
              ) : (
                history.map((record, index) => {
                  const evts = record.teacher_attendance_events ?? []
                  const arrive = evts.find(e => e.event_type === 'arrive')
                  const depart = evts.find(e => e.event_type === 'depart')
                  const pauses = evts.filter(e => e.event_type === 'pause_debut').length
                  const reunions = evts.filter(e => e.event_type === 'reunion_debut').length
                  const dur = getWorkDuration(evts)

                  const statusCfg = record.status === 'present'
                    ? { label: 'Present', bg: '#DCFCE7', color: '#166534' }
                    : record.status === 'late'
                    ? { label: 'En retard', bg: '#FEF3C7', color: '#92400E' }
                    : { label: 'Absent', bg: '#FEF2F2', color: '#DC2626' }

                  return (
                    <tr key={record.id} style={{ borderBottom: index < history.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                      <td style={{ padding: '11px 16px', fontSize: '13px', color: '#1E293B', fontWeight: 500 }}>
                        {new Date(record.date).toLocaleDateString('fr-MA', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: statusCfg.bg, color: statusCfg.color }}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569' }}>
                        {arrive ? new Date(arrive.timestamp).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569' }}>
                        {depart ? new Date(depart.timestamp).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>
                        {dur ? formatDuration(dur) : '-'}
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569' }}>
                        {pauses > 0 ? pauses + ' pause' + (pauses > 1 ? 's' : '') : '-'}
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569' }}>
                        {reunions > 0 ? reunions + ' reunion' + (reunions > 1 ? 's' : '') : '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}