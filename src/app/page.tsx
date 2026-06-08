import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data, error } = await supabase.from('schools').select('count')

  console.log('Supabase test:', { data, error })

  if (!error) {
    console.log('✅ Supabase connecté avec succès')
  }

  redirect('/landing.html')
}