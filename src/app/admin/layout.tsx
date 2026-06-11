import { AuthGuard } from "@/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="admin">
      <AppShell role="admin">{children}</AppShell>
    </AuthGuard>
  );
}
