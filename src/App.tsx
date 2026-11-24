import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useTranslation } from 'react-i18next'
import { Home } from './components/Home'
import { LanguageToggle } from './components/LanguageToggle'
import { PageShell } from './components/PageShell'
import { supabase } from './lib/supabase'

function authErrorFromUrl() {
  const search = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return search.get('error_description') ?? hash.get('error_description')
}

function App() {
  const { t } = useTranslation()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(authErrorFromUrl)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) setError(sessionError.message)
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  async function signInWithGoogle() {
    setError(null)
    setSigningIn(true)
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (signInError) {
      setError(signInError.message)
      setSigningIn(false)
    }
  }

  async function signOut() {
    setError(null)
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) setError(signOutError.message)
  }

  const name =
    session?.user.user_metadata.full_name ??
    session?.user.user_metadata.name ??
    session?.user.email

  if (!loading && session) {
    return (
      <PageShell>
        <Home userId={session.user.id} name={name ?? t('auth.signedIn')} onSignOut={signOut} />
      </PageShell>
    )
  }

  return (
    <PageShell centered>
      <div className="mb-8 flex justify-end">
        <LanguageToggle />
      </div>
      <h1 className="mb-3 text-3xl tracking-tight text-white">{t('appName')}</h1>
      {loading ? (
        <p>{t('auth.checking')}</p>
      ) : (
        <>
          <p>{t('auth.intro')}</p>
          <button
            type="button"
            className="mt-6 cursor-pointer rounded-full bg-emerald-600 px-5 py-3 font-[inherit] text-white disabled:cursor-wait disabled:opacity-70"
            onClick={signInWithGoogle}
            disabled={signingIn}
          >
            {signingIn ? t('auth.redirecting') : t('auth.signIn')}
          </button>
        </>
      )}
      {error ? <p className="mt-4 text-red-300">{error}</p> : null}
    </PageShell>
  )
}

export default App
