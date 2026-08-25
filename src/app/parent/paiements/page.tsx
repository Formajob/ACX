'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function ParentPaiementsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [payments, setPayments] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('tous')

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    loadData(user.email)
  }, [])

  async function loadData(email: string) {
    const { data: studentsList } = await supabase
      .from('students')
      .select('id, full_name')
      .eq('parent_email', email)

    setStudents(studentsList ?? [])
    const ids = studentsList?.map(s => s.id) ?? []

    if (ids.length > 0) {
      const { data: pays } = await supabase
        .from('payments')
        .select('*, students(full_name)')
        .in('student_id', ids)
        .order('due_date', { ascending: false })
      setPayments(pays ?? [])
    }
    setLoading(false)
  }

  const filtered = payments.filter(p => filterStatus === 'tous' || p.status === filterStatus)

  const totalDu   = payments.reduce((s, p) => s + p.amount, 0)
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const totalLeft = payments.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amount, 0)

  const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
    paid:    { label: 'Paye',       bg: '#DCFCE7', color: '#166534' },
    pending: { label: 'En attente', bg: '#FEF3C7', color: '#92400E' },
    late:    { label: 'En retard',  bg: '#FEF2F2', color: '#DC2626' },
  }

  if (loading) return <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>Chargement...</div>

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>Paiements</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>Suivi des frais de scolarite</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total annuel',  value: totalDu + ' MAD',   color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Paye',          value: totalPaid + ' MAD', color: '#10B981', bg: '#ECFDF5' },
          { label: 'Reste a payer', value: totalLeft + ' MAD', color: '#EF4444', bg: '#FEF2F2' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: '#0F172A' }}>{s.value}</div>
            <div style={{ height: '4px', background: '#F1F5F9', borderRadius: '2px', marginTop: '10px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: s.color, borderRadius: '2px', width: totalDu > 0 ? (s.label === 'Paye' ? (totalPaid/totalDu*100) + '%' : s.label === 'Reste a payer' ? (totalLeft/totalDu*100) + '%' : '100%') : '0%' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Barre progression globale */}
      {totalDu > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
            <span>Progression des paiements</span>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>{Math.round(totalPaid/totalDu*100)}%</span>
          </div>
          <div style={{ height: '10px', background: '#F1F5F9', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #10B981, #2563EB)', borderRadius: '5px', width: (totalPaid/totalDu*100) + '%', transition: 'width 0.5s' }} />
          </div>
        </div>
      )}

      {/* Filtre */}
      <div style={{ marginBottom: '1rem' }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', outline: 'none', background: '#fff', color: '#1E293B' }}>
          <option value="tous">Tous les statuts</option>
          <option value="paid">Payes</option>
          <option value="pending">En attente</option>
          <option value="late">En retard</option>
        </select>
      </div>

      {/* Tableau */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              {['Enfant', 'Montant', 'Type', 'Echeance', 'Paye le', 'Statut'].map(h => (
                <th key={h} style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px' }}>Aucun paiement</td></tr>
            ) : (
              filtered.map((p: any, index: number) => (
                <tr key={p.id} style={{ borderBottom: index < filtered.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500 }}>
                        {p.students?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{p.students?.full_name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{p.amount} MAD</td>
                  <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569' }}>
                    {p.type === 'tuition' ? 'Scolarite' : p.type === 'registration' ? 'Inscription' : 'Autre'}
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569' }}>
                    {new Date(p.due_date).toLocaleDateString('fr-MA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569' }}>
                    {p.paid_at ? new Date(p.paid_at).toLocaleDateString('fr-MA', { day: 'numeric', month: 'short' }) : '—'}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: statusConfig[p.status]?.bg, color: statusConfig[p.status]?.color }}>
                      {statusConfig[p.status]?.label}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '0.75rem', fontSize: '12px', color: '#94A3B8' }}>{filtered.length} paiement{filtered.length > 1 ? 's' : ''}</div>
    </div>
  )
}