'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function NouvelElevePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    birth_date: '',
    gender: 'M',
    parent_phone: '',
    parent_email: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit() {
    if (!form.full_name.trim()) {
      setError('Le nom complet est obligatoire')
      return
    }

    setLoading(true)
    setError('')

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError('Non authentifie')
      setLoading(false)
      return
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('school_id')
      .eq('id', userData.user.id)
      .single()

    if (!userProfile?.school_id) {
      setError('Ecole introuvable')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('students').insert({
      full_name: form.full_name.trim(),
      birth_date: form.birth_date || null,
      gender: form.gender,
      parent_phone: form.parent_phone || null,
      parent_email: form.parent_email || null,
      school_id: userProfile.school_id,
    })

    if (insertError) {
      setError('Erreur lors de la creation: ' + insertError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard/eleves')
    router.refresh()
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'DM Sans, sans-serif',
    outline: 'none',
    color: '#1E293B',
    background: '#fff',
  }

  const labelStyle = {
    fontSize: '13px',
    fontWeight: 500 as const,
    color: '#1E293B',
    display: 'block' as const,
    marginBottom: '6px',
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', maxWidth: '600px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => router.back()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: '#64748B',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '1rem',
            padding: 0,
          }}
        >
          <i className="ti ti-arrow-left" />
          Retour
        </button>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Ajouter un eleve
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Remplissez les informations de l eleve
        </p>
      </div>

      <div style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div>
          <label style={labelStyle}>
            Nom complet <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="text"
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            placeholder="Ex: Ahmed Benali"
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Date de naissance</label>
            <input
              type="date"
              name="birth_date"
              value={form.birth_date}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Genre</label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="M">Garcon</option>
              <option value="F">Fille</option>
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Telephone parent</label>
          <input
            type="tel"
            name="parent_phone"
            value={form.parent_phone}
            onChange={handleChange}
            placeholder="Ex: 06 12 34 56 78"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Email parent</label>
          <input
            type="email"
            name="parent_email"
            value={form.parent_email}
            onChange={handleChange}
            placeholder="parent@email.com"
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#DC2626',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '13px',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button
            onClick={() => router.back()}
            style={{
              flex: 1,
              padding: '11px',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              background: 'transparent',
              color: '#475569',
              fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              flex: 1,
              padding: '11px',
              border: 'none',
              borderRadius: '10px',
              background: loading ? '#94A3B8' : '#2563EB',
              color: '#fff',
              fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 500,
            }}
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
