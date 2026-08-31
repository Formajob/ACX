'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { whatsappLink } from '@/components/shared/WhatsAppButton'

interface WhatsAppButtonProps {
  phone: string
  message: string
  label?: string
  size?: 'sm' | 'md'
  variant?: 'outline' | 'icon'
}

function WhatsAppButton({ phone, message, label = 'WhatsApp', size = 'md', variant = 'outline' }: WhatsAppButtonProps) {
  const href = whatsappLink(phone, message)
  if (!href) return null

  const isSmall = size === 'sm'
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    borderRadius: '6px',
    border: variant === 'outline' ? '1px solid #D1FAE5' : '1px solid transparent',
    background: variant === 'outline' ? '#ECFDF5' : '#10B981',
    color: variant === 'outline' ? '#047857' : '#fff',
    textDecoration: 'none',
    cursor: 'pointer',
    fontSize: isSmall ? '12px' : '14px',
    fontWeight: 500,
    padding: isSmall ? '6px 10px' : '8px 12px',
    lineHeight: 1,
    whiteSpace: 'nowrap',
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" style={baseStyle}>
      {variant === 'icon' ? <i className="ti ti-brand-whatsapp" /> : label}
    </a>
  )
}

interface Absence {
  id: string
  absence_date: string
  justified: boolean
  reason: string | null
  students: {
    id: string
    full_name: string
    parent_phone: string | null
    parent_name: string | null
  } | null
  classes: { name: string } | null
}

interface Props {
  absences:   Absence[]
  classes:    { id: string; name: string; level: string }[]
  schoolName: string
  onRefresh:  () => void
}

export default function AbsencesClient({ absences, classes, schoolName, onRefresh }: Props) {
  const supabase  = createClient()
  const router    = useRouter()

  const [filterClass,  setFilterClass]  = useState('tous')
  const [filterStatus, setFilterStatus] = useState('tous')
  const [tab,          setTab]          = useState<'liste' | 'saisie'>('liste')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')
  const [success,      setSuccess]      = useState('')
  const [students,     setStudents]     = useState<any[]>([])
  const [loadingStud,  setLoadingStud]  = useState(false)

  const [form, setForm] = useState({
    student_id:   '',
    class_id:     '',
    absence_date: new Date().toISOString().split('T')[0],
    justified:    false,
    reason:       '',
  })

  async function fetchStudents(classId: string) {
    setLoadingStud(true)
    const { data } = await supabase
      .from('class_students')
      .select('students(id, full_name)')
      .eq('class_id', classId)
    setStudents(data?.map((d: any) => d.students).filter(Boolean) ?? [])
    setLoadingStud(false)
  }

  async function handleSubmit() {
    if (!form.student_id || !form.class_id) { setError('Sélectionnez une classe et un élève'); return }
    setSaving(true); setError(''); setSuccess('')

    const stored = localStorage.getItem('acx_user')
    if (!stored) return
    const user = JSON.parse(stored)

    const { error: err } = await supabase.from('absences').insert({
      student_id:   form.student_id,
      class_id:     form.class_id,
      absence_date: form.absence_date,
      justified:    form.justified,
      reason:       form.reason || null,
      recorded_by:  user.id,
    })

    if (err) { setError('Erreur : ' + err.message); setSaving(false); return }
    setSuccess('Absence enregistrée')
    setForm({ student_id: '', class_id: '', absence_date: new Date().toISOString().split('T')[0], justified: false, reason: '' })
    setStudents([])
    setSaving(false)
    onRefresh()
  }

  async function handleJustify(id: string) {
    await supabase.from('absences').update({ justified: true }).eq('id', id)
    onRefresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette absence ?')) return
    await supabase.from('absences').delete().eq('id', id)
    onRefresh()
  }

  function buildAbsenceMessage(absence: Absence) {
    const date = new Date(absence.absence_date).toLocaleDateString('fr-MA', { weekday: 'long', day: 'numeric', month: 'long' })
    const eleve = absence.students?.full_name ?? 'votre enfant'
    return `Bonjour,\n\nNous vous informons que *${eleve}* a été absent(e) le *${date}*.\n\nMerci de nous contacter si vous avez une justification.\n\nCordialement,\n*${schoolName}*`
  }

  function buildJustifMessage(absence: Absence) {
    const date = new Date(absence.absence_date).toLocaleDateString('fr-MA', { weekday: 'long', day: 'numeric', month: 'long' })
    const eleve = absence.students?.full_name ?? 'votre enfant'
    return `Bonjour,\n\nL'absence de *${eleve}* du *${date}* a bien été enregistrée comme justifiée.\n\nCordialement,\n*${schoolName}*`
  }

  const filtered = absences.filter(a => {
    const matchClass  = filterClass  === 'tous' || a.classes?.name === classes.find(c => c.id === filterClass)?.name
    const matchStatus = filterStatus === 'tous' ||
      (filterStatus === 'justified'   &&  a.justified) ||
      (filterStatus === 'unjustified' && !a.justified)
    return matchClass && matchStatus
  })

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0',
    borderRadius: '8px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
    outline: 'none', color: '#1E293B', background: '#fff', boxSizing: 'border-box',
  }

  const totalInjust = absences.filter(a => !a.justified).length

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total absences',     value: absences.length,  color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Non justifiées',     value: totalInjust,       color: '#EF4444', bg: '#FEF2F2' },
          { label: 'Justifiées',         value: absences.length - totalInjust, color: '#10B981', bg: '#ECFDF5' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.25rem', background: '#F1F5F9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {(['liste', 'saisie'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 18px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#1E293B' : '#64748B', boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            {t === 'liste' ? 'Liste des absences' : 'Saisir une absence'}
          </button>
        ))}
      </div>

      {/* ══ TAB LISTE ══ */}
      {tab === 'liste' && (
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: '180px' }}>
              <option value="tous">Toutes les classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: '160px' }}>
              <option value="tous">Tous les statuts</option>
              <option value="justified">Justifiée</option>
              <option value="unjustified">Non justifiée</option>
            </select>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {['Élève', 'Classe', 'Date', 'Statut', 'Motif', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px' }}>Aucune absence</td></tr>
                ) : filtered.map((absence, index) => (
                  <tr key={absence.id} style={{ borderBottom: index < filtered.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500 }}>
                          {absence.students?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{absence.students?.full_name}</div>
                          {absence.students?.parent_name && <div style={{ fontSize: '11px', color: '#94A3B8' }}>{absence.students.parent_name}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: '#475569' }}>{absence.classes?.name ?? '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' as const }}>
                      {new Date(absence.absence_date).toLocaleDateString('fr-MA', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: absence.justified ? '#DCFCE7' : '#FEF3C7', color: absence.justified ? '#166534' : '#92400E' }}>
                        {absence.justified ? 'Justifiée' : 'Non justifiée'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: '#475569' }}>{absence.reason ?? '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Justifier */}
                        {!absence.justified && (
                          <button
                            onClick={() => handleJustify(absence.id)}
                            title="Justifier"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#fff', color: '#10B981', cursor: 'pointer', fontSize: '14px' }}
                          >
                            <i className="ti ti-check" />
                          </button>
                        )}

                        {/* Supprimer */}
                        <button
                          onClick={() => handleDelete(absence.id)}
                          title="Supprimer"
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#fff', color: '#EF4444', cursor: 'pointer', fontSize: '14px' }}
                        >
                          <i className="ti ti-trash" />
                        </button>

                        {/* WhatsApp — notifier absence */}
                        {absence.students?.parent_phone && !absence.justified && (
                          <WhatsAppButton
                            phone={absence.students.parent_phone}
                            message={buildAbsenceMessage(absence)}
                            label="Notifier"
                            size="sm"
                            variant="outline"
                          />
                        )}

                        {/* WhatsApp — confirmer justification */}
                        {absence.students?.parent_phone && absence.justified && (
                          <WhatsAppButton
                            phone={absence.students.parent_phone}
                            message={buildJustifMessage(absence)}
                            label="Confirmer"
                            size="sm"
                            variant="icon"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '12px', color: '#94A3B8' }}>
            {filtered.length} absence{filtered.length > 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* ══ TAB SAISIE ══ */}
      {tab === 'saisie' && (
        <div style={{ maxWidth: '500px' }}>
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Classe</label>
              <select
                value={form.class_id}
                onChange={e => { setForm(p => ({ ...p, class_id: e.target.value, student_id: '' })); fetchStudents(e.target.value) }}
                style={inputStyle}
              >
                <option value="">Sélectionnez une classe</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.level}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Élève</label>
              <select
                value={form.student_id}
                onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}
                disabled={!form.class_id || loadingStud}
                style={{ ...inputStyle, opacity: !form.class_id ? 0.5 : 1 }}
              >
                <option value="">{loadingStud ? 'Chargement...' : 'Sélectionnez un élève'}</option>
                {students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Date</label>
              <input type="date" value={form.absence_date} onChange={e => setForm(p => ({ ...p, absence_date: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Motif (optionnel)</label>
              <input type="text" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Maladie, rendez-vous..." style={inputStyle} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="justified" checked={form.justified} onChange={e => setForm(p => ({ ...p, justified: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563EB' }} />
              <label htmlFor="justified" style={{ fontSize: '13px', color: '#1E293B', cursor: 'pointer' }}>Absence justifiée</label>
            </div>

            {error   && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}
            {success && <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>{success}</div>}

            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{ padding: '11px', border: 'none', borderRadius: '10px', background: saving ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer l\'absence'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}