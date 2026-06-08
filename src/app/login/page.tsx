'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#172554',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '14px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '28px', fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>
            AC<span style={{ color: '#EF4444' }}>X</span>
          </div>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
            Connectez-vous à votre espace
          </p>
        </div>

        {/* Champs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="directeur@ecole.ma"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'DM Sans, sans-serif'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '6px' }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'DM Sans, sans-serif'
              }}
            />
          </div>

          {/* Erreur */}
          {error && (
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#DC2626',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          {/* Bouton */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              background: loading ? '#94A3B8' : '#2563EB',
              color: '#fff',
              border: 'none',
              padding: '11px',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
              fontFamily: 'DM Sans, sans-serif'
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#94A3B8', marginTop: '1.5rem' }}>
          ACX · Gestion scolaire au Maroc 🇲🇦
        </p>
      </div>
    </div>
  )
}