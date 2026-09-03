'use client'

import { useState } from 'react'

const BUG_TYPES = [
  { value: 'bug',        label: 'Bug / Erreur technique',     icon: 'ti-bug'           },
  { value: 'affichage',  label: 'Problème d\'affichage',      icon: 'ti-eye-off'       },
  { value: 'lenteur',    label: 'Lenteur / Performance',      icon: 'ti-clock-pause'   },
  { value: 'donnees',    label: 'Données incorrectes',         icon: 'ti-database-off'  },
  { value: 'connexion',  label: 'Problème de connexion',      icon: 'ti-wifi-off'      },
  { value: 'impression', label: 'PDF / Impression',           icon: 'ti-file-off'      },
  { value: 'suggestion', label: 'Suggestion d\'amélioration', icon: 'ti-bulb'          },
  { value: 'autre',      label: 'Autre',                      icon: 'ti-dots'          },
]

const PAGES = [
  'Tableau de bord', 'Élèves', 'Classes', 'Notes & Bulletins',
  'Absences', 'Paiements', 'Emplois du temps', 'Pointage profs',
  'Observations', 'Annonces', 'Dépenses', 'Rapports', 'Paramètres',
  'Portail parent', 'Espace professeur', 'Login', 'Autre',
]

type SupportUser = {
  full_name?: string
  email?: string
  role?: string
  school_name?: string
}

const getCurrentPageFromPath = () => {
  if (typeof window === 'undefined') return 'Autre'

  const path = window.location.pathname
  if (path.includes('eleves')) return 'Élèves'
  if (path.includes('notes')) return 'Notes & Bulletins'
  if (path.includes('absences')) return 'Absences'
  if (path.includes('paiements')) return 'Paiements'
  if (path.includes('emplois')) return 'Emplois du temps'
  if (path.includes('presence')) return 'Pointage profs'
  if (path.includes('classes')) return 'Classes'
  if (path.includes('observations')) return 'Observations'
  if (path.includes('annonces')) return 'Annonces'
  if (path.includes('depenses')) return 'Dépenses'
  if (path.includes('rapports')) return 'Rapports'
  if (path.includes('parametres')) return 'Paramètres'
  if (path.includes('parent')) return 'Portail parent'
  if (path.includes('professeur')) return 'Espace professeur'
  if (path.includes('dashboard')) return 'Tableau de bord'
  return 'Autre'
}

export default function SupportWidget() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'menu' | 'ticket' | 'sent'>('menu')
  const [sending, setSending] = useState(false)
  const [user, setUser] = useState<SupportUser | null>(null)
  const [currentPage, setCurrentPage] = useState('Autre')

  const [form, setForm] = useState({
    bug_type:    '',
    page:        '',
    description: '',
    urgent:      false,
  })

  function resetForm() {
    setForm({ bug_type: '', page: currentPage, description: '', urgent: false })
    setStep('menu')
  }

    async function sendTicket() {
    if (!form.bug_type || !form.description.trim()) return
    setSending(true)

    const roleLabel: Record<string, string> = {
      admin: 'Administrateur',
      super_admin: 'Super Admin',
      teacher: 'Professeur',
      parent: 'Parent',
    }

    const userRole = user?.role
    const userRoleLabel = userRole ? (roleLabel[userRole] ?? userRole) : '—'

    // 1. Préparer les données pour Web3Forms
    const formData = {
      access_key: "a037a697-b706-4e18-a945-3a1b664ea8e2", // ⚠️ Remplace par ta clé obtenue à l'étape 1
      subject: `[ACX${form.urgent ? ' 🚨 URGENT' : ''}] ${BUG_TYPES.find(b => b.value === form.bug_type)?.label} — ${user?.school_name ?? 'Inconnu'}`,
      from_name: user?.full_name ?? 'Utilisateur ACX',
      replyto: user?.email ?? 'no-reply@acx.ma',
      message: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
URGENCE : ${form.urgent ? '🚨 OUI' : '🟢 Non'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UTILISATEUR
Nom   : ${user?.full_name ?? 'Non connecté'}
Email : ${user?.email ?? '—'}
Rôle  : ${userRoleLabel}
École : ${user?.school_name ?? '—'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROBLÈME
Type : ${BUG_TYPES.find(b => b.value === form.bug_type)?.label ?? form.bug_type}
Page : ${form.page || currentPage}
URL  : ${window.location.href}
Date : ${new Date().toLocaleString('fr-MA')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESCRIPTION
${form.description}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `.trim()
    }

    try {
      // 2. Envoyer la requête à Web3Forms
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Accept": "application/json" 
        },
        body: JSON.stringify(formData),
      })
      
      const result = await response.json()
      
      if (result.success) {
        // 3. Succès : afficher l'écran de confirmation
        setTimeout(() => { 
          setSending(false)
          setStep('sent') 
        }, 1000)
      } else {
        alert("Erreur lors de l'envoi. Veuillez réessayer ou utiliser WhatsApp.")
        setSending(false)
      }
    } catch (err) {
      console.error(err)
      alert("Erreur de connexion. Vérifiez votre internet.")
      setSending(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0',
    borderRadius: '8px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
    outline: 'none', color: '#1E293B', background: '#fff', boxSizing: 'border-box',
  }

  return (
    <>
      {/* ── BOUTON FLOTTANT ── */}
      <button
        onClick={() => {
          const nextOpen = !open
          setOpen(nextOpen)

          if (nextOpen) {
            setStep('menu')

            const storedUser = typeof window !== 'undefined' ? localStorage.getItem('acx_user') : null
            if (storedUser) {
              try {
                setUser(JSON.parse(storedUser) as SupportUser)
              } catch {
                setUser(null)
              }
            } else {
              setUser(null)
            }

            const page = getCurrentPageFromPath()
            setCurrentPage(page)
            setForm(p => ({ ...p, page }))
          }
        }}
        title="Support & Assistance"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: open ? '#EF4444' : '#2563EB',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontSize: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 24px rgba(37,99,235,0.45)',
          zIndex: 1000,
          transition: 'all 0.25s ease',
          transform: open ? 'scale(0.96)' : 'scale(1)',
          animation: open ? 'supportButtonPulse 0.4s ease' : 'supportFloat 3.2s ease-in-out infinite',
        }}
      >
        <i className={'ti ' + (open ? 'ti-x' : 'ti-headset')} />
      </button>

      {/* ── PANEL ── */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: '88px',
          right: '24px',
          width: '340px',
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          zIndex: 1000,
          overflow: 'hidden',
          fontFamily: 'DM Sans, sans-serif',
          animation: 'supportPanelIn 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
          transformOrigin: 'bottom right',
        }}>

          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #172554, #1E3A8A)', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.12)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                <i className="ti ti-headset" />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Support ACX</div>
                <div style={{ fontSize: '11px', color: '#93C5FD', marginTop: '1px' }}>
                  {user?.school_name ?? 'Non connecté'} · {user?.full_name ?? ''}
                </div>
              </div>
            </div>
          </div>

          {/* ── STEP MENU ── */}
          {step === 'menu' && (
            <div style={{ padding: '16px' }}>

              {/* Support urgent */}
              <a
                href={`https://wa.me/212634232006?text=Bonjour ACX, j'ai besoin d'un support urgent pour l'école : ${user?.school_name ?? ''}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '12px', textDecoration: 'none', marginBottom: '10px' }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>Support urgent WhatsApp</div>
                  <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '1px' }}>+212 6 34 23 20 06 · Réponse immédiate</div>
                </div>
                <i className="ti ti-external-link" style={{ color: '#86EFAC', fontSize: '14px', marginLeft: 'auto' }} />
              </a>

              {/* Ticket */}
              <button
                onClick={() => setStep('ticket')}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', width: '100%', cursor: 'pointer', textAlign: 'left', marginBottom: '10px', fontFamily: 'DM Sans, sans-serif' }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                  <i className="ti ti-ticket" />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E3A8A' }}>Créer un ticket de support</div>
                  <div style={{ fontSize: '11px', color: '#3B82F6', marginTop: '1px' }}>Signaler un bug · Réponse sous 24h</div>
                </div>
                <i className="ti ti-chevron-right" style={{ color: '#BFDBFE', fontSize: '14px', marginLeft: 'auto' }} />
              </button>

              {/* Email direct */}
              <a
                href="mailto:support@acx.ma"
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', textDecoration: 'none' }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: '#F1F5F9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                  <i className="ti ti-mail" />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>Email support</div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>support@acx.ma</div>
                </div>
                <i className="ti ti-external-link" style={{ color: '#CBD5E1', fontSize: '14px', marginLeft: 'auto' }} />
              </a>

              {/* Info utilisateur */}
              {user && (
                <div style={{ marginTop: '12px', padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', fontSize: '11px', color: '#94A3B8' }}>
                  <i className="ti ti-user" style={{ marginRight: '4px' }} />
                  Connecté : <strong style={{ color: '#64748B' }}>{user.full_name}</strong>
                  {' · '}{user.role} · {user.school_name}
                </div>
              )}
            </div>
          )}

          {/* ── STEP TICKET ── */}
          {step === 'ticket' && (
            <div style={{ padding: '16px', maxHeight: '480px', overflowY: 'auto' }}>
              <button
                onClick={() => setStep('menu')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '12px', marginBottom: '12px', padding: 0, fontFamily: 'DM Sans, sans-serif' }}
              >
                <i className="ti ti-arrow-left" /> Retour
              </button>

              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '14px' }}>
                <i className="ti ti-ticket" style={{ marginRight: '6px', color: '#2563EB' }} />
                Nouveau ticket
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                {/* Type de bug */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Type de problème *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                    {BUG_TYPES.map(bt => (
                      <button
                        key={bt.value}
                        onClick={() => setForm(p => ({ ...p, bug_type: bt.value }))}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 9px', border: '1px solid ' + (form.bug_type === bt.value ? '#2563EB' : '#E2E8F0'), borderRadius: '7px', background: form.bug_type === bt.value ? '#EFF6FF' : '#fff', cursor: 'pointer', textAlign: 'left', fontSize: '11px', fontWeight: form.bug_type === bt.value ? 600 : 400, color: form.bug_type === bt.value ? '#1E3A8A' : '#475569', fontFamily: 'DM Sans, sans-serif' }}
                      >
                        <i className={'ti ' + bt.icon} style={{ fontSize: '13px', flexShrink: 0, color: form.bug_type === bt.value ? '#2563EB' : '#94A3B8' }} />
                        {bt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Page concernée */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Page concernée
                  </label>
                  <select value={form.page || currentPage} onChange={e => setForm(p => ({ ...p, page: e.target.value }))} style={inputStyle}>
                    {PAGES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Description *
                  </label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    rows={4}
                    placeholder="Décrivez le problème en détail — ce que vous faisiez, ce qui s&apos;est passé, le message d&apos;erreur si applicable..."
                    style={{ ...inputStyle, resize: 'vertical' as const, fontSize: '13px' }}
                  />
                </div>

                {/* Urgence */}
                <div
                  onClick={() => setForm(p => ({ ...p, urgent: !p.urgent }))}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: '1px solid ' + (form.urgent ? '#FCA5A5' : '#E2E8F0'), borderRadius: '8px', background: form.urgent ? '#FEF2F2' : '#F8FAFC', cursor: 'pointer' }}
                >
                  <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: '2px solid ' + (form.urgent ? '#EF4444' : '#CBD5E1'), background: form.urgent ? '#EF4444' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {form.urgent && <i className="ti ti-check" style={{ color: '#fff', fontSize: '12px' }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: form.urgent ? '#DC2626' : '#475569' }}>
                      <i className="ti ti-alert-triangle" style={{ marginRight: '4px' }} />
                      Marquer comme urgent
                    </div>
                    <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '1px' }}>
                      Bloque l&apos;utilisation de la plateforme
                    </div>
                  </div>
                </div>

                {/* Infos auto */}
                <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '10px 12px', fontSize: '11px', color: '#94A3B8' }}>
                  <div style={{ fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>Informations ajoutées automatiquement :</div>
                  <div>👤 {user?.full_name ?? 'Non connecté'} · {user?.role ?? '—'}</div>
                  <div>🏫 {user?.school_name ?? '—'}</div>
                  <div>📍 {form.page || currentPage}</div>
                  <div>🕐 Date ajoutée au moment de l&apos;envoi</div>
                </div>

                {/* Bouton envoi */}
                {!form.bug_type || !form.description.trim() ? (
                  <div style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', padding: '8px' }}>
                    Sélectionnez un type et décrivez le problème pour envoyer
                  </div>
                ) : (
                  <button
                    onClick={sendTicket}
                    disabled={sending}
                    style={{ padding: '11px', border: 'none', borderRadius: '9px', background: form.urgent ? '#EF4444' : '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}
                  >
                    <i className={'ti ' + (sending ? 'ti-loader-2' : 'ti-send')} style={{ fontSize: '16px', animation: sending ? 'spin 1s linear infinite' : 'none' }} />
                    {sending ? 'Envoi en cours...' : form.urgent ? 'Envoyer ticket URGENT' : 'Envoyer le ticket'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── STEP SENT ── */}
          {step === 'sent' && (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 1rem' }}>
                <i className="ti ti-check" />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>Ticket envoyé !</div>
              <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Notre équipe a reçu votre signalement et vous répondra dans les plus brefs délais.
                <br /><br />
                Pour un problème urgent, contactez-nous directement sur WhatsApp.
              </div>
              <a
                href="https://wa.me/212634232006"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#25D366', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Contacter sur WhatsApp
              </a>
              <br />
              <button onClick={() => { resetForm(); setOpen(false) }} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}>
                Fermer
              </button>
            </div>
          )}

          {/* Footer */}
          <div style={{ padding: '8px 16px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', fontSize: '10px', color: '#94A3B8', textAlign: 'center' }}>
            ACX Support · support@acx.ma · +212 6 34 23 20 06
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes supportFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes supportButtonPulse {
          0% { transform: scale(0.9); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        @keyframes supportPanelIn {
          0% {
            opacity: 0;
            transform: translateY(16px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  )
}