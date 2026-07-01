import { AdminResetPasswordForm } from "@/components/admin/admin-reset-password-form";

export const dynamic = "force-dynamic";

export default function AdminResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <AdminResetPasswordForm />
    </div>
  );
}
