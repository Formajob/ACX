'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import SupportWidget from '@/components/shared/SupportWidget'

const navItems = [
  { href: '/parent',           icon: 'ti-home',         label: 'Tableau de bord' },
  { href: '/parent/notes',     icon: 'ti-file-text',    label: 'Notes & Bulletins' },
  { href: '/parent/absences',  icon: 'ti-calendar-off', label: 'Absences' },
  { href: '/parent/paiements', icon: 'ti-credit-card',  label: 'Paiements' },
  { href: '/parent/observations', icon: 'ti-notes', label: 'Observations' },
  { href: '/parent/annonces', icon: 'ti-speakerphone', label: 'Annonces' },
]

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    if (user.role !== 'parent') { router.push('/login'); return }
    setUserName(user.full_name ?? '')
  }, [])

  function handleLogout() {
    localStorage.removeItem('acx_user')
    router.push('/login')
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=Syne:wght@500;600&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />

      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'DM Sans, sans-serif', background: '#F8FAFC' }}>

        <aside style={{ width: collapsed ? '64px' : '240px', background: '#172554', display: 'flex', flexDirection: 'column', transition: 'width 0.2s', overflow: 'hidden', flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', padding: collapsed ? '18px 0' : '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', minHeight: '60px' }}>
            {!collapsed && (
              <div>
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 600, color: '#fff' }}>
                  AC<span style={{ color: '#EF4444' }}>X</span>
                </span>
                <span style={{ fontSize: '11px', color: '#93C5FD', marginLeft: '6px' }}>Parent</span>
              </div>
            )}
            <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'none', border: 'none', color: '#BFDBFE', cursor: 'pointer', fontSize: '18px', padding: '4px' }}>
              <i className={'ti ' + (collapsed ? 'ti-layout-sidebar-right' : 'ti-layout-sidebar')} />
            </button>
          </div>

          <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {navItems.map(item => {
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: collapsed ? '10px 0' : '10px 12px', justifyContent: collapsed ? 'center' : 'flex-start', borderRadius: '8px', textDecoration: 'none', background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent', color: isActive ? '#fff' : '#93C5FD', fontSize: '14px', fontWeight: isActive ? 500 : 400 }}>
                  <i className={'ti ' + item.icon} style={{ fontSize: '18px', flexShrink: 0 }} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </nav>

          <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: collapsed ? 'center' : 'flex-start', width: '100%', padding: collapsed ? '10px 0' : '10px 12px', background: 'none', border: 'none', borderRadius: '8px', color: '#93C5FD', fontSize: '14px', cursor: 'pointer' }}>
              <i className="ti ti-logout" style={{ fontSize: '18px' }} />
              {!collapsed && <span>Deconnexion</span>}
            </button>
          </div>
        </aside>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <header style={{ height: '60px', background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', position: 'sticky', top: 0, zIndex: 50 }}>
            <div style={{ fontSize: '14px', color: '#64748B' }}>
              {navItems.find(i => pathname === i.href)?.label ?? 'Espace Parent'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {userName && <span style={{ fontSize: '13px', color: '#64748B' }}>{userName}</span>}
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 500 }}>
                {userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'PA'}
              </div>
            </div>
          </header>
          <main style={{ flex: 1, padding: '1.5rem' }}>
            {children}
          </main>
        </div>
        <SupportWidget />
      </div>
    </>
  )
}