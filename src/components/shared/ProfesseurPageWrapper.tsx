'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  children: (userId: string, schoolId: string) => React.ReactNode
}

export default function ProfesseurPageWrapper({ children }: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('acx_user')
    if (!stored) {
      router.push('/login')
      return
    }
    const user = JSON.parse(stored)
    setUserId(user.id)
    setSchoolId(user.school_id)
  }, [])

  if (!userId) return (
    <div style={{ padding: '2rem', color: '#94A3B8', fontSize: '14px' }}>
      Chargement...
    </div>
  )

  return <>{children(userId, schoolId!)}</>
}