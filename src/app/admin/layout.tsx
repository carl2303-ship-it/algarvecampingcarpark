import { Toaster } from "@/components/ui/sonner";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div lang="fr">
      {children}
      <Toaster />
    </div>
  );
}
