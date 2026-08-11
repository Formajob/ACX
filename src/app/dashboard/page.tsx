import { createClient } from '@/lib/supabase-server'
import QuickActions from '@/components/shared/QuickActions'

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { count: totalStudents },
    { count: totalAbsences },
    { data: payments },
    { data: recentAbsences },
    { data: todayAttendances },
    { count: totalTeachers },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('absences').select('*', { count: 'exact', head: true }).eq('justified', false),
    supabase.from('payments').select('status'),
    supabase.from('absences').select('*, students(full_name)').order('created_at', { ascending: false }).limit(5),
    supabase.from('teacher_attendance').select('*, users(full_name), teacher_attendance_events(event_type)').eq('date', today),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
  ])

  const totalPayments = payments?.length ?? 0
  const paidPayments = payments?.filter((p: any) => p.status === 'paid').length ?? 0
  const paymentRate = totalPayments > 0 ? Math.round((paidPayments / totalPayments) * 100) : 0

  // Calcul statuts pointage live
  function getTeacherStatus(att: any) {
    const evts = att.teacher_attendance_events ?? []
    const hasDeparted  = evts.some((e: any) => e.event_type === 'depart')
    const isOnPause    = evts.filter((e: any) => e.event_type === 'pause_debut').length > evts.filter((e: any) => e.event_type === 'pause_fin').length
    const isInMeeting  = evts.filter((e: any) => e.event_type === 'reunion_debut').length > evts.filter((e: any) => e.event_type === 'reunion_fin').length
    const hasArrived   = evts.some((e: any) => e.event_type === 'arrive')
    if (hasDeparted)  return 'parti'
    if (isOnPause)    return 'pause'
    if (isInMeeting)  return 'reunion'
    if (hasArrived)   return att.status === 'late' ? 'retard' : 'present'
    return 'absent'
  }

  const statusCounts = {
    presents:  0,
    pause:     0,
    reunion:   0,
    retard:    0,
    absents:   0,
    partis:    0,
  }

  todayAttendances?.forEach((att: any) => {
    const s = getTeacherStatus(att)
    if (s === 'present') statusCounts.presents++
    else if (s === 'pause')   statusCounts.pause++
    else if (s === 'reunion') statusCounts.reunion++
    else if (s === 'retard')  statusCounts.retard++
    else if (s === 'parti')   statusCounts.partis++
  })

  const pointedToday = todayAttendances?.length ?? 0
  statusCounts.absents = (totalTeachers ?? 0) - pointedToday

  const stats = [
    { label: 'Eleves inscrits',   value: totalStudents ?? 0,  sub: 'Total',         color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Paiements recus',   value: `${paymentRate}%`,   sub: `${totalPayments - paidPayments} impayes`, color: '#EF4444', bg: '#FEF2F2' },
    { label: 'Absences injustif', value: totalAbsences ?? 0,  sub: 'Non justifiees', color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Bulletins generes', value: totalStudents ?? 0,  sub: 'T2 cloture',    color: '#10B981', bg: '#ECFDF5' },
  ]

  const pointageStats = [
    { label: 'Presents',   value: statusCounts.presents, color: '#166534', bg: '#DCFCE7', icon: 'ti-check' },
    { label: 'En pause',   value: statusCounts.pause,    color: '#92400E', bg: '#FEF3C7', icon: 'ti-coffee' },
    { label: 'En reunion', value: statusCounts.reunion,  color: '#4C1D95', bg: '#F5F3FF', icon: 'ti-users' },
    { label: 'En retard',  value: statusCounts.retard,   color: '#9A3412', bg: '#FFF7ED', icon: 'ti-clock-exclamation' },
    { label: 'Absents',    value: statusCounts.absents,  color: '#DC2626', bg: '#FEF2F2', icon: 'ti-user-off' },
    { label: 'Partis',     value: statusCounts.partis,   color: '#64748B', bg: '#F1F5F9', icon: 'ti-logout' },
  ]

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Tableau de bord
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          {new Date().toLocaleDateString('fr-MA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats élèves */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '1.5rem' }}>
        {stats.map(stat => (
          <div key={stat.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>{stat.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#0F172A', lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: '11px', color: stat.color, marginTop: '6px', background: stat.bg, display: 'inline-block', padding: '2px 8px', borderRadius: '20px' }}>
              {stat.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Section Pointage LIVE */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 0 3px #DCFCE7' }} />
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>
              Pointage professeurs — Aujourd'hui
            </span>
          </div>
          <a href="/dashboard/presence" style={{ fontSize: '12px', color: '#2563EB', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            Voir details <i className="ti ti-arrow-right" style={{ fontSize: '13px' }} />
          </a>
        </div>

        {/* Barre de progression globale */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              {pointedToday} / {totalTeachers ?? 0} profs ont pointe aujourd'hui
            </span>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#2563EB' }}>
              {totalTeachers ? Math.round((pointedToday / totalTeachers) * 100) : 0}%
            </span>
          </div>
          <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#2563EB', borderRadius: '4px', width: totalTeachers ? `${Math.round((pointedToday / totalTeachers) * 100)}%` : '0%', transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Cards statuts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
          {pointageStats.map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: '10px', padding: '0.875rem', textAlign: 'center' }}>
              <i className={'ti ' + s.icon} style={{ fontSize: '20px', color: s.color, display: 'block', marginBottom: '6px' }} />
              <div style={{ fontSize: '22px', fontWeight: 600, color: s.color, lineHeight: 1, marginBottom: '4px' }}>
                {s.value}
              </div>
              <div style={{ fontSize: '11px', color: s.color, opacity: 0.8 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Liste live des profs présents */}
        {todayAttendances && todayAttendances.length > 0 && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px', fontWeight: 500 }}>
              Statut en temps reel
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {todayAttendances.map((att: any) => {
                const status = getTeacherStatus(att)
                const statusMap: Record<string, { color: string; bg: string; label: string }> = {
                  present:  { color: '#166534', bg: '#DCFCE7', label: 'Present' },
                  pause:    { color: '#92400E', bg: '#FEF3C7', label: 'En pause' },
                  reunion:  { color: '#4C1D95', bg: '#F5F3FF', label: 'En reunion' },
                  retard:   { color: '#9A3412', bg: '#FFF7ED', label: 'En retard' },
                  parti:    { color: '#64748B', bg: '#F1F5F9', label: 'Parti' },
                  absent:   { color: '#DC2626', bg: '#FEF2F2', label: 'Absent' },
                }
                const cfg = statusMap[status]
                return (
                  <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', background: cfg.bg, borderRadius: '20px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#fff', color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 600 }}>
                      {att.users?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: cfg.color }}>{att.users?.full_name}</span>
                    <span style={{ fontSize: '10px', color: cfg.color, opacity: 0.7 }}>· {cfg.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bas de page */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px' }}>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '1rem' }}>
            Dernieres absences eleves
          </div>
          {recentAbsences && recentAbsences.length > 0 ? (
            recentAbsences.map((absence: any, index: number) => (
              <div key={absence.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: index < recentAbsences.length - 1 ? '1px solid #F1F5F9' : 'none', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500 }}>
                    {absence.students?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ color: '#1E293B' }}>{absence.students?.full_name}</span>
                </div>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: absence.justified ? '#DBEAFE' : '#FEF3C7', color: absence.justified ? '#1E3A8A' : '#92400E' }}>
                  {absence.justified ? 'Justifiee' : 'Non justifiee'}
                </span>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontSize: '13px' }}>
              Aucune absence enregistree
            </div>
          )}
        </div>

        <QuickActions />
      </div>
    </div>
  )
}