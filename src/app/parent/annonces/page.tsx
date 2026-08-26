'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
  info:     { label: 'Information', icon: 'ti-info-circle',    color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  exam:     { label: 'Examen',      icon: 'ti-pencil',         color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  vacation: { label: 'Vacances',    icon: 'ti-beach',          color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
  event:    { label: 'Evenement',   icon: 'ti-calendar-event', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  photo:    { label: 'Photos',      icon: 'ti-photo',          color: '#EC4899', bg: '#FDF2F8', border: '#FBCFE8' },
  urgent:   { label: 'Urgent',      icon: 'ti-alert-triangle', color: '#EF4444', bg: '#FEF2F2', border: '#FCA5A5' },
}

export default function ParentAnnoncesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [annonces, setAnnonces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('tous')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    loadAnnonces(user.school_id)
  }, [])

  async function loadAnnonces(schoolId: string) {
    const { data } = await supabase
      .from('announcements')
      .select('*, users(full_name)')
      .eq('school_id', schoolId)
      .eq('visible', true)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
    setAnnonces(data ?? [])
    setLoading(false)
  }

  function getDaysUntil(dateStr: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(dateStr)
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return null
    if (diff === 0) return "Aujourd'hui"
    if (diff === 1) return 'Demain'
    if (diff <= 7) return 'Dans ' + diff + ' jours'
    return null
  }

  const filtered = annonces.filter(a => filterType === 'tous' || a.type === filterType)
  const pinned = filtered.filter(a => a.pinned)
  const normal = filtered.filter(a => !a.pinned)

  const upcoming = annonces
    .filter(a => a.event_date)
    .map(a => ({ ...a, daysUntil: getDaysUntil(a.event_date) }))
    .filter(a => a.daysUntil !== null)
    .slice(0, 4)

  if (loading) return <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>Chargement...</div>

  const AnnonceCard = ({ ann, big = false }: { ann: any; big?: boolean }) => {
    const cfg = TYPE_CONFIG[ann.type] ?? TYPE_CONFIG.info
    const isExpanded = expandedId === ann.id
    const daysUntil = ann.event_date ? getDaysUntil(ann.event_date) : null

    return (
      <div
        style={{ background: '#fff', border: '2px solid ' + (ann.pinned ? cfg.border : '#E2E8F0'), borderRadius: '14px', overflow: 'hidden', transition: 'all 0.2s' }}
      >
        {/* Bande colorée selon le type */}
        <div style={{ height: '4px', background: cfg.color }} />

        <div style={{ padding: big ? '1.5rem' : '1.25rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
            <div style={{ width: big ? '48px' : '40px', height: big ? '48px' : '40px', borderRadius: '12px', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: big ? '22px' : '18px', flexShrink: 0 }}>
              <i className={'ti ' + cfg.icon} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                  {cfg.label}
                </span>
                {ann.pinned && <span style={{ fontSize: '10px', background: '#FEF2F2', color: '#DC2626', padding: '1px 6px', borderRadius: '6px', fontWeight: 600 }}>
                  <i className="ti ti-pin" style={{ fontSize: '10px' }} /> A la une
                </span>}
                {daysUntil && <span style={{ fontSize: '10px', background: '#FFFBEB', color: '#92400E', padding: '1px 8px', borderRadius: '10px', fontWeight: 600 }}>
                  <i className="ti ti-clock" style={{ fontSize: '10px', marginRight: '2px' }} />{daysUntil}
                </span>}
              </div>
              <div style={{ fontSize: big ? '17px' : '15px', fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>{ann.title}</div>
            </div>
          </div>

          {/* Date événement */}
          {ann.event_date && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: cfg.bg, color: cfg.color, padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, marginBottom: '10px' }}>
              <i className="ti ti-calendar" />
              {new Date(ann.event_date).toLocaleDateString('fr-MA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {ann.event_end && <span> → {new Date(ann.event_end).toLocaleDateString('fr-MA', { day: 'numeric', month: 'long' })}</span>}
            </div>
          )}

          {/* Contenu */}
          {ann.content && (
            <div style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, marginBottom: '10px' }}>
              {isExpanded || ann.content.length <= 150
                ? ann.content
                : ann.content.slice(0, 150) + '...'}
            </div>
          )}

          {/* Lire plus */}
          {ann.content && ann.content.length > 150 && (
            <button
              onClick={() => setExpandedId(isExpanded ? null : ann.id)}
              style={{ background: 'none', border: 'none', color: cfg.color, fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '0', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {isExpanded ? 'Reduire' : 'Lire la suite'}
              <i className={'ti ' + (isExpanded ? 'ti-chevron-up' : 'ti-chevron-down')} style={{ fontSize: '14px' }} />
            </button>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F1F5F9', fontSize: '11px', color: '#94A3B8' }}>
            <i className="ti ti-user" />
            <span>{ann.users?.full_name ?? 'Administration'}</span>
            <span>·</span>
            <i className="ti ti-clock" />
            <span>{new Date(ann.created_at).toLocaleDateString('fr-MA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
          Annonces de l ecole
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          {annonces.length} publication{annonces.length > 1 ? 's' : ''} — informations, evenements et photos
        </p>
      </div>

      {/* Evenements a venir */}
      {upcoming.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            A venir
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
            {upcoming.map(ann => {
              const cfg = TYPE_CONFIG[ann.type] ?? TYPE_CONFIG.info
              return (
                <div key={ann.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: cfg.bg, border: '1px solid ' + cfg.border, borderRadius: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fff', color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                    <i className={'ti ' + cfg.icon} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: cfg.color, marginBottom: '1px' }}>{ann.daysUntil}</div>
                    <div style={{ fontSize: '12px', color: '#0F172A', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ann.title}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterType('tous')}
          style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid ' + (filterType === 'tous' ? '#2563EB' : '#E2E8F0'), background: filterType === 'tous' ? '#EFF6FF' : '#fff', color: filterType === 'tous' ? '#2563EB' : '#64748B', fontSize: '13px', fontWeight: filterType === 'tous' ? 600 : 400, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >
          Tout ({annonces.length})
        </button>
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
          const count = annonces.filter(a => a.type === key).length
          if (count === 0) return null
          return (
            <button
              key={key}
              onClick={() => setFilterType(filterType === key ? 'tous' : key)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '20px', border: '1px solid ' + (filterType === key ? cfg.color : '#E2E8F0'), background: filterType === key ? cfg.bg : '#fff', color: filterType === key ? cfg.color : '#64748B', fontSize: '13px', fontWeight: filterType === key ? 600 : 400, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
            >
              <i className={'ti ' + cfg.icon} style={{ fontSize: '13px' }} />
              {cfg.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Annonces épinglées */}
      {pinned.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <i className="ti ti-pin" /> A la une
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pinned.map(ann => <AnnonceCard key={ann.id} ann={ann} big />)}
          </div>
        </div>
      )}

      {/* Annonces normales */}
      {normal.length > 0 && (
        <div>
          {pinned.length > 0 && (
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              Toutes les annonces
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {normal.map(ann => <AnnonceCard key={ann.id} ann={ann} />)}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94A3B8', fontSize: '14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          <i className="ti ti-speakerphone" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
          Aucune annonce publiee
        </div>
      )}
    </div>
  )
}