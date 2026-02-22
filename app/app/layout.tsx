import { AppSidebar } from "@/components/app/app-sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar />
      <main className="lg:pl-64 pb-16 lg:pb-0">{children}</main>
    </div>
  );
}
