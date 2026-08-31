'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

interface Teacher { id: string; full_name: string; email: string; school_id?: string }
interface Event { id: string; event_type: string; timestamp: string; note: string | null }
interface Attendance {
  id: string
  status: string
  date: string
  users: { full_name: string } | null
  teacher_attendance_events: Event[]
}
interface Alert {
  id: string
  type: string
  message: string
  created_at: string
  users: { full_name: string } | null
}

interface Props {
  teachers: Teacher[]
  todayAttendances: Attendance[]
  alerts: Alert[]
  schoolId: string | null
}

const EVENT_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
  arrive:        { label: 'Present',    icon: 'ti-check',       color: '#166534', bg: '#DCFCE7', border: '#86EFAC' },
  pause_debut:   { label: 'En pause',   icon: 'ti-coffee',      color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
  pause_fin:     { label: 'Present',    icon: 'ti-check',       color: '#166534', bg: '#DCFCE7', border: '#86EFAC' },
  reunion_debut: { label: 'En reunion', icon: 'ti-users',       color: '#4C1D95', bg: '#F5F3FF', border: '#DDD6FE' },
  reunion_fin:   { label: 'Present',    icon: 'ti-check',       color: '#166534', bg: '#DCFCE7', border: '#86EFAC' },
  depart:        { label: 'Parti',      icon: 'ti-logout',      color: '#64748B', bg: '#F1F5F9', border: '#E2E8F0' },
}

const ADMIN_TAG_OPTIONS = ['arrive', 'pause_debut', 'pause_fin', 'reunion_debut', 'reunion_fin', 'depart']

const CALIBRATION_WINDOW_MS = 5 * 60 * 1000

function formatDuration(ms: number) {
  const clamped = Math.max(0, ms)
  const h = Math.floor(clamped / 3600000)
  const m = Math.floor((clamped % 3600000) / 60000)
  const s = Math.floor((clamped % 60000) / 1000)
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}m${String(s).padStart(2, '0')}s`
  return `${m}m${String(s).padStart(2, '0')}s`
}

function getWorkDuration(events: Event[], now: number) {
  const arrive = events.find(e => e.event_type === 'arrive')
  const depart = events.find(e => e.event_type === 'depart')
  if (!arrive) return null
  const start = new Date(arrive.timestamp).getTime()
  const end = depart ? new Date(depart.timestamp).getTime() : now
  let pauseTime = 0
  events.filter(e => e.event_type === 'pause_debut').forEach(p => {
    const pStart = new Date(p.timestamp).getTime()
    const pEnd = events.find(e => e.event_type === 'pause_fin' && new Date(e.timestamp) > new Date(p.timestamp))
    pauseTime += (pEnd ? new Date(pEnd.timestamp).getTime() : now) - pStart
  })
  return Math.max(0, end - start - pauseTime)
}

function getCurrentTag(events: Event[]) {
  if (events.length === 0) return null
  return [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
}

type FilterKey = 'tous' | 'actifs' | 'pause' | 'reunion' | 'retard' | 'absents' | 'partis'

export default function PresenceAdminClient({ teachers, todayAttendances: initialAttendances, alerts }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const schoolId = teachers[0]?.school_id ?? null

  const [attendances, setAttendances] = useState<Attendance[]>(initialAttendances)
  const [tab, setTab] = useState<'presence' | 'alertes'>('presence')
  const [filter, setFilter] = useState<FilterKey>('tous')
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const [tagMenuOpen, setTagMenuOpen] = useState<string | null>(null)
  const [changingTag, setChangingTag] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<number>(Date.now())

  // --- Horloge recalee sur le serveur (corrige le bug du timer negatif) ---
  const [serverOffset, setServerOffset] = useState(0)
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const now = Date.now() + serverOffset

  const calibrate = useCallback((serverTimestampISO: string) => {
    const drift = new Date(serverTimestampISO).getTime() - Date.now()
    setServerOffset(drift)
    setLastSync(Date.now())
  }, [])

  useEffect(() => {
    let latest: string | null = null
    attendances.forEach(a => a.teacher_attendance_events?.forEach(e => {
      if (!latest || new Date(e.timestamp).getTime() > new Date(latest).getTime()) latest = e.timestamp
    }))
    if (latest && Date.now() - new Date(latest).getTime() < CALIBRATION_WINDOW_MS) calibrate(latest)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Presence: qui a l'app ouverte ---
  useEffect(() => {
    if (!schoolId) return
    const channel = supabase.channel(`presence:school-${schoolId}`, {
      config: { presence: { key: 'admin-' + Math.random().toString(36).slice(2) } },
    })
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ teacher_id: string }>()
        const ids = new Set<string>()
        Object.values(state).forEach(entries => entries.forEach(e => ids.add(e.teacher_id)))
        setOnlineIds(ids)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [schoolId, supabase])

  // --- Realtime: nouveaux pointages ---
  useEffect(() => {
    const channel = supabase
      .channel('teacher_attendance_events-admin')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'teacher_attendance_events' },
        (payload) => {
          const newEvent = payload.new as Event & { teacher_attendance_id: string }
          calibrate(newEvent.timestamp)
          setAttendances(prev => prev.map(a =>
            a.id === newEvent.teacher_attendance_id
              ? {
                  ...a,
                  teacher_attendance_events: a.teacher_attendance_events.some(e => e.id === newEvent.id)
                    ? a.teacher_attendance_events
                    : [...a.teacher_attendance_events, newEvent],
                }
              : a
          ))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, calibrate])

  function getTeacherAttendance(teacherId: string) {
    return attendances.find(a => {
      const t = teachers.find(t => t.id === teacherId)
      return a.users?.full_name === t?.full_name
    })
  }

  function getTeacherStatus(teacherId: string) {
    const att = getTeacherAttendance(teacherId)
    if (!att) return { label: 'Non pointe', bg: '#F1F5F9', color: '#64748B', icon: 'ti-clock' }
    const evts = att.teacher_attendance_events ?? []
    const hasDeparted = evts.some(e => e.event_type === 'depart')
    const isOnPause = evts.filter(e => e.event_type === 'pause_debut').length > evts.filter(e => e.event_type === 'pause_fin').length
    const isInMeeting = evts.filter(e => e.event_type === 'reunion_debut').length > evts.filter(e => e.event_type === 'reunion_fin').length
    const hasArrived = evts.some(e => e.event_type === 'arrive')

    if (hasDeparted) return { label: 'Parti', bg: '#F1F5F9', color: '#64748B', icon: 'ti-logout' }
    if (isOnPause) return { label: 'En pause', bg: '#FFFBEB', color: '#92400E', icon: 'ti-coffee' }
    if (isInMeeting) return { label: 'En reunion', bg: '#F5F3FF', color: '#4C1D95', icon: 'ti-users' }
    if (hasArrived && att.status === 'late') return { label: 'En retard', bg: '#FEF3C7', color: '#92400E', icon: 'ti-clock-exclamation' }
    if (hasArrived) return { label: 'Present', bg: '#DCFCE7', color: '#166534', icon: 'ti-check' }
    return { label: 'Absent', bg: '#FEF2F2', color: '#DC2626', icon: 'ti-x' }
  }

  const counts = useMemo(() => {
    const c = { tous: teachers.length, actifs: 0, pause: 0, reunion: 0, retard: 0, absents: 0, partis: 0 }
    teachers.forEach(t => {
      const label = getTeacherStatus(t.id).label
      if (['Present', 'En pause', 'En reunion', 'En retard'].includes(label)) c.actifs++
      if (label === 'En pause') c.pause++
      if (label === 'En reunion') c.reunion++
      if (label === 'En retard') c.retard++
      if (['Non pointe', 'Absent'].includes(label)) c.absents++
      if (label === 'Parti') c.partis++
    })
    return c
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachers, attendances])

  const filteredTeachers = useMemo(() => {
    if (filter === 'tous') return teachers
    return teachers.filter(t => {
      const label = getTeacherStatus(t.id).label
      if (filter === 'actifs') return ['Present', 'En pause', 'En reunion', 'En retard'].includes(label)
      if (filter === 'pause') return label === 'En pause'
      if (filter === 'reunion') return label === 'En reunion'
      if (filter === 'retard') return label === 'En retard'
      if (filter === 'absents') return ['Non pointe', 'Absent'].includes(label)
      if (filter === 'partis') return label === 'Parti'
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachers, filter, attendances])

  async function markAlert(alertId: string) {
    await supabase.from('attendance_alerts').update({ read: true }).eq('id', alertId)
    router.refresh()
  }

  const changeTeacherTag = useCallback(async (teacherId: string, newType: string) => {
    setChangingTag(teacherId)
    setTagMenuOpen(null)
    try {
      let att = getTeacherAttendance(teacherId)

      if (!att) {
        const teacher = teachers.find(t => t.id === teacherId)
        const { data: created } = await supabase
          .from('teacher_attendance')
          .insert({
            teacher_id: teacherId,
            school_id: teacher?.school_id,
            date: new Date().toISOString().split('T')[0],
            status: newType === 'arrive' ? 'present' : 'absent',
          })
          .select()
          .single()
        att = { ...created, teacher_attendance_events: [] }
        setAttendances(prev => [...prev, att as Attendance])
      }

      const { data: newEvent } = await supabase
        .from('teacher_attendance_events')
        .insert({ teacher_attendance_id: att!.id, event_type: newType, note: 'Modifie par admin' })
        .select()
        .single()

      calibrate(newEvent.timestamp)

      setAttendances(prev => prev.map(a =>
        a.id === att!.id
          ? {
              ...a,
              teacher_attendance_events: a.teacher_attendance_events.some(e => e.id === newEvent.id)
                ? a.teacher_attendance_events
                : [...a.teacher_attendance_events, newEvent],
            }
          : a
      ))

      if (newType === 'arrive') {
        await supabase.from('teacher_attendance').update({ status: 'present' }).eq('id', att!.id)
      }
    } finally {
      setChangingTag(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachers, supabase, attendances, calibrate])

  const FILTERS: { key: FilterKey; label: string; icon: string }[] = [
    { key: 'tous',    label: 'Tous',       icon: 'ti-users' },
    { key: 'actifs',  label: 'Actifs',     icon: 'ti-activity' },
    { key: 'pause',   label: 'En pause',   icon: 'ti-coffee' },
    { key: 'reunion', label: 'En reunion', icon: 'ti-users-group' },
    { key: 'retard',  label: 'En retard',  icon: 'ti-clock-exclamation' },
    { key: 'absents', label: 'Absents',    icon: 'ti-user-off' },
    { key: 'partis',  label: 'Partis',     icon: 'ti-logout' },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="ti ti-clock" style={{ fontSize: '18px', color: '#2563EB' }} />
          <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
            Presence de l'equipe (Temps reel)
          </span>
        </div>
        <div style={{ fontSize: '13px', color: '#64748B' }}>{teachers.length} membres</div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${FILTERS.length}, 1fr)`, gap: '10px', marginBottom: '1rem' }}>
        {FILTERS.map(f => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                background: active ? '#ECFDF5' : '#fff',
                border: active ? '1.5px solid #22C55E' : '1px solid #E2E8F0',
                borderRadius: '12px', padding: '14px 10px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              }}
            >
              <i className={'ti ' + f.icon} style={{ fontSize: '18px', color: active ? '#16A34A' : '#94A3B8' }} />
              <span style={{ fontSize: '12px', color: '#64748B' }}>{f.label}</span>
              <span style={{ fontSize: '18px', fontWeight: 600, color: active ? '#166534' : '#0F172A' }}>
                {counts[f.key]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Tabs + status line */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', padding: '4px', borderRadius: '10px' }}>
          {(['presence', 'alertes'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 18px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#1E293B' : '#64748B', boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', position: 'relative' as const }}>
              {t === 'presence' ? 'Presence' : 'Alertes'}
              {t === 'alertes' && alerts.length > 0 && (
                <span style={{ position: 'absolute', top: '4px', right: '6px', width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
              )}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#94A3B8' }}>
          <span>Mis a jour a {new Date(lastSync).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          <button
            onClick={() => router.refresh()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', color: '#1E293B', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            <i className="ti ti-refresh" /> Actualiser
          </button>
        </div>
      </div>

      {tab === 'presence' && (
        filteredTeachers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94A3B8', fontSize: '14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
            <i className="ti ti-user-off" style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }} />
            Aucun professeur dans ce filtre
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {filteredTeachers.map(teacher => {
              const att = getTeacherAttendance(teacher.id)
              const status = getTeacherStatus(teacher.id)
              const evts = att?.teacher_attendance_events ?? []
              const dur = getWorkDuration(evts, now)
              const currentTag = getCurrentTag(evts)
              const tagCfg = currentTag ? EVENT_CONFIG[currentTag.event_type] : null
              const tagSince = currentTag ? Math.max(0, now - new Date(currentTag.timestamp).getTime()) : null
              const isOnline = onlineIds.has(teacher.id)

              return (
                <div key={teacher.id} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.1rem', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isOnline ? '#22C55E' : '#CBD5E1', boxShadow: isOnline ? '0 0 0 3px #DCFCE7' : 'none', flexShrink: 0 }} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{teacher.full_name}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px', marginLeft: '13px' }}>{teacher.email}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500, background: status.bg, color: status.color, whiteSpace: 'nowrap' }}>
                        {status.label}
                      </span>
                      <button
                        onClick={() => setTagMenuOpen(tagMenuOpen === teacher.id ? null : teacher.id)}
                        disabled={changingTag === teacher.id}
                        style={{ width: '26px', height: '26px', borderRadius: '7px', border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      >
                        <i className={changingTag === teacher.id ? 'ti ti-loader-2' : 'ti ti-pencil'} style={{ fontSize: '13px' }} />
                      </button>
                    </div>
                  </div>

                  {tagMenuOpen === teacher.id && (
                    <div style={{ position: 'absolute', right: '1.1rem', top: '52px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 20, minWidth: '170px', overflow: 'hidden' }}>
                      {ADMIN_TAG_OPTIONS.map(opt => {
                        const cfg = EVENT_CONFIG[opt]
                        return (
                          <button
                            key={opt}
                            onClick={() => changeTeacherTag(teacher.id, opt)}
                            style={{ width: '100%', textAlign: 'left', padding: '9px 14px', border: 'none', background: '#fff', cursor: 'pointer', fontSize: '13px', color: cfg.color, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'DM Sans, sans-serif' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                          >
                            <i className={'ti ' + cfg.icon} />
                            {opt === 'pause_debut' ? 'Debut pause' : opt === 'pause_fin' ? 'Fin pause' : opt === 'reunion_debut' ? 'Debut reunion' : opt === 'reunion_fin' ? 'Fin reunion' : opt === 'arrive' ? 'Arrivee' : 'Depart'}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  <div style={{ background: '#EFF6FF', borderRadius: '9px', padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#1E3A8A' }}>
                      {currentTag ? `Depuis ${new Date(currentTag.timestamp).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}` : 'Pas encore pointe'}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E3A8A', fontVariantNumeric: 'tabular-nums' }}>
                      {tagSince !== null ? formatDuration(tagSince) : '-'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>Temps effectif</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', fontVariantNumeric: 'tabular-nums' }}>
                      {dur !== null ? formatDuration(dur) : '-'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {tab === 'alertes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#94A3B8', fontSize: '14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
              <i className="ti ti-bell-off" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
              Aucune alerte non lue
            </div>
          ) : (
            alerts.map(alert => (
              <div key={alert.id} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: alert.type === 'absence' ? '#FEF2F2' : alert.type === 'retard' ? '#FEF3C7' : '#FFFBEB', color: alert.type === 'absence' ? '#DC2626' : '#92400E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                  <i className={'ti ' + (alert.type === 'absence' ? 'ti-user-off' : alert.type === 'retard' ? 'ti-clock-exclamation' : 'ti-coffee')} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{alert.message}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                    {alert.users?.full_name} · {new Date(alert.created_at).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button
                  onClick={() => markAlert(alert.id)}
                  style={{ padding: '5px 12px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', color: '#64748B', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                >
                  Lu
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}