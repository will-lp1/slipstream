import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth');
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar user={session.user} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
