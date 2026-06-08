'use client'

interface Action {
  label: string
  icon: string
  href: string
  color: string
  bg: string
}

const actions: Action[] = [
  { label: 'Ajouter un eleve', icon: 'ti-user-plus', href: '/dashboard/eleves/nouveau', color: '#2563EB', bg: '#EFF6FF' },
  { label: 'Saisir des notes', icon: 'ti-pencil', href: '/dashboard/notes', color: '#10B981', bg: '#ECFDF5' },
  { label: 'Enregistrer absence', icon: 'ti-calendar-off', href: '/dashboard/absences', color: '#F59E0B', bg: '#FFFBEB' },
  { label: 'Ajouter un paiement', icon: 'ti-credit-card', href: '/dashboard/paiements', color: '#EF4444', bg: '#FEF2F2' },
]

export default function QuickActions() {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
      <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '1rem' }}>
        Acces rapides
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {actions.map((item: Action) => (
          <a
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #F1F5F9',
              textDecoration: 'none',
              color: '#1E293B',
              fontSize: '13px',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.background = '#F8FAFC'
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: item.bg,
                color: item.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className={'ti ' + item.icon} style={{ fontSize: '16px' }} />
            </div>
            {item.label}
          </a>
        ))}
      </div>
    </div>
  )
}
