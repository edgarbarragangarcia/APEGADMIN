'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    Users, ShoppingCart, Trophy, Activity, TrendingUp, TrendingDown,
    DollarSign, Eye, Clock, ArrowUpRight, ArrowDownRight, BarChart3,
    Zap, Shield, Database, Wifi, ChevronRight, Calendar, Star,
    Package, CreditCard, RefreshCw, AlertCircle, Hash, Tag
} from 'lucide-react'
import { useMemo } from 'react'
import DashboardCharts from '@/components/DashboardCharts'

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
    order_number?: string
    product?: { name: string; image_url: string }
    order_items?: { product: { name: string; image_url: string } }[]
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

interface Offer {
    id: string
    offer_amount: number
    status: string
    created_at: string
    product?: { name: string; image_url: string }
    buyer?: { full_name: string }
}

interface ProductLike {
    id: string
    created_at: string
    product?: { name: string; image_url: string; seller_id: string }
    user: { full_name: string }
    product_id: string
}

interface ActivityItem {
    type: 'order' | 'user' | 'tournament' | 'offer' | 'like'
    message: string
    detail: string
    amount?: string | number
    time: string
    icon: any
    color?: string
    imageUrl?: string
    likedBy?: { name: string; date: string }[]
    productId?: string
    date: Date
}

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null)
    const [orders, setOrders] = useState<Order[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [offers, setOffers] = useState<Offer[]>([])
    const [likes, setLikes] = useState<ProductLike[]>([])
    const [loading, setLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [apiLatency, setApiLatency] = useState<number>(0)
    const [refreshing, setRefreshing] = useState(false)
    const [userProfile, setUserProfile] = useState<{ id: string; isAdmin: boolean } | null>(null)
    const [selectedLikes, setSelectedLikes] = useState<{ product: string; users: { name: string; date: string }[] } | null>(null)

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
                    { data: allTournaments, count: tournamentsCount },
                    { data: allOffers },
                    { data: allLikes }
                ] = await Promise.all([
                    supabase.from('orders').select('*, product:products(id, name, image_url), order_items(product:products(id, name, image_url))', { count: 'exact' }).order('created_at', { ascending: false }).limit(50),
                    supabase.from('profiles').select('*', { count: 'exact' }).limit(50),
                    supabase.from('tournaments').select('*', { count: 'exact' }),
                    supabase.from('offers').select('*, product:products(id, name, image_url), buyer:profiles(full_name)').order('created_at', { ascending: false }).limit(50),
                    supabase.from('product_likes').select('*, product:products(id, name, image_url), user:profiles(full_name)').order('created_at', { ascending: false }).limit(100)
                ])

                // Calculate revenue from orders
                const totalRevenue = allOrders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0
                const paidOrders = allOrders?.filter(o => ['paid', 'pagado', 'completed'].includes(o.status?.toLowerCase())) || []
                const paidRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)

                setOrders(allOrders || [])
                setUsers(allUsers || [])
                setOffers(allOffers || [])
                setLikes(allLikes || [])
                setStats({
                    total_users: usersCount || 0,
                    total_orders: ordersCount || 0,
                    total_tournaments: tournamentsCount || 0,
                    total_revenue: totalRevenue,
                    paid_revenue: paidRevenue,
                    pending_orders: (ordersCount || 0) - paidOrders.length
                })
            } else {
                // User: Fetch only their data (Seller Side Activity)
                const [
                    { data: sellerOrders, count: sellerOrdersCount },
                    { data: sellerOffers },
                    { data: sellerLikes }
                ] = await Promise.all([
                    supabase.from('orders').select('*, product:products(id, name, image_url), order_items(product:products(id, name, image_url))', { count: 'exact' }).eq('seller_id', user.id).order('created_at', { ascending: false }).limit(100),
                    supabase.from('offers').select('*, product:products(id, name, image_url), buyer:profiles(full_name)').eq('seller_id', user.id).order('created_at', { ascending: false }).limit(100),
                    supabase.from('product_likes').select('*, product:products(id, name, image_url, seller_id), user:profiles(full_name)').order('created_at', { ascending: false }).limit(200)
                ])

                // Filter likes by seller_id in JS since we can't easily deep filter with standard select
                const filteredLikes = sellerLikes?.filter((l: any) => l.product?.seller_id === user.id) || []

                const totalRevenue = sellerOrders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0

                setOrders(sellerOrders || [])
                setOffers(sellerOffers || [])
                setLikes(filteredLikes)
                setStats({
                    total_users: 1,
                    total_orders: sellerOrdersCount || 0,
                    total_tournaments: 0,
                    total_revenue: totalRevenue,
                    paid_revenue: 0,
                    pending_orders: sellerOrders?.filter(o => o.status === 'pending').length || 0
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
        if (isNaN(date.getTime())) return '...'
        const now = new Date()
        const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000)
        if (diffMins < 1) return 'Ahora'
        if (diffMins < 60) return `${diffMins}m`
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `${diffHours}h`
        return `${Math.floor(diffHours / 24)}d`
    }

    const chartData = useMemo(() => {
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        const currentYear = new Date().getFullYear()

        const data = monthNames.map((name, index) => ({
            name,
            activity: 0,
            revenue: 0,
            shipped: 0,
            received: 0,
            monthIndex: index,
            imageUrl: undefined as string | undefined,
            products: [] as any[] // Will store ProductDetail[]
        }))

        // Helper structure for internal aggregation
        const monthlyProducts = monthNames.map(() => ({} as Record<string, any>))

        const addInteraction = (monthIndex: number, product: any, interaction: any) => {
            if (!product) return
            const pId = product.id || product.name || 'unknown-product'
            if (!monthlyProducts[monthIndex][pId]) {
                monthlyProducts[monthIndex][pId] = {
                    id: pId,
                    name: product.name || 'Producto',
                    imageUrl: product.image_url,
                    count: 0,
                    interactions: []
                }
            }
            monthlyProducts[monthIndex][pId].count += 1
            monthlyProducts[monthIndex][pId].interactions.push(interaction)
        }

        likes?.forEach(l => {
            const d = new Date(l.created_at)
            if (d.getFullYear() === currentYear) {
                const m = d.getMonth()
                data[m].activity += 1
                addInteraction(m, l.product, {
                    userName: l.user?.full_name || 'Alguien',
                    type: 'Le gusta el producto',
                    date: l.created_at
                })
            }
        })

        offers?.forEach(o => {
            const d = new Date(o.created_at)
            if (d.getFullYear() === currentYear) {
                const m = d.getMonth()
                data[m].activity += 1
                addInteraction(m, (o as any).product, {
                    userName: o.buyer?.full_name || 'Alguien',
                    type: 'Envió una oferta',
                    date: o.created_at
                })
            }
        })

        orders?.forEach(o => {
            const d = new Date(o.created_at)
            if (d.getFullYear() === currentYear) {
                const m = d.getMonth()
                data[m].revenue += Number(o.total_amount || 0)
                data[m].activity += 1

                const productWithImage = o.product?.image_url ? o.product : (o.order_items?.[0]?.product || null)
                addInteraction(m, productWithImage, {
                    userName: o.buyer_name || 'Anónimo',
                    type: 'Realizó una compra',
                    date: o.created_at
                })

                const status = (o.status || '').toLowerCase()
                if (['shipped', 'enviado', 'on-the-way', 'camino'].some(s => status.includes(s))) {
                    data[m].shipped += 1
                }
                if (['received', 'recibido', 'delivered', 'entregado'].some(s => status.includes(s))) {
                    data[m].received += 1
                }
            }
        })

        // Final pass: Pick the image of the product with the HIGHEST activity count in that month
        data.forEach((m, idx) => {
            const monthProducts = Object.values(monthlyProducts[idx])
            m.products = monthProducts.sort((a, b) => b.count - a.count)

            if (m.products.length > 0 && m.products[0].imageUrl) {
                m.imageUrl = m.products[0].imageUrl
            }
        })

        return data
    }, [likes, offers, orders])

    const groupedLikes = (likes || []).reduce((acc: any, like) => {
        const prodId = like.product_id || (like as any).product?.id || 'unknown'
        if (!acc[prodId]) {
            acc[prodId] = {
                product: (like as any).product?.name || 'Producto',
                imageUrl: (like as any).product?.image_url,
                users: [],
                latestDate: new Date(0)
            }
        }

        const rawDate = like.created_at || new Date().toISOString()
        acc[prodId].users.push({ name: like.user?.full_name || 'Alguien', date: rawDate })

        const likeDate = new Date(rawDate)
        if (!isNaN(likeDate.getTime())) {
            if (acc[prodId].latestDate.getTime() === 0 || likeDate > acc[prodId].latestDate) {
                acc[prodId].latestDate = likeDate
            }
        }
        return acc
    }, {})

    const activityData = [
        ...orders.map(order => ({
            type: 'order' as const,
            message: order.status === 'pagado' || order.status === 'paid' ? 'Venta finalizada' : 'Nueva orden recibida',
            detail: order.product?.name || order.order_number || order.id.substring(0, 8),
            amount: formatCurrency(Number(order.total_amount)),
            date: new Date(order.created_at),
            icon: CreditCard,
            color: 'text-primary',
            imageUrl: order.product?.image_url
        })),
        ...offers.map(offer => ({
            type: 'offer' as const,
            message: `${offer.buyer?.full_name || 'Alguien'} envió una oferta`,
            detail: (offer as any).product?.name || 'Producto',
            amount: formatCurrency(Number(offer.offer_amount)),
            date: new Date(offer.created_at),
            icon: Tag,
            color: 'text-amber-500',
            imageUrl: (offer as any).product?.image_url
        })),
        ...Object.entries(groupedLikes).map(([prodId, data]: [string, any]) => ({
            type: 'like' as const,
            message: `${data.users.length} ${data.users.length === 1 ? 'persona le gusta' : 'personas les gusta'} tu producto`,
            detail: data.product,
            amount: undefined,
            date: data.latestDate.getTime() === 0 ? new Date() : data.latestDate,
            icon: Star,
            color: 'text-rose-500',
            imageUrl: data.imageUrl,
            likedBy: data.users,
            productId: prodId
        }))
    ]

    const recentActivity: ActivityItem[] = activityData
        .filter(item => item.date && !isNaN(item.date.getTime()))
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 15)
        .map(item => ({
            type: item.type,
            message: item.message,
            detail: item.detail,
            amount: item.amount,
            time: formatRelativeTime(item.date.toISOString()),
            icon: item.icon,
            color: item.color,
            imageUrl: item.imageUrl,
            likedBy: (item as any).likedBy,
            productId: (item as any).productId,
            date: item.date
        }))

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

                {/* 0. ANALYTICS CHARTS */}
                <DashboardCharts data={chartData} />

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
                                            <div
                                                key={i}
                                                className={`p-4 md:p-5 flex items-center gap-4 md:gap-6 group hover:bg-white/2 transition-all ${activity.type === 'like' ? 'cursor-pointer' : ''}`}
                                                onClick={() => {
                                                    if (activity.type === 'like' && activity.likedBy) {
                                                        setSelectedLikes({ product: activity.detail, users: activity.likedBy })
                                                    }
                                                }}
                                            >
                                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center ${activity.color || 'text-[#86868b]'} group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-all shrink-0 overflow-hidden`}>
                                                    {activity.imageUrl ? (
                                                        <img
                                                            src={activity.imageUrl}
                                                            alt={activity.detail}
                                                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                                        />
                                                    ) : (
                                                        <Icon className="w-5 h-5 md:w-6 md:h-6" />
                                                    )}
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
                                                {activity.type === 'like' && (
                                                    <ChevronRight className="w-4 h-4 text-[#5c5c5e] group-hover:text-primary" />
                                                )}
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

            {/* LIKES MODAL */}
            {selectedLikes && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedLikes(null)} />
                    <div className="apple-card w-full max-w-md overflow-hidden z-10 animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-xs font-black text-foreground uppercase tracking-widest mb-1">Interacciones</h3>
                                <p className="text-[9px] text-[#5c5c5e] font-bold uppercase tracking-widest truncate max-w-[200px]">{selectedLikes.product}</p>
                            </div>
                            <button onClick={() => setSelectedLikes(null)} className="p-2 rounded-full hover:bg-white/5 transition-all text-[#5c5c5e] hover:text-white">
                                <AlertCircle className="w-5 h-5 rotate-45" />
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-white/5 custom-scrollbar">
                            {selectedLikes.users.map((u, idx) => (
                                <div key={idx} className="p-4 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                                        {u.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-foreground uppercase truncate">{u.name}</p>
                                        <p className="text-[9px] text-[#5c5c5e] font-bold uppercase tracking-widest">{formatRelativeTime(u.date)}</p>
                                    </div>
                                    <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                                        <Star className="w-3.5 h-3.5 fill-current" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 border-t border-white/5 bg-white/2">
                            <button
                                onClick={() => setSelectedLikes(null)}
                                className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-[10px] font-black text-foreground uppercase tracking-widest transition-all border border-white/5 hover:border-white/10"
                            >
                                Cerrar Ventana
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
