import Card from '../components/ui/Card'

// Shown instead of a blank white page when required build-time env vars are
// missing — this is a deploy misconfiguration (e.g. Netlify env vars unset
// or renamed), not something a signed-out visitor can fix, so the message
// is deliberately developer-facing.
export default function ConfigError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg p-4">
      <Card className="w-full max-w-md">
        <h1 className="mb-1 text-xl font-bold text-brand-gold">XCLUSV · DropshipOS</h1>
        <p className="mb-4 text-sm text-red-400">This deployment is missing required configuration.</p>
        <p className="text-sm text-brand-muted">
          <code className="text-brand-text">VITE_SUPABASE_URL</code> and/or{' '}
          <code className="text-brand-text">VITE_SUPABASE_ANON_KEY</code> are not set for this build. Add them
          in your hosting provider's environment variables (see <code className="text-brand-text">web/.env.example</code>)
          and redeploy.
        </p>
      </Card>
    </div>
  )
}
