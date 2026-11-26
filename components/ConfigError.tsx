/** Écran affiché quand les variables d'environnement Supabase manquent. */
export function ConfigError({ missing }: { missing: string[] }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-[520px] p-6">
        <h1 className="text-[22px] font-bold">Configuration incomplete</h1>
        <p className="mt-2 text-[15px] text-label3">
          The app is deployed, but these environment variables are missing:
        </p>
        <ul className="mt-3 space-y-1">
          {missing.map((m) => (
            <li key={m} className="rounded-[8px] bg-red/10 px-3 py-2 font-mono text-[14px] text-red">
              {m}
            </li>
          ))}
        </ul>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-[15px]">
          <li>Vercel › project › Settings › Environment Variables: add them (values in Supabase › Project Settings › API).</li>
          <li>
            Then <strong>Deployments › ⋯ › Redeploy</strong>: these variables are read at build time, so adding them is not
            enough.
          </li>
        </ol>
      </div>
    </main>
  );
}
