'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { WaIcon } from '@/components/shared/WhatsAppButton'

function formatMoroccanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('0') ? `212${digits.slice(1)}` : digits
}

interface LigneDevis {
  id: string
  description: string
  montant: string
}

const LIGNES_DEFAUT: LigneDevis[] = [
  { id: '1', description: 'Frais de scolarite annuelle', montant: '' },
  { id: '2', description: "Frais d'inscription", montant: '' },
]

export default function DevisPage() {
  const router = useRouter()

  const [schoolName, setSchoolName] = useState('')
  const [schoolAddress, setSchoolAddress] = useState('')
  const [schoolPhone, setSchoolPhone] = useState('')

  const [eleveNom, setEleveNom] = useState('')
  const [parentNom, setParentNom] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [niveau, setNiveau] = useState('')
  const [dateDevis, setDateDevis] = useState(new Date().toISOString().split('T')[0])
  const [validite, setValidite] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })
  const [notes, setNotes] = useState('Ce devis est valable 30 jours et sera confirme apres validation du dossier d\'inscription.')
  const [lignes, setLignes] = useState<LigneDevis[]>(LIGNES_DEFAUT)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    setSchoolName(user.school_name ?? '')
    setSchoolAddress(user.school_address ?? '')
    setSchoolPhone(user.school_phone ?? '')
  }, [router])

  function addLigne() {
    setLignes(prev => [...prev, { id: Date.now().toString(), description: '', montant: '' }])
  }

  function removeLigne(id: string) {
    setLignes(prev => prev.filter(l => l.id !== id))
  }

  function updateLigne(id: string, field: 'description' | 'montant', value: string) {
    setLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  const total = lignes.reduce((sum, l) => sum + (parseFloat(l.montant) || 0), 0)
  const numeroDevis = `DEV-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`

  const isValid = eleveNom.trim() !== '' && lignes.some(l => l.description.trim() !== '' && parseFloat(l.montant) > 0)

  async function generatePDF() {
    if (!isValid) return
    setGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF()

      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text(schoolName || 'Ecole', 14, 20)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      let headerY = 27
      if (schoolAddress) { doc.text(schoolAddress, 14, headerY); headerY += 5 }
      if (schoolPhone) { doc.text(`Tel: ${schoolPhone}`, 14, headerY); headerY += 5 }

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(37, 99, 235)
      doc.text('DEVIS - Estimation des frais de scolarite', 14, 45)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text(`N° ${numeroDevis}`, 14, 52)
      doc.text(`Date : ${new Date(dateDevis).toLocaleDateString('fr-MA')}`, 130, 52)
      doc.text(`Valable jusqu'au : ${new Date(validite).toLocaleDateString('fr-MA')}`, 130, 57)

      doc.setDrawColor(226, 232, 240)
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(14, 62, 182, 26, 2, 2, 'FD')

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text(`Eleve : ${eleveNom}`, 18, 70)
      doc.setFont('helvetica', 'normal')
      if (niveau) doc.text(`Niveau : ${niveau}`, 18, 76)
      if (parentNom) doc.text(`Parent / Tuteur : ${parentNom}`, 18, 82)
      if (parentPhone) doc.text(`Contact : ${parentPhone}`, 110, 82)

      autoTable(doc, {
        startY: 94,
        head: [['Description', 'Montant (MAD)']],
        body: lignes
          .filter(l => l.description.trim() !== '')
          .map(l => [l.description, (parseFloat(l.montant) || 0).toLocaleString('fr-MA') + ' MAD']),
        foot: [['Total estime', total.toLocaleString('fr-MA') + ' MAD']],
        styles: { fontSize: 10, cellPadding: 5, font: 'helvetica' },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 11 },
        columnStyles: { 1: { halign: 'right', cellWidth: 50 } },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      })

      const afterTableY = (doc as any).lastAutoTable.finalY + 12

      if (notes) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(100, 116, 139)
        const splitNotes = doc.splitTextToSize(notes, 180)
        doc.text(splitNotes, 14, afterTableY)
      }

      const pageHeight = doc.internal.pageSize.height
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(148, 163, 184)
      doc.text(`Document genere via ACX le ${new Date().toLocaleDateString('fr-MA')}`, 14, pageHeight - 10)

      doc.save(`${numeroDevis}-${eleveNom.replace(/\s+/g, '-')}.pdf`)
    } finally {
      setGenerating(false)
    }
  }

  function envoyerWhatsApp() {
    if (!parentPhone) return
    const formatted = formatMoroccanPhone(parentPhone)
    const message = `Bonjour${parentNom ? ' ' + parentNom : ''}, voici l'estimation des frais de scolarite pour ${eleveNom} a ${schoolName} : ${total.toLocaleString('fr-MA')} MAD (${numeroDevis}). Le devis PDF detaille vous sera transmis separement. Ce montant est valable jusqu'au ${new Date(validite).toLocaleDateString('fr-MA')}.`
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: '8px',
    fontSize: '13px', fontFamily: 'DM Sans, sans-serif', outline: 'none', color: '#1E293B', boxSizing: 'border-box' as const,
  }
  const labelStyle = { fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px' }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', maxWidth: '760px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => router.push('/dashboard/paiements')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#64748B', fontSize: '13px', cursor: 'pointer', marginBottom: '10px', padding: 0, fontFamily: 'DM Sans, sans-serif' }}
        >
          <i className="ti ti-arrow-left" /> Retour aux paiements
        </button>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Nouveau devis
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Estimation des frais de scolarite pour une famille avant inscription
        </p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '1rem' }}>Informations eleve</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div>
            <label style={labelStyle}>Nom de l'eleve *</label>
            <input value={eleveNom} onChange={e => setEleveNom(e.target.value)} placeholder="Ex: Amine Bennani" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Niveau / Classe souhaite</label>
            <input value={niveau} onChange={e => setNiveau(e.target.value)} placeholder="Ex: CM2, 3eme annee college..." style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Nom du parent / tuteur</label>
            <input value={parentNom} onChange={e => setParentNom(e.target.value)} placeholder="Ex: M. Bennani" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Telephone (WhatsApp)</label>
            <input value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="0612345678" style={inputStyle} />
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>Details du devis</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div>
              <label style={{ ...labelStyle, marginBottom: '2px' }}>Date</label>
              <input type="date" value={dateDevis} onChange={e => setDateDevis(e.target.value)} style={{ ...inputStyle, padding: '5px 8px', fontSize: '12px' }} />
            </div>
            <div>
              <label style={{ ...labelStyle, marginBottom: '2px' }}>Valable jusqu'au</label>
              <input type="date" value={validite} onChange={e => setValidite(e.target.value)} style={{ ...inputStyle, padding: '5px 8px', fontSize: '12px' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
          {lignes.map(ligne => (
            <div key={ligne.id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: '8px', alignItems: 'center' }}>
              <input
                value={ligne.description}
                onChange={e => updateLigne(ligne.id, 'description', e.target.value)}
                placeholder="Description du frais"
                style={inputStyle}
              />
              <input
                type="number"
                value={ligne.montant}
                onChange={e => updateLigne(ligne.id, 'montant', e.target.value)}
                placeholder="Montant"
                style={{ ...inputStyle, textAlign: 'right' }}
              />
              <button
                onClick={() => removeLigne(ligne.id)}
                disabled={lignes.length === 1}
                style={{ width: '32px', height: '32px', border: '1px solid #FEE2E2', borderRadius: '8px', background: '#fff', color: '#DC2626', cursor: lignes.length === 1 ? 'not-allowed' : 'pointer', opacity: lignes.length === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <i className="ti ti-trash" style={{ fontSize: '14px' }} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addLigne}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', border: '1px dashed #CBD5E1', borderRadius: '8px', background: '#F8FAFC', color: '#2563EB', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >
          <i className="ti ti-plus" /> Ajouter une ligne
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '13px', color: '#64748B' }}>Total estime</span>
          <span style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A' }}>{total.toLocaleString('fr-MA')} MAD</span>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Notes / conditions</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'DM Sans, sans-serif' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={generatePDF}
          disabled={!isValid || generating}
          style={{
            flex: 1, padding: '12px', border: 'none', borderRadius: '10px',
            background: isValid ? '#2563EB' : '#CBD5E1', color: '#fff', fontSize: '14px', fontWeight: 600,
            cursor: isValid && !generating ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          <i className={generating ? 'ti ti-loader-2' : 'ti ti-file-type-pdf'} />
          {generating ? 'Generation...' : 'Generer le PDF'}
        </button>
        {parentPhone && (
          <button
            onClick={envoyerWhatsApp}
            disabled={!isValid}
            style={{ padding: '12px 20px', border: '1px solid #E2E8F0', borderRadius: '10px', background: '#fff', color: '#166534', fontSize: '14px', fontWeight: 500, cursor: isValid ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <WaIcon /> Envoyer un recap
          </button>
        )}
      </div>

      {!isValid && (
        <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '10px' }}>
          Renseigne le nom de l'eleve et au moins une ligne de frais avec un montant pour generer le devis.
        </p>
      )}
    </div>
  )
}