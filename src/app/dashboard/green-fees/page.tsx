'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    ArrowRight, X, Save, Trash2, Info, Flag,
    MapPin, Search, Plus, Filter, Star,
    CheckCircle2, Activity, Users, Settings,
    Trophy, ChevronRight
} from 'lucide-react'

import Link from 'next/link'
import { motion } from 'framer-motion'

interface GreenFee {
    id: string
    name: string
    location: string
    address: string
    price_weekday: number
    price_weekend: number
    holes: number
    status: 'active' | 'inactive' | 'maintenance'
    rating: number
    caddy_included: boolean
    description: string | null
    image_url: string | null
    source?: string
}


export default function GreenFeesPage() {
    const [fees, setFees] = useState<GreenFee[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingFee, setEditingFee] = useState<GreenFee | null>(null)
    const [stats, setStats] = useState({ total: 0, active: 0, maintenance: 0 });
    const [activeTab, setActiveTab] = useState<'list' | 'finance'>('list')
    const supabase = createClient()

    const fetchData = useCallback(async () => {
        setLoading(true)
        const { data: courses } = await supabase.from('golf_courses').select('*').order('name')

        if (courses) {
            setFees(courses as GreenFee[])
            setStats({
                total: courses.length,
                active: courses.filter(c => c.status === 'active').length,
                maintenance: courses.filter(c => c.status === 'maintenance').length
            })
        }

        setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchData()

        const channel = supabase
            .channel('green-fees-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'golf_courses' },
                () => fetchData()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchData, supabase])

    const formatCurrency = (amount: number | null) => {
        if (!amount) return '--'
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(amount)
    }

    const handleOpenModal = (fee: GreenFee | null = null) => {
        setEditingFee(fee || {
            id: '', name: '', location: '', address: '',
            price_weekday: 0, price_weekend: 0, holes: 18,
            status: 'active', rating: 4.5, caddy_included: true,
            description: '', image_url: '', source: 'Manual'
        } as GreenFee)
        setIsModalOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingFee) return

        const { id, ...data } = editingFee
        let error

        if (id) {
            const { error: err } = await supabase.from('golf_courses').update(data).eq('id', id)
            error = err
        } else {
            const { error: err } = await supabase.from('golf_courses').insert([data])
            error = err
        }

        if (!error) {
            setIsModalOpen(false)
            fetchData()
        } else {
            console.error('Error saving course:', error)
        }
    }

    const handleDelete = async (courseId: string) => {
        if (confirm('¿Estás seguro de eliminar este campo?')) {
            const { error } = await supabase.from('golf_courses').delete().eq('id', courseId)
            if (!error) fetchData()
        }
    }

    // Finance View Data (Mocked or Estimated based on Course Rates)
    const courseStats = fees.map(f => ({
        name: f.name,
        estimatedMonthlyRev: (f.price_weekday * 40) + (f.price_weekend * 20), // Placeholder estimate
        utilization: Math.floor(60 + Math.random() * 30)
    }))

    const totalRev = courseStats.reduce((sum, c) => sum + c.estimatedMonthlyRev, 0)

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background relative">
            <div className="bg-mesh opacity-30 fixed inset-0 pointer-events-none" />

            {/* COMPACT FIXED HEADER */}
            <div className="px-4 md:px-8 py-5 flex flex-wrap items-center justify-between gap-4 shrink-0 z-10 relative mt-4 lg:mt-0">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-[#2d5a27]/10 border border-[#2d5a27]/20 shrink-0">
                        <Flag className="w-5 h-5 text-[#2d5a27]" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-[#1d1d1f] leading-tight uppercase tracking-tighter">Green Fees</h1>
                        <p className="text-[9px] md:text-[10px] text-[#5c5c5e] font-bold uppercase tracking-widest mt-0.5 whitespace-nowrap">Gestión comercial de campos</p>
                    </div>

                    {/* SEGMENTED CONTROL */}
                    <div className="bg-black/5 p-1 rounded-xl flex border border-black/5 sm:ml-4">
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase transition-all ${activeTab === 'list' ? 'bg-[#2d5a27] text-white shadow-lg shadow-[#2d5a27]/20' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}
                        >
                            Catálogo
                        </button>
                        <button
                            onClick={() => setActiveTab('finance')}
                            className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase transition-all ${activeTab === 'finance' ? 'bg-[#2d5a27] text-white shadow-lg shadow-[#2d5a27]/20' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}
                        >
                            Finanzas
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => handleOpenModal()}
                        className="apple-button-primary apple-button-sm w-full sm:w-auto py-2.5 md:py-2! px-6 flex items-center justify-center"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Programar Campo
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 p-4 md:p-8 pt-2 md:pt-4 flex flex-col gap-6 overflow-hidden relative z-10">

                {activeTab === 'list' ? (
                    <div className="flex-1 overflow-auto custom-scrollbar pr-1 md:pr-2 pb-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 items-start">
                            {loading ? (
                                [...Array(4)].map((_, i) => <div key={i} className="apple-card h-[280px] md:h-[320px] animate-pulse" />)
                            ) : fees.length === 0 ? (
                                <div className="col-span-full h-full apple-card flex flex-col items-center justify-center p-10 md:p-20">
                                    <Search className="w-16 h-16 md:w-20 md:h-20 text-gray-800 mb-6" />
                                    <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">Sin registros</h3>
                                </div>
                            ) : (
                                fees.map((fee) => (
                                    <div key={fee.id} className="apple-card group hover:translate-y-[-4px] transition-all duration-300 flex flex-col justify-between overflow-hidden p-6 min-h-[280px] md:h-[320px] bg-white border-black/5 shadow-sm">
                                        <div>
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex flex-col min-w-0">
                                                    <span className={`text-[8px] md:text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border mb-3 w-fit tracking-widest ${fee.source === 'App Movil' ? 'bg-[#2d5a27]/10 text-[#2d5a27] border-[#2d5a27]/20' : 'bg-black/5 text-[#86868b] border-black/5'
                                                        }`}>
                                                        {fee.source || 'SISTEMA'}
                                                    </span>
                                                    <h3 className="text-lg md:text-xl font-black text-[#1d1d1f] group-hover:text-[#2d5a27] transition-colors leading-tight mb-2 uppercase tracking-tighter truncate">{fee.name}</h3>
                                                    <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-[#5c5c5e] font-bold uppercase tracking-widest truncate">
                                                        <MapPin className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#2d5a27]/50" /> {fee.location}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleOpenModal(fee)}
                                                    className="p-2.5 md:p-3 rounded-xl bg-black/5 border border-black/5 text-[#86868b] hover:text-[#1d1d1f] transition-all shrink-0"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <Link
                                            href={`/dashboard/green-fees/${fee.id}`}
                                            className="w-full py-3.5 md:py-4 rounded-2xl bg-black/5 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-[#1d1d1f] hover:bg-[#2d5a27] hover:text-white border border-black/10 transition-all flex items-center justify-center gap-3 group/btn shadow-lg"
                                        >
                                            Admin Reserva
                                            <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                        </Link>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    /* FINANCE VIEW */
                    <div className="flex-1 flex flex-col gap-6 overflow-hidden overflow-y-auto no-scrollbar pb-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 shrink-0">
                            <div className="apple-card p-6 border-l-4 border-l-[#2d5a27] bg-white border-black/5 shadow-sm">
                                <p className="text-[10px] md:text-[11px] font-black text-[#86868b] uppercase tracking-widest mb-1">Volumen Estimado Mes</p>
                                <h3 className="text-2xl md:text-3xl font-black text-[#1d1d1f]">{formatCurrency(totalRev)}</h3>
                                <p className="text-[10px] text-[#4c7c44] mt-2 font-bold flex items-center gap-1 leading-none">
                                    <Activity className="w-3 h-3" /> Basado en precios base
                                </p>
                            </div>
                            <div className="apple-card p-6 bg-white border-black/5 shadow-sm">
                                <p className="text-[10px] md:text-[11px] font-black text-[#86868b] uppercase tracking-widest mb-1">Promedio Ocupación</p>
                                <h3 className="text-2xl md:text-3xl font-black text-[#1d1d1f]">74%</h3>
                                <p className="text-[10px] text-[#5c5c5e] mt-2 font-bold uppercase tracking-tight">Rendimiento óptimo general</p>
                            </div>
                            <div className="apple-card p-6 sm:col-span-2 lg:col-span-1 bg-white border-black/5 shadow-sm">
                                <p className="text-[10px] md:text-[11px] font-black text-[#86868b] uppercase tracking-widest mb-1">Campos Activos</p>
                                <h3 className="text-2xl md:text-3xl font-black text-[#1d1d1f]">{stats.active}</h3>
                                <p className="text-[10px] text-amber-500 mt-2 font-bold uppercase tracking-tight">{stats.maintenance} en mantenimiento</p>
                            </div>
                        </div>

                        <div className="flex-1 apple-card p-5 md:p-8 flex flex-col overflow-hidden min-h-[400px] bg-white border-black/5 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 md:mb-8">
                                <div>
                                    <h3 className="text-base md:text-lg font-black text-[#1d1d1f] uppercase tracking-tight">Desempeño por Campo</h3>
                                    <p className="text-[9px] md:text-xs text-[#5c5c5e] font-bold uppercase tracking-tight">Estimación de ingresos generados</p>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1 md:pr-4">
                                {courseStats.map((c, i) => (
                                    <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-4 md:gap-6 p-4 rounded-2xl bg-black/5 border border-black/5 hover:bg-black/10 transition-all">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#2d5a27]/10 flex items-center justify-center text-[#2d5a27] font-black text-xs md:text-sm shrink-0">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-[150px]">
                                            <h4 className="text-[10px] md:text-xs font-black text-[#1d1d1f] uppercase tracking-tight mb-2 truncate">{c.name}</h4>
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 h-1.5 bg-black/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-linear-to-r from-[#2d5a27] to-[#4c7c44]" style={{ width: `${c.utilization}%` }} />
                                                </div>
                                                <span className="text-[9px] font-black text-[#5c5c5e] uppercase w-8 text-right shrink-0">{c.utilization}%</span>
                                            </div>
                                        </div>
                                        <div className="text-right ml-auto">
                                            <p className="text-[8px] md:text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-0.5 whitespace-nowrap">Est. Mensual</p>
                                            <p className="text-xs md:text-sm font-black text-[#1d1d1f]">{formatCurrency(c.estimatedMonthlyRev)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* FOOTER */}
                <div className="px-4 md:px-6 py-4 bg-white/40 border border-black/5 rounded-2xl flex flex-wrap gap-4 items-center justify-between shrink-0 shadow-sm">
                    <p className="text-[9px] md:text-[10px] font-black text-[#2d5a27] uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" /> Monitor en tiempo real
                    </p>
                    <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-black text-[#5c5c5e] uppercase tracking-tighter">
                        <span>Apeg Golf Management</span>
                    </div>
                </div>
            </div>

            {/* NEW/EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-[32px] border border-black/5 flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl relative"
                    >
                        <div className="p-6 md:p-8 border-b border-black/5 flex items-center justify-between shrink-0 relative z-10">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-black text-[#1d1d1f] uppercase tracking-tighter leading-none">
                                    {editingFee?.id ? 'Editar Campo' : 'Registrar'}
                                </h2>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2.5 md:p-3.5 rounded-xl md:rounded-2xl bg-black/5 border border-black/5 text-[#86868b] hover:text-[#1d1d1f] transition-all">
                                <X className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-5 md:space-y-6 custom-scrollbar relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] md:text-[10px] font-black text-[#86868b] uppercase tracking-widest ml-1">Nombre</label>
                                    <input required className="w-full bg-black/5 border border-black/10 rounded-xl md:rounded-2xl px-5 py-3 text-sm text-[#1d1d1f] focus:outline-none focus:border-[#2d5a27] transition-all font-bold" value={editingFee?.name || ''} onChange={e => setEditingFee({ ...editingFee!, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] md:text-[10px] font-black text-[#86868b] uppercase tracking-widest ml-1">Ubicación</label>
                                    <input className="w-full bg-black/5 border border-black/10 rounded-xl md:rounded-2xl px-5 py-3 text-sm text-[#1d1d1f] focus:outline-none focus:border-[#2d5a27] transition-all font-bold" value={editingFee?.location || ''} onChange={e => setEditingFee({ ...editingFee!, location: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] md:text-[10px] font-black text-[#86868b] uppercase tracking-widest ml-1">Precio Semana</label>
                                    <input type="number" className="w-full bg-black/5 border border-black/10 rounded-xl md:rounded-2xl px-5 py-3 text-sm text-[#1d1d1f] focus:outline-none focus:border-[#2d5a27] transition-all font-bold" value={editingFee?.price_weekday || 0} onChange={e => setEditingFee({ ...editingFee!, price_weekday: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] md:text-[10px] font-black text-[#86868b] uppercase tracking-widest ml-1">Precio Fin Sem.</label>
                                    <input type="number" className="w-full bg-black/5 border border-black/10 rounded-xl md:rounded-2xl px-5 py-3 text-sm text-[#1d1d1f] focus:outline-none focus:border-[#2d5a27] transition-all font-bold" value={editingFee?.price_weekend || 0} onChange={e => setEditingFee({ ...editingFee!, price_weekend: Number(e.target.value) })} />
                                </div>
                            </div>
                        </form>

                        <div className="p-6 md:p-8 border-t border-black/5 flex items-center justify-end gap-3 md:gap-5 shrink-0 relative z-10">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 md:px-8 py-3 rounded-xl md:rounded-2xl bg-black/5 text-[9px] md:text-[10px] font-black uppercase text-[#86868b] hover:text-[#1d1d1f] border border-black/5 transition-all">Cancelar</button>
                            <button onClick={handleSubmit} className="h-[44px] md:h-[48px] px-8 md:px-10 bg-[#2d5a27] text-white rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase hover:scale-105 transition-all shadow-lg shadow-[#2d5a27]/20">Guardar</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div >
    )
}

