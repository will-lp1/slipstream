import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth');
  }

  return (
    <div className="flex h-screen">
      <SidebarProvider defaultOpen={true}>
        <AppSidebar user={session.user} />
        <SidebarInset>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
} 