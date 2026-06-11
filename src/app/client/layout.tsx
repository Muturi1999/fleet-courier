import { AuthGuard } from "@/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="client">
      <AppShell role="client">{children}</AppShell>
    </AuthGuard>
  );
}
