'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
    LayoutDashboard, Users, ShoppingCart, Trophy, Package,
    LogOut, Settings, HelpCircle, ChevronLeft, ChevronRight,
    Ticket, Calendar, Flag, X
} from 'lucide-react'
import Image from 'next/image'

const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, adminOnly: false },
    { name: 'Usuarios', href: '/dashboard/users', icon: Users, adminOnly: true },
    { name: 'Órdenes', href: '/dashboard/orders', icon: ShoppingCart, adminOnly: false },
    { name: 'Torneos', href: '/dashboard/tournaments', icon: Trophy, adminOnly: false },
    { name: 'Green Fees', href: '/dashboard/green-fees', icon: Flag, adminOnly: true },
    { name: 'Inventario', href: '/dashboard/inventory', icon: Package, adminOnly: false },
]

interface SidebarProps {
    isCollapsed: boolean
    onToggle: () => void
    isMobileOpen?: boolean
    onCloseMobile?: () => void
}

export default function Sidebar({ isCollapsed, onToggle, isMobileOpen, onCloseMobile }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [userData, setUserData] = useState<{ name: string; email: string; isAdmin: boolean } | null>(null)

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                // Fetch profile to check if is_admin
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, is_admin')
                    .eq('id', user.id)
                    .single()

                setUserData({
                    name: profile?.full_name || user.email?.split('@')[0] || 'Usuario',
                    email: user.email || '',
                    isAdmin: profile?.is_admin || false
                })
            }
        }
        fetchUserData()
    }, [supabase])

    const handleLogout = async () => {
        try {
            console.log('Iniciando cierre de sesión...')
            await supabase.auth.signOut()
            document.cookie = "apeg_admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
            window.location.href = '/'
        } catch (error) {
            console.error('Error al cerrar sesión:', error)
            document.cookie = "apeg_admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
            window.location.href = '/'
        }
    }

    const filteredMenuItems = menuItems.filter(item => !item.adminOnly || userData?.isAdmin)

    return (
        <aside className={`h-full ${isCollapsed ? 'w-20' : 'w-64'} flex flex-col transition-all duration-300 apple-sidebar-glass ${isMobileOpen ? 'w-64 shadow-2xl' : ''}`}>
            {/* Toggle Button - Hidden on Mobile */}
            <button
                onClick={onToggle}
                className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full items-center justify-center shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all z-50"
            >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-black" /> : <ChevronLeft className="w-3.5 h-3.5 text-black" />}
            </button>

            {/* Logo Section */}
            <div className={`relative px-6 py-8 flex items-center justify-between ${isCollapsed ? 'justify-center' : ''} h-24`}>
                {(!isCollapsed || isMobileOpen) ? (
                    <div className="flex items-center gap-3">
                        <Image src="/images/logo.png" alt="APEG Logo" width={42} height={42} className="object-contain" />
                        <div>
                            <h2 className="text-lg font-bold text-foreground tracking-tight leading-none uppercase">APEG</h2>
                            <p className="text-[10px] text-[#86868b] font-black uppercase tracking-widest mt-0.5">Admin</p>
                        </div>
                    </div>
                ) : (
                    <Image src="/images/logo.png" alt="APEG Logo" width={32} height={32} className="object-contain" />
                )}

                {/* Mobile-only close button */}
                {isMobileOpen && (
                    <button
                        onClick={onCloseMobile}
                        className="lg:hidden p-2 rounded-xl bg-black/5 text-[#86868b] hover:text-foreground transition-all active:scale-90"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                {filteredMenuItems.map((item) => {
                    const isActive = pathname === item.href || (pathname !== '/dashboard' && pathname.startsWith(item.href) && item.href !== '/dashboard');
                    const Icon = item.icon
                    const isCollapsedNow = isCollapsed && !isMobileOpen;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => onCloseMobile?.()}
                            className={`apple-nav-item ${isActive ? 'active' : ''} ${isCollapsedNow ? 'justify-center px-0 py-3' : ''}`}
                        >
                            <Icon className={`w-5 h-5 ${isCollapsedNow ? '' : 'mr-3'} ${isActive ? 'text-primary' : 'text-[#86868b]'}`} />

                            {!isCollapsedNow && (
                                <span className="font-bold tracking-tight">{item.name}</span>
                            )}

                            {isCollapsedNow && (
                                <div className="absolute left-16 px-3 py-2 bg-foreground text-white rounded-lg text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-50">
                                    {item.name}
                                </div>
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Bottom Section */}
            <div className="p-4 border-t border-black/5">
                <div className={`flex items-center ${(isCollapsed && !isMobileOpen) ? 'justify-center' : 'gap-3'} p-2`}>
                    <div className="w-9 h-9 rounded-full bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-black text-foreground shadow-sm uppercase shrink-0 border border-black/5">
                        {userData?.name?.charAt(0) || 'U'}
                    </div>

                    {(!isCollapsed || isMobileOpen) && (
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-foreground truncate leading-none mb-0.5">{userData?.name || 'Usuario'}</p>
                            <p className="text-[10px] text-[#86868b] font-medium truncate">{userData?.email}</p>
                        </div>
                    )}

                    {(!isCollapsed || isMobileOpen) && (
                        <button
                            onClick={handleLogout}
                            className="p-1.5 rounded-lg text-[#86868b] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </aside>
    )
}
