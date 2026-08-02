import { createClient } from '@/lib/supabase-server'

export default async function ProfesseurPage() {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, school_id')
    .eq('role', 'teacher')
    .limit(1)
    .single()

  if (!profile) {
    return <div style={{ padding: '2rem', color: '#64748B' }}>Profil introuvable</div>
  }

  const { data: mesClasses } = await supabase
    .from('classes')
    .select('id, name, level')
    .eq('teacher_id', profile.id)

  const classIds = mesClasses?.map(c => c.id) ?? []

  const [
    { count: totalEleves },
    { count: absencesNonJust },
    { data: recentAbsences },
    { data: mySlots },
  ] = await Promise.all([
    supabase.from('class_students').select('*', { count: 'exact', head: true }).in('class_id', classIds.length > 0 ? classIds : ['none']),
    supabase.from('absences').select('*', { count: 'exact', head: true }).in('class_id', classIds.length > 0 ? classIds : ['none']).eq('justified', false),
    supabase.from('absences').select('*, students(full_name), classes(name)').in('class_id', classIds.length > 0 ? classIds : ['none']).order('created_at', { ascending: false }).limit(5),
    supabase.from('timetable_slots').select('*, subjects(name), classes(name)').eq('teacher_id', profile.id).order('day_of_week').limit(6),
  ])

  const DAYS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Bonjour, {profile.full_name} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          {new Date().toLocaleDateString('fr-MA', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
        {[
          { label: 'Mes classes',         value: mesClasses?.length ?? 0, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Mes eleves',          value: totalEleves ?? 0,        color: '#10B981', bg: '#ECFDF5' },
          { label: 'Absences injustif.',  value: absencesNonJust ?? 0,    color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Creneaux / semaine',  value: mySlots?.length ?? 0,    color: '#EF4444', bg: '#FEF2F2' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>{s.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#0F172A', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '11px', marginTop: '6px', background: s.bg, color: s.color, display: 'inline-block', padding: '2px 8px', borderRadius: '20px' }}>
              Annee 2024-25
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '1rem' }}>
            Mon planning de la semaine
          </div>
          {mySlots && mySlots.length > 0 ? (
            mySlots.map((slot: any, index: number) => (
              <div key={slot.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: index < mySlots.length - 1 ? '1px solid #F1F5F9' : 'none', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                    <i className="ti ti-book" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, color: '#1E293B' }}>{slot.subjects?.name}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>{slot.classes?.name} · {DAYS[slot.day_of_week]}</div>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', background: '#F8FAFC', padding: '3px 8px', borderRadius: '6px' }}>
                  {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontSize: '13px' }}>
              <i className="ti ti-calendar" style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }} />
              Aucun creneau assigne
            </div>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '1rem' }}>
            Dernieres absences — mes classes
          </div>
          {recentAbsences && recentAbsences.length > 0 ? (
            recentAbsences.map((absence: any, index: number) => (
              <div key={absence.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: index < recentAbsences.length - 1 ? '1px solid #F1F5F9' : 'none', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500 }}>
                    {absence.students?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ color: '#1E293B', fontWeight: 500 }}>{absence.students?.full_name}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>{absence.classes?.name} · {new Date(absence.absence_date).toLocaleDateString('fr-MA')}</div>
                  </div>
                </div>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: absence.justified ? '#DCFCE7' : '#FEF3C7', color: absence.justified ? '#166534' : '#92400E' }}>
                  {absence.justified ? 'Justifiee' : 'Non justifiee'}
                </span>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontSize: '13px' }}>
              <i className="ti ti-check" style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }} />
              Aucune absence recente
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '14px' }}>
        {[
          { label: 'Voir mes eleves',    icon: 'ti-users',        href: '/professeur/eleves',   color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Saisir des notes',   icon: 'ti-pencil',       href: '/professeur/notes',    color: '#10B981', bg: '#ECFDF5' },
          { label: 'Gerer les absences', icon: 'ti-calendar-off', href: '/professeur/absences', color: '#F59E0B', bg: '#FFFBEB' },
        ].map(item => (
          <a key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', textDecoration: 'none', color: '#1E293B', fontSize: '13px', fontWeight: 500 }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <i className={'ti ' + item.icon} />
            </div>
            {item.label}
          </a>
        ))}
      </div>
    </div>
  )
}