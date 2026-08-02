'use client'

import { useState } from 'react'
import PresenceAdminClient from './PresenceAdminClient'
import RapportPointage from './RapportPointage'

interface Props {
  teachers: any[]
  todayAttendances: any[]
  alerts: any[]
}

export default function PresenceAdminWrapper({ teachers, todayAttendances, alerts }: Props) {
  const [mainTab, setMainTab] = useState<'presence' | 'rapport'>('presence')

  return (
    <div>
      {/* Main tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.25rem', background: '#F1F5F9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {[
          { key: 'presence', label: 'Presence du jour', icon: 'ti-clock' },
          { key: 'rapport',  label: 'Rapport pointage', icon: 'ti-report' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setMainTab(t.key as any)}
            style={{
              padding: '7px 18px', borderRadius: '7px', border: 'none',
              fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              background: mainTab === t.key ? '#fff' : 'transparent',
              color: mainTab === t.key ? '#1E293B' : '#64748B',
              boxShadow: mainTab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              position: 'relative' as const,
            }}
          >
            <i className={'ti ' + t.icon} style={{ fontSize: '15px' }} />
            {t.label}
            {t.key === 'presence' && alerts.length > 0 && (
              <span style={{ background: '#EF4444', color: '#fff', fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '10px', marginLeft: '2px' }}>
                {alerts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {mainTab === 'presence' && (
        <PresenceAdminClient
          teachers={teachers}
          todayAttendances={todayAttendances}
          alerts={alerts}
        />
      )}

      {mainTab === 'rapport' && (
        <RapportPointage teachers={teachers} />
      )}
    </div>
  )
}