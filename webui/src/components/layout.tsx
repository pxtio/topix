import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className='flex flex-col h-screen'>
          <header className='flex h-16 shrink-0 items-center gap-2 border-b px-4'>
            <SidebarTrigger className="-ml-1" />
          </header>
          <div className='flex flex-1 w-full relative min-w-0'>
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </main>
  )
}