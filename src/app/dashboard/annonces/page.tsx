'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  info:     { label: 'Information', icon: 'ti-info-circle',    color: '#2563EB', bg: '#EFF6FF' },
  exam:     { label: 'Examen',      icon: 'ti-pencil',         color: '#7C3AED', bg: '#F5F3FF' },
  vacation: { label: 'Vacances',    icon: 'ti-beach',          color: '#10B981', bg: '#ECFDF5' },
  event:    { label: 'Evenement',   icon: 'ti-calendar-event', color: '#F59E0B', bg: '#FFFBEB' },
  photo:    { label: 'Photos',      icon: 'ti-photo',          color: '#EC4899', bg: '#FDF2F8' },
  urgent:   { label: 'Urgent',      icon: 'ti-alert-triangle', color: '#EF4444', bg: '#FEF2F2' },
}

const TARGETS = [
  { value: 'all',        label: 'Tous les niveaux' },
  { value: 'maternelle', label: 'Maternelle uniquement' },
  { value: 'primaire',   label: 'Primaire uniquement' },
  { value: 'college',    label: 'College uniquement' },
  { value: 'lycee',      label: 'Lycee uniquement' },
]

export default function AnnoncesAdminPage() {
  const supabase = createClient()
  const router = useRouter()
  const [annonces, setAnnonces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'liste' | 'ajouter'>('liste')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState('tous')

  const [form, setForm] = useState({
    type: 'info',
    title: '',
    content: '',
    event_date: '',
    event_end: '',
    pinned: false,
    visible: true,
    target: 'all',
  })

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
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
    setAnnonces(data ?? [])
    setLoading(false)
  }

  function resetForm() {
    setForm({ type: 'info', title: '', content: '', event_date: '', event_end: '', pinned: false, visible: true, target: 'all' })
    setEditingId(null)
    setError('')
    setSuccess('')
  }

  async function handleSubmit() {
    if (!form.title.trim()) { setError('Le titre est obligatoire'); return }
    setSaving(true)
    setError('')
    setSuccess('')

    const stored = localStorage.getItem('acx_user')
    if (!stored) return
    const user = JSON.parse(stored)

    const payload = {
      school_id:  user.school_id,
      author_id:  user.id,
      type:       form.type,
      title:      form.title.trim(),
      content:    form.content || null,
      event_date: form.event_date || null,
      event_end:  form.event_end || null,
      pinned:     form.pinned,
      visible:    form.visible,
      target:     form.target,
    }

    let err
    if (editingId) {
      const res = await supabase.from('announcements').update(payload).eq('id', editingId)
      err = res.error
    } else {
      const res = await supabase.from('announcements').insert(payload)
      err = res.error
    }

    if (err) { setError('Erreur: ' + err.message); setSaving(false); return }
    setSuccess(editingId ? 'Annonce modifiee' : 'Annonce publiee')
    resetForm()
    setSaving(false)
    setTab('liste')
    const u = JSON.parse(localStorage.getItem('acx_user')!)
    loadAnnonces(u.school_id)
  }

  async function handleToggleVisible(id: string, visible: boolean) {
    await supabase.from('announcements').update({ visible: !visible }).eq('id', id)
    const u = JSON.parse(localStorage.getItem('acx_user')!)
    loadAnnonces(u.school_id)
  }

  async function handleTogglePin(id: string, pinned: boolean) {
    await supabase.from('announcements').update({ pinned: !pinned }).eq('id', id)
    const u = JSON.parse(localStorage.getItem('acx_user')!)
    loadAnnonces(u.school_id)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette annonce ?')) return
    await supabase.from('announcements').delete().eq('id', id)
    const u = JSON.parse(localStorage.getItem('acx_user')!)
    loadAnnonces(u.school_id)
  }

  function handleEdit(ann: any) {
    setForm({
      type:       ann.type,
      title:      ann.title,
      content:    ann.content ?? '',
      event_date: ann.event_date ?? '',
      event_end:  ann.event_end ?? '',
      pinned:     ann.pinned,
      visible:    ann.visible,
      target:     ann.target,
    })
    setEditingId(ann.id)
    setTab('ajouter')
  }

  const filtered = annonces.filter(a => filterType === 'tous' || a.type === filterType)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0',
    borderRadius: '8px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
    outline: 'none', color: '#1E293B', background: '#fff', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block', marginBottom: '4px',
  }

  if (loading) return <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>Chargement...</div>

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>Annonces & Evenements</h1>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>{annonces.length} publication{annonces.length > 1 ? 's' : ''} · visibles par les parents</p>
        </div>
        <button
          onClick={() => { resetForm(); setTab(tab === 'liste' ? 'ajouter' : 'liste') }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#2563EB', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >
          <i className={tab === 'liste' ? 'ti ti-plus' : 'ti ti-list'} style={{ fontSize: '16px' }} />
          {tab === 'liste' ? 'Nouvelle annonce' : 'Voir les annonces'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '1.25rem' }}>
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
          <div
            key={key}
            onClick={() => setFilterType(filterType === key ? 'tous' : key)}
            style={{ background: '#fff', border: '1px solid ' + (filterType === key ? cfg.color : '#E2E8F0'), borderRadius: '10px', padding: '10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
          >
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', margin: '0 auto 6px' }}>
              <i className={'ti ' + cfg.icon} />
            </div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A' }}>{annonces.filter(a => a.type === key).length}</div>
            <div style={{ fontSize: '10px', color: '#64748B' }}>{cfg.label}</div>
          </div>
        ))}
      </div>

      {/* Formulaire */}
      {tab === 'ajouter' && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '1.25rem' }}>
            {editingId ? 'Modifier l annonce' : 'Nouvelle annonce'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Type *</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Destinataires</label>
              <select value={form.target} onChange={e => setForm(p => ({ ...p, target: e.target.value }))} style={inputStyle}>
                {TARGETS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Titre *</label>
            <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Titre de l annonce" style={inputStyle} />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Contenu</label>
            <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={4} placeholder="Description, details, informations importantes..." style={{ ...inputStyle, resize: 'vertical' as const }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Date de l evenement</label>
              <input type="date" value={form.event_date} onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Date de fin (optionnel)</label>
              <input type="date" value={form.event_end} onChange={e => setForm(p => ({ ...p, event_end: e.target.value }))} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="pinned" checked={form.pinned} onChange={e => setForm(p => ({ ...p, pinned: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#EF4444' }} />
              <label htmlFor="pinned" style={{ fontSize: '13px', color: '#1E293B', cursor: 'pointer' }}>
                <i className="ti ti-pin" style={{ marginRight: '4px', color: '#EF4444' }} />
                Epingler en haut
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="visible" checked={form.visible} onChange={e => setForm(p => ({ ...p, visible: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563EB' }} />
              <label htmlFor="visible" style={{ fontSize: '13px', color: '#1E293B', cursor: 'pointer' }}>
                <i className="ti ti-eye" style={{ marginRight: '4px', color: '#2563EB' }} />
                Visible par les parents
              </label>
            </div>
          </div>

          {error && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '10px' }}>{error}</div>}
          {success && <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '10px' }}>{success}</div>}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={resetForm} style={{ padding: '10px 20px', border: '1px solid #E2E8F0', borderRadius: '10px', background: '#fff', color: '#475569', fontSize: '14px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '10px', background: saving ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {saving ? 'Publication...' : editingId ? 'Modifier l annonce' : 'Publier l annonce'}
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {tab === 'liste' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#94A3B8', fontSize: '14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
              <i className="ti ti-speakerphone" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
              Aucune annonce publiee
            </div>
          ) : (
            filtered.map(ann => {
              const cfg = TYPE_CONFIG[ann.type]
              return (
                <div key={ann.id} style={{ background: '#fff', border: '1px solid ' + (ann.pinned ? '#FCA5A5' : '#E2E8F0'), borderRadius: '12px', padding: '1.25rem', opacity: ann.visible ? 1 : 0.6 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                      <i className={'ti ' + cfg.icon} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        {ann.pinned && <span style={{ fontSize: '10px', background: '#FEF2F2', color: '#DC2626', padding: '1px 6px', borderRadius: '6px', fontWeight: 600 }}><i className="ti ti-pin" /> Epingle</span>}
                        {!ann.visible && <span style={{ fontSize: '10px', background: '#F1F5F9', color: '#64748B', padding: '1px 6px', borderRadius: '6px' }}><i className="ti ti-eye-off" /> Masque</span>}
                        <span style={{ fontSize: '11px', background: cfg.bg, color: cfg.color, padding: '1px 8px', borderRadius: '10px', fontWeight: 500 }}>{cfg.label}</span>
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>·</span>
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                          {TARGETS.find(t => t.value === ann.target)?.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>{ann.title}</div>
                      {ann.content && <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginBottom: '8px' }}>{ann.content}</div>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#94A3B8' }}>
                        {ann.event_date && (
                          <span><i className="ti ti-calendar" style={{ marginRight: '3px' }} />
                            {new Date(ann.event_date).toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' })}
                            {ann.event_end && ' → ' + new Date(ann.event_end).toLocaleDateString('fr-MA', { day: 'numeric', month: 'long' })}
                          </span>
                        )}
                        <span><i className="ti ti-clock" style={{ marginRight: '3px' }} />{new Date(ann.created_at).toLocaleDateString('fr-MA')}</span>
                        {ann.users && <span><i className="ti ti-user" style={{ marginRight: '3px' }} />{ann.users.full_name}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => handleTogglePin(ann.id, ann.pinned)} title={ann.pinned ? 'Desepingler' : 'Epingler'} style={{ width: '30px', height: '30px', border: '1px solid #E2E8F0', borderRadius: '6px', background: ann.pinned ? '#FEF2F2' : '#fff', color: ann.pinned ? '#DC2626' : '#94A3B8', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="ti ti-pin" />
                      </button>
                      <button onClick={() => handleToggleVisible(ann.id, ann.visible)} title={ann.visible ? 'Masquer' : 'Afficher'} style={{ width: '30px', height: '30px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', color: ann.visible ? '#2563EB' : '#94A3B8', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className={'ti ' + (ann.visible ? 'ti-eye' : 'ti-eye-off')} />
                      </button>
                      <button onClick={() => handleEdit(ann)} title="Modifier" style={{ width: '30px', height: '30px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="ti ti-pencil" />
                      </button>
                      <button onClick={() => handleDelete(ann.id)} title="Supprimer" style={{ width: '30px', height: '30px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', color: '#EF4444', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}