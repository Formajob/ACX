'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

interface Classe { id: string; name: string; level: string }
interface Eleve {
  id: string
  full_name: string
  birth_date: string
  gender: string
  parent_phone: string
  parent_email: string
  classe: Classe
}

interface Props {
  eleves: Eleve[]
  classes: Classe[]
}

export default function ProfElevesClient({ eleves, classes }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('tous')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ parent_phone: '', parent_email: '' })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  const filtered = eleves.filter(e => {
    const matchSearch = e.full_name.toLowerCase().includes(search.toLowerCase())
    const matchClass = filterClass === 'tous' || e.classe?.id === filterClass
    return matchSearch && matchClass
  })

  function startEdit(eleve: Eleve) {
    setEditingId(eleve.id)
    setEditForm({ parent_phone: eleve.parent_phone ?? '', parent_email: eleve.parent_email ?? '' })
    setSuccess('')
  }

  async function handleSave(eleveId: string) {
    setSaving(true)
    await supabase.from('students').update({
      parent_phone: editForm.parent_phone,
      parent_email: editForm.parent_email,
    }).eq('id', eleveId)
    setSaving(false)
    setEditingId(null)
    setSuccess('Informations mises a jour')
    router.refresh()
  }

  function getAge(birthDate: string) {
    if (!birthDate) return '-'
    return Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365)) + ' ans'
  }

  const inputStyle = {
    padding: '6px 10px',
    border: '1px solid #BFDBFE',
    borderRadius: '6px',
    fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif',
    outline: 'none',
    color: '#1E293B',
    background: '#fff',
    width: '100%',
  }

  return (
    <div>
      {success && (
        <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '1rem' }}>
          {success}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '15px' }} />
          <input
            type="text"
            placeholder="Rechercher un eleve..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
          />
        </div>
        <select
          value={filterClass}
          onChange={e => setFilterClass(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', outline: 'none', background: '#fff', color: '#1E293B' }}
        >
          <option value="tous">Toutes mes classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              {['Eleve', 'Classe', 'Age', 'Tel parent', 'Email parent', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '14px' }}>
                  Aucun eleve trouve
                </td>
              </tr>
            ) : (
              filtered.map((eleve, index) => {
                const isEditing = editingId === eleve.id
                return (
                  <tr key={eleve.id} style={{ borderBottom: index < filtered.length - 1 ? '1px solid #F1F5F9' : 'none', background: isEditing ? '#F0F9FF' : 'transparent' }}>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#DBEAFE', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500 }}>
                          {eleve.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{eleve.full_name}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>{eleve.gender === 'M' ? 'Garcon' : 'Fille'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#DBEAFE', color: '#1E3A8A', fontWeight: 500 }}>
                        {eleve.classe?.name}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569' }}>{getAge(eleve.birth_date)}</td>
                    <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569', minWidth: '150px' }}>
                      {isEditing ? (
                        <input value={editForm.parent_phone} onChange={e => setEditForm(p => ({ ...p, parent_phone: e.target.value }))} style={inputStyle} placeholder="Tel parent" />
                      ) : (
                        eleve.parent_phone ?? '-'
                      )}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569', minWidth: '180px' }}>
                      {isEditing ? (
                        <input value={editForm.parent_email} onChange={e => setEditForm(p => ({ ...p, parent_email: e.target.value }))} style={inputStyle} placeholder="Email parent" />
                      ) : (
                        eleve.parent_email ?? '-'
                      )}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleSave(eleve.id)}
                            disabled={saving}
                            style={{ padding: '5px 12px', border: 'none', borderRadius: '6px', background: '#2563EB', color: '#fff', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                          >
                            {saving ? '...' : 'Sauvegarder'}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{ padding: '5px 8px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', color: '#64748B', fontSize: '12px', cursor: 'pointer' }}
                          >
                            <i className="ti ti-x" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(eleve)}
                          style={{ padding: '5px 10px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', color: '#2563EB', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <i className="ti ti-pencil" /> Modifier
                        </button>
                      )}
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