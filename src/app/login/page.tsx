'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface School {
  id: string
  name: string
  city: string
}

const DEMO_ACCOUNTS = [
  {
    type: 'admin',
    label: 'Directeur / Admin',
    icon: 'ti-shield-check',
    color: '#2563EB',
    bg: '#EFF6FF',
    desc: 'Accès complet à tous les modules',
    email: 'admin@al-jawhara.ma',
  },
  {
    type: 'teacher',
    label: 'Professeur',
    icon: 'ti-chalkboard',
    color: '#10B981',
    bg: '#ECFDF5',
    desc: 'Notes, absences, pointage, observations',
    email: 'prof1@al-jawhara.ma',
  },
  {
    type: 'parent',
    label: 'Parent',
    icon: 'ti-users',
    color: '#F59E0B',
    bg: '#FFFBEB',
    desc: 'Suivi scolaire et financier de l\'enfant',
    email: 'parent.benali@gmail.com',
  },
]

export default function LoginPage() {
  const [schools, setSchools]               = useState<School[]>([])
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [step, setStep]                     = useState<'school' | 'auth'>('school')
  const [email, setEmail]                   = useState('')
  const [password, setPassword]             = useState('')
  const [error, setError]                   = useState('')
  const [loading, setLoading]               = useState(false)
  const [loadingSchools, setLoadingSchools] = useState(true)
  const [showDemo, setShowDemo]             = useState(false)
  const [demoLoading, setDemoLoading]       = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    supabase.from('schools').select('id, name, city').order('name').then(({ data }) => {
      setSchools(data ?? [])
      setLoadingSchools(false)
    })
  }, [])

  // Trouver l'école Al Jawhara pour la démo
  const demoSchool = schools.find(s => s.name?.toLowerCase().includes('jawhara')) ?? schools[0]

  async function handleDemoLogin(accountType: string) {
    const account = DEMO_ACCOUNTS.find(a => a.type === accountType)
    if (!account || !demoSchool) return
    setDemoLoading(accountType)

    const { data: profiles } = await supabase
      .from('users')
      .select('id, school_id, role, full_name, email')
      .eq('email', account.email)
      .limit(1)

    if (!profiles || profiles.length === 0) {
      setError('Compte démo introuvable — vérifiez la base de données')
      setDemoLoading(null)
      return
    }

    const u = profiles[0]
    localStorage.setItem('acx_user', JSON.stringify({
      id:          u.id,
      email:       u.email,
      role:        u.role,
      full_name:   u.full_name,
      school_id:   u.school_id,
      school_name: demoSchool.name,
    }))

    const dest = u.role === 'teacher' ? '/professeur' : u.role === 'parent' ? '/parent' : '/dashboard'
    window.location.href = dest
  }

  async function handleLogin() {
    if (!selectedSchool) return
    setLoading(true)
    setError('')

    try {
      const { data: profiles } = await supabase
        .from('users')
        .select('id, school_id, role, full_name, email')
        .eq('email', email.trim().toLowerCase())
        .limit(1)

      if (!profiles || profiles.length === 0) {
        setError('Email introuvable')
        setLoading(false)
        return
      }

      const u = profiles[0]

      if (password !== 'acx123456') {
        setError('Mot de passe incorrect')
        setLoading(false)
        return
      }

      if (u.role !== 'super_admin' && u.school_id !== selectedSchool.id) {
        setError('Ce compte n\'appartient pas à cette école')
        setLoading(false)
        return
      }

      localStorage.setItem('acx_user', JSON.stringify({
        id:          u.id,
        email:       u.email,
        role:        u.role,
        full_name:   u.full_name,
        school_id:   u.role === 'super_admin' ? selectedSchool.id : u.school_id,
        school_name: selectedSchool.name,
      }))

      const dest = u.role === 'teacher' ? '/professeur' : u.role === 'parent' ? '/parent' : '/dashboard'
      window.location.href = dest

    } catch (e: any) {
      setError('Erreur: ' + e.message)
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', border: '1px solid #E2E8F0',
    borderRadius: '10px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
    outline: 'none', color: '#1E293B', boxSizing: 'border-box', background: '#fff',
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />

      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0F172A 0%, #172554 50%, #1E3A8A 100%)', display: 'flex', fontFamily: 'DM Sans, sans-serif', position: 'relative', overflow: 'hidden' }}>

        {/* Décoration fond */}
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-150px', left: '-100px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Panneau gauche — branding */}
        <div style={{ display: 'none', flex: 1, padding: '3rem', flexDirection: 'column', justifyContent: 'space-between', '@media (min-width: 1024px)': { display: 'flex' } } as any}>
          {/* Logo */}
          <div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff', fontFamily: 'Syne, sans-serif', letterSpacing: '-1px' }}>
              AC<span style={{ color: '#EF4444' }}>X</span>
            </div>
            <div style={{ fontSize: '13px', color: '#93C5FD', marginTop: '4px' }}>Plateforme de gestion scolaire</div>
          </div>

          {/* Features */}
          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff', fontFamily: 'Syne, sans-serif', lineHeight: 1.3, marginBottom: '2rem', letterSpacing: '-0.5px' }}>
              La plateforme pensée<br />pour les écoles privées<br /><span style={{ color: '#EF4444' }}>marocaines.</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { icon: 'ti-users',       text: 'Gestion élèves, notes et bulletins PDF' },
                { icon: 'ti-credit-card', text: 'Paiements, devis et relances WhatsApp'  },
                { icon: 'ti-fingerprint', text: 'Pointage du staff en temps réel'        },
                { icon: 'ti-chart-bar',   text: 'Rapports complets PDF & Excel'          },
                { icon: 'ti-speakerphone',text: 'Portail parents et annonces école'      },
              ].map(f => (
                <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(255,255,255,0.08)', color: '#93C5FD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0 }}>
                    <i className={'ti ' + f.icon} />
                  </div>
                  <span style={{ fontSize: '14px', color: '#BFDBFE', fontWeight: 300 }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
            © 2025 ACX · acx.ma · Fait au Maroc 🇲🇦
          </div>
        </div>

        {/* Panneau droit — formulaire */}
        <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%' }}>

            {/* Card principale */}
            <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: '20px', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }}>

              {/* Logo mobile */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'Syne, sans-serif', color: '#0F172A', letterSpacing: '-1px' }}>
                  AC<span style={{ color: '#EF4444' }}>X</span>
                </div>
                <p style={{ fontSize: '13px', color: '#64748B', marginTop: '3px' }}>
                  {step === 'school' ? 'Sélectionnez votre établissement' : 'Connectez-vous à votre espace'}
                </p>
              </div>

              {/* ── BOUTON DÉMO ── */}
              <div style={{ marginBottom: '1.25rem' }}>
                <button
                  onClick={() => setShowDemo(!showDemo)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px', border: '1px dashed #2563EB', borderRadius: '12px', background: showDemo ? '#EFF6FF' : 'transparent', color: '#2563EB', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}
                >
                  <i className={'ti ' + (showDemo ? 'ti-x' : 'ti-player-play')} style={{ fontSize: '16px' }} />
                  {showDemo ? 'Fermer la démo' : 'Essayer la démo — accès instantané'}
                </button>

                {showDemo && (
                  <div style={{ marginTop: '10px', padding: '14px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                      Choisissez votre profil de démo
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {DEMO_ACCOUNTS.map(account => (
                        <button
                          key={account.type}
                          onClick={() => handleDemoLogin(account.type)}
                          disabled={!!demoLoading}
                          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', border: '1px solid ' + (demoLoading === account.type ? account.color : '#E2E8F0'), borderRadius: '10px', background: demoLoading === account.type ? account.bg : '#fff', cursor: demoLoading ? 'not-allowed' : 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s', fontFamily: 'DM Sans, sans-serif' }}
                        >
                          <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: account.bg, color: account.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                            {demoLoading === account.type
                              ? <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} />
                              : <i className={'ti ' + account.icon} />
                            }
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{account.label}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>{account.desc}</div>
                          </div>
                          <i className="ti ti-arrow-right" style={{ color: '#CBD5E1', fontSize: '16px' }} />
                        </button>
                      ))}
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '11px', color: '#94A3B8', textAlign: 'center' }}>
                      <i className="ti ti-lock" style={{ marginRight: '4px' }} />
                      Données fictives — aucune donnée réelle impliquée
                    </div>
                  </div>
                )}
              </div>

              {/* Séparateur */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
                <span style={{ fontSize: '12px', color: '#94A3B8', whiteSpace: 'nowrap' }}>ou connectez-vous avec votre compte</span>
                <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
              </div>

              {/* ── STEP ÉCOLE ── */}
              {step === 'school' && (
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                    Établissements
                  </p>
                  {loadingSchools ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontSize: '14px' }}>
                      <i className="ti ti-loader-2" style={{ fontSize: '24px', display: 'block', marginBottom: '6px' }} />
                      Chargement...
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
                      {schools.map(school => (
                        <button
                          key={school.id}
                          onClick={() => { setSelectedSchool(school); setStep('auth'); setError('') }}
                          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', border: '1px solid #E2E8F0', borderRadius: '10px', background: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s', fontFamily: 'DM Sans, sans-serif' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2563EB'; (e.currentTarget as HTMLElement).style.background = '#EFF6FF' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; (e.currentTarget as HTMLElement).style.background = '#fff' }}
                        >
                          <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                            <i className="ti ti-school" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E293B' }}>{school.name}</div>
                            <div style={{ fontSize: '12px', color: '#94A3B8' }}>{school.city ?? 'Maroc'}</div>
                          </div>
                          <i className="ti ti-chevron-right" style={{ color: '#CBD5E1', fontSize: '16px' }} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP AUTH ── */}
              {step === 'auth' && (
                <div>
                  {/* École sélectionnée */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: '10px', marginBottom: '1.25rem' }}>
                    <i className="ti ti-school" style={{ color: '#2563EB', fontSize: '18px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E3A8A' }}>{selectedSchool?.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{selectedSchool?.city}</div>
                    </div>
                    <button
                      onClick={() => { setStep('school'); setSelectedSchool(null); setEmail(''); setPassword(''); setError('') }}
                      style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}
                    >
                      Changer
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Email</label>
                      <input
                        type="text"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="votre@email.ma"
                        style={inputStyle}
                        autoComplete="email"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '5px' }}>Mot de passe</label>
                      <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        placeholder="••••••••"
                        style={inputStyle}
                        autoComplete="current-password"
                      />
                    </div>

                    {error && (
                      <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="ti ti-alert-circle" />
                        {error}
                      </div>
                    )}

                    <button
                      onClick={handleLogin}
                      disabled={loading}
                      style={{ background: loading ? '#94A3B8' : 'linear-gradient(135deg, #2563EB, #1E40AF)', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: loading ? 'none' : '0 4px 14px rgba(37,99,235,0.4)' }}
                    >
                      {loading ? 'Connexion...' : 'Se connecter'}
                    </button>

                    
                  </div>
                </div>
              )}
            </div>

            {/* Lien retour landing */}
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <a href="/landing.html" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <i className="ti ti-arrow-left" style={{ fontSize: '13px' }} />
                Retour à l'accueil
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}