/** Écran affiché quand les variables d'environnement Supabase manquent. */
export function ConfigError({ missing }: { missing: string[] }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-[520px] p-6">
        <h1 className="text-[22px] font-bold">Configuration incomplète</h1>
        <p className="mt-2 text-[15px] text-label3">
          L&apos;app est bien déployée, mais il lui manque ces variables d&apos;environnement :
        </p>
        <ul className="mt-3 space-y-1">
          {missing.map((m) => (
            <li key={m} className="rounded-[8px] bg-red/10 px-3 py-2 font-mono text-[14px] text-red">
              {m}
            </li>
          ))}
        </ul>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-[15px]">
          <li>Vercel › projet › Settings › Environment Variables : ajoute-les (valeurs dans Supabase › Project Settings › API).</li>
          <li>
            Puis <strong>Deployments › ⋯ › Redeploy</strong> : ces variables sont lues au moment du build, l&apos;ajout seul ne
            suffit pas.
          </li>
        </ol>
      </div>
    </main>
  );
}
