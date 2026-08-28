'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const LEVELS = ['Maternelle', 'Primaire', 'College', 'Lycee']

const LEVEL_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  Maternelle: { color: '#F59E0B', bg: '#FFFBEB', icon: 'ti-baby-carriage' },
  Primaire:   { color: '#2563EB', bg: '#EFF6FF', icon: 'ti-school'        },
  College:    { color: '#10B981', bg: '#ECFDF5', icon: 'ti-book'          },
  Lycee:      { color: '#7C3AED', bg: '#F5F3FF', icon: 'ti-certificate'   },
}

interface FeeConfig {
  id?: string
  level: string
  tuition: number
  registration: number
  transport: number
  canteen: number
  boarding: number
}

export default function TarifsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [configs, setConfigs] = useState<Record<string, FeeConfig>>({})
  const [schoolId, setSchoolId] = useState('')
  const [schoolYearId, setSchoolYearId] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    setSchoolId(user.school_id)
    setSchoolName(user.school_name ?? '')
    loadData(user.school_id)
  }, [])

  async function loadData(sid: string) {
    const { data: year } = await supabase
      .from('school_years')
      .select('id')
      .eq('school_id', sid)
      .eq('is_active', true)
      .single()

    if (year) setSchoolYearId(year.id)

    const { data: fees } = await supabase
      .from('fee_configs')
      .select('*')
      .eq('school_id', sid)

    const map: Record<string, FeeConfig> = {}
    LEVELS.forEach(level => {
      const existing = fees?.find(f => f.level === level)
      map[level] = existing ?? { level, tuition: 0, registration: 0, transport: 0, canteen: 0, boarding: 0 }
    })
    setConfigs(map)
    setLoading(false)
  }

  async function handleSave(level: string) {
    setSaving(level)
    setError('')
    setSuccess(null)
    const cfg = configs[level]

    const payload = {
      school_id:      schoolId,
      school_year_id: schoolYearId || null,
      level,
      tuition:      cfg.tuition,
      registration: cfg.registration,
      transport:    cfg.transport,
      canteen:      cfg.canteen,
      boarding:     cfg.boarding,
    }

    const { error: err } = await supabase
      .from('fee_configs')
      .upsert(payload, { onConflict: 'school_id,school_year_id,level' })

    if (err) { setError('Erreur: ' + err.message); setSaving(null); return }
    setSuccess(level)
    setSaving(null)
    setTimeout(() => setSuccess(null), 2000)
  }

  function updateField(level: string, field: keyof FeeConfig, value: number) {
    setConfigs(prev => ({
      ...prev,
      [level]: { ...prev[level], [field]: value }
    }))
  }

  function getTotalAnnuel(level: string) {
    const c = configs[level]
    if (!c) return 0
    return c.tuition * 10 + c.registration + c.transport * 10 + c.canteen * 10
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0',
    borderRadius: '7px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
    outline: 'none', color: '#1E293B', background: '#fff', boxSizing: 'border-box',
    textAlign: 'right',
  }

  if (loading) return <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>Chargement...</div>

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/dashboard/paiements" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#64748B', textDecoration: 'none', marginBottom: '0.75rem' }}>
          <i className="ti ti-arrow-left" /> Retour aux paiements
        </Link>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Configuration des tarifs
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          {schoolName} — Annee 2024-25 · Facturation mensuelle
        </p>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
        {LEVELS.map(level => {
          const cfg = configs[level]
          const lcfg = LEVEL_CONFIG[level]
          const isSaving = saving === level
          const isDone = success === level

          return (
            <div key={level} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
              {/* Header niveau */}
              <div style={{ background: lcfg.bg, borderBottom: '1px solid #E2E8F0', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fff', color: lcfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                    <i className={'ti ' + lcfg.icon} />
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', fontFamily: 'Syne, sans-serif' }}>{level}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>Total annuel estimé : <strong style={{ color: lcfg.color }}>{getTotalAnnuel(level).toLocaleString('fr-MA')} MAD</strong></div>
                  </div>
                </div>
                <button
                  onClick={() => handleSave(level)}
                  disabled={isSaving}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', border: 'none', borderRadius: '7px', background: isDone ? '#10B981' : isSaving ? '#94A3B8' : lcfg.color, color: '#fff', fontSize: '13px', fontWeight: 500, cursor: isSaving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                >
                  <i className={'ti ' + (isDone ? 'ti-check' : 'ti-device-floppy')} />
                  {isDone ? 'Sauvegarde !' : isSaving ? 'Saving...' : 'Sauvegarder'}
                </button>
              </div>

              {/* Champs */}
              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { field: 'tuition',      label: 'Scolarite mensuelle',    suffix: 'MAD/mois',  required: true  },
                  { field: 'registration', label: 'Frais d inscription',    suffix: 'MAD/an',    required: true  },
                  { field: 'transport',    label: 'Transport (optionnel)',   suffix: 'MAD/mois',  required: false },
                  { field: 'canteen',      label: 'Cantine (optionnel)',     suffix: 'MAD/mois',  required: false },
                  { field: 'boarding',     label: 'Internat (optionnel)',    suffix: 'MAD/mois',  required: false },
                ].map(row => (
                  <div key={row.field} style={{ display: 'grid', gridTemplateColumns: '1fr auto 100px', gap: '8px', alignItems: 'center' }}>
                    <label style={{ fontSize: '13px', color: row.required ? '#1E293B' : '#64748B', fontWeight: row.required ? 500 : 400 }}>
                      {row.label}
                      {!row.required && <span style={{ fontSize: '10px', color: '#94A3B8', marginLeft: '4px' }}>opt.</span>}
                    </label>
                    <span style={{ fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap' }}>{row.suffix}</span>
                    <input
                      type="number"
                      min="0"
                      value={(cfg as any)[row.field] || ''}
                      onChange={e => updateField(level, row.field as keyof FeeConfig, parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      style={inputStyle}
                    />
                  </div>
                ))}

                {/* Récap */}
                <div style={{ marginTop: '6px', padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
                  <div style={{ color: '#64748B' }}>Scolarite × 10 mois</div>
                  <div style={{ textAlign: 'right', fontWeight: 500, color: '#1E293B' }}>{(cfg?.tuition * 10).toLocaleString('fr-MA')} MAD</div>
                  <div style={{ color: '#64748B' }}>Inscription</div>
                  <div style={{ textAlign: 'right', fontWeight: 500, color: '#1E293B' }}>{(cfg?.registration || 0).toLocaleString('fr-MA')} MAD</div>
                  <div style={{ color: '#64748B', borderTop: '1px solid #E2E8F0', paddingTop: '6px', fontWeight: 600 }}>Total annuel (sans services)</div>
                  <div style={{ textAlign: 'right', fontWeight: 700, color: lcfg.color, borderTop: '1px solid #E2E8F0', paddingTop: '6px' }}>
                    {((cfg?.tuition * 10) + (cfg?.registration || 0)).toLocaleString('fr-MA')} MAD
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info */}
      <div style={{ marginTop: '1.25rem', padding: '12px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', fontSize: '13px', color: '#1E3A8A', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <i className="ti ti-info-circle" style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }} />
        <div>
          Ces tarifs s'appliquent <strong>automatiquement</strong> lors de la configuration financière d'un nouvel élève selon son niveau. Chaque élève peut avoir un tarif personnalisé (remise, cas particulier) depuis sa fiche individuelle.
        </div>
      </div>
    </div>
  )
}