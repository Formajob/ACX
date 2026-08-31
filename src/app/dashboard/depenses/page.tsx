'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

const CATEGORIES_PREDEFINIES = [
  { key: 'salaires',    label: 'Salaires',     icon: 'ti-user-dollar',    color: '#2563EB', bg: '#EFF6FF' },
  { key: 'charges',     label: 'Charges',      icon: 'ti-bolt',           color: '#F59E0B', bg: '#FFFBEB' },
  { key: 'fournitures', label: 'Fournitures',  icon: 'ti-pencil',         color: '#10B981', bg: '#ECFDF5' },
  { key: 'entretien',   label: 'Entretien',    icon: 'ti-tool',           color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'autre',       label: 'Autre',        icon: 'ti-dots',           color: '#64748B', bg: '#F1F5F9' },
]

interface Expense {
  id: string
  category: string
  label: string
  amount: number
  date: string
  paid_to: string | null
  notes: string | null
  created_at: string
}

export default function DepensesPage() {
  const supabase = createClient()
  const router = useRouter()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'liste' | 'ajouter' | 'tableau_bord'>('tableau_bord')
  const [filterCat, setFilterCat] = useState('tous')
  const [filterMonth, setFilterMonth] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    category:   'salaires',
    custom_cat: '',
    label:      '',
    amount:     '',
    date:       new Date().toISOString().split('T')[0],
    paid_to:    '',
    notes:      '',
  })

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    loadData(user.school_id)
  }, [])

  async function loadData(schoolId: string) {
    const [{ data: exp }, { data: pays }] = await Promise.all([
      supabase.from('expenses').select('*').eq('school_id', schoolId).order('date', { ascending: false }),
      supabase.from('payments').select('amount, status, due_date').eq('school_id', schoolId),
    ])
    setExpenses(exp ?? [])
    setPayments(pays ?? [])
    setLoading(false)
  }

  function resetForm() {
    setForm({ category: 'salaires', custom_cat: '', label: '', amount: '', date: new Date().toISOString().split('T')[0], paid_to: '', notes: '' })
    setEditingId(null); setError(''); setSuccess('')
  }

  function startEdit(exp: Expense) {
    const isPredefined = CATEGORIES_PREDEFINIES.find(c => c.key === exp.category)
    setForm({
      category:   isPredefined ? exp.category : 'custom',
      custom_cat: isPredefined ? '' : exp.category,
      label:      exp.label,
      amount:     String(exp.amount),
      date:       exp.date,
      paid_to:    exp.paid_to ?? '',
      notes:      exp.notes ?? '',
    })
    setEditingId(exp.id)
    setTab('ajouter')
  }

  async function handleSubmit() {
    if (!form.label.trim() || !form.amount) { setError('Libellé et montant sont obligatoires'); return }
    const cat = form.category === 'custom' ? (form.custom_cat.trim() || 'autre') : form.category
    setSaving(true); setError(''); setSuccess('')

    const stored = localStorage.getItem('acx_user')
    if (!stored) return
    const user = JSON.parse(stored)

    const payload = {
      school_id:  user.school_id,
      category:   cat,
      label:      form.label.trim(),
      amount:     parseFloat(form.amount),
      date:       form.date,
      paid_to:    form.paid_to || null,
      notes:      form.notes || null,
      created_by: user.id,
    }

    const { error: err } = editingId
      ? await supabase.from('expenses').update(payload).eq('id', editingId)
      : await supabase.from('expenses').insert(payload)

    if (err) { setError('Erreur: ' + err.message); setSaving(false); return }
    setSuccess(editingId ? 'Dépense modifiée' : 'Dépense enregistrée')
    resetForm()
    setSaving(false)
    loadData(user.school_id)
    setTimeout(() => { setSuccess(''); setTab('liste') }, 1000)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette dépense ?')) return
    const stored = localStorage.getItem('acx_user')
    if (!stored) return
    const user = JSON.parse(stored)
    await supabase.from('expenses').delete().eq('id', id)
    loadData(user.school_id)
  }

  function getCatConfig(key: string) {
    return CATEGORIES_PREDEFINIES.find(c => c.key === key) ?? { label: key, icon: 'ti-dots', color: '#64748B', bg: '#F1F5F9' }
  }

  // Stats financières
  const totalRecettes = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const totalDepenses  = expenses.reduce((s, e) => s + e.amount, 0)
  const solde          = totalRecettes - totalDepenses

  // Par catégorie
  const byCat = CATEGORIES_PREDEFINIES.map(c => ({
    ...c,
    total: expenses.filter(e => e.category === c.key).reduce((s, e) => s + e.amount, 0),
    count: expenses.filter(e => e.category === c.key).length,
  }))

  // Par mois
  const byMonth: Record<string, number> = {}
  expenses.forEach(e => {
    const m = e.date.slice(0, 7)
    byMonth[m] = (byMonth[m] ?? 0) + e.amount
  })

  // Filtres
  const filtered = expenses.filter(e => {
    const matchCat   = filterCat   === 'tous' || e.category === filterCat
    const matchMonth = !filterMonth || e.date.startsWith(filterMonth)
    return matchCat && matchMonth
  })

  const months = [...new Set(expenses.map(e => e.date.slice(0, 7)))].sort((a, b) => b.localeCompare(a))

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0',
    borderRadius: '8px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
    outline: 'none', color: '#1E293B', background: '#fff', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px' }

  if (loading) return <div style={{ padding: '2rem', color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}>Chargement...</div>

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>Dépenses</h1>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>Gestion de la caisse de l'école</p>
        </div>
        <button onClick={() => { resetForm(); setTab(tab === 'ajouter' ? 'liste' : 'ajouter') }} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#EF4444', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
          <i className={tab === 'ajouter' ? 'ti ti-list' : 'ti ti-plus'} />
          {tab === 'ajouter' ? 'Voir les dépenses' : 'Ajouter une dépense'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', background: '#F1F5F9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {([
          { key: 'tableau_bord', label: 'Vue d\'ensemble', icon: 'ti-chart-bar'  },
          { key: 'liste',        label: 'Liste',           icon: 'ti-list'        },
          { key: 'ajouter',      label: editingId ? 'Modifier' : 'Ajouter', icon: editingId ? 'ti-pencil' : 'ti-plus' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); if (t.key !== 'ajouter') resetForm() }} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 16px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', background: tab === t.key ? '#fff' : 'transparent', color: tab === t.key ? '#1E293B' : '#64748B', boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            <i className={'ti ' + t.icon} style={{ fontSize: '13px' }} /> {t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB TABLEAU DE BORD ══ */}
      {tab === 'tableau_bord' && (
        <div>
          {/* KPIs caisse */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total recettes',  value: totalRecettes, color: '#166534', bg: '#DCFCE7', icon: 'ti-trending-up',   suffix: 'MAD' },
              { label: 'Total dépenses',  value: totalDepenses,  color: '#DC2626', bg: '#FEF2F2', icon: 'ti-trending-down', suffix: 'MAD' },
              { label: 'Solde caisse',    value: solde,          color: solde >= 0 ? '#166534' : '#DC2626', bg: solde >= 0 ? '#DCFCE7' : '#FEF2F2', icon: 'ti-wallet', suffix: 'MAD' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                    <i className={'ti ' + s.icon} />
                  </div>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>{s.label}</span>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: s.color, lineHeight: 1 }}>
                  {s.value.toLocaleString('fr-MA')}
                  <span style={{ fontSize: '14px', fontWeight: 400, marginLeft: '4px' }}>{s.suffix}</span>
                </div>
                {/* Barre visuelle */}
                {s.label === 'Solde caisse' && totalRecettes > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: solde >= 0 ? '#10B981' : '#EF4444', borderRadius: '3px', width: Math.min(100, Math.abs(solde) / totalRecettes * 100) + '%' }} />
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                      {totalRecettes > 0 ? Math.round((totalDepenses / totalRecettes) * 100) : 0}% des recettes dépensées
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Par catégorie */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '1.5rem' }}>
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', marginBottom: '1rem' }}>
                Dépenses par catégorie
              </div>
              {byCat.filter(c => c.total > 0).map(c => (
                <div key={c.key} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#1E293B' }}>
                      <i className={'ti ' + c.icon} style={{ color: c.color, fontSize: '14px' }} />
                      {c.label}
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>({c.count})</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: c.color }}>{c.total.toLocaleString('fr-MA')} MAD</span>
                  </div>
                  <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: c.color, borderRadius: '3px', width: totalDepenses > 0 ? (c.total / totalDepenses * 100) + '%' : '0%', transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>
                    {totalDepenses > 0 ? Math.round(c.total / totalDepenses * 100) : 0}% du total
                  </div>
                </div>
              ))}
            </div>

            {/* Par mois */}
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', marginBottom: '1rem' }}>
                Dépenses par mois
              </div>
              {Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6).map(([month, total]) => {
                const maxMonth = Math.max(...Object.values(byMonth))
                return (
                  <div key={month} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                      <span style={{ color: '#1E293B' }}>
                        {new Date(month + '-01').toLocaleDateString('fr-MA', { month: 'long', year: 'numeric' })}
                      </span>
                      <span style={{ fontWeight: 600, color: '#EF4444' }}>{total.toLocaleString('fr-MA')} MAD</span>
                    </div>
                    <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#EF4444', borderRadius: '3px', width: maxMonth > 0 ? (total / maxMonth * 100) + '%' : '0%', opacity: 0.7 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Dernières dépenses */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '13px', fontWeight: 500, color: '#64748B' }}>
              5 dernières dépenses
            </div>
            {expenses.slice(0, 5).map((e, i) => {
              const cfg = getCatConfig(e.category)
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px', borderBottom: i < 4 ? '1px solid #F1F5F9' : 'none' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>
                    <i className={'ti ' + cfg.icon} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{e.label}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                      {new Date(e.date).toLocaleDateString('fr-MA')}
                      {e.paid_to && ' · ' + e.paid_to}
                    </div>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#EF4444' }}>{e.amount.toLocaleString('fr-MA')} MAD</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══ TAB LISTE ══ */}
      {tab === 'liste' && (
        <div>
          {/* Filtres */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: '160px' }}>
              <option value="tous">Toutes catégories</option>
              {CATEGORIES_PREDEFINIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: '160px' }}>
              <option value="">Tous les mois</option>
              {months.map(m => (
                <option key={m} value={m}>
                  {new Date(m + '-01').toLocaleDateString('fr-MA', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B' }}>
              Total filtré : <strong style={{ color: '#EF4444' }}>{filtered.reduce((s, e) => s + e.amount, 0).toLocaleString('fr-MA')} MAD</strong>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {['Catégorie', 'Libellé', 'Date', 'Payé à', 'Montant', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px' }}>Aucune dépense</td></tr>
                ) : filtered.map((e, i) => {
                  const cfg = getCatConfig(e.category)
                  return (
                    <tr key={e.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: 500, background: cfg.bg, color: cfg.color }}>
                          <i className={'ti ' + cfg.icon} style={{ fontSize: '12px' }} />
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{e.label}</div>
                        {e.notes && <div style={{ fontSize: '11px', color: '#94A3B8' }}>{e.notes}</div>}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' as const }}>
                        {new Date(e.date).toLocaleDateString('fr-MA', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: '#475569' }}>{e.paid_to ?? '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '14px', fontWeight: 700, color: '#EF4444', whiteSpace: 'nowrap' as const }}>
                        {e.amount.toLocaleString('fr-MA')} MAD
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => startEdit(e)} style={{ width: '28px', height: '28px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', color: '#2563EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>
                            <i className="ti ti-pencil" />
                          </button>
                          <button onClick={() => handleDelete(e.id)} style={{ width: '28px', height: '28px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>
                            <i className="ti ti-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '12px', color: '#94A3B8' }}>
            {filtered.length} dépense{filtered.length > 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* ══ TAB AJOUTER / MODIFIER ══ */}
      {tab === 'ajouter' && (
        <div style={{ maxWidth: '560px' }}>
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>
                <i className={editingId ? 'ti ti-pencil' : 'ti ti-plus'} />
              </div>
              {editingId ? 'Modifier la dépense' : 'Nouvelle dépense'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Catégorie */}
              <div>
                <label style={labelStyle}>Catégorie *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: form.category === 'custom' ? '8px' : '0' }}>
                  {[...CATEGORIES_PREDEFINIES, { key: 'custom', label: 'Personnalisée', icon: 'ti-tag', color: '#64748B', bg: '#F1F5F9' }].map(c => (
                    <button
                      key={c.key}
                      onClick={() => setForm(p => ({ ...p, category: c.key }))}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px', border: '1px solid ' + (form.category === c.key ? c.color : '#E2E8F0'), borderRadius: '8px', background: form.category === c.key ? c.bg : '#fff', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: form.category === c.key ? 600 : 400, color: form.category === c.key ? c.color : '#64748B' }}
                    >
                      <i className={'ti ' + c.icon} style={{ fontSize: '14px' }} />
                      {c.label}
                    </button>
                  ))}
                </div>
                {form.category === 'custom' && (
                  <input type="text" value={form.custom_cat} onChange={e => setForm(p => ({ ...p, custom_cat: e.target.value }))} placeholder="Nom de la catégorie personnalisée" style={inputStyle} />
                )}
              </div>

              <div>
                <label style={labelStyle}>Libellé *</label>
                <input type="text" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="Ex: Salaire janvier, Facture eau..." style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Montant (MAD) *</label>
                  <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Payé à / Bénéficiaire</label>
                <input type="text" value={form.paid_to} onChange={e => setForm(p => ({ ...p, paid_to: e.target.value }))} placeholder="Nom du fournisseur, employé..." style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Numéro de facture, remarques..." style={{ ...inputStyle, resize: 'vertical' as const }} />
              </div>

              {error   && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}
              {success && <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>{success}</div>}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { resetForm(); setTab('liste') }} style={{ flex: 1, padding: '10px', border: '1px solid #E2E8F0', borderRadius: '9px', background: '#fff', color: '#64748B', fontSize: '14px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  Annuler
                </button>
                <button onClick={handleSubmit} disabled={saving} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: '9px', background: saving ? '#94A3B8' : '#EF4444', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Enregistrer la dépense'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}