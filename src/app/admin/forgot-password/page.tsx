import { AdminForgotPasswordForm } from "@/components/admin/admin-forgot-password-form";

export const dynamic = "force-dynamic";

export default function AdminForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <AdminForgotPasswordForm />
    </div>
  );
}
