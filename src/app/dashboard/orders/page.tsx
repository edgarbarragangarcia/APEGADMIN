'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    ChevronLeft, ChevronRight, FileText, Package, Calendar,
    DollarSign, TrendingUp, Filter, Search, MoreHorizontal,
    Eye, Download, ShoppingCart, Clock, User
} from 'lucide-react'

interface Order {
    id: string
    buyer_name: string | null
    status: string
    total_amount: number
    created_at: string
    items: any[]
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [activeTab, setActiveTab] = useState<'list' | 'finance'>('list')
    const supabase = createClient()

    const fetchOrders = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase.rpc('get_all_orders', {
            page_num: page,
            page_size: 6 // Fits perfectly in 1 page
        })

        if (data) setOrders(data)
        setLoading(false)
    }, [page, supabase])

    useEffect(() => {
        fetchOrders()
    }, [fetchOrders])

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'paid':
            case 'pagado':
            case 'completed':
                return 'badge-success'
            case 'pending':
            case 'pendiente':
                return 'badge-warning'
            case 'enviado':
            case 'shipped':
                return 'badge-info'
            case 'cancelled':
            case 'cancelado':
                return 'badge-danger'
            default:
                return 'badge-info'
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

    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0)
    const paidOrders = orders.filter(o => ['paid', 'pagado', 'completed'].includes(o.status?.toLowerCase())).length

    // Finance View Calculations
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

            {/* COMPACT FIXED HEADER */}
            <div className="px-4 md:px-8 py-5 flex flex-wrap items-center justify-between gap-4 shrink-0 z-10 relative mt-4 lg:mt-0">
                <div className="flex flex-wrap items-center gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-white leading-tight uppercase tracking-tighter">Órdenes</h1>
                        <p className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5 whitespace-nowrap">Control comercial de ventas</p>
                    </div>
                    {/* SEGMENTED CONTROL */}
                    <div className="bg-[#1c1c1e] p-1 rounded-xl flex border border-white/5 sm:ml-4">
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase transition-all ${activeTab === 'list' ? 'bg-[#32d74b] text-black shadow-lg shadow-[#32d74b]/20' : 'text-gray-500 hover:text-white'}`}
                        >
                            Listado
                        </button>
                        <button
                            onClick={() => setActiveTab('finance')}
                            className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase transition-all ${activeTab === 'finance' ? 'bg-[#32d74b] text-black shadow-lg shadow-[#32d74b]/20' : 'text-gray-500 hover:text-white'}`}
                        >
                            Finanzas
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <button className="h-9 px-4 flex-1 sm:flex-none rounded-xl bg-white/5 border border-white/5 text-[9px] md:text-[10px] font-black uppercase text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2">
                        <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Exportar</span>
                    </button>
                    <button className="apple-button-primary apple-button-sm flex-1 sm:flex-none py-2! px-6">
                        <Filter className="w-4 h-4 mr-0 sm:mr-2" /> <span className="hidden sm:inline">Canales</span>
                    </button>
                </div>
            </div>

            {/* MAIN AREA */}
            <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col gap-4 md:gap-6 overflow-hidden relative z-10">

                {activeTab === 'list' ? (
                    <>
                        {/* 4-COLUMN QUICK STATS */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                            <div className="apple-card p-4 border-white/5 bg-linear-to-br from-[#32d74b]/5 to-transparent">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-[#32d74b]/10 text-[#32d74b] shrink-0">
                                        <DollarSign className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Ingresos</p>
                                        <p className="text-lg font-black text-white truncate">{formatCurrency(totalRevenue)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="apple-card p-4 border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                                        <ShoppingCart className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Órdenes</p>
                                        <p className="text-lg font-black text-white truncate">{orders.length}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="apple-card p-4 border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Espera</p>
                                        <p className="text-lg font-black text-white truncate">{orders.length - paidOrders}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="apple-card p-4 sm:col-span-2 lg:col-span-1">
                                <div className="flex flex-col h-full justify-center">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Tasa de Cierre</p>
                                        <span className="text-[10px] font-black text-[#32d74b]">{Math.round((paidOrders / (orders.length || 1)) * 100)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-linear-to-r from-[#32d74b] to-primary"
                                            style={{ width: `${(paidOrders / (orders.length || 1)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SEARCH BAR COMPACT */}
                        <div className="apple-card p-2 border-white/5 shrink-0">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#32d74b]" />
                                <input
                                    type="text"
                                    placeholder="Buscar por ID de orden o cliente..."
                                    className="w-full pl-11 pr-4 py-2 bg-transparent text-xs text-white focus:outline-none transition-all font-bold placeholder:text-gray-700 h-8 md:h-10"
                                />
                            </div>
                        </div>

                        {/* TABLE CONTAINER */}
                        <div className="flex-1 apple-card border-white/5 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[600px] md:min-w-0">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/2 sticky top-0 z-10">
                                            <th className="py-4 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Orden</th>
                                            <th className="py-4 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Cliente</th>
                                            <th className="py-4 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Estado</th>
                                            <th className="py-4 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Monto</th>
                                            <th className="py-4 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/2">
                                        {loading ? (
                                            [...Array(6)].map((_, i) => (
                                                <tr key={i}><td colSpan={5} className="py-6 px-6"><div className="w-full h-8 bg-white/5 rounded-lg animate-pulse" /></td></tr>
                                            ))
                                        ) : (
                                            orders.map((order) => (
                                                <tr key={order.id} className="group hover:bg-white/5 transition-colors">
                                                    <td className="py-4 px-4 md:px-6">
                                                        <div className="text-white font-mono text-[10px] md:text-xs font-black tracking-widest">
                                                            #{order.id.substring(0, 8).toUpperCase()}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 md:px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-gray-400 shrink-0">
                                                                {order.buyer_name?.charAt(0) || '?'}
                                                            </div>
                                                            <div className="text-[11px] md:text-xs font-black text-white truncate max-w-[120px] md:max-w-[150px]">{order.buyer_name || 'Anónimo'}</div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 md:px-6 text-center">
                                                        <span className={`px-2 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-wide border ${['paid', 'pagado'].includes(order.status?.toLowerCase())
                                                            ? 'bg-[#32d74b]/10 text-[#32d74b] border-[#32d74b]/20'
                                                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                            }`}>
                                                            {order.status || 'PENDIENTE'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4 md:px-6">
                                                        <div className="text-[11px] md:text-xs font-black text-white">{formatCurrency(order.total_amount)}</div>
                                                    </td>
                                                    <td className="py-4 px-4 md:px-6 text-right">
                                                        <button className="p-2 rounded-lg hover:bg-white/10 text-gray-500 transition-colors">
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* PAGINATION */}
                            <div className="px-4 md:px-6 py-4 border-t border-white/5 flex items-center justify-between shrink-0 bg-white/2">
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                    Pág. <span className="text-white font-black">{page}</span>
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1 || loading}
                                        className="p-2 rounded-lg bg-white/5 disabled:opacity-20 hover:bg-white/10 text-white transition-all border border-white/5"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={orders.length < 6 || loading}
                                        className="p-2 rounded-lg bg-white/5 disabled:opacity-20 hover:bg-white/10 text-white transition-all border border-white/5"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    /* FINANCE VIEW */
                    <div className="flex-1 flex flex-col gap-6 overflow-hidden overflow-y-auto no-scrollbar pb-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 shrink-0">
                            <div className="apple-card p-6 border-l-4 border-l-[#32d74b]">
                                <p className="text-[10px] md:text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">Monto Cobrado</p>
                                <h3 className="text-2xl md:text-3xl font-black text-white">{formatCurrency(totalRevenue)}</h3>
                                <p className="text-[10px] text-emerald-400 mt-2 font-bold flex items-center gap-1">
                                    <TrendingUp className="w-3.5 h-3.5" /> +12% vs mes anterior
                                </p>
                            </div>
                            <div className="apple-card p-6">
                                <p className="text-[10px] md:text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">Ticket Promedio</p>
                                <h3 className="text-2xl md:text-3xl font-black text-white">{formatCurrency(totalRevenue / (orders.length || 1))}</h3>
                                <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-tight">Distribución estable</p>
                            </div>
                            <div className="apple-card p-6 sm:col-span-2 lg:col-span-1">
                                <p className="text-[10px] md:text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">Órdenes Pagadas</p>
                                <h3 className="text-2xl md:text-3xl font-black text-white">{paidOrders}</h3>
                                <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#32d74b]" style={{ width: `${(paidOrders / (orders.length || 1)) * 100}%` }} />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 apple-card p-5 md:p-8 flex flex-col overflow-hidden min-h-[400px]">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 md:mb-8">
                                <div>
                                    <h3 className="text-base md:text-lg font-black text-white uppercase tracking-tight">Rendimiento Comercial</h3>
                                    <p className="text-[9px] md:text-xs text-gray-500 font-bold uppercase tracking-tight">Ingresos diarios (MXN)</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#32d74b]" />
                                        <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Órdenes Pagadas</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex items-end gap-2 md:gap-6 px-1 md:px-4 pb-4 overflow-x-auto no-scrollbar">
                                {dailyRevenue.map((d, i) => (
                                    <div key={i} className="flex-1 min-w-[30px] flex flex-col items-center gap-4 h-full justify-end group">
                                        <div className="w-full relative flex-1 flex flex-col justify-end">
                                            <div
                                                className="w-full bg-[#32d74b]/80 hover:bg-[#32d74b] transition-all duration-300 rounded-t-lg md:rounded-t-xl"
                                                style={{ height: `${(d.val / maxRev) * 100}%`, minHeight: '4px' }}
                                            />
                                            {/* Tooltip on mobile is tricky, keeping it simplified */}
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl">
                                                {formatCurrency(d.val)}
                                            </div>
                                        </div>
                                        <span className="text-[9px] md:text-[11px] font-black text-gray-500 uppercase">{d.day}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

