'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    ChevronLeft, ChevronRight, Package, Activity,
    DollarSign, TrendingUp, Search,
    Download, ShoppingCart, Clock, Edit2, Trash2, X, Check, Loader2, Database, Calendar,
} from 'lucide-react'

interface OrderItem {
    name: string
    quantity: number
    price: number
    image_url?: string
    size?: string
    color?: string
    category?: string
    brand?: string
    sku?: string
}

interface Order {
    id: string
    buyer_name: string | null
    status: string
    total_amount: number
    created_at: string
    items: OrderItem[]
    buyer_phone: string | null
    shipping_address: string | null
    tracking_number: string | null
    shipping_provider: string | null
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [activeTab, setActiveTab] = useState<'list' | 'finance'>('list')
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, paidOrders: 0 })
    const supabase = createClient()

    const fetchOrders = useCallback(async () => {
        setLoading(true)
        let query = supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    id,
                    quantity,
                    price_at_purchase,
                    products (
                        name,
                        image_url,
                        images,
                        category,
                        brand,
                        size
                    )
                )
            `)
            .order('created_at', { ascending: false })

        if (searchTerm) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(searchTerm)
            if (isUuid) {
                query = query.eq('id', searchTerm)
            } else {
                query = query.or(`buyer_name.ilike.%${searchTerm}%,tracking_number.ilike.%${searchTerm}%`)
            }
        }

        const { data, error } = await query
            .range((page - 1) * 6, page * 6 - 1)

        if (error) {
            console.error('Error fetching orders:', error)
        } else if (data) {
            // Transform data to ensure 'items' is populated from order_items if needed
            const transformedOrders = (data as any[]).map(order => {
                let items = Array.isArray(order.items) ? order.items : [];

                if (items.length === 0 && order.order_items && order.order_items.length > 0) {
                    items = order.order_items.map((oi: any) => ({
                        name: oi.products?.name || 'Producto',
                        quantity: oi.quantity || 1,
                        price: oi.price_at_purchase || oi.products?.price || 0,
                        image_url: oi.products?.image_url || (Array.isArray(oi.products?.images) && oi.products.images.length > 0 ? oi.products.images[0] : null),
                        size: oi.products?.size,
                        category: oi.products?.category,
                        brand: oi.products?.brand
                    }));
                }

                return {
                    ...order,
                    items
                };
            });
            setOrders(transformedOrders)
        }
        setLoading(false)
    }, [page, supabase, searchTerm])

    const fetchStats = useCallback(async () => {
        const { data, error } = await supabase
            .from('orders')
            .select('total_amount, status')

        if (data && !error) {
            const totalRevenue = data.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
            const totalOrders = data.length
            const paidOrders = data.filter(o => ['paid', 'pagado', 'completed', 'success'].includes(o.status?.toLowerCase())).length
            setStats({ totalRevenue, totalOrders, paidOrders })
        }
    }, [supabase])

    useEffect(() => {
        const loadData = async () => {
            await Promise.all([fetchOrders(), fetchStats()])
        }
        loadData()
    }, [fetchOrders, fetchStats])

    const handleUpdateOrder = async (orderId: string, updates: Partial<Order>) => {
        setIsSaving(true)
        const { error } = await supabase
            .from('orders')
            .update(updates)
            .eq('id', orderId)

        if (error) {
            alert('Error al actualizar: ' + error.message)
        } else {
            await fetchOrders()
            await fetchStats()
            setIsEditModalOpen(false)
            setIsDetailsModalOpen(false)
            setSelectedOrder(null)
        }
        setIsSaving(false)
    }

    const handleDeleteOrder = async (orderId: string) => {
        setIsSaving(true)
        try {
            // 1. Eliminar items asociados
            await supabase.from('order_items').delete().eq('order_id', orderId)

            // 2. Eliminar la orden principal
            const { error } = await supabase
                .from('orders')
                .delete()
                .eq('id', orderId)

            if (error) {
                alert('Error al eliminar la orden: ' + error.message)
            } else {
                await fetchOrders()
                await fetchStats()
                setIsDeleteModalOpen(false)
                setSelectedOrder(null)
            }
        } catch (e: any) {
            alert('Error inesperado: ' + e.message)
        } finally {
            setIsSaving(false)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'paid':
            case 'pagado':
            case 'completed':
                return 'bg-primary/10 text-primary border-primary/20'
            case 'pending':
            case 'pendiente':
                return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            case 'enviado':
            case 'shipped':
                return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            case 'cancelled':
            case 'cancelado':
                return 'bg-red-500/10 text-red-500 border-red-500/20'
            default:
                return 'bg-black/5 text-[#86868b] border-black/10'
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    const dailyRevenue = (() => {
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
        const data = []
        for (let i = 6; i >= 0; i--) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            const revenue = orders
                .filter(o => new Date(o.created_at).toDateString() === date.toDateString() && ['paid', 'pagado'].includes(o.status?.toLowerCase()))
                .reduce((sum, o) => sum + Number(o.total_amount), 0)
            data.push({ day: days[date.getDay()], val: revenue })
        }
        return data
    })()

    const maxRev = Math.max(...dailyRevenue.map(d => d.val), 1)

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background relative">
            <div className="bg-mesh opacity-30 fixed inset-0 pointer-events-none" />

            <div className="px-4 md:px-8 py-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4 shrink-0 z-10 relative mt-4 lg:mt-0">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
                        <Activity className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-foreground leading-tight uppercase tracking-tighter">Órdenes (LIVE)</h1>
                        <p className="text-[9px] md:text-[10px] text-[#5c5c5e] font-bold uppercase tracking-widest mt-0.5 whitespace-nowrap">Gestión de Pedidos V2</p>
                    </div>
                </div>

                {/* SEGMENTED CONTROL - CENTRADO */}
                <div className="flex justify-center">
                    <div className="bg-black/5 p-1 rounded-xl flex border border-black/5">
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase transition-all ${activeTab === 'list' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-[#86868b] hover:text-foreground'}`}
                        >
                            Listado
                        </button>
                        <button
                            onClick={() => setActiveTab('finance')}
                            className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase transition-all ${activeTab === 'finance' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-[#86868b] hover:text-foreground'}`}
                        >
                            Finanzas
                        </button>
                    </div>
                </div>

                <div className="flex justify-end gap-2 md:gap-3">
                    <button className="apple-button apple-button-secondary apple-button-sm hidden sm:flex items-center justify-center gap-2">
                        <Download className="w-3.5 h-3.5" /> <span>Exportar</span>
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="apple-button apple-button-primary apple-button-sm flex items-center justify-center gap-2 text-white font-bold"
                    >
                        <Package className="w-4 h-4 text-white" /> <span>Nueva Orden</span>
                    </button>
                </div>
            </div>


            <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col gap-4 md:gap-6 overflow-hidden relative z-10">
                {activeTab === 'list' ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 shrink-0">
                            <div className="apple-card p-6 flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-inner">
                                    <ShoppingCart className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] md:text-xs font-black text-[#86868b] uppercase tracking-widest leading-none mb-1.5">Total</p>
                                    <h3 className="text-xl md:text-2xl font-black text-foreground">{stats?.totalOrders || 0}</h3>
                                </div>
                            </div>
                            <div className="apple-card p-6 flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                                    <Activity className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] md:text-xs font-black text-[#86868b] uppercase tracking-widest leading-none mb-1.5">Nuevas</p>
                                    <h3 className="text-xl md:text-2xl font-black text-foreground">{orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length}</h3>
                                </div>
                            </div>
                            <div className="apple-card p-6 flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-inner">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] md:text-xs font-black text-[#86868b] uppercase tracking-widest leading-none mb-1.5">Pendientes</p>
                                    <h3 className="text-xl md:text-2xl font-black text-foreground">{stats?.totalOrders - stats?.paidOrders || 0}</h3>
                                </div>
                            </div>
                            <div className="apple-card p-6 flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] md:text-xs font-black text-[#86868b] uppercase tracking-widest leading-none mb-1.5">Ingresos Hoy</p>
                                    <h3 className="text-xl md:text-2xl font-black text-foreground truncate">{formatCurrency(orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString() && ['paid', 'pagado'].includes(o.status?.toLowerCase())).reduce((sum, o) => sum + Number(o.total_amount), 0))}</h3>
                                </div>
                            </div>
                        </div>

                        {/* TOOLBAR */}
                        <div className="apple-card p-2.5 pl-5 flex items-center gap-4 shrink-0 shadow-sm">
                            <div className="flex-1 relative group">
                                <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Buscar por cliente o ID..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value)
                                        setPage(1)
                                    }}
                                    className="w-full bg-transparent border-none text-foreground text-sm font-bold focus:outline-none placeholder:text-[#86868b] pl-8 h-10"
                                />
                            </div>
                        </div>

                        {/* TABLE CARD */}
                        <div className="flex-1 apple-card flex flex-col overflow-hidden shadow-sm">
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[600px]">
                                    <thead>
                                        <tr className="border-b border-black/5 bg-black/2 sticky top-0 z-10">
                                            <th className="py-4 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-[#86868b]">Fecha</th>
                                            <th className="py-4 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-[#86868b]">Cliente</th>
                                            <th className="py-4 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-[#86868b] text-center">Estado</th>
                                            <th className="py-4 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-[#86868b]">Monto</th>
                                            <th className="py-4 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-[#86868b] text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/2">
                                        {loading ? (
                                            [...Array(6)].map((_, i) => (
                                                <tr key={i}><td colSpan={6} className="py-6 px-6"><div className="w-full h-8 bg-black/5 rounded-lg animate-pulse" /></td></tr>
                                            ))
                                        ) : orders.length === 0 ? (
                                            <tr><td colSpan={6} className="py-20 text-center text-[#86868b] font-bold uppercase text-[10px] tracking-widest">No se encontraron órdenes</td></tr>
                                        ) : (
                                            orders.map((order) => (
                                                <tr
                                                    key={order.id}
                                                    onClick={() => {
                                                        setSelectedOrder(order)
                                                        setIsDetailsModalOpen(true)
                                                    }}
                                                    className="group hover:bg-black/3 transition-colors cursor-pointer"
                                                >
                                                    <td className="py-4 px-4 md:px-6">
                                                        <div className="text-foreground font-mono text-[10px] md:text-xs font-black tracking-widest">
                                                            #{order.id.substring(0, 8).toUpperCase()}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 md:px-6">
                                                        <div className="text-[10px] md:text-xs text-foreground font-bold">{formatDate(order.created_at)}</div>
                                                    </td>
                                                    <td className="py-4 px-4 md:px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-[10px] font-black text-[#86868b] shrink-0 uppercase border border-black/5">
                                                                {order.buyer_name?.charAt(0) || '?'}
                                                            </div>
                                                            <div className="text-[11px] md:text-xs font-black text-foreground truncate max-w-[150px]">{order.buyer_name || 'Anónimo'}</div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 md:px-6 text-center">
                                                        <span className={`px-2 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-wide border ${getStatusBadge(order.status)}`}>
                                                            {order.status || 'PENDIENTE'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4 md:px-6">
                                                        <div className="text-[11px] md:text-xs font-black text-foreground">{formatCurrency(order.total_amount)}</div>
                                                    </td>
                                                    <td className="py-4 px-4 md:px-6 text-right">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setSelectedOrder(order)
                                                                    setIsEditModalOpen(true)
                                                                }}
                                                                className="p-2 rounded-lg hover:bg-primary/10 text-[#86868b] hover:text-primary transition-all"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setSelectedOrder(order)
                                                                    setIsDeleteModalOpen(true)
                                                                }}
                                                                className="p-2 rounded-lg hover:bg-red-500/10 text-[#86868b] hover:text-red-500 transition-all"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="px-4 md:px-6 py-4 border-t border-black/5 flex items-center justify-between shrink-0 bg-black/1">
                                <p className="text-[10px] font-black text-[#86868b] uppercase tracking-widest">
                                    Pág. <span className="text-foreground font-black">{page}</span>
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1 || loading}
                                        className="p-2 rounded-lg bg-black/5 disabled:opacity-20 hover:bg-black/10 text-foreground transition-all border border-black/5"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={orders.length < 6 || loading}
                                        className="p-2 rounded-lg bg-black/5 disabled:opacity-20 hover:bg-black/10 text-foreground transition-all border border-black/5"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col gap-6 overflow-hidden overflow-y-auto no-scrollbar pb-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 shrink-0">
                            <div className="apple-card p-6 border-l-4 border-l-primary border-black/5 bg-white">
                                <p className="text-[10px] md:text-[11px] font-black text-[#86868b] uppercase tracking-widest mb-1">Monto Cobrado</p>
                                <h3 className="text-2xl md:text-3xl font-black text-foreground">{formatCurrency(stats.totalRevenue)}</h3>
                                <p className="text-[10px] text-primary mt-2 font-bold flex items-center gap-1">
                                    <TrendingUp className="w-3.5 h-3.5" /> +12% vs mes anterior
                                </p>
                            </div>
                            <div className="apple-card p-6 border-black/5 bg-white">
                                <p className="text-[10px] md:text-[11px] font-black text-[#86868b] uppercase tracking-widest mb-1">Ticket Promedio</p>
                                <h3 className="text-2xl md:text-3xl font-black text-foreground">{formatCurrency(stats.totalRevenue / (stats.totalOrders || 1))}</h3>
                                <p className="text-[10px] text-[#86868b] mt-2 font-bold uppercase tracking-tight">Distribución estable</p>
                            </div>
                            <div className="apple-card p-6 sm:col-span-2 lg:col-span-1 border-black/5 bg-white">
                                <p className="text-[10px] md:text-[11px] font-black text-[#86868b] uppercase tracking-widest mb-1">Órdenes Pagadas</p>
                                <h3 className="text-2xl md:text-3xl font-black text-foreground">{stats.paidOrders}</h3>
                                <div className="mt-4 h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${(stats.paidOrders / (stats.totalOrders || 1)) * 100}%` }} />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 apple-card p-5 md:p-8 flex flex-col overflow-hidden min-h-[400px] border-black/5 bg-white">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 md:mb-8">
                                <div>
                                    <h3 className="text-base md:text-lg font-black text-foreground uppercase tracking-tight">Rendimiento Comercial</h3>
                                    <p className="text-[9px] md:text-xs text-[#86868b] font-bold uppercase tracking-tight">Ingresos diarios (MXN)</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                                        <span className="text-[9px] md:text-[10px] font-black text-[#86868b] uppercase tracking-widest">Órdenes Pagadas</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex items-end gap-2 md:gap-6 px-1 md:px-4 pb-4 overflow-x-auto no-scrollbar">
                                {dailyRevenue.map((d, i) => (
                                    <div key={i} className="flex-1 min-w-[30px] flex flex-col items-center gap-4 h-full justify-end group">
                                        <div className="w-full relative flex-1 flex flex-col justify-end">
                                            <div
                                                className="w-full bg-primary/80 hover:bg-primary transition-all duration-300 rounded-t-lg md:rounded-t-xl"
                                                style={{ height: `${(d.val / maxRev) * 100}%`, minHeight: '4px' }}
                                            />
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-foreground text-[9px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl border border-black/5">
                                                {formatCurrency(d.val)}
                                            </div>
                                        </div>
                                        <span className="text-[9px] md:text-[11px] font-black text-[#86868b] uppercase">{d.day}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isEditModalOpen && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
                    <div className="apple-card w-full max-w-lg border-black/5 bg-white p-6 relative overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-black text-foreground uppercase tracking-tighter">Editar Orden</h3>
                                <p className="text-[10px] text-[#86868b] font-bold uppercase tracking-widest mt-1">#{selectedOrder.id.substring(0, 8).toUpperCase()}</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-black/5 rounded-full text-[#86868b] hover:text-foreground transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest block mb-1.5">Estado</label>
                                <select
                                    className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-bold appearance-none cursor-pointer"
                                    defaultValue={selectedOrder.status}
                                    id="edit-status"
                                >
                                    <option value="pending">Pendiente</option>
                                    <option value="paid">Pagado</option>
                                    <option value="shipped">Enviado</option>
                                    <option value="completed">Completado</option>
                                    <option value="cancelled">Cancelado</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest block mb-1.5">Proveedor</label>
                                    <input
                                        type="text"
                                        id="edit-provider"
                                        defaultValue={selectedOrder.shipping_provider || ''}
                                        className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-bold"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest block mb-1.5">Guía</label>
                                    <input
                                        type="text"
                                        id="edit-tracking"
                                        defaultValue={selectedOrder.tracking_number || ''}
                                        className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest block mb-1.5">Monto Total</label>
                                <input
                                    type="number"
                                    id="edit-amount"
                                    defaultValue={selectedOrder.total_amount}
                                    className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-bold"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl border border-black/5 bg-black/5 text-[10px] font-black text-[#86868b] uppercase tracking-widest transition-all">Cancelar</button>
                            <button
                                disabled={isSaving}
                                onClick={() => {
                                    const status = (document.getElementById('edit-status') as HTMLSelectElement).value;
                                    const shipping_provider = (document.getElementById('edit-provider') as HTMLInputElement).value;
                                    const tracking_number = (document.getElementById('edit-tracking') as HTMLInputElement).value;
                                    const total_amount = parseFloat((document.getElementById('edit-amount') as HTMLInputElement).value);
                                    handleUpdateOrder(selectedOrder.id, { status, shipping_provider, tracking_number, total_amount });
                                }}
                                className="flex-1 py-3 px-4 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                            >
                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
                    <div className="apple-card w-full max-w-lg border-black/5 bg-white p-6 relative overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-black text-foreground uppercase tracking-tighter">Nueva Orden</h3>
                                <p className="text-[10px] text-[#86868b] font-bold uppercase tracking-widest mt-1">Ingreso manual de pedido</p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-black/5 rounded-full text-[#86868b] hover:text-foreground transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest block mb-1.5">Nombre del Cliente</label>
                                <input type="text" id="create-name" placeholder="Ej. Juan Pérez" className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-bold" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest block mb-1.5">Estado</label>
                                    <select id="create-status" className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-bold">
                                        <option value="pending">Pendiente</option>
                                        <option value="paid">Pagado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest block mb-1.5">Monto (MXN)</label>
                                    <input type="number" id="create-amount" placeholder="0" className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-bold" />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl border border-black/5 bg-black/5 text-[10px] font-black text-[#86868b] uppercase tracking-widest transition-all">Cancelar</button>
                            <button
                                disabled={isSaving}
                                onClick={async () => {
                                    const buyer_name = (document.getElementById('create-name') as HTMLInputElement).value;
                                    const status = (document.getElementById('create-status') as HTMLSelectElement).value;
                                    const total_amount = parseFloat((document.getElementById('create-amount') as HTMLInputElement).value);

                                    if (!buyer_name || isNaN(total_amount)) {
                                        alert('Completa los campos obligatorios');
                                        return;
                                    }

                                    setIsSaving(true);
                                    const { error } = await supabase.from('orders').insert([{ buyer_name, status, total_amount, created_at: new Date().toISOString(), items: [] }]);
                                    if (error) alert(error.message);
                                    else {
                                        await fetchOrders();
                                        await fetchStats();
                                        setIsCreateModalOpen(false);
                                    }
                                    setIsSaving(false);
                                }}
                                className="flex-1 py-3 px-4 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                            >
                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Crear
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {isDeleteModalOpen && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
                    <div className="apple-card w-full max-w-sm border-black/5 bg-white p-6 relative overflow-hidden shadow-2xl">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4 border border-red-500/10">
                                <Trash2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-foreground uppercase tracking-tighter">¿Eliminar Orden?</h3>
                            <p className="text-sm text-[#86868b] font-bold mt-2">Esta acción no se puede deshacer. Se eliminará la orden #{selectedOrder.id.substring(0, 8).toUpperCase()}.</p>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 py-3 px-4 rounded-xl border border-black/5 bg-black/5 text-[10px] font-black text-[#86868b] uppercase tracking-widest hover:text-foreground transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={isSaving}
                                onClick={() => handleDeleteOrder(selectedOrder.id)}
                                className="flex-1 py-3 px-4 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                            >
                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DETAILS MODAL */}
            {isDetailsModalOpen && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDetailsModalOpen(false)} />
                    <div className="apple-card w-full max-w-4xl max-h-[90vh] flex flex-col border-black/5 bg-white relative overflow-hidden shadow-2xl">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <div>
                                <h3 className="text-lg md:text-xl font-black text-foreground uppercase tracking-tighter flex items-center gap-2">
                                    Orden #{selectedOrder.id.substring(0, 8).toUpperCase()}
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border ${getStatusBadge(selectedOrder.status)}`}>
                                        {selectedOrder.status}
                                    </span>
                                </h3>
                                <div className="flex items-center gap-4 mt-1.5">
                                    <div className="flex items-center gap-1.5 text-[9px] text-[#86868b] font-bold uppercase tracking-widest">
                                        <Calendar className="w-3.5 h-3.5 text-primary" />
                                        {formatDate(selectedOrder.created_at)}
                                    </div>
                                    <div className="w-px h-3 bg-black/10" />
                                    <div className="flex items-center gap-1.5 text-[9px] text-[#86868b] font-bold uppercase tracking-widest">
                                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                                        {new Date(selectedOrder.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 hover:bg-black/5 rounded-full text-[#86868b] hover:text-foreground transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                                {/* Left Column: Info */}
                                <div className="lg:col-span-1 space-y-4">
                                    {/* Customer Card */}
                                    <div className="apple-card p-5 border-black/5 bg-black/2 relative overflow-hidden group min-h-[220px] flex flex-col">
                                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500" />

                                        <h4 className="text-[10px] font-black text-[#86868b] uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(50,215,75,0.5)]" />
                                            Información del Cliente
                                        </h4>
                                        <div className="space-y-4 relative z-10 flex-1 flex flex-col justify-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-sm font-black text-foreground shrink-0 uppercase border border-black/5 shadow-sm">
                                                    {selectedOrder.buyer_name?.charAt(0) || '?'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-foreground truncate">{selectedOrder.buyer_name || 'Cliente Anónimo'}</p>
                                                    {selectedOrder.buyer_phone && (
                                                        <p className="text-[10px] text-primary font-mono font-bold mt-0.5">{selectedOrder.buyer_phone}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {selectedOrder.shipping_address && (
                                                <div className="pt-2">
                                                    <p className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5">Dirección de Envío</p>
                                                    <div className="p-3 rounded-xl bg-white border border-black/5 shadow-sm">
                                                        <p className="text-[11px] text-[#424245] leading-relaxed font-medium">
                                                            {selectedOrder.shipping_address}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Financial Card */}
                                    <div className="apple-card p-5 border-black/5 bg-linear-to-br from-amber-500/5 to-transparent min-h-[220px] flex flex-col">
                                        <h4 className="text-[10px] font-black text-[#86868b] uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                            Resumen Financiero
                                        </h4>
                                        <div className="space-y-2.5 flex-1 flex flex-col justify-center">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] text-[#86868b] font-bold uppercase tracking-tight">Fecha de Compra</span>
                                                <span className="text-[10px] font-black text-foreground uppercase whitespace-nowrap">{formatDate(selectedOrder.created_at)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] text-[#86868b] font-bold uppercase tracking-tight">Subtotal</span>
                                                <span className="text-xs font-black text-foreground">{formatCurrency(selectedOrder.total_amount)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] text-[#86868b] font-bold uppercase tracking-tight">Envío</span>
                                                <span className="text-[10px] font-black text-primary uppercase">Bonificado</span>
                                            </div>
                                            <div className="h-px bg-black/5 my-3" />
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <p className="text-[9px] text-[#86868b] font-black uppercase tracking-widest mb-0.5">Total de la Orden</p>
                                                    <p className="text-2xl font-black text-foreground tracking-tighter leading-none">{formatCurrency(selectedOrder.total_amount)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${getStatusBadge(selectedOrder.status)}`}>
                                                        {selectedOrder.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Shipping & Items */}
                                <div className="lg:col-span-2 space-y-4">
                                    {/* Shipping Management */}
                                    <div className="apple-card p-5 border-black/5 bg-linear-to-br from-blue-500/5 to-transparent relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                                            <Package className="w-32 h-32 text-blue-500 -rotate-12 transform translate-x-8 -translate-y-8" />
                                        </div>

                                        <div className="relative z-10">
                                            <div className="flex items-center justify-between mb-5">
                                                <h4 className="text-xs font-black text-foreground uppercase tracking-tighter flex items-center gap-2">
                                                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                                                        <Package className="w-3.5 h-3.5" />
                                                    </div>
                                                    Gestión Logística
                                                </h4>
                                                {selectedOrder.tracking_number && (
                                                    <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <Check className="w-2.5 h-2.5" /> Guía Asignada
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest ml-1">Transportadora</label>
                                                    <input
                                                        type="text"
                                                        id="details-provider"
                                                        defaultValue={selectedOrder.shipping_provider || ''}
                                                        placeholder="Ej. DHL, FedEx, Servientrega"
                                                        className="w-full bg-white border border-black/10 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/10 transition-all font-bold placeholder:text-gray-400 shadow-sm"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest ml-1">Número de Seguimiento</label>
                                                    <input
                                                        type="text"
                                                        id="details-tracking"
                                                        defaultValue={selectedOrder.tracking_number || ''}
                                                        placeholder="Guía de rastreo"
                                                        className="w-full bg-white border border-black/10 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/10 transition-all font-mono font-bold tracking-wider placeholder:text-gray-400 shadow-sm"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                disabled={isSaving}
                                                onClick={() => {
                                                    const shipping_provider = (document.getElementById('details-provider') as HTMLInputElement).value;
                                                    const tracking_number = (document.getElementById('details-tracking') as HTMLInputElement).value;
                                                    let status = selectedOrder.status;
                                                    if (tracking_number && ['pending', 'paid', 'pendiente', 'pagado'].includes(status.toLowerCase())) {
                                                        status = 'shipped';
                                                    }
                                                    handleUpdateOrder(selectedOrder.id, { shipping_provider, tracking_number, status });
                                                }}
                                                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3"
                                            >
                                                {isSaving ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <div className="p-1 rounded-full bg-white/20">
                                                        <Check className="w-3 h-3" />
                                                    </div>
                                                )}
                                                Guardar Información de Envío
                                            </button>

                                            {selectedOrder.tracking_number && (
                                                <div className="mt-5 pt-4 border-t border-black/5 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] text-[#86868b] font-black uppercase tracking-widest">Estatus</span>
                                                            <span className="text-[10px] text-foreground font-black uppercase tracking-wider">{selectedOrder.status === 'shipped' || selectedOrder.status === 'enviado' ? 'EN TRÁNSITO' : selectedOrder.status}</span>
                                                        </div>
                                                        <div className="w-px h-5 bg-black/10" />
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] text-[#86868b] font-black uppercase tracking-widest">Operador</span>
                                                            <span className="text-[10px] text-foreground font-black uppercase tracking-wider">{selectedOrder.shipping_provider || '--'}</span>
                                                        </div>
                                                    </div>
                                                    <button className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest flex items-center gap-1.5 transition-all">
                                                        Rastrear <ChevronRight className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Items List */}
                                    <div className="space-y-4">
                                        <div className="space-y-2.5">
                                            {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                                                selectedOrder.items.map((item, idx) => (
                                                    <div key={idx} className="apple-card p-5 border-black/5 bg-black/2 flex gap-6 group hover:bg-black/4 transition-all duration-300 relative overflow-hidden shadow-sm">
                                                        <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-black/2 rounded-full blur-2xl pointer-events-none" />

                                                        <div className="w-24 h-24 rounded-2xl bg-white overflow-hidden shrink-0 border border-black/5 relative shadow-md group-hover:scale-[1.02] transition-transform duration-500">
                                                            {item.image_url ? (
                                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                                                                    <Package className="w-8 h-8" />
                                                                </div>
                                                            )}
                                                            <div className="absolute top-1.5 right-1.5 bg-black/80 backdrop-blur-md text-[8px] font-black text-white px-2 py-0.5 rounded-md">
                                                                x{item.quantity || 1}
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 min-w-0 flex flex-col pt-1">
                                                            <div className="flex justify-between items-start mb-3">
                                                                <div className="min-w-0">
                                                                    <h5 className="text-base font-black text-foreground truncate group-hover:text-primary transition-colors">{item.name || 'Producto sin nombre'}</h5>
                                                                    <p className="text-[10px] text-[#86868b] font-bold uppercase tracking-widest mt-1">{item.brand || 'Colección General'}</p>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <p className="text-base font-black text-foreground tracking-tight">{formatCurrency(item.price || 0)}</p>
                                                                    <p className="text-[9px] text-[#86868b] font-bold uppercase mt-1">Precio Unit.</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-wrap gap-2 mt-auto">
                                                                {item.category && (
                                                                    <span className="px-2.5 py-1 rounded-xl bg-white text-[9px] font-black text-[#86868b] uppercase tracking-widest border border-black/5 shadow-sm">
                                                                        {item.category}
                                                                    </span>
                                                                )}
                                                                {item.size && (
                                                                    <span className="px-2.5 py-1 rounded-xl bg-primary/5 text-[9px] font-black text-primary uppercase tracking-widest border border-primary/10 shadow-sm">
                                                                        Talla {item.size}
                                                                    </span>
                                                                )}
                                                                {item.color && (
                                                                    <span className="px-2.5 py-1 rounded-xl bg-white text-[9px] font-black text-[#86868b] uppercase tracking-widest border border-black/5 shadow-sm">
                                                                        {item.color}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-12 text-center border-2 border-dashed border-black/5 rounded-3xl bg-black/1">
                                                    <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mx-auto mb-4 text-[#86868b]">
                                                        <Package className="w-6 h-6" />
                                                    </div>
                                                    <p className="text-[10px] text-[#86868b] font-black uppercase tracking-widest">No hay artículos registrados en esta orden</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
