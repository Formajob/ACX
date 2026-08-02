'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

interface Teacher { id: string; full_name: string; email: string }
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
}

const EVENT_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  arrive:        { label: 'Arrivee',       icon: 'ti-login',       color: '#166534' },
  pause_debut:   { label: 'Debut pause',   icon: 'ti-coffee',      color: '#92400E' },
  pause_fin:     { label: 'Fin pause',     icon: 'ti-coffee-off',  color: '#1E3A8A' },
  reunion_debut: { label: 'Debut reunion', icon: 'ti-users',       color: '#4C1D95' },
  reunion_fin:   { label: 'Fin reunion',   icon: 'ti-users-minus', color: '#1E3A8A' },
  depart:        { label: 'Depart',        icon: 'ti-logout',      color: '#991B1B' },
}

function formatDuration(ms: number) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h${String(m).padStart(2, '0')}`
}

function getWorkDuration(events: Event[]) {
  const arrive = events.find(e => e.event_type === 'arrive')
  const depart = events.find(e => e.event_type === 'depart')
  if (!arrive) return null
  const start = new Date(arrive.timestamp).getTime()
  const end = depart ? new Date(depart.timestamp).getTime() : Date.now()
  let pauseTime = 0
  events.filter(e => e.event_type === 'pause_debut').forEach(p => {
    const pStart = new Date(p.timestamp).getTime()
    const pEnd = events.find(e => e.event_type === 'pause_fin' && new Date(e.timestamp) > new Date(p.timestamp))
    pauseTime += (pEnd ? new Date(pEnd.timestamp).getTime() : Date.now()) - pStart
  })
  return end - start - pauseTime
}

export default function PresenceAdminClient({ teachers, todayAttendances, alerts }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null)
  const [tab, setTab] = useState<'presence' | 'alertes'>('presence')

  function getTeacherAttendance(teacherId: string) {
    return todayAttendances.find(a => {
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

  const stats = {
    presents: teachers.filter(t => ['Present', 'En pause', 'En reunion', 'En retard'].includes(getTeacherStatus(t.id).label)).length,
    absents: teachers.filter(t => ['Non pointe', 'Absent'].includes(getTeacherStatus(t.id).label)).length,
    partis: teachers.filter(t => getTeacherStatus(t.id).label === 'Parti').length,
    enRetard: teachers.filter(t => getTeacherStatus(t.id).label === 'En retard').length,
  }

  async function markAlert(alertId: string) {
    await supabase.from('attendance_alerts').update({ read: true }).eq('id', alertId)
    router.refresh()
  }

  const selectedAttendance = selectedTeacher ? getTeacherAttendance(selectedTeacher) : null
  const selectedEvents = selectedAttendance?.teacher_attendance_events?.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) ?? []

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.25rem' }}>
        {[
          { label: 'Presents',  value: stats.presents,  color: '#166534', bg: '#DCFCE7' },
          { label: 'Absents',   value: stats.absents,   color: '#DC2626', bg: '#FEF2F2' },
          { label: 'En retard', value: stats.enRetard,  color: '#92400E', bg: '#FEF3C7' },
          { label: 'Partis',    value: stats.partis,    color: '#64748B', bg: '#F1F5F9' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontSize: '26px', fontWeight: 600, color: '#0F172A' }}>{s.value}</div>
            <div style={{ fontSize: '11px', marginTop: '4px', background: s.bg, color: s.color, display: 'inline-block', padding: '2px 8px', borderRadius: '20px' }}>
              sur {teachers.length} profs
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
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
      </div>

      {tab === 'presence' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedTeacher ? '1fr 1fr' : '1fr', gap: '14px' }}>

          {/* Liste des profs */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {['Professeur', 'Statut', 'Arrivee', 'Temps effectif', 'Detail'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'left' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher, index) => {
                  const att = getTeacherAttendance(teacher.id)
                  const status = getTeacherStatus(teacher.id)
                  const evts = att?.teacher_attendance_events ?? []
                  const arrive = evts.find(e => e.event_type === 'arrive')
                  const dur = getWorkDuration(evts)

                  return (
                    <tr key={teacher.id} style={{ borderBottom: index < teachers.length - 1 ? '1px solid #F1F5F9' : 'none', background: selectedTeacher === teacher.id ? '#F8FAFC' : 'transparent' }}>
                      <td style={{ padding: '11px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 500 }}>
                            {teacher.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{teacher.full_name}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{teacher.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: status.bg, color: status.color, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <i className={'ti ' + status.icon} style={{ fontSize: '12px' }} />
                          {status.label}
                        </span>
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569' }}>
                        {arrive ? new Date(arrive.timestamp).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>
                        {dur ? formatDuration(dur) : '-'}
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <button
                          onClick={() => setSelectedTeacher(selectedTeacher === teacher.id ? null : teacher.id)}
                          style={{ padding: '4px 10px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', color: '#2563EB', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                        >
                          <i className="ti ti-eye" /> Voir
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Detail timeline */}
          {selectedTeacher && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>
                  Timeline — {teachers.find(t => t.id === selectedTeacher)?.full_name}
                </div>
                <button onClick={() => setSelectedTeacher(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '18px' }}>
                  <i className="ti ti-x" />
                </button>
              </div>

              {selectedEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '13px' }}>
                  Aucun pointage aujourd'hui
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {selectedEvents.map((event, index) => {
                    const cfg = EVENT_CONFIG[event.event_type]
                    return (
                      <div key={event.id} style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#F8FAFC', border: '2px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg?.color ?? '#64748B', fontSize: '13px', flexShrink: 0 }}>
                            <i className={'ti ' + (cfg?.icon ?? 'ti-clock')} />
                          </div>
                          {index < selectedEvents.length - 1 && (
                            <div style={{ width: '2px', flex: 1, background: '#E2E8F0', minHeight: '24px' }} />
                          )}
                        </div>
                        <div style={{ paddingBottom: index < selectedEvents.length - 1 ? '16px' : '0', flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: cfg?.color ?? '#64748B' }}>
                            {cfg?.label ?? event.event_type}
                          </div>
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
          )}
        </div>
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