'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface Props {
  studentId: string
  studentName: string
  studentLevel: string
  parentName?: string
  parentPhone?: string
  parentEmail?: string
  schoolName: string
  readOnly?: boolean
}

interface StudentFee {
  id?: string
  tuition: number
  registration: number
  has_transport: boolean
  transport: number
  has_canteen: boolean
  canteen: number
  has_boarding: boolean
  boarding: number
  discount_type: 'none' | 'percent' | 'fixed'
  discount_value: number
  discount_reason: string
  notes: string
}

const DEFAULT_FEE: StudentFee = {
  tuition: 0, registration: 0,
  has_transport: false, transport: 0,
  has_canteen: false, canteen: 0,
  has_boarding: false, boarding: 0,
  discount_type: 'none', discount_value: 0, discount_reason: '', notes: '',
}

export default function StudentFinances({ studentId, studentName, studentLevel, parentName, parentPhone, parentEmail, schoolName, readOnly = false }: Props) {
  const supabase = createClient()
  const [fee, setFee] = useState<StudentFee>(DEFAULT_FEE)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'config' | 'historique'>('config')

  useEffect(() => {
    loadData()
  }, [studentId])

  async function loadData() {
    const [{ data: feeData }, { data: paysData }] = await Promise.all([
      supabase.from('student_fees').select('*').eq('student_id', studentId).single(),
      supabase.from('payments').select('*').eq('student_id', studentId).order('due_date', { ascending: false }),
    ])

    if (feeData) {
      setFee({
        id:             feeData.id,
        tuition:        feeData.tuition,
        registration:   feeData.registration,
        has_transport:  feeData.has_transport,
        transport:      feeData.transport ?? 0,
        has_canteen:    feeData.has_canteen,
        canteen:        feeData.canteen ?? 0,
        has_boarding:   feeData.has_boarding,
        boarding:       feeData.boarding ?? 0,
        discount_type:  feeData.discount_type ?? 'none',
        discount_value: feeData.discount_value ?? 0,
        discount_reason:feeData.discount_reason ?? '',
        notes:          feeData.notes ?? '',
      })
    } else {
      // Charger depuis fee_configs selon le niveau
      const stored = localStorage.getItem('acx_user')
      if (stored) {
        const user = JSON.parse(stored)
        const { data: cfg } = await supabase
          .from('fee_configs')
          .select('*')
          .eq('school_id', user.school_id)
          .eq('level', studentLevel)
          .single()
        if (cfg) {
          setFee(prev => ({
            ...prev,
            tuition:      cfg.tuition,
            registration: cfg.registration,
            transport:    cfg.transport,
            canteen:      cfg.canteen,
            boarding:     cfg.boarding,
          }))
        }
      }
    }

    setPayments(paysData ?? [])
    setLoading(false)
  }

  function getSubtotal() {
    let total = fee.tuition * 10 + fee.registration
    if (fee.has_transport) total += fee.transport * 10
    if (fee.has_canteen)   total += fee.canteen * 10
    if (fee.has_boarding)  total += fee.boarding * 10
    return total
  }

  function getDiscount() {
    const sub = getSubtotal()
    if (fee.discount_type === 'percent') return Math.round(sub * fee.discount_value / 100)
    if (fee.discount_type === 'fixed')   return fee.discount_value
    return 0
  }

  function getTotal() { return getSubtotal() - getDiscount() }

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const totalLeft = getTotal() - totalPaid

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')
    const stored = localStorage.getItem('acx_user')
    if (!stored) return
    const user = JSON.parse(stored)

    const { data: year } = await supabase.from('school_years').select('id').eq('school_id', user.school_id).eq('is_active', true).single()

    const payload = {
      student_id:      studentId,
      school_id:       user.school_id,
      school_year_id:  year?.id ?? null,
      tuition:         fee.tuition,
      registration:    fee.registration,
      has_transport:   fee.has_transport,
      transport:       fee.transport,
      has_canteen:     fee.has_canteen,
      canteen:         fee.canteen,
      has_boarding:    fee.has_boarding,
      boarding:        fee.boarding,
      discount_type:   fee.discount_type,
      discount_value:  fee.discount_value,
      discount_reason: fee.discount_reason || null,
      notes:           fee.notes || null,
      updated_at:      new Date().toISOString(),
    }

    const { error: err } = fee.id
      ? await supabase.from('student_fees').update(payload).eq('id', fee.id)
      : await supabase.from('student_fees').insert(payload)

    if (err) { setError('Erreur: ' + err.message); setSaving(false); return }
    setSuccess('Configuration sauvegardee')
    setSaving(false)
    loadData()
  }

  async function generatePDF(type: 'invoice' | 'quote') {
    setGenerating(true)
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const today = new Date().toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' })
    const num = (type === 'invoice' ? 'FAC' : 'DEV') + '-' + Date.now().toString().slice(-6)

    // En-tête
    doc.setFillColor(23, 37, 84)
    doc.rect(0, 0, pageW, 42, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(255, 255, 255)
    doc.text('ACX', 15, 18)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(147, 197, 253)
    doc.text('Plateforme de gestion scolaire', 15, 24)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(255, 255, 255)
    doc.text(schoolName, pageW - 15, 16, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(147, 197, 253)
    doc.text('acx.ma', pageW - 15, 22, { align: 'right' })

    // Titre
    const titleLabel = type === 'invoice' ? 'FACTURE' : 'DEVIS'
    const titleColor = type === 'invoice' ? [37, 99, 235] : [239, 68, 68]
    doc.setFillColor(239, 246, 255)
    doc.rect(0, 42, pageW, 18, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(titleColor[0], titleColor[1], titleColor[2])
    doc.text(titleLabel + ' DE SCOLARITE', pageW / 2, 53, { align: 'center' })

    // Infos doc
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('N° ' + num, 15, 70)
    doc.text('Date : ' + today, 15, 76)
    if (type === 'quote') {
      const validity = new Date()
      validity.setDate(validity.getDate() + 7)
      doc.text('Valable jusqu\'au : ' + validity.toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' }), 15, 82)
    }

    // Infos élève
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(14, 88, pageW - 28, 36, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    doc.text('Élève :', 20, 97)
    doc.setFont('helvetica', 'normal')
    doc.text(studentName, 45, 97)
    doc.text('Niveau : ' + studentLevel, 45, 104)

    if (parentName) {
      doc.setFont('helvetica', 'bold')
      doc.text('Parent :', 20, 111)
      doc.setFont('helvetica', 'normal')
      doc.text(parentName, 45, 111)
    }
    if (parentPhone) doc.text('Tél : ' + parentPhone, pageW / 2, 97)
    if (parentEmail) doc.text(parentEmail, pageW / 2, 104)

    // Tableau prestations
    const rows: any[] = []
    rows.push(['Frais de scolarité', '10 mois × ' + fee.tuition + ' MAD', (fee.tuition * 10) + ' MAD'])
    rows.push(['Frais d\'inscription', 'Annuel', fee.registration + ' MAD'])
    if (fee.has_transport) rows.push(['Transport scolaire', '10 mois × ' + fee.transport + ' MAD', (fee.transport * 10) + ' MAD'])
    if (fee.has_canteen)   rows.push(['Cantine scolaire',   '10 mois × ' + fee.canteen + ' MAD',   (fee.canteen * 10) + ' MAD'])
    if (fee.has_boarding)  rows.push(['Internat',           '10 mois × ' + fee.boarding + ' MAD',  (fee.boarding * 10) + ' MAD'])

    autoTable(doc, {
      startY: 132,
      head: [['Prestation', 'Détail', 'Montant']],
      body: rows,
      styles: { fontSize: 10, cellPadding: 5, font: 'helvetica' },
      headStyles: { fillColor: [23, 37, 84], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 65, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    })

    const finalY = (doc as any).lastAutoTable.finalY + 6

    // Sous-total + remise + total
    let currentY = finalY

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('Sous-total :', pageW - 70, currentY)
    doc.setTextColor(30, 41, 59)
    doc.setFont('helvetica', 'bold')
    doc.text(getSubtotal().toLocaleString('fr-MA') + ' MAD', pageW - 15, currentY, { align: 'right' })

    if (getDiscount() > 0) {
      currentY += 7
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text('Remise' + (fee.discount_reason ? ' (' + fee.discount_reason + ')' : '') + ' :', pageW - 70, currentY)
      doc.setTextColor(239, 68, 68)
      doc.setFont('helvetica', 'bold')
      doc.text('- ' + getDiscount().toLocaleString('fr-MA') + ' MAD', pageW - 15, currentY, { align: 'right' })
    }

    currentY += 8
    doc.setFillColor(23, 37, 84)
    doc.roundedRect(pageW - 80, currentY - 5, 66, 14, 2, 2, 'F')
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('TOTAL : ' + getTotal().toLocaleString('fr-MA') + ' MAD', pageW - 47, currentY + 5, { align: 'center' })

    if (type === 'invoice' && totalPaid > 0) {
      currentY += 18
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text('Déjà payé : ' + totalPaid.toLocaleString('fr-MA') + ' MAD', pageW - 15, currentY, { align: 'right' })
      currentY += 5
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(totalLeft > 0 ? 220 : 22, totalLeft > 0 ? 38 : 101, totalLeft > 0 ? 38 : 52)
      doc.text('Reste à payer : ' + totalLeft.toLocaleString('fr-MA') + ' MAD', pageW - 15, currentY, { align: 'right' })
    }

    if (fee.notes) {
      currentY += 14
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(100, 116, 139)
      doc.text('Note : ' + fee.notes, 15, currentY)
    }

    // Pied de page
    const pageH = doc.internal.pageSize.getHeight()
    doc.setFillColor(23, 37, 84)
    doc.rect(0, pageH - 18, pageW, 18, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(147, 197, 253)
    doc.text('ACX — Plateforme de gestion scolaire | acx.ma', pageW / 2, pageH - 10, { align: 'center' })
    if (type === 'quote') doc.text('Ce devis est valable 7 jours à compter de sa date d\'émission.', pageW / 2, pageH - 5, { align: 'center' })

    const filename = (type === 'invoice' ? 'Facture' : 'Devis') + '-' + studentName.replace(/\s/g, '-') + '-' + num + '.pdf'
    doc.save(filename)
    setGenerating(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0',
    borderRadius: '7px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
    outline: 'none', color: '#1E293B', background: '#fff', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px' }

  if (loading) return <div style={{ padding: '1rem', color: '#94A3B8', fontSize: '13px' }}>Chargement...</div>

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem', background: '#F1F5F9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {([
          { key: 'config',     label: 'Configuration tarifaire', icon: 'ti-settings'     },
          { key: 'historique', label: 'Historique paiements',    icon: 'ti-credit-card'   },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', background: tab === t.key ? '#fff' : 'transparent', color: tab === t.key ? '#1E293B' : '#64748B', boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            <i className={'ti ' + t.icon} style={{ fontSize: '13px' }} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Config */}
      {tab === 'config' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

          {/* Formulaire */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Frais principaux */}
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                <i className="ti ti-school" style={{ marginRight: '5px' }} /> Frais scolaires
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <label style={labelStyle}>Scolarité mensuelle (MAD)</label>
                  <input type="number" value={fee.tuition || ''} onChange={e => setFee(p => ({ ...p, tuition: parseFloat(e.target.value) || 0 }))} placeholder="0" style={inputStyle} disabled={readOnly} />
                </div>
                <div>
                  <label style={labelStyle}>Frais d'inscription (MAD)</label>
                  <input type="number" value={fee.registration || ''} onChange={e => setFee(p => ({ ...p, registration: parseFloat(e.target.value) || 0 }))} placeholder="0" style={inputStyle} disabled={readOnly} />
                </div>
              </div>
            </div>

            {/* Services */}
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                <i className="ti ti-settings" style={{ marginRight: '5px' }} /> Services optionnels
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { key: 'transport', label: 'Transport',  icon: 'ti-bus',              hasKey: 'has_transport' },
                  { key: 'canteen',   label: 'Cantine',    icon: 'ti-tools-kitchen-2',  hasKey: 'has_canteen'   },
                  { key: 'boarding',  label: 'Internat',   icon: 'ti-building',         hasKey: 'has_boarding'  },
                ].map(s => (
                  <div key={s.key}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: (fee as any)[s.hasKey] ? '6px' : '0' }}>
                      <input type="checkbox" id={s.key} checked={(fee as any)[s.hasKey]} onChange={e => setFee(p => ({ ...p, [s.hasKey]: e.target.checked }))} style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#10B981' }} disabled={readOnly} />
                      <label htmlFor={s.key} style={{ fontSize: '13px', color: '#1E293B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <i className={'ti ' + s.icon} style={{ color: '#10B981', fontSize: '15px' }} /> {s.label}
                      </label>
                    </div>
                    {(fee as any)[s.hasKey] && (
                      <div style={{ marginLeft: '23px' }}>
                        <input type="number" value={(fee as any)[s.key] || ''} onChange={e => setFee(p => ({ ...p, [s.key]: parseFloat(e.target.value) || 0 }))} placeholder="Montant mensuel MAD" style={{ ...inputStyle, maxWidth: '200px' }} disabled={readOnly} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Remise */}
            {!readOnly && (
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  <i className="ti ti-discount" style={{ marginRight: '5px' }} /> Remise
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <label style={labelStyle}>Type de remise</label>
                    <select value={fee.discount_type} onChange={e => setFee(p => ({ ...p, discount_type: e.target.value as any }))} style={inputStyle}>
                      <option value="none">Aucune remise</option>
                      <option value="percent">Remise en pourcentage (%)</option>
                      <option value="fixed">Remise montant fixe (MAD)</option>
                    </select>
                  </div>
                  {fee.discount_type !== 'none' && (
                    <>
                      <div>
                        <label style={labelStyle}>Valeur {fee.discount_type === 'percent' ? '(%)' : '(MAD)'}</label>
                        <input type="number" value={fee.discount_value || ''} onChange={e => setFee(p => ({ ...p, discount_value: parseFloat(e.target.value) || 0 }))} placeholder="0" style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Motif de la remise</label>
                        <input type="text" value={fee.discount_reason} onChange={e => setFee(p => ({ ...p, discount_reason: e.target.value }))} placeholder="Ex: Remise fratrie, cas social..." style={inputStyle} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {!readOnly && (
              <div>
                <label style={labelStyle}>Notes internes</label>
                <textarea value={fee.notes} onChange={e => setFee(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Remarques sur la configuration tarifaire..." style={{ ...inputStyle, resize: 'vertical' as const }} />
              </div>
            )}

            {/* Messages */}
            {error && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}
            {success && <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>{success}</div>}

            {!readOnly && (
              <button onClick={handleSave} disabled={saving} style={{ padding: '10px', border: 'none', borderRadius: '8px', background: saving ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
              </button>
            )}
          </div>

          {/* Récapitulatif + PDF */}
          <div style={{ position: 'sticky', top: '80px', alignSelf: 'start' }}>
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>

              {/* En-tête récap */}
              <div style={{ background: '#172554', padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', fontFamily: 'Syne, sans-serif' }}>
                      AC<span style={{ color: '#EF4444' }}>X</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#93C5FD' }}>Récapitulatif financier</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{studentName}</div>
                    <div style={{ fontSize: '11px', color: '#93C5FD' }}>{studentLevel}</div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '1rem 1.25rem' }}>
                {/* Lignes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>Scolarité × 10 mois</span>
                    <span style={{ fontWeight: 500 }}>{(fee.tuition * 10).toLocaleString('fr-MA')} MAD</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>Inscription</span>
                    <span style={{ fontWeight: 500 }}>{fee.registration.toLocaleString('fr-MA')} MAD</span>
                  </div>
                  {fee.has_transport && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#64748B' }}>Transport × 10 mois</span>
                      <span style={{ fontWeight: 500 }}>{(fee.transport * 10).toLocaleString('fr-MA')} MAD</span>
                    </div>
                  )}
                  {fee.has_canteen && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#64748B' }}>Cantine × 10 mois</span>
                      <span style={{ fontWeight: 500 }}>{(fee.canteen * 10).toLocaleString('fr-MA')} MAD</span>
                    </div>
                  )}
                  {fee.has_boarding && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#64748B' }}>Internat × 10 mois</span>
                      <span style={{ fontWeight: 500 }}>{(fee.boarding * 10).toLocaleString('fr-MA')} MAD</span>
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>Sous-total</span>
                    <span style={{ fontWeight: 500 }}>{getSubtotal().toLocaleString('fr-MA')} MAD</span>
                  </div>

                  {getDiscount() > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#EF4444' }}>Remise {fee.discount_reason ? '(' + fee.discount_reason + ')' : ''}</span>
                      <span style={{ fontWeight: 500, color: '#EF4444' }}>- {getDiscount().toLocaleString('fr-MA')} MAD</span>
                    </div>
                  )}
                </div>

                {/* Total annuel */}
                <div style={{ background: '#172554', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#BFDBFE' }}>Total annuel</span>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>{getTotal().toLocaleString('fr-MA')} MAD</span>
                </div>

                {/* Barre progression paiements */}
                {payments.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B', marginBottom: '5px' }}>
                      <span>Payé : <strong style={{ color: '#166534' }}>{totalPaid.toLocaleString('fr-MA')} MAD</strong></span>
                      <span>Reste : <strong style={{ color: totalLeft > 0 ? '#DC2626' : '#166534' }}>{totalLeft.toLocaleString('fr-MA')} MAD</strong></span>
                    </div>
                    <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: getTotal() > 0 && totalLeft <= 0 ? '#10B981' : '#2563EB', borderRadius: '4px', width: getTotal() > 0 ? Math.min(100, totalPaid / getTotal() * 100) + '%' : '0%', transition: 'width 0.5s' }} />
                    </div>
                  </div>
                )}

                {/* Mensualité */}
                <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px', fontSize: '12px', color: '#64748B', textAlign: 'center' }}>
                  Mensualité : <strong style={{ color: '#1E293B', fontSize: '14px' }}>
                    {(fee.tuition + (fee.has_transport ? fee.transport : 0) + (fee.has_canteen ? fee.canteen : 0) + (fee.has_boarding ? fee.boarding : 0)).toLocaleString('fr-MA')} MAD/mois
                  </strong>
                </div>

                {/* Boutons PDF */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => generatePDF('quote')}
                    disabled={generating}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px', border: '1px solid #BFDBFE', borderRadius: '8px', background: '#EFF6FF', color: '#2563EB', fontSize: '13px', fontWeight: 500, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    <i className="ti ti-file-invoice" style={{ fontSize: '16px' }} />
                    Générer un Devis PDF
                  </button>
                  <button
                    onClick={() => generatePDF('invoice')}
                    disabled={generating}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px', border: 'none', borderRadius: '8px', background: generating ? '#94A3B8' : '#172554', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    <i className="ti ti-file-text" style={{ fontSize: '16px' }} />
                    {generating ? 'Génération...' : 'Générer une Facture PDF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Historique */}
      {tab === 'historique' && (
        <div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '1rem' }}>
            {[
              { label: 'Total annuel',  value: getTotal() + ' MAD',  color: '#2563EB', bg: '#EFF6FF' },
              { label: 'Total payé',    value: totalPaid + ' MAD',   color: '#166534', bg: '#DCFCE7' },
              { label: 'Reste à payer', value: totalLeft + ' MAD',   color: totalLeft > 0 ? '#DC2626' : '#166534', bg: totalLeft > 0 ? '#FEF2F2' : '#DCFCE7' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: '10px', padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: s.color, marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
              <i className="ti ti-credit-card-off" style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }} />
              Aucun paiement enregistré
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    {['Type', 'Montant', 'Échéance', 'Payé le', 'Statut'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, index) => (
                    <tr key={p.id} style={{ borderBottom: index < payments.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: '#475569' }}>
                        {p.type === 'tuition' ? 'Scolarité' : p.type === 'registration' ? 'Inscription' : 'Autre'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{p.amount} MAD</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: '#475569' }}>{new Date(p.due_date).toLocaleDateString('fr-MA')}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: '#475569' }}>{p.paid_at ? new Date(p.paid_at).toLocaleDateString('fr-MA') : '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500,
                          background: p.status === 'paid' ? '#DCFCE7' : p.status === 'late' ? '#FEF2F2' : '#FEF3C7',
                          color:      p.status === 'paid' ? '#166534' : p.status === 'late' ? '#DC2626' : '#92400E'
                        }}>
                          {p.status === 'paid' ? 'Payé' : p.status === 'late' ? 'En retard' : 'En attente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}