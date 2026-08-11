'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

interface Classe { id: string; name: string; level: string }
interface Absence {
  id: string
  absence_date: string
  justified: boolean
  reason: string | null
  students: { full_name: string } | null
  classes: { name: string; level: string } | null
}
interface Student { id: string; full_name: string }

export default function ProfAbsencesPage() {
  const supabase = createClient()
  const router = useRouter()

  const [classes, setClasses] = useState<Classe[]>([])
  const [absences, setAbsences] = useState<Absence[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [tab, setTab] = useState<'liste' | 'saisie'>('liste')
  const [filterClass, setFilterClass] = useState('tous')
  const [filterStatus, setFilterStatus] = useState('tous')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    student_id: '',
    class_id: '',
    absence_date: new Date().toISOString().split('T')[0],
    justified: false,
    reason: '',
  })

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    loadData(user.id)
  }, [])

  async function loadData(userId: string) {
    const { data: cls } = await supabase.from('classes').select('id, name, level').eq('teacher_id', userId).order('name')
    setClasses(cls ?? [])
    const classIds = cls?.map(c => c.id) ?? []

    const { data: abs } = await supabase
      .from('absences')
      .select('*, students(full_name), classes(name, level)')
      .in('class_id', classIds.length > 0 ? classIds : ['none'])
      .order('absence_date', { ascending: false })
    setAbsences(abs ?? [])
    setLoading(false)
  }

  async function fetchStudents(classId: string) {
    setLoadingStudents(true)
    const { data } = await supabase.from('class_students').select('students(id, full_name)').eq('class_id', classId)
    setStudents(data?.map((d: any) => d.students).filter(Boolean) ?? [])
    setLoadingStudents(false)
  }

  async function handleSubmit() {
    if (!form.student_id || !form.class_id) { setError('Selectionnez une classe et un eleve'); return }
    setSaving(true)
    setError('')
    setSuccess('')

    const { error: insertError } = await supabase.from('absences').insert({
      student_id: form.student_id,
      class_id: form.class_id,
      absence_date: form.absence_date,
      justified: form.justified,
      reason: form.reason || null,
    })

    if (insertError) { setError('Erreur: ' + insertError.message); setSaving(false); return }
    setSuccess('Absence enregistree')
    setForm({ student_id: '', class_id: '', absence_date: new Date().toISOString().split('T')[0], justified: false, reason: '' })
    setStudents([])
    setSaving(false)

    const stored = localStorage.getItem('acx_user')
    if (stored) loadData(JSON.parse(stored).id)
  }

  async function handleJustify(id: string) {
    await supabase.from('absences').update({ justified: true }).eq('id', id)
    const stored = localStorage.getItem('acx_user')
    if (stored) loadData(JSON.parse(stored).id)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette absence ?')) return
    await supabase.from('absences').delete().eq('id', id)
    const stored = localStorage.getItem('acx_user')
    if (stored) loadData(JSON.parse(stored).id)
  }

  const filtered = absences.filter(a => {
    const matchClass = filterClass === 'tous' || a.classes?.name === classes.find(c => c.id === filterClass)?.name
    const matchStatus = filterStatus === 'tous' || (filterStatus === 'justifiee' && a.justified) || (filterStatus === 'non_justifiee' && !a.justified)
    return matchClass && matchStatus
  })

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

  if (loading) return <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px' }}>Chargement...</div>

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>Absences — Mes classes</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>Absences des eleves de vos classes uniquement</p>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.25rem', background: '#F1F5F9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {(['liste', 'saisie'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 18px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#1E293B' : '#64748B', boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            {t === 'liste' ? 'Liste des absences' : 'Saisir une absence'}
          </button>
        ))}
      </div>

      {tab === 'liste' && (
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: '180px' }}>
              <option value="tous">Toutes mes classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: '160px' }}>
              <option value="tous">Tous les statuts</option>
              <option value="justifiee">Justifiee</option>
              <option value="non_justifiee">Non justifiee</option>
            </select>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {['Eleve', 'Classe', 'Date', 'Statut', 'Motif', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px' }}>Aucune absence enregistree</td></tr>
                ) : (
                  filtered.map((absence, index) => (
                    <tr key={absence.id} style={{ borderBottom: index < filtered.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                      <td style={{ padding: '11px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500 }}>
                            {absence.students?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontSize: '13px', color: '#1E293B' }}>{absence.students?.full_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569' }}>{absence.classes?.name ?? '-'}</td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569' }}>{new Date(absence.absence_date).toLocaleDateString('fr-MA')}</td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: absence.justified ? '#DCFCE7' : '#FEF3C7', color: absence.justified ? '#166534' : '#92400E' }}>
                          {absence.justified ? 'Justifiee' : 'Non justifiee'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569' }}>{absence.reason ?? '-'}</td>
                      <td style={{ padding: '11px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {!absence.justified && (
                            <button onClick={() => handleJustify(absence.id)} title="Justifier" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#fff', color: '#10B981', cursor: 'pointer', fontSize: '14px' }}>
                              <i className="ti ti-check" />
                            </button>
                          )}
                          <button onClick={() => handleDelete(absence.id)} title="Supprimer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#fff', color: '#EF4444', cursor: 'pointer', fontSize: '14px' }}>
                            <i className="ti ti-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '12px', color: '#94A3B8' }}>
            {filtered.length} absence{filtered.length > 1 ? 's' : ''} affichee{filtered.length > 1 ? 's' : ''}
          </div>
        </div>
      )}

      {tab === 'saisie' && (
        <div style={{ maxWidth: '500px' }}>
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Classe</label>
              <select value={form.class_id} onChange={e => { setForm(p => ({ ...p, class_id: e.target.value, student_id: '' })); fetchStudents(e.target.value) }} style={inputStyle}>
                <option value="">Selectionnez une classe</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.level}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Eleve</label>
              <select value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))} disabled={!form.class_id || loadingStudents} style={{ ...inputStyle, opacity: !form.class_id ? 0.5 : 1 }}>
                <option value="">{loadingStudents ? 'Chargement...' : 'Selectionnez un eleve'}</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Date</label>
              <input type="date" value={form.absence_date} onChange={e => setForm(p => ({ ...p, absence_date: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Motif (optionnel)</label>
              <input type="text" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Ex: Maladie, rendez-vous..." style={inputStyle} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="justified" checked={form.justified} onChange={e => setForm(p => ({ ...p, justified: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              <label htmlFor="justified" style={{ fontSize: '13px', color: '#1E293B', cursor: 'pointer' }}>Absence justifiee</label>
            </div>
            {error && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}
            {success && <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>{success}</div>}
            <button onClick={handleSubmit} disabled={saving} style={{ padding: '11px', border: 'none', borderRadius: '10px', background: saving ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Enregistrement...' : 'Enregistrer l absence'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}