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
            <div className="px-8 py-6 bg-transparent z-30 flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-3xl font-semibold text-white tracking-tight">Usuarios</h1>
                    <p className="text-sm text-gray-400 font-medium mt-1">Gestión de comunidad APEG</p>
                </div>

                <div className="flex gap-3">
                    <button className="apple-button apple-button-secondary apple-button-sm w-auto flex items-center gap-2">
                        <Download className="w-4 h-4" /> Exportar
                    </button>
                    <button className="apple-button apple-button-primary apple-button-sm w-auto flex items-center gap-2">
                        <UserPlus className="w-4 h-4" /> Nuevo Usuario
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA - NO SCROLL */}
            <div className="flex-1 p-6 flex flex-col gap-6 overflow-hidden">

                {/* MINIFIED STATS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
                    <div className="apple-card p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-400">Total Usuarios</p>
                            <p className="text-2xl font-semibold text-white">{stats?.users?.total || 0}</p>
                        </div>
                    </div>
                    <div className="apple-card p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-400">Premium</p>
                            <p className="text-2xl font-semibold text-white">{stats?.users?.premium || 0}</p>
                        </div>
                    </div>
                    <div className="apple-card p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center">
                            <Star className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-400">Handicap Prom.</p>
                            <p className="text-2xl font-semibold text-white">{stats?.users?.avg_handicap || 0}</p>
                        </div>
                    </div>
                </div>

                {/* COMPACT TOOLBAR */}
                <div className="apple-card p-2 pl-4 flex items-center gap-4 shrink-0">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value)
                                setPage(1)
                            }}
                            className="w-full bg-transparent border-none text-white text-sm focus:outline-none placeholder:text-gray-500 pl-8 h-10"
                        />
                    </div>
                    <button className="apple-button apple-button-secondary apple-button-sm w-auto flex items-center gap-2 m-1">
                        <Filter className="w-3.5 h-3.5" /> Filtrar
                    </button>
                </div>

                {/* DATA TABLE */}
                <div className="flex-1 apple-card flex flex-col overflow-hidden">
                    <div className="overflow-x-auto overflow-y-auto h-full px-2">
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 z-10 bg-[#1e1e1e] border-b border-white/5">
                                <tr>
                                    <th className="py-4 px-6 text-xs font-medium text-gray-400 text-left">Usuario</th>
                                    <th className="py-4 px-6 text-xs font-medium text-gray-400 text-left">Contacto</th>
                                    <th className="py-4 px-6 text-xs font-medium text-gray-400 text-center">Handicap</th>
                                    <th className="py-4 px-6 text-xs font-medium text-gray-400 text-left">Registro</th>
                                    <th className="py-4 px-6 text-xs font-medium text-gray-400 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    [...Array(6)].map((_, i) => (
                                        <tr key={i}><td colSpan={5} className="py-6 px-6"><div className="h-8 w-full bg-white/5 rounded-lg animate-pulse" /></td></tr>
                                    ))
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-semibold text-white">
                                                        {user.full_name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-white">{user.full_name || 'Desconocido'}</div>
                                                        <div className="text-xs text-gray-500 font-mono">ID: {user.id.substring(0, 8)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-sm text-gray-300">
                                                        <Mail className="w-3.5 h-3.5 text-gray-500" /> {user.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <Phone className="w-3.5 h-3.5" /> {user.phone || '—'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white text-sm font-medium">
                                                    {user.handicap || '-'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm text-gray-300">{formatDate(user.updated_at)}</span>
                                                    {user.is_premium && (
                                                        <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full w-fit">PREMIUM</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link
                                                        href={`/dashboard/users/${user.id}`}
                                                        className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    <button className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
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
                    <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between shrink-0">
                        <p className="text-xs text-gray-500">
                            Página <span className="text-white font-medium">{page}</span>
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all"
                            >
                                <ChevronLeft className="w-5 h-5 text-white" />
                            </button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={users.length < 6 || loading}
                                className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all"
                            >
                                <ChevronRight className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
