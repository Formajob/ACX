'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import { WaIcon } from '@/components/shared/WhatsAppButton'

interface Paiement {
  id: string
  amount: number
  status: string
  type: string
  due_date: string
  paid_at: string | null
  students: {
    full_name: string
    parent_phone: string | null
    parent_email: string | null
    matricule: string | null
    parent_name: string | null
  } | null
}
interface Eleve { id: string; full_name: string }
interface Props {
  paiements:  Paiement[]
  eleves:     Eleve[]
  schoolName: string
  onRefresh:  () => void
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  paid:      { label: 'Payé',       bg: '#DCFCE7', color: '#166534' },
  pending:   { label: 'En attente', bg: '#FEF3C7', color: '#92400E' },
  late:      { label: 'En retard',  bg: '#FEF2F2', color: '#DC2626' },
  cancelled: { label: 'Annulé',     bg: '#F1F5F9', color: '#64748B' },
}

export default function PaiementsClient({ paiements, eleves, schoolName, onRefresh }: Props) {
  const supabase = createClient()

  const [tab,           setTab]          = useState<'liste' | 'recherche' | 'ajouter'>('liste')
  const [filterStatus,  setFilterStatus] = useState('tous')
  const [loading,       setLoading]      = useState(false)
  const [error,         setError]        = useState('')
  const [success,       setSuccess]      = useState('')

  // Recherche
  const [searchQuery,    setSearchQuery]    = useState('')
  const [searchResults,  setSearchResults]  = useState<any[]>([])
  const [searchLoading,  setSearchLoading]  = useState(false)
  const [selectedEleve,  setSelectedEleve]  = useState<any>(null)
  const [elevePaiements, setElevePaiements] = useState<any[]>([])

  // Formulaire
  const [form, setForm] = useState({
    student_id: '', amount: '', type: 'tuition',
    due_date:   new Date().toISOString().split('T')[0],
    status: 'pending', notes: '',
  })

  // Stats
  const stats = {
    total:     paiements.length,
    paid:      paiements.filter(p => p.status === 'paid').length,
    late:      paiements.filter(p => p.status === 'late').length,
    pending:   paiements.filter(p => p.status === 'pending').length,
    totalMAD:  paiements.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0),
    impayeMAD: paiements.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amount, 0),
  }

  const filtered = paiements.filter(p => filterStatus === 'tous' || p.status === filterStatus)

  function buildLateMessage(p: Paiement) {
    return `Bonjour${p.students?.parent_name ? ' ' + p.students.parent_name : ''},\n\nNous vous rappelons qu'un paiement de *${p.amount.toLocaleString('fr-MA')} MAD* pour la scolarité de *${p.students?.full_name ?? ''}* est en retard.\n\nMerci de régulariser votre situation dans les plus brefs délais.\n\nCordialement,\n*${schoolName}*`
  }

  function buildReminderMessage(p: Paiement) {
    const due = new Date(p.due_date).toLocaleDateString('fr-MA', { day: 'numeric', month: 'long' })
    return `Bonjour${p.students?.parent_name ? ' ' + p.students.parent_name : ''},\n\nCeci est un rappel : un paiement de *${p.amount.toLocaleString('fr-MA')} MAD* pour *${p.students?.full_name ?? ''}* est attendu le *${due}*.\n\nCordialement,\n*${schoolName}*`
  }

  function buildSearchLateMessage(eleve: any, totalLeft: number) {
    return `Bonjour${eleve.parent_name ? ' ' + eleve.parent_name : ''},\n\nNous vous rappelons qu'un solde de *${totalLeft.toLocaleString('fr-MA')} MAD* pour la scolarité de *${eleve.full_name}* est en attente de règlement.\n\nMerci de régulariser votre situation.\n\nCordialement,\n*${schoolName}*`
  }

  function formatPhone(phone: string) {
    const cleaned = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '')
    if (cleaned.startsWith('212')) return cleaned
    if (cleaned.startsWith('0')) return '212' + cleaned.slice(1)
    return '212' + cleaned
  }

  function waLink(phone: string, message: string) {
    return `https://wa.me/${formatPhone(phone)}?text=${encodeURIComponent(message)}`
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearchLoading(true); setSelectedEleve(null); setElevePaiements([])
    const { data } = await supabase
      .from('students')
      .select('id, full_name, matricule, parent_name, parent_phone, parent_email, level, class_students(classes(name))')
      .or('full_name.ilike.%' + searchQuery + '%,matricule.ilike.%' + searchQuery + '%,parent_name.ilike.%' + searchQuery + '%,parent_phone.ilike.%' + searchQuery + '%,parent_email.ilike.%' + searchQuery + '%')
      .limit(10)
    setSearchResults(data ?? [])
    setSearchLoading(false)
  }

  async function handleSelectEleve(e: any) {
    setSelectedEleve(e); setSearchResults([])
    const { data } = await supabase.from('payments').select('*').eq('student_id', e.id).order('due_date', { ascending: false })
    setElevePaiements(data ?? [])
  }

  async function handleMarkPaid(id: string) {
    await supabase.from('payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id)
    if (selectedEleve) handleSelectEleve(selectedEleve)
    onRefresh()
  }

  async function handleMarkLate(id: string) {
    await supabase.from('payments').update({ status: 'late' }).eq('id', id)
    onRefresh()
  }

  async function handleSubmit() {
    if (!form.student_id || !form.amount) { setError('Élève et montant sont obligatoires'); return }
    setLoading(true); setError(''); setSuccess('')
    const stored = localStorage.getItem('acx_user')
    if (!stored) { setError('Session expirée'); setLoading(false); return }
    const user = JSON.parse(stored)
    const { data: profile } = await supabase.from('users').select('school_id').eq('id', user.id).single()
    if (!profile?.school_id) { setError('École introuvable'); setLoading(false); return }
    const { error: err } = await supabase.from('payments').insert({
      student_id: form.student_id, school_id: profile.school_id,
      amount: parseFloat(form.amount), type: form.type, due_date: form.due_date,
      status: form.status, notes: form.notes || null,
      paid_at: form.status === 'paid' ? new Date().toISOString() : null,
    })
    if (err) { setError('Erreur : ' + err.message); setLoading(false); return }
    setSuccess('Paiement enregistré')
    setForm({ student_id: '', amount: '', type: 'tuition', due_date: new Date().toISOString().split('T')[0], status: 'pending', notes: '' })
    setLoading(false); onRefresh()
    setTimeout(() => setSuccess(''), 3000)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0',
    borderRadius: '8px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
    outline: 'none', color: '#1E293B', background: '#fff', boxSizing: 'border-box',
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total paiements',  value: stats.total,                                         color: '#2563EB', bg: '#EFF6FF', icon: 'ti-credit-card'  },
          { label: 'Payés',            value: stats.paid,                                           color: '#10B981', bg: '#ECFDF5', icon: 'ti-check-circle' },
          { label: 'En retard',        value: stats.late,                                           color: '#EF4444', bg: '#FEF2F2', icon: 'ti-alert-circle' },
          { label: 'Montant encaissé', value: stats.totalMAD.toLocaleString('fr-MA') + ' MAD',      color: '#F59E0B', bg: '#FFFBEB', icon: 'ti-cash'         },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                <i className={'ti ' + s.icon} />
              </div>
              <span style={{ fontSize: '12px', color: '#64748B' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: '#0F172A' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Barre progression */}
      {stats.total > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B', marginBottom: '6px' }}>
            <span>{stats.paid} payés sur {stats.total}</span>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>{Math.round(stats.paid / stats.total * 100)}%</span>
          </div>
          <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #10B981, #2563EB)', borderRadius: '4px', width: Math.round(stats.paid / stats.total * 100) + '%' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
            <span style={{ color: '#10B981' }}>Encaissé : {stats.totalMAD.toLocaleString('fr-MA')} MAD</span>
            <span style={{ color: '#EF4444' }}>Impayé : {stats.impayeMAD.toLocaleString('fr-MA')} MAD</span>
          </div>
        </div>
      )}

      {/* Actions bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', padding: '4px', borderRadius: '10px' }}>
          {([
            { key: 'liste',     label: 'Liste',     icon: 'ti-list'   },
            { key: 'recherche', label: 'Recherche', icon: 'ti-search' },
            { key: 'ajouter',   label: 'Ajouter',   icon: 'ti-plus'   },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', background: tab === t.key ? '#fff' : 'transparent', color: tab === t.key ? '#1E293B' : '#64748B', boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              <i className={'ti ' + t.icon} style={{ fontSize: '13px' }} /> {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/dashboard/paiements/tarifs" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', color: '#64748B', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
            <i className="ti ti-settings" style={{ fontSize: '14px' }} /> Tarifs
          </Link>
          <Link href="/dashboard/paiements/devis" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', color: '#2563EB', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
            <i className="ti ti-file-invoice" style={{ fontSize: '14px' }} /> Devis
          </Link>
        </div>
      </div>

      {/* ══ TAB LISTE ══ */}
      {tab === 'liste' && (
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', alignItems: 'center' }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: '180px' }}>
              <option value="tous">Tous les statuts</option>
              <option value="paid">Payé</option>
              <option value="pending">En attente</option>
              <option value="late">En retard</option>
            </select>
            <span style={{ fontSize: '13px', color: '#64748B' }}>{filtered.length} paiement{filtered.length > 1 ? 's' : ''}</span>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {['Élève', 'Montant', 'Type', 'Échéance', 'Statut', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'left', whiteSpace: 'nowrap' as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>Aucun paiement</td></tr>
                ) : filtered.map((p, index) => {
                  const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pending
                  return (
                    <tr key={p.id} style={{ borderBottom: index < filtered.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500, flexShrink: 0 }}>
                            {p.students?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{p.students?.full_name}</div>
                            {p.students?.parent_name && <div style={{ fontSize: '11px', color: '#94A3B8' }}>{p.students.parent_name}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '14px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' as const }}>
                        {p.amount.toLocaleString('fr-MA')} MAD
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: '#475569' }}>
                        {p.type === 'tuition' ? 'Scolarité' : p.type === 'registration' ? 'Inscription' : 'Autre'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' as const }}>
                        {new Date(p.due_date).toLocaleDateString('fr-MA', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: 500, background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {/* Marquer payé */}
                          {p.status !== 'paid' && (
                            <button onClick={() => handleMarkPaid(p.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #86EFAC', background: '#DCFCE7', color: '#166534', cursor: 'pointer', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' as const }}>
                              <i className="ti ti-check" /> Payé
                            </button>
                          )}
                          {/* Marquer retard */}
                          {p.status === 'pending' && (
                            <button onClick={() => handleMarkLate(p.id)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', fontSize: '13px' }}>
                              <i className="ti ti-clock-exclamation" />
                            </button>
                          )}
                          {/* WhatsApp — retard */}
                          {p.students?.parent_phone && p.status === 'late' && (
                            <a href={waLink(p.students.parent_phone, buildLateMessage(p))} target="_blank" rel="noopener noreferrer" title="Relancer via WhatsApp" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#25D366', textDecoration: 'none', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap' as const }}>
                              <WaIcon size="13px" /> Relancer
                            </a>
                          )}
                          {/* WhatsApp — rappel */}
                          {p.students?.parent_phone && p.status === 'pending' && (
                            <a href={waLink(p.students.parent_phone, buildReminderMessage(p))} target="_blank" rel="noopener noreferrer" title="Envoyer rappel WhatsApp" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#25D366', textDecoration: 'none', fontSize: '13px' }}>
                              <WaIcon size="13px" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ TAB RECHERCHE ══ */}
      {tab === 'recherche' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '16px' }} />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Nom, matricule, parent, téléphone, email..." style={{ ...inputStyle, paddingLeft: '36px' }} />
            </div>
            <button onClick={handleSearch} disabled={searchLoading} style={{ padding: '9px 20px', border: 'none', borderRadius: '8px', background: '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' as const }}>
              {searchLoading ? 'Recherche...' : 'Rechercher'}
            </button>
          </div>

          {/* Résultats */}
          {searchResults.length > 0 && !selectedEleve && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem' }}>
              <div style={{ padding: '10px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 500, color: '#64748B' }}>
                {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}
              </div>
              {searchResults.map((e: any, i: number) => (
                <div key={e.id} onClick={() => handleSelectEleve(e)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i < searchResults.length - 1 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer' }}
                  onMouseEnter={el => (el.currentTarget as HTMLElement).style.background = '#F8FAFC'}
                  onMouseLeave={el => (el.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}>
                    {e.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E293B' }}>{e.full_name}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      {e.matricule && <span style={{ marginRight: '8px', fontFamily: 'monospace' }}>{e.matricule}</span>}
                      {e.parent_name && <span>· {e.parent_name}</span>}
                    </div>
                  </div>
                  <i className="ti ti-chevron-right" style={{ color: '#CBD5E1' }} />
                </div>
              ))}
            </div>
          )}

          {/* Fiche élève sélectionné */}
          {selectedEleve && (
            <div>
              <button onClick={() => { setSelectedEleve(null); setElevePaiements([]) }} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1rem', padding: 0, fontFamily: 'DM Sans, sans-serif' }}>
                <i className="ti ti-arrow-left" /> Nouvelle recherche
              </button>

              {/* Infos */}
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 600, flexShrink: 0 }}>
                    {selectedEleve.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', fontFamily: 'Syne, sans-serif' }}>{selectedEleve.full_name}</div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                      {selectedEleve.matricule && <span style={{ fontSize: '11px', background: '#F1F5F9', color: '#64748B', padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>{selectedEleve.matricule}</span>}
                      {selectedEleve.level && <span style={{ fontSize: '11px', background: '#DBEAFE', color: '#1E3A8A', padding: '2px 8px', borderRadius: '6px' }}>{selectedEleve.level}</span>}
                      {selectedEleve.class_students?.[0]?.classes?.name && <span style={{ fontSize: '11px', background: '#ECFDF5', color: '#166534', padding: '2px 8px', borderRadius: '6px' }}>{selectedEleve.class_students[0].classes.name}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
                  {selectedEleve.parent_name  && <div style={{ padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}><div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '2px' }}>Parent</div><div style={{ fontSize: '13px', fontWeight: 500 }}>{selectedEleve.parent_name}</div></div>}
                  {selectedEleve.parent_phone && <div style={{ padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}><div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '2px' }}>Téléphone</div><div style={{ fontSize: '13px', fontWeight: 500 }}>{selectedEleve.parent_phone}</div></div>}
                  {selectedEleve.parent_email && <div style={{ padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}><div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '2px' }}>Email</div><div style={{ fontSize: '13px', fontWeight: 500 }}>{selectedEleve.parent_email}</div></div>}
                </div>
              </div>

              {/* Résumé + WhatsApp relance */}
              {elevePaiements.length > 0 && (() => {
                const totalDu   = elevePaiements.reduce((s, p) => s + p.amount, 0)
                const totalPaid = elevePaiements.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
                const totalLeft = elevePaiements.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amount, 0)
                const hasLate   = elevePaiements.some(p => p.status === 'late')
                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                      {[
                        { label: 'Total dû',  value: totalDu.toLocaleString('fr-MA') + ' MAD',   color: '#2563EB', bg: '#EFF6FF' },
                        { label: 'Payé',      value: totalPaid.toLocaleString('fr-MA') + ' MAD', color: '#166534', bg: '#DCFCE7' },
                        { label: 'Reste',     value: totalLeft.toLocaleString('fr-MA') + ' MAD', color: totalLeft > 0 ? '#DC2626' : '#166534', bg: totalLeft > 0 ? '#FEF2F2' : '#DCFCE7' },
                      ].map(s => (
                        <div key={s.label} style={{ background: s.bg, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: s.color, marginBottom: '4px' }}>{s.label}</div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: s.color }}>{s.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Bouton WhatsApp relance globale */}
                    {totalLeft > 0 && selectedEleve.parent_phone && (
                      <a
                        href={waLink(selectedEleve.parent_phone, buildSearchLateMessage(selectedEleve, totalLeft))}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: '#25D366', color: '#fff', borderRadius: '9px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', marginBottom: '12px' }}
                      >
                        <WaIcon size="16px" />
                        Envoyer relance WhatsApp — {totalLeft.toLocaleString('fr-MA')} MAD {hasLate ? 'en retard' : 'en attente'}
                      </a>
                    )}

                    {/* Tableau historique */}
                    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '13px', fontWeight: 500, color: '#64748B' }}>
                        Historique ({elevePaiements.length} paiements)
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                            {['Type', 'Montant', 'Échéance', 'Payé le', 'Statut', 'Action'].map(h => (
                              <th key={h} style={{ padding: '9px 14px', fontSize: '11px', fontWeight: 500, color: '#64748B', textAlign: 'left' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {elevePaiements.map((p: any, i: number) => {
                            const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pending
                            return (
                              <tr key={p.id} style={{ borderBottom: i < elevePaiements.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                                <td style={{ padding: '9px 14px', fontSize: '13px', color: '#475569' }}>{p.type === 'tuition' ? 'Scolarité' : 'Inscription'}</td>
                                <td style={{ padding: '9px 14px', fontSize: '13px', fontWeight: 600 }}>{p.amount.toLocaleString('fr-MA')} MAD</td>
                                <td style={{ padding: '9px 14px', fontSize: '13px', color: '#475569' }}>{new Date(p.due_date).toLocaleDateString('fr-MA')}</td>
                                <td style={{ padding: '9px 14px', fontSize: '13px', color: '#475569' }}>{p.paid_at ? new Date(p.paid_at).toLocaleDateString('fr-MA') : '—'}</td>
                                <td style={{ padding: '9px 14px' }}>
                                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                                </td>
                                <td style={{ padding: '9px 14px' }}>
                                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                    {p.status !== 'paid' && (
                                      <button onClick={() => handleMarkPaid(p.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #86EFAC', background: '#DCFCE7', color: '#166534', cursor: 'pointer', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}>
                                        <i className="ti ti-check" /> Payé
                                      </button>
                                    )}
                                    {p.status !== 'paid' && selectedEleve.parent_phone && (
                                      <a href={waLink(selectedEleve.parent_phone, buildReminderMessage({ ...p, students: selectedEleve }))} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#25D366', textDecoration: 'none', fontSize: '13px' }}>
                                        <WaIcon size="13px" />
                                      </a>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )
              })()}

              {elevePaiements.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                  <i className="ti ti-credit-card-off" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
                  Aucun paiement pour cet élève
                </div>
              )}
            </div>
          )}

          {searchResults.length === 0 && !selectedEleve && searchQuery && !searchLoading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
              <i className="ti ti-search-off" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
              Aucun résultat pour "{searchQuery}"
            </div>
          )}
        </div>
      )}

      {/* ══ TAB AJOUTER ══ */}
      {tab === 'ajouter' && (
        <div style={{ maxWidth: '500px' }}>
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>
                <i className="ti ti-plus" />
              </div>
              Nouveau paiement
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Élève *</label>
              <select value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))} style={inputStyle}>
                <option value="">Sélectionnez un élève</option>
                {eleves.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Montant (MAD) *</label>
                <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="800" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                  <option value="tuition">Scolarité</option>
                  <option value="registration">Inscription</option>
                  <option value="other">Autre</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Date d'échéance</label>
                <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Statut</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
                  <option value="pending">En attente</option>
                  <option value="paid">Payé</option>
                  <option value="late">En retard</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Mois concerné, remarques..." style={inputStyle} />
            </div>
            {error   && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}
            {success && <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166634', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>{success}</div>}
            <button onClick={handleSubmit} disabled={loading} style={{ padding: '11px', border: 'none', borderRadius: '10px', background: loading ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Enregistrement...' : 'Enregistrer le paiement'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}