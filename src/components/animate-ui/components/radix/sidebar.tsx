import * as React from 'react'
import { Slot } from 'radix-ui'
import { PanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

type SidebarState = { open: boolean; mobileOpen: boolean; setMobileOpen: (open: boolean) => void; toggleSidebar: () => void }
const SidebarContext = React.createContext<SidebarState | null>(null)

export function useSidebar() {
  const value = React.useContext(SidebarContext)
  if (!value) throw new Error('Sidebar deve estar dentro de SidebarProvider')
  return value
}

export function SidebarProvider({ children, defaultOpen = true, className }: { children: React.ReactNode; defaultOpen?: boolean; className?: string }) {
  const [open, setOpen] = React.useState(() => {
    try { return localStorage.getItem('data-sight:sidebar') !== 'closed' } catch { return defaultOpen }
  })
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const toggleSidebar = React.useCallback(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setMobileOpen(value => !value)
    else setOpen(value => {
      const next = !value
      try { localStorage.setItem('data-sight:sidebar', next ? 'open' : 'closed') } catch { /* optional */ }
      return next
    })
  }, [])
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') { event.preventDefault(); toggleSidebar() }
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleSidebar])
  return <SidebarContext.Provider value={{ open, mobileOpen, setMobileOpen, toggleSidebar }}><div className={cn('flex min-h-svh w-full', className)}>{children}</div></SidebarContext.Provider>
}

export function Sidebar({ children, className }: React.ComponentProps<'aside'>) {
  const { open, mobileOpen, setMobileOpen } = useSidebar()
  return <>
    <aside data-state={open ? 'expanded' : 'collapsed'} className={cn('group/sidebar sticky top-0 z-40 hidden h-svh shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#050505] transition-[width] duration-300 md:flex md:w-[72px] md:data-[state=expanded]:w-[264px]', className)}>{children}</aside>
    {mobileOpen ? <div className="fixed inset-0 z-50 md:hidden"><button aria-label="Fechar menu" className="absolute inset-0 bg-black/75" onClick={() => setMobileOpen(false)} /><aside className={cn('relative flex h-full w-[286px] flex-col border-r border-white/10 bg-[#050505]', className)}>{children}</aside></div> : null}
  </>
}

export const SidebarHeader = ({ className, ...props }: React.ComponentProps<'div'>) => <div className={cn('shrink-0', className)} {...props} />
export const SidebarContent = ({ className, ...props }: React.ComponentProps<'div'>) => <div className={cn('min-h-0 flex-1 overflow-y-auto', className)} {...props} />
export const SidebarFooter = ({ className, ...props }: React.ComponentProps<'div'>) => <div className={cn('shrink-0', className)} {...props} />
export const SidebarGroup = ({ className, ...props }: React.ComponentProps<'div'>) => <div className={cn('px-3 py-4', className)} {...props} />
export const SidebarGroupContent = (props: React.ComponentProps<'div'>) => <div {...props} />
export const SidebarGroupLabel = ({ className, ...props }: React.ComponentProps<'p'>) => <p className={cn('mb-2 px-3 text-[9px] font-semibold uppercase tracking-[.2em] text-white/30 transition-opacity group-data-[state=collapsed]/sidebar:opacity-0', className)} {...props} />
export const SidebarMenu = ({ className, ...props }: React.ComponentProps<'ul'>) => <ul className={cn('space-y-1', className)} {...props} />
export const SidebarMenuItem = ({ className, ...props }: React.ComponentProps<'li'>) => <li className={cn('relative', className)} {...props} />

export function SidebarMenuButton({ asChild, isActive, className, ...props }: React.ComponentProps<'button'> & { asChild?: boolean; isActive?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return <Comp data-active={isActive || undefined} className={cn('flex h-11 w-full items-center gap-3 overflow-hidden rounded-lg px-3 text-sm text-white/48 transition-colors hover:bg-white/[.055] hover:text-white data-[active=true]:bg-[#ff5a1f]/10 data-[active=true]:text-white data-[active=true]:shadow-[inset_2px_0_0_#ff5a1f] [&>svg]:size-4 [&>svg]:shrink-0 group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:px-0 group-data-[state=collapsed]/sidebar:[&>span]:hidden', className)} {...props} />
}

export function SidebarTrigger({ className, ...props }: React.ComponentProps<'button'>) {
  const { toggleSidebar } = useSidebar()
  return <button type="button" onClick={toggleSidebar} aria-label="Alternar menu" className={cn('grid h-9 w-9 place-items-center text-white/55 transition-colors hover:text-[#ff5a1f]', className)} {...props}><PanelLeft className="h-4 w-4" /></button>
}

export function SidebarRail() {
  const { toggleSidebar } = useSidebar()
  return <button type="button" aria-label="Alternar menu" onClick={toggleSidebar} className="absolute inset-y-0 right-[-3px] hidden w-[6px] cursor-col-resize md:block" />
}

export const SidebarInset = ({ className, ...props }: React.ComponentProps<'div'>) => <div className={cn('min-w-0 flex-1', className)} {...props} />
export const SidebarSeparator = ({ className, ...props }: React.ComponentProps<'hr'>) => <hr className={cn('mx-3 border-0 border-t border-white/10', className)} {...props} />
