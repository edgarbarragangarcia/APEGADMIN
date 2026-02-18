'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    Users, ShoppingCart, Trophy, Activity, TrendingUp, TrendingDown,
    DollarSign, Eye, Clock, ArrowUpRight, ArrowDownRight, BarChart3,
    Zap, Shield, Database, Wifi, ChevronRight, Calendar, Star,
    Package, CreditCard, RefreshCw, AlertCircle, Hash
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
                // Admin: Fetch data directly from tables
                const [
                    { data: allOrders, count: ordersCount },
                    { data: allUsers, count: usersCount },
                    { data: allTournaments, count: tournamentsCount }
                ] = await Promise.all([
                    supabase.from('orders').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(20),
                    supabase.from('profiles').select('*', { count: 'exact' }).limit(20),
                    supabase.from('tournaments').select('*', { count: 'exact' })
                ])

                // Calculate revenue from orders
                const totalRevenue = allOrders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0
                const paidOrders = allOrders?.filter(o => ['paid', 'pagado', 'completed'].includes(o.status?.toLowerCase())) || []
                const paidRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)

                setOrders(allOrders || [])
                setUsers(allUsers || [])
                setStats({
                    total_users: usersCount || 0,
                    total_orders: ordersCount || 0,
                    total_tournaments: tournamentsCount || 0,
                    total_revenue: totalRevenue,
                    paid_revenue: paidRevenue,
                    pending_orders: (ordersCount || 0) - paidOrders.length
                })
            } else {
                // User: Fetch only their data
                const { data: userOrders, count: userOrdersCount } = await supabase
                    .from('orders')
                    .select('*', { count: 'exact' })
                    .eq('buyer_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(20)

                const totalRevenue = userOrders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0

                setOrders(userOrders || [])
                setStats({
                    total_users: 1,
                    total_orders: userOrdersCount || 0,
                    total_tournaments: 0,
                    total_revenue: totalRevenue,
                    paid_revenue: 0,
                    pending_orders: userOrders?.filter(o => o.status === 'pending').length || 0
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
            <div className="px-4 md:px-8 py-5 flex flex-wrap items-center justify-between gap-4 shrink-0 z-10 relative mt-4 lg:mt-0">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                        <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-foreground leading-tight uppercase tracking-tighter">Monitor Central</h1>
                        <p className="text-[9px] md:text-[10px] text-[#5c5c5e] font-bold uppercase tracking-widest mt-0.5 whitespace-nowrap">Estado global de la plataforma</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 md:gap-6 ml-auto lg:ml-0">
                    <div className="text-right hidden sm:block">
                        <p className="text-lg md:text-xl font-semibold text-foreground font-mono">{formatTime(currentTime)}</p>
                        <p className="text-[10px] md:text-xs font-medium text-[#86868b] capitalize">{formatDate(currentTime)}</p>
                    </div>
                    <button onClick={handleRefresh} className={`w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all ${refreshing ? 'animate-spin' : ''}`}>
                        <RefreshCw className="w-4 h-4 text-[#5c5c5e]" />
                    </button>
                </div>
            </div>

            {/* MAIN DASHBOARD CONTENT */}
            <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar z-10 relative">

                {/* 1. COMPACT STATS GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 shrink-0">
                    <div className="apple-card p-6 flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] md:text-xs font-black text-[#86868b] uppercase tracking-widest leading-none mb-1.5 flex items-center gap-1.5">
                                Usuarios <span className="text-primary">+12%</span>
                            </p>
                            <h3 className="text-xl md:text-2xl font-black text-foreground">{stats?.total_users || 0}</h3>
                        </div>
                    </div>
                    <div className="apple-card p-6 flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                            <ShoppingCart className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] md:text-xs font-black text-[#86868b] uppercase tracking-widest leading-none mb-1.5 flex items-center gap-1.5">
                                Órdenes <span className="text-primary">+5%</span>
                            </p>
                            <h3 className="text-xl md:text-2xl font-black text-foreground">{stats?.total_orders || 0}</h3>
                        </div>
                    </div>
                    <div className="apple-card p-6 flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-inner">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] md:text-xs font-black text-[#86868b] uppercase tracking-widest leading-none mb-1.5">Torneos</p>
                            <h3 className="text-xl md:text-2xl font-black text-foreground">{stats?.total_tournaments || 0}</h3>
                        </div>
                    </div>
                    <div className="apple-card p-6 flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] md:text-xs font-black text-[#86868b] uppercase tracking-widest leading-none mb-1.5">Ingresos</p>
                            <h3 className="text-xl md:text-2xl font-black text-foreground">{formatCurrency(stats?.total_revenue || 0)}</h3>
                        </div>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 overflow-hidden">
                    {/* Activity Feed */}
                    <div className="lg:col-span-2 apple-card flex flex-col overflow-hidden shadow-sm">
                        <div className="p-5 md:p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-[10px] md:text-xs font-black text-foreground uppercase tracking-widest mb-1">Actividad en Tiempo Real</h3>
                                <p className="text-[8px] md:text-[9px] text-[#5c5c5e] font-bold uppercase tracking-tight">Últimos eventos registrados</p>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                <span className="text-[8px] md:text-[9px] font-black text-primary uppercase tracking-widest">Live</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar p-1">
                            {recentActivity.length > 0 ? (
                                <div className="divide-y divide-white/5">
                                    {recentActivity.map((activity, i) => {
                                        const Icon = activity.icon
                                        return (
                                            <div key={i} className="p-4 md:p-5 flex items-center gap-4 md:gap-6 group hover:bg-white/2 transition-all">
                                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-[#86868b] group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-all shrink-0">
                                                    <Icon className="w-5 h-5 md:w-6 md:h-6" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] md:text-xs font-black text-foreground uppercase tracking-tight mb-1 group-hover:text-primary transition-colors">{activity.message}</p>
                                                    <div className="flex items-center gap-2 text-[9px] text-[#5c5c5e] font-bold uppercase tracking-widest">
                                                        <Hash className="w-3 h-3" /> {activity.detail}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-[10px] md:text-xs font-black text-foreground mb-1">{activity.amount || '—'}</p>
                                                    <p className="text-[8px] md:text-[9px] text-[#5c5c5e] font-bold uppercase tracking-widest">{activity.time}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-10 text-center opacity-40">
                                    <Activity className="w-10 h-10 mb-4 text-[#86868b]" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#86868b]">Sin actividad reciente</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Stats Sidebar */}
                    <div className="flex flex-col gap-6 overflow-y-auto no-scrollbar">
                        <div className="apple-card p-6 shadow-sm">
                            <h3 className="text-[10px] md:text-xs font-black text-foreground uppercase tracking-widest mb-6 border-b border-white/5 pb-3">Resumen Financiero</h3>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <TrendingUp className="w-4 h-4" />
                                        </div>
                                        <p className="text-[9px] font-black text-[#5c5c5e] uppercase tracking-widest">Margen Bruto</p>
                                    </div>
                                    <p className="text-xs font-black text-foreground">84%</p>
                                </div>
                                <div className="px-1">
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-[9px] font-black text-[#86868b] uppercase tracking-widest">Progreso de Meta</p>
                                        <span className="text-[10px] font-black text-primary">62%</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                        <div className="h-full bg-primary rounded-full" style={{ width: '62%' }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="apple-card p-6 flex flex-col justify-center min-h-[140px] shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-[10px] font-black text-foreground uppercase tracking-widest">Latencia de API</h3>
                                    <p className="text-[8px] text-primary font-bold uppercase tracking-tight">Estable</p>
                                </div>
                            </div>
                            <div className="flex items-end gap-1.5 h-12">
                                {[...Array(12)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="flex-1 bg-white/5 border border-white/5 rounded-t-sm hover:bg-primary/30 transition-all cursor-crosshair group relative"
                                        style={{ height: `${20 + Math.random() * 80}%` }}
                                    >
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-[8px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                            {Math.floor(20 + Math.random() * 100)}ms
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* SYSTEM INFO */}
                        <div className="px-6 py-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-2 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-[#5c5c5e] uppercase tracking-widest">Supabase Engine</span>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    <span className="text-[8px] font-black text-primary uppercase tracking-widest">Online</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-[#5c5c5e] uppercase tracking-widest">Vercel Edge</span>
                                <span className="text-[8px] font-black text-foreground uppercase tracking-widest">v18.2.0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
