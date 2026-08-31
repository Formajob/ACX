'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

interface SchoolSettings {
  id: string
  name: string
  slug: string
  city: string
  phone: string | null
  email: string | null
  address: string | null
  logo_url: string | null
  plan: string
  website: string | null
  director_name: string | null
  founded_year: string | null
  student_count_max: number | null
}

const SECTIONS = [
  { key: 'ecole',        label: 'Informations école',    icon: 'ti-school'        },
  { key: 'contact',      label: 'Contact & Adresse',     icon: 'ti-map-pin'       },
  { key: 'annee',        label: 'Année scolaire',        icon: 'ti-calendar'      },
  { key: 'compte',       label: 'Mon compte',            icon: 'ti-user'          },
  { key: 'affichage',    label: 'Préférences affichage', icon: 'ti-palette'       },
  { key: 'danger',       label: 'Zone de danger',        icon: 'ti-alert-triangle'},
]

export default function ParametresPage() {
  const supabase = createClient()
  const router = useRouter()

  const [activeSection, setActiveSection] = useState('ecole')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // École
  const [school, setSchool] = useState<SchoolSettings | null>(null)
  const [schoolForm, setSchoolForm] = useState({
    name: '', city: '', phone: '', email: '', address: '',
    website: '', director_name: '', founded_year: '',
  })

  // Année scolaire
  const [schoolYear, setSchoolYear] = useState<any>(null)
  const [yearForm, setYearForm] = useState({ label: '', start_date: '', end_date: '' })

  // Mon compte
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '', current_password: '', new_password: '', confirm_password: '' })
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Préférences
  const [prefs, setPrefs] = useState({
    language:         'fr',
    date_format:      'fr-MA',
    currency:         'MAD',
    show_matricule:   true,
    show_photo:       false,
    compact_mode:     false,
    notifications_wa: true,
    notifications_email: false,
    theme:            'light',
  })

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    setCurrentUser(user)

    // Charger prefs depuis localStorage
    const savedPrefs = localStorage.getItem('acx_prefs')
    if (savedPrefs) setPrefs(JSON.parse(savedPrefs))

    loadData(user.school_id, user)
  }, [])

  async function loadData(schoolId: string, user: any) {
    const [{ data: s }, { data: y }, { data: profile }] = await Promise.all([
      supabase.from('schools').select('*').eq('id', schoolId).single(),
      supabase.from('school_years').select('*').eq('school_id', schoolId).eq('is_active', true).single(),
      supabase.from('users').select('id, full_name, email, phone').eq('id', user.id).single(),
    ])

    if (s) {
      setSchool(s)
      setSchoolForm({
        name:          s.name ?? '',
        city:          s.city ?? '',
        phone:         s.phone ?? '',
        email:         s.email ?? '',
        address:       s.address ?? '',
        website:       s.website ?? '',
        director_name: s.director_name ?? '',
        founded_year:  s.founded_year ?? '',
      })
    }

    if (y) {
      setSchoolYear(y)
      setYearForm({ label: y.label ?? '', start_date: y.start_date ?? '', end_date: y.end_date ?? '' })
    }

    if (profile) {
      setProfileForm(prev => ({ ...prev, full_name: profile.full_name ?? '', email: profile.email ?? '' }))
    }

    setLoading(false)
  }

  async function saveSchool() {
    if (!school) return
    setSaving(true); setError(''); setSuccess('')
    const { error: err } = await supabase.from('schools').update({
      name:          schoolForm.name.trim(),
      city:          schoolForm.city || null,
      phone:         schoolForm.phone || null,
      email:         schoolForm.email || null,
      address:       schoolForm.address || null,
      website:       schoolForm.website || null,
      director_name: schoolForm.director_name || null,
      founded_year:  schoolForm.founded_year || null,
    }).eq('id', school.id)
    if (err) { setError('Erreur: ' + err.message); setSaving(false); return }

    // Mettre à jour school_name dans le localStorage
    const stored = localStorage.getItem('acx_user')
    if (stored) {
      const user = JSON.parse(stored)
      user.school_name = schoolForm.name.trim()
      localStorage.setItem('acx_user', JSON.stringify(user))
    }

    setSuccess('Informations de l\'école mises à jour')
    setSaving(false)
    setTimeout(() => setSuccess(''), 3000)
  }

  async function saveYear() {
    if (!schoolYear) return
    setSaving(true); setError(''); setSuccess('')
    const { error: err } = await supabase.from('school_years').update({
      label:      yearForm.label.trim(),
      start_date: yearForm.start_date || null,
      end_date:   yearForm.end_date || null,
    }).eq('id', schoolYear.id)
    if (err) { setError('Erreur: ' + err.message); setSaving(false); return }
    setSuccess('Année scolaire mise à jour')
    setSaving(false)
    setTimeout(() => setSuccess(''), 3000)
  }

  async function saveProfile() {
    if (!currentUser) return
    if (!profileForm.full_name.trim()) { setError('Le nom est obligatoire'); return }
    if (profileForm.new_password && profileForm.new_password !== profileForm.confirm_password) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    setSaving(true); setError(''); setSuccess('')
    const { error: err } = await supabase.from('users').update({
      full_name: profileForm.full_name.trim(),
    }).eq('id', currentUser.id)
    if (err) { setError('Erreur: ' + err.message); setSaving(false); return }

    const stored = localStorage.getItem('acx_user')
    if (stored) {
      const user = JSON.parse(stored)
      user.full_name = profileForm.full_name.trim()
      localStorage.setItem('acx_user', JSON.stringify(user))
    }

    setSuccess('Profil mis à jour')
    setSaving(false)
    setTimeout(() => setSuccess(''), 3000)
  }

  function savePrefs() {
    localStorage.setItem('acx_prefs', JSON.stringify(prefs))
    setSuccess('Préférences sauvegardées')
    setTimeout(() => setSuccess(''), 2000)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0',
    borderRadius: '8px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
    outline: 'none', color: '#1E293B', background: '#fff', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px',
  }
  const sectionTitle = (title: string, icon: string, desc?: string) => (
    <div style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid #F1F5F9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
          <i className={'ti ' + icon} />
        </div>
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>{title}</span>
      </div>
      {desc && <p style={{ fontSize: '13px', color: '#94A3B8', marginLeft: '40px' }}>{desc}</p>}
    </div>
  )

  const toggle = (key: keyof typeof prefs, label: string, desc?: string) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E293B' }}>{label}</div>
        {desc && <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>{desc}</div>}
      </div>
      <div
        onClick={() => setPrefs(p => ({ ...p, [key]: !p[key as keyof typeof prefs] }))}
        style={{ width: '44px', height: '24px', borderRadius: '12px', background: (prefs as any)[key] ? '#2563EB' : '#E2E8F0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
      >
        <div style={{ position: 'absolute', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', top: '3px', left: (prefs as any)[key] ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </div>
    </div>
  )

  if (loading) return <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>Chargement...</div>

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>Paramètres</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Configurez votre école et vos préférences
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '20px', alignItems: 'start' }}>

        {/* ── SIDEBAR NAV ── */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', position: 'sticky', top: '80px' }}>
          {SECTIONS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => { setActiveSection(s.key); setError(''); setSuccess('') }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 14px', border: 'none', borderBottom: i < SECTIONS.length - 1 ? '1px solid #F1F5F9' : 'none', background: activeSection === s.key ? '#EFF6FF' : '#fff', color: activeSection === s.key ? '#2563EB' : s.key === 'danger' ? '#DC2626' : '#475569', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: activeSection === s.key ? 600 : 400, textAlign: 'left' }}
            >
              <i className={'ti ' + s.icon} style={{ fontSize: '16px', flexShrink: 0 }} />
              {s.label}
              {activeSection === s.key && <i className="ti ti-chevron-right" style={{ marginLeft: 'auto', fontSize: '13px' }} />}
            </button>
          ))}

          {/* Info plan */}
          <div style={{ padding: '12px 14px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Plan actuel</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#DCFCE7', color: '#166534', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
              <i className="ti ti-crown" style={{ fontSize: '12px' }} />
              {school?.plan?.toUpperCase() ?? 'FREE'}
            </div>
          </div>
        </div>

        {/* ── CONTENU ── */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem' }}>

          {/* Messages globaux */}
          {error   && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '1rem' }}>{error}</div>}
          {success && <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '1rem' }}>
            <i className="ti ti-check" style={{ marginRight: '6px' }} />{success}
          </div>}

          {/* ══ SECTION ÉCOLE ══ */}
          {activeSection === 'ecole' && (
            <div>
              {sectionTitle('Informations de l\'école', 'ti-school', 'Ces informations apparaissent sur les bulletins, devis et factures PDF.')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Nom de l'établissement *</label>
                  <input type="text" value={schoolForm.name} onChange={e => setSchoolForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} placeholder="Groupe Scolaire Al Amal" />
                </div>
                <div>
                  <label style={labelStyle}>Ville</label>
                  <input type="text" value={schoolForm.city} onChange={e => setSchoolForm(p => ({ ...p, city: e.target.value }))} style={inputStyle} placeholder="Casablanca" />
                </div>
                <div>
                  <label style={labelStyle}>Année de fondation</label>
                  <input type="text" value={schoolForm.founded_year} onChange={e => setSchoolForm(p => ({ ...p, founded_year: e.target.value }))} style={inputStyle} placeholder="2005" />
                </div>
                <div>
                  <label style={labelStyle}>Nom du directeur / de la directrice</label>
                  <input type="text" value={schoolForm.director_name} onChange={e => setSchoolForm(p => ({ ...p, director_name: e.target.value }))} style={inputStyle} placeholder="M. Hassan Alaoui" />
                </div>
                <div>
                  <label style={labelStyle}>Site web</label>
                  <input type="text" value={schoolForm.website} onChange={e => setSchoolForm(p => ({ ...p, website: e.target.value }))} style={inputStyle} placeholder="https://www.mon-ecole.ma" />
                </div>
              </div>
              <button onClick={saveSchool} disabled={saving} style={{ padding: '10px 24px', border: 'none', borderRadius: '9px', background: saving ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                {saving ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          )}

          {/* ══ SECTION CONTACT ══ */}
          {activeSection === 'contact' && (
            <div>
              {sectionTitle('Contact & Adresse', 'ti-map-pin', 'Coordonnées de l\'établissement affichées sur les documents officiels.')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={labelStyle}>Téléphone</label>
                  <input type="tel" value={schoolForm.phone} onChange={e => setSchoolForm(p => ({ ...p, phone: e.target.value }))} style={inputStyle} placeholder="0522XXXXXX" />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={schoolForm.email} onChange={e => setSchoolForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} placeholder="contact@ecole.ma" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Adresse complète</label>
                  <textarea value={schoolForm.address} onChange={e => setSchoolForm(p => ({ ...p, address: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} placeholder="12 Rue Ibn Battouta, Maarif, Casablanca" />
                </div>
              </div>
              <button onClick={saveSchool} disabled={saving} style={{ padding: '10px 24px', border: 'none', borderRadius: '9px', background: saving ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                {saving ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          )}

          {/* ══ SECTION ANNÉE SCOLAIRE ══ */}
          {activeSection === 'annee' && (
            <div>
              {sectionTitle('Année scolaire', 'ti-calendar', 'Configurez l\'année scolaire active. Elle est utilisée pour filtrer les données.')}

              {schoolYear ? (
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#DCFCE7', color: '#166534', padding: '5px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, marginBottom: '1.25rem' }}>
                    <i className="ti ti-check-circle" /> Année active : {schoolYear.label}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <div>
                      <label style={labelStyle}>Libellé *</label>
                      <input type="text" value={yearForm.label} onChange={e => setYearForm(p => ({ ...p, label: e.target.value }))} style={inputStyle} placeholder="2024-2025" />
                    </div>
                    <div>
                      <label style={labelStyle}>Date de début</label>
                      <input type="date" value={yearForm.start_date} onChange={e => setYearForm(p => ({ ...p, start_date: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Date de fin</label>
                      <input type="date" value={yearForm.end_date} onChange={e => setYearForm(p => ({ ...p, end_date: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>

                  <button onClick={saveYear} disabled={saving} style={{ padding: '10px 24px', border: 'none', borderRadius: '9px', background: saving ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    {saving ? 'Sauvegarde...' : 'Enregistrer'}
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px' }}>
                  <i className="ti ti-calendar-off" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
                  Aucune année scolaire active trouvée
                </div>
              )}

              {/* Semestres */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '1rem' }}>
                  <i className="ti ti-layout-columns" style={{ marginRight: '6px', color: '#2563EB' }} />
                  Structure de l'année — 2 Semestres
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    { label: 'Semestre 1', icon: 'ti-number-1', color: '#2563EB', bg: '#EFF6FF', desc: 'Sept. → Janv.' },
                    { label: 'Semestre 2', icon: 'ti-number-2', color: '#10B981', bg: '#ECFDF5', desc: 'Févr. → Juin' },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '14px', background: s.bg, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fff', color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                        <i className={'ti ' + s.icon} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{s.label}</div>
                        <div style={{ fontSize: '12px', color: s.color }}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ SECTION COMPTE ══ */}
          {activeSection === 'compte' && (
            <div>
              {sectionTitle('Mon compte', 'ti-user', 'Modifiez vos informations personnelles.')}

              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem', padding: '16px', background: '#F8FAFC', borderRadius: '10px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 700, flexShrink: 0 }}>
                  {profileForm.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AD'}
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>{profileForm.full_name}</div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>{profileForm.email}</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', background: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: '10px', marginTop: '4px', fontWeight: 600 }}>
                    <i className="ti ti-shield-check" />
                    {currentUser?.role === 'super_admin' ? 'Super Admin' : 'Administrateur'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>Nom complet *</label>
                  <input type="text" value={profileForm.full_name} onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email (lecture seule)</label>
                  <input type="email" value={profileForm.email} style={{ ...inputStyle, background: '#F8FAFC', color: '#94A3B8' }} disabled />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '12px' }}>
                  <i className="ti ti-lock" style={{ marginRight: '6px', color: '#2563EB' }} />
                  Changer le mot de passe
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={labelStyle}>Nouveau mot de passe</label>
                    <input type="password" value={profileForm.new_password} onChange={e => setProfileForm(p => ({ ...p, new_password: e.target.value }))} style={inputStyle} placeholder="Laissez vide pour ne pas changer" />
                  </div>
                  <div>
                    <label style={labelStyle}>Confirmer le mot de passe</label>
                    <input type="password" value={profileForm.confirm_password} onChange={e => setProfileForm(p => ({ ...p, confirm_password: e.target.value }))} style={inputStyle} placeholder="Répétez le nouveau mot de passe" />
                  </div>
                </div>
              </div>

              <button onClick={saveProfile} disabled={saving} style={{ padding: '10px 24px', border: 'none', borderRadius: '9px', background: saving ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                {saving ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          )}

          {/* ══ SECTION AFFICHAGE ══ */}
          {activeSection === 'affichage' && (
            <div>
              {sectionTitle('Préférences d\'affichage', 'ti-palette', 'Personnalisez l\'expérience selon vos habitudes.')}

              {/* Langue & Format */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>Langue</label>
                  <select value={prefs.language} onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))} style={inputStyle}>
                    <option value="fr">Français</option>
                    <option value="ar">Arabe (قريباً)</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Format de date</label>
                  <select value={prefs.date_format} onChange={e => setPrefs(p => ({ ...p, date_format: e.target.value }))} style={inputStyle}>
                    <option value="fr-MA">JJ/MM/AAAA</option>
                    <option value="en-US">MM/JJ/AAAA</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Devise</label>
                  <select value={prefs.currency} onChange={e => setPrefs(p => ({ ...p, currency: e.target.value }))} style={inputStyle}>
                    <option value="MAD">MAD — Dirham</option>
                    <option value="EUR">EUR — Euro</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0 14px', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                  Interface
                </div>
                {toggle('show_matricule', 'Afficher le matricule des élèves', 'Visible dans les listes et tableaux')}
                {toggle('compact_mode', 'Mode compact', 'Réduit l\'espacement pour afficher plus d\'informations')}
              </div>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0 14px', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                  Notifications
                </div>
                {toggle('notifications_wa', 'Boutons WhatsApp rapides', 'Affiche les boutons wa.me dans les listes d\'absences et paiements')}
                {toggle('notifications_email', 'Rappels email', 'Bientôt disponible')}
              </div>

              <button onClick={savePrefs} style={{ padding: '10px 24px', border: 'none', borderRadius: '9px', background: '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                Sauvegarder les préférences
              </button>
            </div>
          )}

          {/* ══ SECTION DANGER ══ */}
          {activeSection === 'danger' && (
            <div>
              {sectionTitle('Zone de danger', 'ti-alert-triangle', 'Ces actions sont irréversibles. Procédez avec précaution.')}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* Export données */}
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '3px' }}>Exporter mes données</div>
                    <div style={{ fontSize: '13px', color: '#64748B' }}>Téléchargez toutes les données de votre école au format JSON.</div>
                  </div>
                  <button style={{ padding: '8px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', color: '#475569', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' as const, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="ti ti-download" /> Exporter
                  </button>
                </div>

                {/* Reset données test */}
                <div style={{ border: '1px solid #FDE68A', borderRadius: '10px', padding: '1.25rem', background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#92400E', marginBottom: '3px' }}>
                      <i className="ti ti-refresh" style={{ marginRight: '5px' }} />
                      Réinitialiser les données de démonstration
                    </div>
                    <div style={{ fontSize: '13px', color: '#B45309' }}>Supprime les élèves, notes et paiements fictifs.</div>
                  </div>
                  <button onClick={() => { if (confirm('Supprimer toutes les données de démo ? Cette action est irréversible.')) setSuccess('Fonction à implémenter') }} style={{ padding: '8px 16px', border: '1px solid #FDE68A', borderRadius: '8px', background: '#fff', color: '#92400E', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' as const }}>
                    Réinitialiser
                  </button>
                </div>

                {/* Déconnexion */}
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '3px' }}>Se déconnecter</div>
                    <div style={{ fontSize: '13px', color: '#64748B' }}>Fermer la session en cours sur cet appareil.</div>
                  </div>
                  <button onClick={() => { localStorage.removeItem('acx_user'); router.push('/login') }} style={{ padding: '8px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', color: '#475569', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' as const }}>
                    <i className="ti ti-logout" /> Se déconnecter
                  </button>
                </div>

                {/* Supprimer école */}
                <div style={{ border: '1px solid #FCA5A5', borderRadius: '10px', padding: '1.25rem', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#DC2626', marginBottom: '3px' }}>
                      <i className="ti ti-trash" style={{ marginRight: '5px' }} />
                      Supprimer l'école
                    </div>
                    <div style={{ fontSize: '13px', color: '#EF4444' }}>Cette action supprime définitivement toutes les données. Irréversible.</div>
                  </div>
                  <button onClick={() => alert('Contactez support@acx.ma pour supprimer votre compte.')} style={{ padding: '8px 16px', border: '1px solid #FCA5A5', borderRadius: '8px', background: '#fff', color: '#DC2626', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' as const }}>
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}