'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    Search, ChevronLeft, ChevronRight, Mail, Phone, User as UserIcon, Users,
    Filter, Download, MoreHorizontal, Eye, UserPlus, Star,
    Activity, Shield, CheckCircle2, Clock
} from 'lucide-react'
import Link from 'next/link'

interface UserProfile {
    id: string
    full_name: string | null
    email: string
    phone: string | null
    handicap: number | null
    updated_at: string
    is_premium: boolean
}

export default function UsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([])
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const supabase = createClient()

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        const [usersRes, statsRes] = await Promise.all([
            supabase.rpc('get_all_profiles', {
                search_query: search,
                page_num: page,
                page_size: 6
            }),
            supabase.rpc('get_advanced_admin_stats')
        ])

        if (usersRes.data) setUsers(usersRes.data)
        if (statsRes.data) setStats(statsRes.data)
        setLoading(false)
    }, [page, search, supabase])

    useEffect(() => {
        const timer = setTimeout(() => fetchUsers(), 300)
        return () => clearTimeout(timer)
    }, [fetchUsers])

    const formatDate = (date: string) => {
        const d = new Date(date)
        if (isNaN(d.getTime())) return 'N/A'
        return d.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
            {/* FIXED HEADER - VERY COMPACT */}
            <div className="px-4 md:px-8 py-4 md:py-6 bg-transparent z-30 flex flex-wrap items-center justify-between gap-4 shrink-0 mt-4 lg:mt-0">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-[#1d1d1f] leading-tight uppercase tracking-tighter">Usuarios</h1>
                    <p className="text-[9px] md:text-[10px] text-[#5c5c5e] font-bold uppercase tracking-widest mt-0.5 whitespace-nowrap">Gestión de comunidad APEG</p>
                </div>

                <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
                    <button className="apple-button apple-button-secondary apple-button-sm flex-1 sm:flex-none flex items-center justify-center gap-2 bg-black/5 text-[#5c5c5e] hover:text-[#1d1d1f] hover:bg-black/10 border border-black/5 shadow-none">
                        <Download className="w-4 h-4" /> <span className="sm:inline">Exportar</span>
                    </button>
                    <button className="apple-button apple-button-primary apple-button-sm flex-1 sm:flex-none flex items-center justify-center gap-2 shadow-lg shadow-[#2d5a27]/20">
                        <UserPlus className="w-4 h-4" /> <span className="sm:inline">Nuevo</span>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA - NO SCROLL */}
            <div className="flex-1 p-4 md:p-6 flex flex-col gap-4 md:gap-6 overflow-hidden">

                {/* MINIFIED STATS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 shrink-0">
                    <div className="apple-card p-4 md:p-5 flex items-center gap-4 bg-white border-black/5">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 border border-blue-500/20">
                            <Activity className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] md:text-xs font-black text-[#86868b] uppercase tracking-widest">Total Usuarios</p>
                            <p className="text-xl md:text-2xl font-black text-[#1d1d1f] truncate">{stats?.users?.total || 0}</p>
                        </div>
                    </div>
                    <div className="apple-card p-4 md:p-5 flex items-center gap-4 bg-white border-black/5">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#2d5a27]/10 text-[#2d5a27] flex items-center justify-center shrink-0 border border-[#2d5a27]/20">
                            <Shield className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] md:text-xs font-black text-[#86868b] uppercase tracking-widest">Premium</p>
                            <p className="text-xl md:text-2xl font-black text-[#1d1d1f] truncate">{stats?.users?.premium || 0}</p>
                        </div>
                    </div>
                    <div className="apple-card p-4 md:p-5 flex items-center gap-4 sm:col-span-2 lg:col-span-1 bg-white border-black/5">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/20">
                            <Star className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] md:text-xs font-black text-[#86868b] uppercase tracking-widest">Handicap Prom.</p>
                            <p className="text-xl md:text-2xl font-black text-[#1d1d1f] truncate">{stats?.users?.avg_handicap || 0}</p>
                        </div>
                    </div>
                </div>

                {/* COMPACT TOOLBAR */}
                {/* COMPACT TOOLBAR */}
                <div className="apple-card p-2 pl-4 flex items-center gap-2 md:gap-4 shrink-0 bg-white border-black/5 shadow-sm">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] group-focus-within:text-[#2d5a27]" />
                        <input
                            type="text"
                            placeholder="Buscar usuarios..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value)
                                setPage(1)
                            }}
                            className="w-full bg-transparent border-none text-[#1d1d1f] text-sm font-bold focus:outline-none placeholder:text-[#86868b] pl-8 h-10"
                        />
                    </div>
                    <button className="apple-button apple-button-secondary apple-button-sm w-auto px-4 flex items-center gap-2 m-1 h-10 bg-black/5 text-[#5c5c5e] hover:text-[#1d1d1f] hover:bg-black/10 shadow-none border border-black/5">
                        <Filter className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Filtrar</span>
                    </button>
                </div>

                {/* DATA TABLE */}
                <div className="flex-1 apple-card flex flex-col overflow-hidden bg-white border-black/5 shadow-sm">
                    <div className="overflow-x-auto overflow-y-auto h-full px-1 md:px-2 custom-scrollbar">
                        <table className="w-full border-collapse min-w-[600px] md:min-w-0">
                            <thead className="sticky top-0 z-10 bg-black/[0.02] border-b border-black/5">
                                <tr>
                                    <th className="py-4 px-4 md:px-6 text-[10px] md:text-xs font-black uppercase tracking-widest text-[#86868b] text-left">Usuario</th>
                                    <th className="py-4 px-4 md:px-6 text-[10px] md:text-xs font-black uppercase tracking-widest text-[#86868b] text-left hidden sm:table-cell">Contacto</th>
                                    <th className="py-4 px-4 md:px-6 text-[10px] md:text-xs font-black uppercase tracking-widest text-[#86868b] text-center">HCP</th>
                                    <th className="py-4 px-4 md:px-6 text-[10px] md:text-xs font-black uppercase tracking-widest text-[#86868b] text-left hidden md:table-cell">Registro</th>
                                    <th className="py-4 px-4 md:px-6 text-[10px] md:text-xs font-black uppercase tracking-widest text-[#86868b] text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {loading ? (
                                    [...Array(6)].map((_, i) => (
                                        <tr key={i}><td colSpan={5} className="py-6 px-6"><div className="h-8 w-full bg-black/5 rounded-lg animate-pulse" /></td></tr>
                                    ))
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="group hover:bg-black/[0.02] transition-colors">
                                            <td className="py-4 px-4 md:px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-black/5 flex items-center justify-center text-sm font-black text-[#86868b] shrink-0 border border-black/5">
                                                        {user.full_name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-black text-[#1d1d1f] truncate">{user.full_name || 'Desconocido'}</div>
                                                        <div className="text-[10px] text-[#5c5c5e] font-bold font-mono truncate">ID: {user.id.substring(0, 8)}</div>
                                                        {/* Mobile-only contact info */}
                                                        <div className="sm:hidden mt-0.5 text-[10px] text-[#5c5c5e] truncate">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 md:px-6 hidden sm:table-cell">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-sm text-[#5c5c5e] font-medium truncate">
                                                        <Mail className="w-3.5 h-3.5 text-[#86868b] shrink-0" /> {user.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px] text-[#5c5c5e] font-medium truncate">
                                                        <Phone className="w-3.5 h-3.5 text-[#86868b] shrink-0" /> {user.phone || '—'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 md:px-6 text-center">
                                                <span className="inline-block px-2 md:px-3 py-1 rounded-full bg-black/5 border border-black/5 text-[#1d1d1f] text-xs md:text-sm font-black">
                                                    {user.handicap || '-'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 md:px-6 hidden md:table-cell">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm text-[#5c5c5e] font-bold">{formatDate(user.updated_at)}</span>
                                                    {user.is_premium && (
                                                        <span className="text-[9px] font-black bg-[#2d5a27]/10 text-[#2d5a27] px-2 py-0.5 rounded-full w-fit uppercase tracking-widest border border-[#2d5a27]/20">PREMIUM</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 md:px-6 text-right">
                                                <div className="flex items-center justify-end gap-1 md:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link
                                                        href={`/dashboard/users/${user.id}`}
                                                        className="p-2 rounded-lg hover:bg-black/5 text-[#86868b] hover:text-[#1d1d1f] transition-colors"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    <button className="p-2 rounded-lg hover:bg-black/5 text-[#86868b] hover:text-[#1d1d1f] transition-colors">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* MINIFIED PAGINATION */}
                    <div className="px-4 md:px-6 py-4 border-t border-black/5 flex items-center justify-between shrink-0">
                        <p className="text-[10px] md:text-xs text-[#86868b] uppercase font-black tracking-widest">
                            Pág. <span className="text-[#1d1d1f] font-black">{page}</span>
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="p-2 rounded-lg bg-black/5 hover:bg-black/10 disabled:opacity-20 transition-all border border-black/5 text-[#1d1d1f]"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={users.length < 6 || loading}
                                className="p-2 rounded-lg bg-black/5 hover:bg-black/10 disabled:opacity-20 transition-all border border-black/5 text-[#1d1d1f]"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
