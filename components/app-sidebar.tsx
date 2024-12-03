'use client';

import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

import { PlusIcon, FolderIcon } from '@/components/icons';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { BetterTooltip } from '@/components/ui/tooltip';
import Link from 'next/link';

interface AppSidebarProps {
  user: User;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar className="border-r bg-background">
      <div className="flex h-full flex-col">
        <div className="flex-1">
          <SidebarHeader>
            <SidebarMenu>
              <div className="flex flex-row justify-between items-center">
                <Link
                  href="/"
                  onClick={() => {
                    setOpenMobile(false);
                  }}
                  className="flex flex-row gap-3 items-center"
                >
                  <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer">
                    Chatbot
                  </span>
                </Link>
                <BetterTooltip content="New Chat" align="start">
                  <Button
                    variant="ghost"
                    type="button"
                    className="p-2 h-fit"
                    onClick={() => {
                      setOpenMobile(false);
                      router.push('/');
                      router.refresh();
                    }}
                  >
                    <PlusIcon />
                  </Button>
                </BetterTooltip>
              </div>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup className="-mx-2">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/vault" onClick={() => setOpenMobile(false)}>
                      <FolderIcon className="mr-2" />
                      <span>Vault</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="gap-0 -mx-2">
            {user && (
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarUserNav user={user} />
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarFooter>
        </div>
      </div>
    </Sidebar>
  );
}
