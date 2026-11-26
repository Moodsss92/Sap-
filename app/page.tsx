import { ConfigError } from "@/components/ConfigError";
import { JournalApp } from "@/components/JournalApp";
import { ToastProvider } from "@/components/ui/Toast";
import { missingPublicEnv } from "@/lib/env";

export default function Home() {
  const missing = missingPublicEnv();
  if (missing.length) return <ConfigError missing={missing} />;
  return (
    <ToastProvider>
      <JournalApp />
    </ToastProvider>
  );
}
