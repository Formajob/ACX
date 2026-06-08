'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

interface School {
  id: string
  name: string
  city: string
  logo_url: string | null
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

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchSchools() {
      const { data } = await supabase
        .from('schools')
        .select('id, name, city, logo_url')
        .order('name', { ascending: true })
      setSchools(data ?? [])
      setLoadingSchools(false)
    }
    fetchSchools()
  }, [])

  function handleSelectSchool(school: School) {
    setSelectedSchool(school)
    setStep('auth')
    setError('')
  }

  function handleBack() {
    setStep('school')
    setSelectedSchool(null)
    setEmail('')
    setPassword('')
    setError('')
  }

  async function handleLogin() {
    if (!selectedSchool) return
    setLoading(true)
    setError('')

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('id', authData.user.id)
      .single()

    if (!userProfile) {
      setError('Profil utilisateur introuvable')
      setLoading(false)
      return
    }

    if (userProfile.school_id !== selectedSchool.id) {
      setError('Vous n avez pas acces a cette ecole')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #172554 0%, #1E3A8A 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'DM Sans, sans-serif',
    padding: '1rem',
  }

  const cardStyle = {
    background: '#fff',
    borderRadius: '16px',
    padding: '2rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
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
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    fontSize: '13px',
    fontWeight: 500 as const,
    color: '#1E293B',
    display: 'block' as const,
    marginBottom: '6px',
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=Syne:wght@500;600&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />

      <div style={containerStyle}>
        <div style={cardStyle}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '28px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
              AC<span style={{ color: '#EF4444' }}>X</span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
              {step === 'school' ? 'Selectionnez votre etablissement' : 'Connectez-vous a votre espace'}
            </p>
          </div>

          {/* STEP 1 — Choix de l'école */}
          {step === 'school' && (
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '12px' }}>
                Etablissements disponibles
              </p>

              {loadingSchools ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontSize: '14px' }}>
                  Chargement...
                </div>
              ) : schools.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontSize: '14px' }}>
                  Aucun etablissement trouve
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                  {schools.map((school) => (
                    <button
                      key={school.id}
                      onClick={() => handleSelectSchool(school)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 14px',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        background: '#fff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#2563EB'
                        e.currentTarget.style.background = '#EFF6FF'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#E2E8F0'
                        e.currentTarget.style.background = '#fff'
                      }}
                    >
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        background: '#DBEAFE',
                        color: '#1E3A8A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        flexShrink: 0,
                      }}>
                        <i className="ti ti-school" />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E293B' }}>
                          {school.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                          {school.city ?? 'Maroc'}
                        </div>
                      </div>
                      <i className="ti ti-chevron-right" style={{ marginLeft: 'auto', color: '#CBD5E1', fontSize: '16px' }} />
                    </button>
                  ))}
                </div>
              )}

              <p style={{ textAlign: 'center', fontSize: '12px', color: '#94A3B8', marginTop: '1.5rem' }}>
                ACX · Gestion scolaire au Maroc
              </p>
            </div>
          )}

          {/* STEP 2 — Authentification */}
          {step === 'auth' && (
            <div>
              {/* École sélectionnée */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: '#EFF6FF',
                border: '1px solid #DBEAFE',
                borderRadius: '10px',
                marginBottom: '1.25rem',
              }}>
                <i className="ti ti-school" style={{ color: '#2563EB', fontSize: '18px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E3A8A' }}>
                    {selectedSchool?.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    {selectedSchool?.city}
                  </div>
                </div>
                <button
                  onClick={handleBack}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '2px 6px',
                  }}
                >
                  Changer
                </button>
              </div>

              {/* Champs login */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="directeur@ecole.ma"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Mot de passe</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
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

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  style={{
                    background: loading ? '#94A3B8' : '#2563EB',
                    color: '#fff',
                    border: 'none',
                    padding: '11px',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                    marginTop: '4px',
                  }}
                >
                  {loading ? 'Connexion...' : 'Se connecter'}
                </button>
              </div>

              <p style={{ textAlign: 'center', fontSize: '12px', color: '#94A3B8', marginTop: '1.5rem' }}>
                ACX · Gestion scolaire au Maroc
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
