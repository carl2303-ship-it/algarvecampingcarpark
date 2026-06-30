import { Toaster } from "@/components/ui/sonner";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}<Toaster /></>;
}
