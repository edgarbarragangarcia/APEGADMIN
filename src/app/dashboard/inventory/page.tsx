'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    Package, Plus, Search, Filter, Download, MoreVertical,
    AlertTriangle, Tag, ChevronLeft, ChevronRight, Eye,
    Edit3, LayoutGrid, List, Layers, ArrowUpRight, BarChart3
} from 'lucide-react'

interface Product {
    id: string
    name: string
    brand: string | null
    category: string | null
    price: number
    stock_quantity: number
    status: string
    description: string | null
}

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
    const [activeTab, setActiveTab] = useState<'list' | 'finance'>('list')
    const supabase = createClient()

    const fetchProducts = useCallback(async () => {
        setLoading(true)
        const [productsRes, statsRes] = await Promise.all([
            supabase.rpc('get_all_products', {
                page_num: page,
                page_size: 6 // fits in one page
            }),
            supabase.rpc('get_advanced_admin_stats')
        ])

        if (productsRes.data) setProducts(productsRes.data)
        if (statsRes.data) setStats(statsRes.data)
        setLoading(false)
    }, [page, supabase])

    useEffect(() => {
        fetchProducts()
    }, [fetchProducts])

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const getStockStatus = (quantity: number) => {
        if (quantity === 0) return { label: 'Agotado', color: 'text-red-500' }
        if (quantity < 10) return { label: 'Bajo Stock', color: 'text-amber-500' }
        return { label: 'En Stock', color: 'text-primary' }
    }

    // Finance Analysis
    const totalInventoryValue = stats?.inventory?.total_value || 0
    const topCategoriesValue = [
        { name: 'Palos de Golf', val: totalInventoryValue * 0.45 },
        { name: 'Indumentaria', val: totalInventoryValue * 0.25 },
        { name: 'Accesorios', val: totalInventoryValue * 0.20 },
        { name: 'Bolas', val: totalInventoryValue * 0.10 }
    ]

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background relative">
            <div className="bg-mesh opacity-30 fixed inset-0 pointer-events-none" />

            {/* COMPACT FIXED HEADER */}
            <div className="px-4 md:px-8 py-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4 shrink-0 z-10 relative mt-4 lg:mt-0">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                        <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-foreground leading-tight uppercase tracking-tighter">Inventario</h1>
                        <p className="text-[9px] md:text-[10px] text-[#5c5c5e] font-bold uppercase tracking-widest mt-0.5 whitespace-nowrap">Control de Almacén y Stock</p>
                    </div>
                </div>

                {/* SEGMENTED CONTROL - CENTRADO */}
                <div className="flex justify-center">
                    <div className="bg-black/5 p-1 rounded-xl flex border border-black/5">
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase transition-all ${activeTab === 'list' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-[#86868b] hover:text-foreground'}`}
                        >
                            Almacén
                        </button>
                        <button
                            onClick={() => setActiveTab('finance')}
                            className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase transition-all ${activeTab === 'finance' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-[#86868b] hover:text-foreground'}`}
                        >
                            Finanzas
                        </button>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button className="apple-button apple-button-primary apple-button-sm flex items-center justify-center shadow-lg shadow-primary/20 text-white font-bold">
                        <Plus className="w-4 h-4 mr-2 text-white" /> Nuevo SKU
                    </button>
                </div>
            </div>

            {/* MAIN AREA */}
            <div className="flex-1 p-4 md:p-8 pt-2 md:pt-4 flex flex-col gap-4 md:gap-6 overflow-hidden relative z-10">

                {activeTab === 'list' ? (
                    <>
                        {/* STATS STRIP */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 font-bold tracking-tight">
                            {[
                                { label: 'Total SKU', val: stats?.inventory?.total || 0, icon: Layers, color: 'text-foreground' },
                                { label: 'Alertas Stock', val: stats?.inventory?.low_stock || 0, icon: AlertTriangle, color: 'text-amber-500' },
                                { label: 'Valor Total', val: formatCurrency(totalInventoryValue), icon: ArrowUpRight, color: 'text-primary' },
                                { label: 'Estado', val: 'Óptimo', icon: BarChart3, color: 'text-primary' }
                            ].map((s, i) => (
                                <div key={i} className="apple-card p-4 flex items-center gap-4 border-white/5">
                                    <div className="p-2 rounded-xl bg-white/5 shrink-0"><s.icon className={`w-4 h-4 ${s.color}`} /></div>
                                    <div className="min-w-0">
                                        <p className="text-[8px] md:text-[9px] font-black text-[#86868b] uppercase tracking-widest">{s.label}</p>
                                        <p className="text-xs md:text-sm font-black text-foreground truncate">{s.val}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* TOOLBAR */}
                        <div className="flex gap-4 shrink-0">
                            <div className="flex-1 relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#86868b] group-focus-within:text-primary" />
                                <input
                                    type="text"
                                    placeholder="Buscar producto..."
                                    className="apple-input pl-10 h-10 rounded-2xl"
                                />
                            </div>
                            <div className="flex bg-black/5 p-1 rounded-xl items-center border border-black/5 h-10">
                                <button onClick={() => setViewMode('table')} className={`p-1.5 md:p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-primary text-white shadow-md' : 'text-[#86868b] hover:text-foreground'}`}>
                                    <List className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                </button>
                                <button onClick={() => setViewMode('grid')} className={`p-1.5 md:p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-md' : 'text-[#86868b] hover:text-foreground'}`}>
                                    <LayoutGrid className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* LIST DISPLAY */}
                        <div className="flex-1 apple-card overflow-hidden flex flex-col shadow-sm">
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                {viewMode === 'table' ? (
                                    <table className="w-full min-w-[500px] md:min-w-0">
                                        <thead>
                                            <tr className="border-b border-black/5 bg-black/2 sticky top-0 z-10">
                                                <th className="py-4 px-4 md:px-6 text-[9px] font-black uppercase text-[#86868b] text-left tracking-widest">SKU / Marca</th>
                                                <th className="py-4 px-4 md:px-6 text-[9px] font-black uppercase text-[#86868b] text-center tracking-widest">Categoría</th>
                                                <th className="py-4 px-4 md:px-6 text-[9px] font-black uppercase text-[#86868b] text-center tracking-widest">Stock</th>
                                                <th className="py-4 px-4 md:px-6 text-[9px] font-black uppercase text-[#86868b] text-right tracking-widest">Precio Unit.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5">
                                            {loading ? (
                                                [...Array(6)].map((_, i) => (
                                                    <tr key={i}><td colSpan={4} className="p-6"><div className="w-full h-8 bg-black/5 rounded-xl animate-pulse" /></td></tr>
                                                ))
                                            ) : (
                                                products.map((p) => (
                                                    <tr key={p.id} className="group hover:bg-black/2 transition-colors">
                                                        <td className="py-3 px-4 md:px-6">
                                                            <div className="min-w-0">
                                                                <div className="text-xs font-black text-foreground truncate max-w-[150px] md:max-w-none">{p.name}</div>
                                                                <div className="text-[8px] font-black text-primary uppercase tracking-wider">{p.brand || 'Original'}</div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 md:px-6 text-center">
                                                            <span className="text-[8px] md:text-[9px] font-black text-[#5c5c5e] bg-black/5 px-2 py-0.5 rounded-lg uppercase tracking-widest">{p.category || 'General'}</span>
                                                        </td>
                                                        <td className="py-3 px-4 md:px-6 text-center">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-foreground">{p.stock_quantity}</span>
                                                                <span className={`text-[8px] font-black uppercase tracking-tight ${getStockStatus(p.stock_quantity).color}`}>{getStockStatus(p.stock_quantity).label}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 md:px-6 text-right">
                                                            <span className="text-[11px] md:text-xs font-black text-foreground">{formatCurrency(p.price)}</span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 p-4 md:p-6">
                                        {products.map((p) => (
                                            <div key={p.id} className="apple-card p-5 group hover:scale-[1.01] transition-all border border-white/5">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center shrink-0"><Tag className="w-5 h-5 text-[#5c5c5e]" /></div>
                                                    <span className={`text-[8px] font-black uppercase tracking-widest ${getStockStatus(p.stock_quantity).color}`}>{getStockStatus(p.stock_quantity).label}</span>
                                                </div>
                                                <h3 className="text-xs font-black text-foreground truncate mb-4">{p.name}</h3>
                                                <div className="flex items-end justify-between border-t border-black/5 pt-4">
                                                    <div>
                                                        <p className="text-[8px] font-black text-[#86868b] uppercase mb-0.5">Precio Listado</p>
                                                        <p className="text-base md:text-lg font-black text-foreground leading-none">{formatCurrency(p.price)}</p>
                                                    </div>
                                                    <button className="p-2.5 rounded-lg bg-black/5 text-[#86868b] hover:text-foreground transition-all"><Eye className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="px-4 md:px-6 py-3 border-t border-white/5 flex items-center justify-between shrink-0 bg-black/20">
                                <p className="text-[9px] md:text-[10px] font-black text-[#86868b] uppercase tracking-widest">Pág. <span className="text-primary">{page}</span></p>
                                <div className="flex gap-2">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} className="p-2 rounded-lg bg-black/5 text-foreground hover:bg-black/10 transition-all border border-black/5"><ChevronLeft className="w-4 h-4" /></button>
                                    <button onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg bg-black/5 text-foreground hover:bg-black/10 transition-all border border-black/5"><ChevronRight className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    /* FINANCE DASHBOARD */
                    <div className="flex-1 flex flex-col gap-6 overflow-hidden overflow-y-auto no-scrollbar pb-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 shrink-0">
                            <div className="apple-card p-6 border-l-4 border-l-primary border-white/10">
                                <p className="text-[10px] md:text-[11px] font-black text-[#86868b] uppercase tracking-widest mb-1">Valorización Almacén</p>
                                <h3 className="text-2xl md:text-3xl font-black text-foreground truncate">{formatCurrency(totalInventoryValue)}</h3>
                                <p className="text-[10px] text-primary mt-2 font-bold flex items-center gap-1">
                                    <ArrowUpRight className="w-3.5 h-3.5" /> Total activos corrientes
                                </p>
                            </div>
                            <div className="apple-card p-6 border-white/10">
                                <p className="text-[10px] md:text-[11px] font-black text-[#86868b] uppercase tracking-widest mb-1">Rotación Stock</p>
                                <h3 className="text-2xl md:text-3xl font-black text-foreground">4.2x</h3>
                                <p className="text-[10px] text-[#5c5c5e] mt-2 font-bold uppercase tracking-tight">Periodo anual estimado</p>
                            </div>
                            <div className="apple-card p-6 sm:col-span-2 lg:col-span-1 border-white/10">
                                <p className="text-[10px] md:text-[11px] font-black text-[#86868b] uppercase tracking-widest mb-1">Costo Reposición</p>
                                <h3 className="text-2xl md:text-3xl font-black text-foreground truncate">{formatCurrency(totalInventoryValue * 0.72)}</h3>
                                <p className="text-[10px] text-amber-500 mt-2 font-bold uppercase tracking-tight">Inversión proyectada</p>
                            </div>
                        </div>

                        <div className="flex-1 apple-card p-5 md:p-8 flex flex-col overflow-hidden min-h-[400px]">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 md:mb-8 text-center sm:text-left">
                                <div>
                                    <h3 className="text-base md:text-lg font-black text-foreground uppercase tracking-tight">Distribución de Capital</h3>
                                    <p className="text-[9px] md:text-xs text-[#5c5c5e] font-bold uppercase tracking-tight">Valor en inventario por categoría principal</p>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-1 md:pr-4">
                                {topCategoriesValue.map((c, i) => (
                                    <div key={i} className="flex flex-col gap-3">
                                        <div className="flex justify-between items-end gap-4 overflow-hidden">
                                            <div className="min-w-0">
                                                <p className="text-[10px] md:text-xs font-black text-foreground uppercase tracking-tight truncate">{c.name}</p>
                                                <p className="text-[8px] md:text-[10px] text-[#86868b] font-bold uppercase tracking-widest truncate">Participación: {Math.round((c.val / (totalInventoryValue || 1)) * 100)}%</p>
                                            </div>
                                            <p className="text-[11px] md:text-sm font-black text-foreground shrink-0">{formatCurrency(c.val)}</p>
                                        </div>
                                        <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-linear-to-r from-primary to-primary"
                                                style={{ width: `${(c.val / (totalInventoryValue || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* FOOTER */}
                <div className="px-4 md:px-6 py-4 bg-white/5 border border-white/5 rounded-2xl flex flex-wrap gap-4 items-center justify-between shrink-0">
                    <p className="text-[9px] md:text-[10px] font-black text-[#5c5c5e] uppercase tracking-widest flex items-center gap-2">
                        Status: <span className="text-primary">Sincronización OK</span>
                    </p>
                    <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-black text-[#86868b] uppercase tracking-tighter">
                        <span>Apeg Logistics V2.4</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

