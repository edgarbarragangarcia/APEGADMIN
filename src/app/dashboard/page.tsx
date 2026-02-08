'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    Users, ShoppingCart, Trophy, Activity, TrendingUp, TrendingDown,
    DollarSign, Eye, Clock, ArrowUpRight, ArrowDownRight, BarChart3,
    Zap, Shield, Database, Wifi, ChevronRight, Calendar, Star,
    Package, CreditCard, RefreshCw, AlertCircle
} from 'lucide-react'

interface DashboardStats {
    total_users: number
    total_orders: number
    total_tournaments: number
    total_revenue?: number
}

interface Order {
    id: string
    buyer_name: string | null
    status: string
    total_amount: number
    created_at: string
    items: any[]
}

interface User {
    id: string
    full_name: string | null
    email: string
    created_at: string
}

interface Product {
    id: string
    title: string
    price: number
    stock_quantity: number
}

interface ActivityItem {
    type: 'order' | 'user' | 'tournament'
    message: string
    detail: string
    amount?: string
    time: string
    icon: any
}

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null)
    const [orders, setOrders] = useState<Order[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [apiLatency, setApiLatency] = useState<number>(0)
    const [refreshing, setRefreshing] = useState(false)
    const [userProfile, setUserProfile] = useState<{ id: string; isAdmin: boolean } | null>(null)

    const supabase = createClient()

    const fetchAllData = useCallback(async () => {
        const startTime = performance.now()
        try {
            // 1. Get current user and role
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('id, is_admin')
                .eq('id', user.id)
                .single()

            const isAdmin = profile?.is_admin || false
            setUserProfile({ id: user.id, isAdmin })

            if (isAdmin) {
                // Admin: Fetch everything via RPCs
                const [statsRes, ordersRes, usersRes] = await Promise.all([
                    supabase.rpc('get_advanced_admin_stats'),
                    supabase.rpc('get_all_orders', { page_num: 1, page_size: 20 }),
                    supabase.rpc('get_all_profiles', { page_num: 1, page_size: 20 })
                ])
                if (statsRes.data) setStats(statsRes.data)
                if (ordersRes.data) setOrders(ordersRes.data)
                if (usersRes.data) setUsers(usersRes.data)
            } else {
                // User: Fetch only their data
                const { data: userOrders } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('buyer_id', user.id) // Assuming buyer_id is the link to profile
                    .order('created_at', { ascending: false })
                    .limit(20)

                const { data: inventoryCount } = await supabase
                    .from('products')
                    .select('id', { count: 'exact', head: true })

                const totalRevenue = userOrders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0

                setOrders(userOrders || [])
                setStats({
                    users: { total: 1, premium: 0 }, // Just themselves
                    orders: { total: userOrders?.length || 0, pending: userOrders?.filter(o => o.status === 'pending').length || 0, revenue: totalRevenue },
                    inventory: { total: inventoryCount?.length || 0, low_stock: 0 }
                })
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        }
        const endTime = performance.now()
        setApiLatency(Math.round(endTime - startTime))
        setLoading(false)
        setRefreshing(false)
    }, [supabase])

    useEffect(() => {
        fetchAllData()
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)

        // 🟢 REAL-TIME SUBSCRIPTIONS FOR DASHBOARD
        const channel = supabase
            .channel('dashboard-monitor')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchAllData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchAllData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchAllData())
            .subscribe()

        return () => {
            clearInterval(timer)
            supabase.removeChannel(channel)
        }
    }, [fetchAllData, supabase])

    const handleRefresh = () => {
        setRefreshing(true)
        fetchAllData()
    }

    const formatTime = (date: Date) => date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    const formatDate = (date: Date) => date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
    const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(amount)

    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000)
        if (diffMins < 1) return 'Ahora'
        if (diffMins < 60) return `${diffMins}m`
        return `${Math.floor(diffMins / 60)}h`
    }

    const recentActivity: ActivityItem[] = [
        ...orders.slice(0, 5).map(order => ({
            type: 'order' as const,
            message: order.status === 'pagado' || order.status === 'paid' ? 'Pago a tu favor' : 'Compra realizada',
            detail: order.id.substring(0, 8),
            amount: formatCurrency(Number(order.total_amount)),
            time: formatRelativeTime(order.created_at),
            icon: CreditCard
        }))
    ].slice(0, 4)

    const weeklyData = (() => {
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
        const weekData = []
        for (let i = 6; i >= 0; i--) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            const count = orders.filter(o => new Date(o.created_at).toDateString() === date.toDateString()).length
            weekData.push({ day: days[date.getDay()], count, isToday: i === 0 })
        }
        return weekData
    })()

    const maxWeeklyValue = Math.max(...weeklyData.map(d => d.count), 1)

    if (loading) return <div className="p-8 text-white uppercase font-black tracking-widest animate-pulse">Cargando Monitor...</div>

    return (
        <div className="flex-1 flex flex-col overflow-hidden h-full bg-background relative">
            <div className="bg-mesh opacity-30 fixed inset-0 pointer-events-none" />

            {/* HEADER */}
            <div className="px-8 py-6 bg-transparent flex items-center justify-between shrink-0 z-10 relative">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-white tracking-tight">Monitor Central</h1>
                        <p className="text-sm text-gray-400 font-medium">Estado global de la plataforma</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-xl font-semibold text-white font-mono">{formatTime(currentTime)}</p>
                        <p className="text-xs font-medium text-gray-500 capitalize">{formatDate(currentTime)}</p>
                    </div>
                    <button onClick={handleRefresh} className={`w-8 h-8 rounded-full bg-[#2c2c2e] hover:bg-[#3a3a3c] flex items-center justify-center transition-all ${refreshing ? 'animate-spin' : ''}`}>
                        <RefreshCw className="w-4 h-4 text-gray-400" />
                    </button>
                </div>
            </div>

            {/* MAIN DASHBOARD CONTENT */}
            <div className="flex-1 px-8 pb-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar z-10 relative">

                {/* 1. COMPACT STATS GRID */}
                <div className={`grid ${userProfile?.isAdmin ? 'grid-cols-4' : 'grid-cols-3'} gap-6 shrink-0`}>
                    {userProfile?.isAdmin && (
                        <div className="apple-card p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <Users className="w-4 h-4 text-emerald-400" />
                                </div>
                                <span className="text-xs font-medium text-gray-400">Usuarios</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-semibold text-white">{(stats as any)?.users?.total || 0}</p>
                                <span className="text-xs font-medium text-emerald-400 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> +{(stats as any)?.users?.premium || 0}</span>
                            </div>
                        </div>
                    )}
                    <div className="apple-card p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <Activity className="w-4 h-4 text-amber-500" />
                            </div>
                            <span className="text-xs font-medium text-gray-400">Órdenes</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-semibold text-white">{(stats as any)?.orders?.total || 0}</p>
                            <span className="text-xs font-medium text-amber-500">{(stats as any)?.orders?.pending || 0} pendientes</span>
                        </div>
                    </div>
                    <div className="apple-card p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Package className="w-4 h-4 text-purple-400" />
                            </div>
                            <span className="text-xs font-medium text-gray-400">Catálogo</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-semibold text-white">{(stats as any)?.inventory?.total || 0}</p>
                            <span className="text-xs font-medium text-gray-500">{(stats as any)?.inventory?.low_stock || 0} bajo stock</span>
                        </div>
                    </div>
                    <div className="apple-card p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <DollarSign className="w-4 h-4 text-emerald-400" />
                            </div>
                            <span className="text-xs font-medium text-gray-400">Ingresos</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-semibold text-white">{formatCurrency((stats as any)?.orders?.revenue || 0)}</p>
                        </div>
                    </div>
                </div>

                {/* 2. CHARTS AND ACTIVITY ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[280px]">
                    {/* CHART BOX */}
                    <div className="lg:col-span-2 apple-card p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-semibold text-white">Actividad de Ventas</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Volumen de órdenes semanal</p>
                            </div>
                            <div className="px-3 py-1 bg-[#2c2c2e] rounded-full text-xs font-medium text-gray-300">Últimos 7 días</div>
                        </div>
                        <div className="flex-1 flex items-end justify-between gap-4 px-2 pb-2">
                            {weeklyData.map((data, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full justify-end group">
                                    <div className="w-full relative flex-1 flex flex-col justify-end">
                                        <div
                                            className={`w-full max-w-[40px] rounded-t-lg transition-all duration-500 bg-emerald-500 ${data.isToday ? 'opacity-100 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'opacity-20 group-hover:opacity-40'}`}
                                            style={{ height: `${(data.count / maxWeeklyValue) * 100}%`, minHeight: '6px' }}
                                        />
                                    </div>
                                    <span className={`text-xs font-medium ${data.isToday ? 'text-emerald-400' : 'text-gray-500'}`}>{data.day}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RECENT ACTIVITY COMPACT */}
                    <div className="apple-card p-6 flex flex-col">
                        <h3 className="text-base font-semibold text-white mb-4">Actividad Reciente</h3>
                        <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                            {recentActivity.map((a, i) => {
                                const Icon = a.icon
                                return (
                                    <div key={i} className="flex items-center gap-3 group">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${a.type === 'order' ? 'bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20'}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate group-hover:text-gray-200 transition-colors">{a.message}</p>
                                            <p className="text-xs text-gray-500 truncate">{a.detail}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-semibold text-gray-300">{a.amount || a.time}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* 3. SYSTEM & METRICS FOOTER ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-36">
                    <div className="apple-card p-5 flex flex-col justify-center gap-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <Zap className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white">Estado del Sistema</h3>
                                <p className="text-xs text-gray-500">Supabase Cloud</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Operacional</span>
                            <span className="text-xs font-mono text-gray-400">{apiLatency}ms</span>
                        </div>
                    </div>

                    <div className="apple-card p-5 flex flex-col justify-center gap-3">
                        <div className="flex justify-between items-end">
                            <p className="text-sm font-semibold text-white">Conversión</p>
                            <span className="text-xl font-semibold text-emerald-400">{
                                (stats as any)?.users?.total > 0
                                    ? Math.round(((stats as any)?.orders?.total / (stats as any)?.users?.total) * 100)
                                    : 0
                            }%</span>
                        </div>
                        <div className="w-full bg-[#2c2c2e] h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{
                                width: `${(stats as any)?.users?.total > 0 ? ((stats as any)?.orders?.total / (stats as any)?.users?.total) * 100 : 0}%`
                            }} />
                        </div>
                        <p className="text-xs text-gray-500">Ratio Órdenes / Usuarios</p>
                    </div>

                    <div className="apple-card p-5 flex flex-col justify-center gap-3">
                        <div className="flex justify-between items-center">
                            <p className="text-sm font-semibold text-white">Salud de API</p>
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">99.9%</span>
                        </div>
                        <div className="flex items-end gap-1 h-8">
                            {[...Array(20)].map((_, i) => (
                                <div key={i} className="flex-1 bg-emerald-500/30 rounded-sm hover:bg-emerald-400 transition-colors" style={{ height: `${30 + Math.random() * 70}%` }} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
