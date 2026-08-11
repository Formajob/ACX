'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

const LEVELS = ['Maternelle', 'Primaire', 'College', 'Lycee']
const RELATIONS = ['Pere', 'Mere', 'Tuteur']
const STATUSES = ['active', 'inactive', 'transferred', 'graduated']
const STATUS_LABELS: Record<string, string> = { active: 'Actif', inactive: 'Inactif', transferred: 'Transfere', graduated: 'Diplome' }

export default function ModifierElevePage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    full_name: '',
    birth_date: '',
    birth_place: '',
    gender: 'M',
    nationality: 'Marocaine',
    address: '',
    city: '',
    level: '',
    enrollment_date: '',
    previous_school: '',
    status: 'active',
    parent_name: '',
    parent_relation: 'Pere',
    parent_phone: '',
    parent_email: '',
    cin_parent: '',
    parent2_name: '',
    parent2_relation: 'Mere',
    parent2_phone: '',
    parent2_email: '',
    emergency_phone: '',
    has_transport: false,
    transport_route: '',
    has_canteen: false,
    has_boarding: false,
    health_notes: '',
    allergies: '',
    notes: '',
  })

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('students').select('*').eq('id', id).single()
      if (data) {
        setForm({
          full_name:       data.full_name ?? '',
          birth_date:      data.birth_date ?? '',
          birth_place:     data.birth_place ?? '',
          gender:          data.gender ?? 'M',
          nationality:     data.nationality ?? 'Marocaine',
          address:         data.address ?? '',
          city:            data.city ?? '',
          level:           data.level ?? '',
          enrollment_date: data.enrollment_date ?? '',
          previous_school: data.previous_school ?? '',
          status:          data.status ?? 'active',
          parent_name:     data.parent_name ?? '',
          parent_relation: data.parent_relation ?? 'Pere',
          parent_phone:    data.parent_phone ?? '',
          parent_email:    data.parent_email ?? '',
          cin_parent:      data.cin_parent ?? '',
          parent2_name:    data.parent2_name ?? '',
          parent2_relation: data.parent2_relation ?? 'Mere',
          parent2_phone:   data.parent2_phone ?? '',
          parent2_email:   data.parent2_email ?? '',
          emergency_phone: data.emergency_phone ?? '',
          has_transport:   data.has_transport ?? false,
          transport_route: data.transport_route ?? '',
          has_canteen:     data.has_canteen ?? false,
          has_boarding:    data.has_boarding ?? false,
          health_notes:    data.health_notes ?? '',
          allergies:       data.allergies ?? '',
          notes:           data.notes ?? '',
        })
      }
      setLoading(false)
    }
    load()
  }, [id])

  function set(key: string, value: any) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.full_name.trim()) { setError('Le nom est obligatoire'); return }
    setSaving(true)
    setError('')
    setSuccess('')

    const { error: updateError } = await supabase
      .from('students')
      .update({
        full_name:       form.full_name.trim(),
        birth_date:      form.birth_date || null,
        birth_place:     form.birth_place || null,
        gender:          form.gender,
        nationality:     form.nationality || null,
        address:         form.address || null,
        city:            form.city || null,
        level:           form.level || null,
        enrollment_date: form.enrollment_date || null,
        previous_school: form.previous_school || null,
        status:          form.status,
        parent_name:     form.parent_name || null,
        parent_relation: form.parent_relation || null,
        parent_phone:    form.parent_phone || null,
        parent_email:    form.parent_email || null,
        cin_parent:      form.cin_parent || null,
        parent2_name:    form.parent2_name || null,
        parent2_relation: form.parent2_relation || null,
        parent2_phone:   form.parent2_phone || null,
        parent2_email:   form.parent2_email || null,
        emergency_phone: form.emergency_phone || null,
        has_transport:   form.has_transport,
        transport_route: form.transport_route || null,
        has_canteen:     form.has_canteen,
        has_boarding:    form.has_boarding,
        health_notes:    form.health_notes || null,
        allergies:       form.allergies || null,
        notes:           form.notes || null,
      })
      .eq('id', id)

    if (updateError) { setError('Erreur: ' + updateError.message); setSaving(false); return }
    setSuccess('Eleve mis a jour avec succes')
    setSaving(false)
    setTimeout(() => router.push('/dashboard/eleves/' + id), 1200)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'DM Sans, sans-serif',
    outline: 'none',
    color: '#1E293B',
    background: '#fff',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 500,
    color: '#64748B',
    display: 'block',
    marginBottom: '4px',
  }

  const sectionTitle = (title: string, icon: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#2563EB', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '1.5rem 0 1rem', paddingBottom: '8px', borderBottom: '2px solid #EFF6FF' }}>
      <i className={'ti ' + icon} style={{ fontSize: '16px' }} />
      {title}
    </div>
  )

  const checkField = (key: string, label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <input type="checkbox" id={key} checked={(form as any)[key]} onChange={e => set(key, e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563EB' }} />
      <label htmlFor={key} style={{ fontSize: '13px', color: '#1E293B', cursor: 'pointer' }}>{label}</label>
    </div>
  )

  if (loading) return <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px' }}>Chargement...</div>

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', maxWidth: '800px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href={'/dashboard/eleves/' + id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#64748B', textDecoration: 'none', marginBottom: '0.75rem' }}>
          <i className="ti ti-arrow-left" /> Retour a la fiche
        </Link>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Modifier l eleve
        </h1>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem' }}>

        {sectionTitle('Informations personnelles', 'ti-user')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Nom complet *</label>
            <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)} style={inputStyle} placeholder="Prenom Nom" />
          </div>
          <div>
            <label style={labelStyle}>Genre</label>
            <select value={form.gender} onChange={e => set('gender', e.target.value)} style={inputStyle}>
              <option value="M">Masculin</option>
              <option value="F">Feminin</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Statut</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} style={inputStyle}>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Date de naissance</label>
            <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Lieu de naissance</label>
            <input type="text" value={form.birth_place} onChange={e => set('birth_place', e.target.value)} style={inputStyle} placeholder="Casablanca" />
          </div>
          <div>
            <label style={labelStyle}>Nationalite</label>
            <input type="text" value={form.nationality} onChange={e => set('nationality', e.target.value)} style={inputStyle} placeholder="Marocaine" />
          </div>
          <div>
            <label style={labelStyle}>Ville</label>
            <input type="text" value={form.city} onChange={e => set('city', e.target.value)} style={inputStyle} placeholder="Casablanca" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Adresse</label>
            <input type="text" value={form.address} onChange={e => set('address', e.target.value)} style={inputStyle} placeholder="12 Rue Ibn Battouta, Maarif" />
          </div>
        </div>

        {sectionTitle('Informations scolaires', 'ti-school')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Niveau scolaire</label>
            <select value={form.level} onChange={e => set('level', e.target.value)} style={inputStyle}>
              <option value="">Selectionnez</option>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Date d inscription</label>
            <input type="date" value={form.enrollment_date} onChange={e => set('enrollment_date', e.target.value)} style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Ecole precedente</label>
            <input type="text" value={form.previous_school} onChange={e => set('previous_school', e.target.value)} style={inputStyle} placeholder="Nom de l ecole precedente" />
          </div>
        </div>

        {sectionTitle('Services', 'ti-settings')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {checkField('has_transport', 'Transport scolaire')}
          {form.has_transport && (
            <div style={{ marginLeft: '24px' }}>
              <label style={labelStyle}>Route de transport</label>
              <input type="text" value={form.transport_route} onChange={e => set('transport_route', e.target.value)} style={{ ...inputStyle, maxWidth: '400px' }} placeholder="Ex: Route Maarif - Ecole" />
            </div>
          )}
          {checkField('has_canteen', 'Cantine scolaire')}
          {checkField('has_boarding', 'Internat')}
        </div>

        {sectionTitle('Parent / Tuteur 1', 'ti-users')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Nom complet</label>
            <input type="text" value={form.parent_name} onChange={e => set('parent_name', e.target.value)} style={inputStyle} placeholder="Nom du parent" />
          </div>
          <div>
            <label style={labelStyle}>Relation</label>
            <select value={form.parent_relation} onChange={e => set('parent_relation', e.target.value)} style={inputStyle}>
              {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Telephone</label>
            <input type="tel" value={form.parent_phone} onChange={e => set('parent_phone', e.target.value)} style={inputStyle} placeholder="06XXXXXXXX" />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={form.parent_email} onChange={e => set('parent_email', e.target.value)} style={inputStyle} placeholder="parent@email.com" />
          </div>
          <div>
            <label style={labelStyle}>CIN</label>
            <input type="text" value={form.cin_parent} onChange={e => set('cin_parent', e.target.value)} style={inputStyle} placeholder="BK123456" />
          </div>
          <div>
            <label style={labelStyle}>Tel urgence</label>
            <input type="tel" value={form.emergency_phone} onChange={e => set('emergency_phone', e.target.value)} style={inputStyle} placeholder="06XXXXXXXX" />
          </div>
        </div>

        {sectionTitle('Parent / Tuteur 2 (optionnel)', 'ti-user-plus')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Nom complet</label>
            <input type="text" value={form.parent2_name} onChange={e => set('parent2_name', e.target.value)} style={inputStyle} placeholder="Nom du 2eme parent" />
          </div>
          <div>
            <label style={labelStyle}>Relation</label>
            <select value={form.parent2_relation} onChange={e => set('parent2_relation', e.target.value)} style={inputStyle}>
              {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Telephone</label>
            <input type="tel" value={form.parent2_phone} onChange={e => set('parent2_phone', e.target.value)} style={inputStyle} placeholder="06XXXXXXXX" />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={form.parent2_email} onChange={e => set('parent2_email', e.target.value)} style={inputStyle} placeholder="parent2@email.com" />
          </div>
        </div>

        {sectionTitle('Sante & Notes', 'ti-heart')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Notes medicales</label>
            <textarea value={form.health_notes} onChange={e => set('health_notes', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} placeholder="Ex: Asthmatique, diabetique..." />
          </div>
          <div>
            <label style={labelStyle}>Allergies</label>
            <input type="text" value={form.allergies} onChange={e => set('allergies', e.target.value)} style={inputStyle} placeholder="Ex: Arachides, lactose..." />
          </div>
          <div>
            <label style={labelStyle}>Notes internes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} placeholder="Notes pour l administration..." />
          </div>
        </div>

        {error && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginTop: '1rem' }}>{error}</div>}
        {success && <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginTop: '1rem' }}>{success}</div>}

        <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
          <Link href={'/dashboard/eleves/' + id} style={{ flex: 1, padding: '11px', border: '1px solid #E2E8F0', borderRadius: '10px', background: 'transparent', color: '#475569', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', fontWeight: 500, textDecoration: 'none', textAlign: 'center' as const }}>
            Annuler
          </Link>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '11px', border: 'none', borderRadius: '10px', background: saving ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>
    </div>
  )
}