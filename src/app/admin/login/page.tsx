import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="space-y-4">
        <AdminLoginForm
          initialError={params.error ?? null}
          resetSuccess={params.reset === "success"}
        />
      </div>
    </div>
  );
}
