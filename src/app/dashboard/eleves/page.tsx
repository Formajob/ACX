'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'

interface Student {
  id: string
  full_name: string
  birth_date: string
  gender: string
  parent_phone: string
  matricule: string
  level: string
  status: string
  has_transport: boolean
  has_canteen: boolean
  class_students: any[]
}

export default function ElevesPage() {
  const supabase = createClient()
  const [eleves, setEleves] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState('tous')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, birth_date, gender, parent_phone, matricule, level, status, has_transport, has_canteen, class_students(classes(name, level))')
      .order('full_name', { ascending: true })
    console.log('eleves:', data, 'error:', error)
    setEleves(data ?? [])
    setLoading(false)
  }

  const levels = ['tous', 'Maternelle', 'Primaire', 'College', 'Lycee']

  const filtered = eleves.filter(e => {
    const matchSearch = e.full_name?.toLowerCase().includes(search.toLowerCase())
    const matchLevel = filterLevel === 'tous' || e.level === filterLevel
    return matchSearch && matchLevel
  })

  function getAge(birthDate: string) {
    if (!birthDate) return '-'
    return Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365)) + ' ans'
  }

  const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
    active:      { label: 'Actif',     bg: '#DCFCE7', color: '#166534' },
    inactive:    { label: 'Inactif',   bg: '#F1F5F9', color: '#64748B' },
    transferred: { label: 'Transfere', bg: '#FEF3C7', color: '#92400E' },
    graduated:   { label: 'Diplome',   bg: '#EFF6FF', color: '#2563EB' },
  }

  if (loading) return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', padding: '2rem', color: '#94A3B8', fontSize: '14px' }}>
      Chargement des eleves...
    </div>
  )

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#0F172A' }}>
            Eleves
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
            {eleves.length} eleve{eleves.length > 1 ? 's' : ''} inscrits
          </p>
        </div>
        <Link
          href="/dashboard/eleves/nouveau"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#2563EB', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}
        >
          <i className="ti ti-user-plus" style={{ fontSize: '16px' }} />
          Ajouter un eleve
        </Link>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '16px' }} />
          <input
            type="text"
            placeholder="Rechercher un eleve..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #E2E8F0', borderRadius: '10px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', outline: 'none', background: '#fff', boxSizing: 'border-box' as const }}
          />
        </div>
        <select
          value={filterLevel}
          onChange={e => setFilterLevel(e.target.value)}
          style={{ padding: '9px 14px', border: '1px solid #E2E8F0', borderRadius: '10px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', outline: 'none', background: '#fff', color: '#1E293B' }}
        >
          {levels.map(l => <option key={l} value={l}>{l === 'tous' ? 'Tous les niveaux' : l}</option>)}
        </select>
      </div>

      {/* Stats rapides */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total',      value: eleves.length,                                         color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Transport',  value: eleves.filter(e => e.has_transport).length,             color: '#10B981', bg: '#ECFDF5' },
          { label: 'Cantine',    value: eleves.filter(e => e.has_canteen).length,               color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Inactifs',   value: eleves.filter(e => e.status !== 'active').length,       color: '#EF4444', bg: '#FEF2F2' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.875rem 1rem' }}>
            <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: '#0F172A' }}>{s.value}</div>
            <div style={{ fontSize: '11px', marginTop: '3px', background: s.bg, color: s.color, display: 'inline-block', padding: '1px 8px', borderRadius: '20px' }}>
              eleves
            </div>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              {['Eleve', 'Matricule', 'Classe', 'Niveau', 'Age', 'Tel parent', 'Services', 'Statut', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'left', whiteSpace: 'nowrap' as const }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px' }}>
                  {search ? 'Aucun eleve trouve' : 'Aucun eleve enregistre'}
                </td>
              </tr>
            ) : (
              filtered.map((eleve, index) => {
                const classe = (eleve.class_students as any)?.[0]?.classes
                const statusCfg = statusConfig[eleve.status ?? 'active']
                return (
                  <tr key={eleve.id} style={{ borderBottom: index < filtered.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 500, flexShrink: 0 }}>
                          {eleve.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{eleve.full_name}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>{eleve.gender === 'M' ? 'Garcon' : eleve.gender === 'F' ? 'Fille' : '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>
                      {eleve.matricule ?? '-'}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '13px', color: '#475569' }}>
                      {classe?.name ?? '-'}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {eleve.level ? (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: '#DBEAFE', color: '#1E3A8A' }}>
                          {eleve.level}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' as const }}>
                      {getAge(eleve.birth_date)}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '13px', color: '#475569' }}>
                      {eleve.parent_phone ?? '-'}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {eleve.has_transport && <span title="Transport" style={{ fontSize: '14px', color: '#2563EB' }}><i className="ti ti-bus" /></span>}
                        {eleve.has_canteen && <span title="Cantine" style={{ fontSize: '14px', color: '#10B981' }}><i className="ti ti-tools-kitchen-2" /></span>}
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, background: statusCfg.bg, color: statusCfg.color }}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Link
                          href={'/dashboard/eleves/' + eleve.id}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '6px', border: '1px solid #E2E8F0', color: '#475569', textDecoration: 'none', fontSize: '15px' }}
                          title="Voir la fiche"
                        >
                          <i className="ti ti-eye" />
                        </Link>
                        <Link
                          href={'/dashboard/eleves/' + eleve.id + '/modifier'}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '6px', border: '1px solid #E2E8F0', color: '#2563EB', textDecoration: 'none', fontSize: '15px' }}
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
        {filtered.length} eleve{filtered.length > 1 ? 's' : ''} affiches
      </div>
    </div>
  )
}