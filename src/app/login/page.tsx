'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface School {
  id: string
  name: string
  city: string
}

export default function LoginPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [step, setStep] = useState<'school' | 'auth'>('school')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingSchools, setLoadingSchools] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    supabase.from('schools').select('id, name, city').order('name').then(({ data }) => {
      setSchools(data ?? [])
      setLoadingSchools(false)
    })
  }, [])

  async function handleLogin() {
    setLoading(true)
    setError('')

    try {
      const { data, error: err } = await supabase
        .from('users')
        .select('id, school_id, role, full_name, email')
        .eq('email', email.trim().toLowerCase())
        .limit(1)

      if (err) {
        setError('Erreur DB: ' + err.message)
        setLoading(false)
        return
      }

      if (!data || data.length === 0) {
        setError('Email introuvable dans la base')
        setLoading(false)
        return
      }

      const u = data[0]

      if (password !== 'acx123456') {
        setError('Mot de passe incorrect — utilisez acx123456')
        setLoading(false)
        return
      }

      if (u.role !== 'super_admin' && selectedSchool && u.school_id !== selectedSchool.id) {
        setError('Compte non autorise pour cette ecole — school_id: ' + u.school_id + ' vs ' + selectedSchool?.id)
        setLoading(false)
        return
      }

      const session = {
        id: u.id,
        email: u.email,
        role: u.role,
        full_name: u.full_name,
        school_id: u.role === 'super_admin' && selectedSchool ? selectedSchool.id : u.school_id,
        school_name: selectedSchool?.name ?? '',
      }

      localStorage.setItem('acx_user', JSON.stringify(session))

      const dest = u.role === 'teacher' ? '/professeur' : u.role === 'parent' ? '/parent' : '/dashboard'
      window.location.href = dest

    } catch (e: any) {
      setError('Exception: ' + e.message)
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'DM Sans, sans-serif',
    outline: 'none',
    color: '#1E293B',
    boxSizing: 'border-box',
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=Syne:wght@500;600&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />

      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #172554 0%, #1E3A8A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', padding: '1rem' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>

          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '28px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
              AC<span style={{ color: '#EF4444' }}>X</span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
              {step === 'school' ? 'Selectionnez votre etablissement' : 'Connectez-vous'}
            </p>
          </div>

          {step === 'school' && (
            <div>
              {loadingSchools ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>Chargement...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {schools.map(school => (
                    <button
                      key={school.id}
                      onClick={() => { setSelectedSchool(school); setStep('auth'); setError('') }}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', border: '1px solid #E2E8F0', borderRadius: '10px', background: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                    >
                      <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                        <i className="ti ti-school" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E293B' }}>{school.name}</div>
                        <div style={{ fontSize: '12px', color: '#94A3B8' }}>{school.city ?? 'Maroc'}</div>
                      </div>
                      <i className="ti ti-chevron-right" style={{ color: '#CBD5E1' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'auth' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: '10px', marginBottom: '1.25rem' }}>
                <i className="ti ti-school" style={{ color: '#2563EB', fontSize: '18px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E3A8A' }}>{selectedSchool?.name}</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>{selectedSchool?.city}</div>
                </div>
                <button onClick={() => { setStep('school'); setSelectedSchool(null); setEmail(''); setPassword(''); setError('') }} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '12px' }}>
                  Changer
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '6px' }}>Email</label>
                  <input
                    type="text"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="votre@email.ma"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '6px' }}>Mot de passe</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="acx123456"
                    style={inputStyle}
                  />
                </div>

                {error && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', wordBreak: 'break-all' }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  style={{ background: loading ? '#94A3B8' : '#2563EB', color: '#fff', border: 'none', padding: '11px', borderRadius: '10px', fontSize: '15px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                >
                  {loading ? 'Connexion...' : 'Se connecter'}
                </button>

                <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', color: '#64748B', textAlign: 'center' }}>
                  Mot de passe test : <strong>acx123456</strong>
                </div>
              </div>
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: '12px', color: '#94A3B8', marginTop: '1.5rem' }}>
            ACX · Gestion scolaire au Maroc
          </p>
        </div>
      </div>
    </>
  )
}