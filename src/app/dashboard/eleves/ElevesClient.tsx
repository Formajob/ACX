'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Student {
  id: string
  full_name: string
  birth_date: string
  gender: string
  parent_phone: string
  parent_email: string
  created_at: string
  class_students: Array<{
    classes: {
      name: string
      level: string
    }
  }>
}

interface Props {
  eleves: Student[]
}

export default function ElevesClient({ eleves }: Props) {
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState('tous')

  const levels = ['tous', 'Maternelle', 'Primaire', 'College', 'Lycee']

  const filtered = eleves.filter((e) => {
    const matchSearch = e.full_name.toLowerCase().includes(search.toLowerCase())
    const classeData = e.class_students?.[0]
const classe = classeData ? (classeData as any).classes : null
    const matchLevel = filterLevel === 'tous' || classe?.level === filterLevel
    return matchSearch && matchLevel
  })

  function getInitials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  function getAge(birthDate: string) {
    if (!birthDate) return '-'
    const diff = Date.now() - new Date(birthDate).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365)) + ' ans'
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <i
            className="ti ti-search"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94A3B8',
              fontSize: '16px',
            }}
          />
          <input
            type="text"
            placeholder="Rechercher un eleve..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif',
              outline: 'none',
              background: '#fff',
            }}
          />
        </div>

        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          style={{
            padding: '9px 14px',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            fontSize: '14px',
            fontFamily: 'DM Sans, sans-serif',
            outline: 'none',
            background: '#fff',
            color: '#1E293B',
            cursor: 'pointer',
          }}
        >
          {levels.map((l) => (
            <option key={l} value={l}>
              {l === 'tous' ? 'Tous les niveaux' : l}
            </option>
          ))}
        </select>
      </div>

      <div style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              {['Eleve', 'Classe', 'Niveau', 'Age', 'Parent', 'Actions'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '10px 16px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#64748B',
                    textAlign: 'left',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: '#94A3B8',
                    fontSize: '14px',
                  }}
                >
                  {search ? 'Aucun eleve trouve' : 'Aucun eleve enregistre'}
                </td>
              </tr>
            ) : (
              filtered.map((eleve, index) => {
                const classe = eleve.class_students?.[0]?.classes
                return (
                  <tr
                    key={eleve.id}
                    style={{
                      borderBottom: index < filtered.length - 1 ? '1px solid #F1F5F9' : 'none',
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#DBEAFE',
                          color: '#1E3A8A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 500,
                          flexShrink: 0,
                        }}>
                          {getInitials(eleve.full_name)}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>
                            {eleve.full_name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                            {eleve.gender === 'M' ? 'Garcon' : eleve.gender === 'F' ? 'Fille' : '-'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                      {classe?.name ?? '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {classe?.level ? (
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '20px',
                          fontWeight: 500,
                          background: '#DBEAFE',
                          color: '#1E3A8A',
                        }}>
                          {classe.level}
                        </span>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#94A3B8' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                      {getAge(eleve.birth_date)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '13px', color: '#475569' }}>
                        {eleve.parent_phone ?? '-'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                        {eleve.parent_email ?? ''}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Link
                          href={'/dashboard/eleves/' + eleve.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '30px',
                            height: '30px',
                            borderRadius: '6px',
                            border: '1px solid #E2E8F0',
                            color: '#475569',
                            textDecoration: 'none',
                            fontSize: '15px',
                          }}
                          title="Voir la fiche"
                        >
                          <i className="ti ti-eye" />
                        </Link>
                        <Link
                          href={'/dashboard/eleves/' + eleve.id + '/modifier'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '30px',
                            height: '30px',
                            borderRadius: '6px',
                            border: '1px solid #E2E8F0',
                            color: '#2563EB',
                            textDecoration: 'none',
                            fontSize: '15px',
                          }}
                          title="Modifier"
                        >
                          <i className="ti ti-pencil" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '0.75rem', fontSize: '12px', color: '#94A3B8' }}>
        {filtered.length} eleve{filtered.length > 1 ? 's' : ''} affiche{filtered.length > 1 ? 's' : ''}
      </div>
    </div>
  )
}
