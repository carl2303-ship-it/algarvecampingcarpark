import { AdminLoginForm } from "@/components/admin/admin-login-form";

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="space-y-4">
        <AdminLoginForm />
      </div>
    </div>
  );
}
