'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
    LayoutDashboard, Users, ShoppingCart, Trophy, Package,
    LogOut, Settings, HelpCircle, ChevronLeft, ChevronRight,
    Ticket, Calendar, Flag
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
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
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
        <aside className={`fixed left-0 top-0 h-screen ${isCollapsed ? 'w-20' : 'w-64'} flex flex-col z-50 transition-all duration-300 apple-sidebar-glass`}>
            {/* Toggle Button */}
            <button
                onClick={onToggle}
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all z-50"
            >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-black" /> : <ChevronLeft className="w-3.5 h-3.5 text-black" />}
            </button>

            {/* Logo Section */}
            <div className={`relative px-6 py-8 flex items-center ${isCollapsed ? 'justify-center' : ''} h-24`}>
                {!isCollapsed ? (
                    <div className="flex items-center gap-3">
                        <Image src="/images/logo.png" alt="APEG Logo" width={42} height={42} className="object-contain" />
                        <div>
                            <h2 className="text-lg font-semibold text-white tracking-tight leading-none">APEG</h2>
                            <p className="text-[11px] text-gray-400 font-medium">Admin</p>
                        </div>
                    </div>
                ) : (
                    <Image src="/images/logo.png" alt="APEG Logo" width={32} height={32} className="object-contain" />
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                {filteredMenuItems.map((item) => {
                    const isActive = pathname === item.href || (pathname !== '/dashboard' && pathname.startsWith(item.href) && item.href !== '/dashboard');
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`apple-nav-item ${isActive ? 'active' : ''} ${isCollapsed ? 'justify-center px-0 py-3' : ''}`}
                        >
                            <Icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} ${isActive ? 'text-[#0a84ff]' : 'text-gray-400'}`} />

                            {!isCollapsed && (
                                <span>{item.name}</span>
                            )}

                            {isCollapsed && (
                                <div className="absolute left-16 px-3 py-2 bg-white text-black rounded-lg text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-50">
                                    {item.name}
                                </div>
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Bottom Section */}
            <div className="p-4 border-t border-white/5">
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} p-2`}>
                    <div className="w-9 h-9 rounded-full bg-linear-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold text-white shadow-inner uppercase shrink-0">
                        {userData?.name?.charAt(0) || 'U'}
                    </div>

                    {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{userData?.name || 'Usuario'}</p>
                            <p className="text-[11px] text-gray-500 truncate">{userData?.email}</p>
                        </div>
                    )}

                    {!isCollapsed && (
                        <button
                            onClick={handleLogout}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </aside>
    )
}
