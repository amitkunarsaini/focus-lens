import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { getUser } from "@/lib/data";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const user = await getUser(userId);
  if (!user) redirect("/login");

  return (
    <div className="app-aurora min-h-screen">
      <div className="mx-auto flex max-w-[1400px]">
        <Sidebar
          user={{ name: user.name, email: user.email, mode: user.mode }}
        />
        <main className="min-w-0 flex-1 px-5 py-6 sm:px-8 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
