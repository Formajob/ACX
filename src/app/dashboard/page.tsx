import { createClient } from '@/lib/supabase-server'
import QuickActions from '@/components/shared/QuickActions'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: totalStudents },
    { count: totalAbsences },
    { data: payments },
    { data: recentAbsences },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('absences').select('*', { count: 'exact', head: true }).eq('justified', false),
    supabase.from('payments').select('status'),
    supabase
      .from('absences')
      .select('*, students(full_name)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const totalPayments = payments?.length ?? 0
  const paidPayments = payments?.filter((p: any) => p.status === 'paid').length ?? 0
  const paymentRate = totalPayments > 0 ? Math.round((paidPayments / totalPayments) * 100) : 0

  const stats = [
    {
      label: 'Élèves inscrits',
      value: totalStudents ?? 0,
      sub: 'Total',
      color: '#2563EB',
      bg: '#EFF6FF',
    },
    {
      label: 'Paiements reçus',
      value: `${paymentRate}%`,
      sub: `${totalPayments - paidPayments} impayés`,
      color: '#EF4444',
      bg: '#FEF2F2',
    },
    {
      label: 'Absences injustif.',
      value: totalAbsences ?? 0,
      sub: 'Non justifiées',
      color: '#F59E0B',
      bg: '#FFFBEB',
    },
    {
      label: 'Bulletins générés',
      value: totalStudents ?? 0,
      sub: 'T2 clôturé',
      color: '#10B981',
      bg: '#ECFDF5',
    },
  ]

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{
          fontSize: '22px', fontWeight: 600,
          fontFamily: 'Syne, sans-serif', color: '#0F172A'
        }}>
          Tableau de bord
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Année scolaire 2024–25
        </p>
      </div>

      {/* Stats cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '14px',
        marginBottom: '1.5rem'
      }}>
        {stats.map(stat => (
          <div
            key={stat.label}
            style={{
              background: '#fff',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.25rem',
            }}
          >
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#0F172A', lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{
              fontSize: '12px',
              color: stat.color,
              marginTop: '6px',
              background: stat.bg,
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '20px'
            }}>
              {stat.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Bas de page */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px' }}>

        {/* Absences récentes */}
        <div style={{
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '1.25rem'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '1rem' }}>
            Dernières absences
          </div>

          {recentAbsences && recentAbsences.length > 0 ? (
            recentAbsences.map((absence: any) => (
              <div
                key={absence.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: '#DBEAFE', color: '#1E3A8A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 500
                  }}>
                    {absence.students?.full_name
                      ?.split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <span style={{ color: '#1E293B' }}>
                    {absence.students?.full_name}
                  </span>
                </div>
                <span style={{
                  fontSize: '11px', padding: '2px 8px',
                  borderRadius: '20px', fontWeight: 500,
                  background: absence.justified ? '#DBEAFE' : '#FEF3C7',
                  color: absence.justified ? '#1E3A8A' : '#92400E'
                }}>
                  {absence.justified ? 'Justifiée' : 'Non justifiée'}
                </span>
              </div>
            ))
          ) : (
            <div style={{
              textAlign: 'center', padding: '2rem',
              color: '#94A3B8', fontSize: '13px'
            }}>
              Aucune absence enregistrée
            </div>
          )}
        </div>

        {/* Accès rapides */}
        <QuickActions />

      </div>
    </div>
  )
}