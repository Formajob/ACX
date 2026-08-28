'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'


interface Paiement {
  id: string
  amount: number
  status: string
  type: string
  due_date: string
  paid_at: string | null
  students: { full_name: string } | null
}

interface Eleve {
  id: string
  full_name: string
}

interface Props {
  paiements: Paiement[]
  eleves: Eleve[]
}

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  paid:      { label: 'Paye',      bg: '#DCFCE7', color: '#166534' },
  pending:   { label: 'En attente', bg: '#FEF3C7', color: '#92400E' },
  late:      { label: 'En retard', bg: '#FEF2F2', color: '#DC2626' },
  cancelled: { label: 'Annule',    bg: '#F1F5F9', color: '#64748B' },
}

export default function PaiementsClient({ paiements, eleves }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [tab, setTab] = useState<'liste' | 'ajouter'>('liste')
  const [filterStatus, setFilterStatus] = useState('tous')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    student_id: '',
    amount: '',
    type: 'tuition',
    due_date: new Date().toISOString().split('T')[0],
    status: 'pending',
  })

  const stats = {
    total:    paiements.length,
    paid:     paiements.filter(p => p.status === 'paid').length,
    late:     paiements.filter(p => p.status === 'late').length,
    pending:  paiements.filter(p => p.status === 'pending').length,
    totalMAD: paiements.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
  }

  const filtered = paiements.filter(p =>
    filterStatus === 'tous' || p.status === filterStatus
  )

  async function handleSubmit() {
    if (!form.student_id || !form.amount) {
      setError('Eleve et montant sont obligatoires')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')

    const { data: userData } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('school_id')
      .eq('id', userData.user!.id)
      .single()

    const { error: insertError } = await supabase.from('payments').insert({
      student_id: form.student_id,
      school_id: userProfile!.school_id,
      amount: parseFloat(form.amount),
      type: form.type,
      due_date: form.due_date,
      status: form.status,
      paid_at: form.status === 'paid' ? new Date().toISOString() : null,
    })

    if (insertError) {
      setError('Erreur: ' + insertError.message)
      setLoading(false)
      return
    }

    setSuccess('Paiement enregistre avec succes')
    setForm({ student_id: '', amount: '', type: 'tuition', due_date: new Date().toISOString().split('T')[0], status: 'pending' })
    setLoading(false)
    router.refresh()
  }

  async function handleMarkPaid(id: string) {
    await supabase.from('payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id)
    router.refresh()
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'DM Sans, sans-serif',
    outline: 'none',
    color: '#1E293B',
    background: '#fff',
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    fontSize: '13px',
    fontWeight: 500 as const,
    color: '#1E293B',
    display: 'block' as const,
    marginBottom: '5px',
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total paiements', value: stats.total, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Payes',           value: stats.paid,  color: '#10B981', bg: '#ECFDF5' },
          { label: 'En retard',       value: stats.late,  color: '#EF4444', bg: '#FEF2F2' },
          { label: 'Montant encaisse', value: stats.totalMAD + ' MAD', color: '#F59E0B', bg: '#FFFBEB' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: '#0F172A' }}>{s.value}</div>
            <div style={{ fontSize: '11px', marginTop: '4px', background: s.bg, color: s.color, display: 'inline-block', padding: '1px 8px', borderRadius: '20px' }}>
              {stats.pending} en attente
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.25rem', background: '#F1F5F9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {(['liste', 'ajouter'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '7px 18px', borderRadius: '7px', border: 'none',
              fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
              cursor: 'pointer',
              background: tab === t ? '#fff' : 'transparent',
              color: tab === t ? '#1E293B' : '#64748B',
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {t === 'liste' ? 'Liste des paiements' : 'Ajouter un paiement'}
          </button>
        ))}
      </div>

      {/* TAB LISTE */}
      {tab === 'liste' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ ...inputStyle, width: 'auto', minWidth: '180px' }}
            >
              <option value="tous">Tous les statuts</option>
              <option value="paid">Paye</option>
              <option value="pending">En attente</option>
              <option value="late">En retard</option>
              <option value="cancelled">Annule</option>
            </select>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {['Eleve', 'Montant', 'Type', 'Echeance', 'Statut', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'left' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px' }}>
                      Aucun paiement trouve
                    </td>
                  </tr>
                ) : (
                  filtered.map((p, index) => (
                    <tr key={p.id} style={{ borderBottom: index < filtered.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                      <td style={{ padding: '11px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500 }}>
                            {p.students?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontSize: '13px', color: '#1E293B' }}>{p.students?.full_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>
                        {p.amount} MAD
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569' }}>
                        {p.type === 'tuition' ? 'Scolarite' : p.type === 'registration' ? 'Inscription' : 'Autre'}
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569' }}>
                        {new Date(p.due_date).toLocaleDateString('fr-MA')}
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: statusConfig[p.status]?.bg, color: statusConfig[p.status]?.color }}>
                          {statusConfig[p.status]?.label}
                        </span>
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        {p.status !== 'paid' && (
                          <button
                            onClick={() => handleMarkPaid(p.id)}
                            title="Marquer comme paye"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#fff', color: '#10B981', cursor: 'pointer', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}
                          >
                            <i className="ti ti-check" /> Paye
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '12px', color: '#94A3B8' }}>
            {filtered.length} paiement{filtered.length > 1 ? 's' : ''} affiche{filtered.length > 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* TAB AJOUTER */}
      {tab === 'ajouter' && (
        <div style={{ maxWidth: '500px' }}>
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Eleve</label>
              <select value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))} style={inputStyle}>
                <option value="">Selectionnez un eleve</option>
                {eleves.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Montant (MAD)</label>
                <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="800" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                  <option value="tuition">Scolarite</option>
                  <option value="registration">Inscription</option>
                  <option value="other">Autre</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Date echeance</label>
                <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Statut</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
                  <option value="pending">En attente</option>
                  <option value="paid">Paye</option>
                  <option value="late">En retard</option>
                </select>
              </div>
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>{error}</div>
            )}
            {success && (
              <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>{success}</div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ padding: '11px', border: 'none', borderRadius: '10px', background: loading ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer le paiement'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}