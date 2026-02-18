'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    Trophy, Plus, Search, Filter, Calendar, MapPin,
    Users, ChevronLeft, ChevronRight, Eye, Settings,
    ArrowRight, Star, Clock, Share2, TrendingUp
} from 'lucide-react'

interface Tournament {
    id: string
    name: string
    description: string
    date: string
    club: string
    price: number | string
    participants_limit: number
    current_participants: number
    status: string
    image_url: string
    game_mode: string
    address: string
}

export default function TournamentsPage() {
    const [tournaments, setTournaments] = useState<Tournament[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('Todos')
    const [activeTab, setActiveTab] = useState<'list' | 'finance'>('list')
    const supabase = createClient()

    const fetchTournaments = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase.rpc('get_all_tournaments')
        if (data) setTournaments(data)
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchTournaments()
    }, [fetchTournaments])

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
    }

    const filteredTournaments = tournaments.filter(t =>
        filter === 'Todos' || t.status === filter
    ).slice(0, 3) // Only show 3 cards to fit in one page without scroll

    // Finance Calculations
    const totalPotentialRevenue = tournaments.reduce((sum, t) => sum + (Number(t.price) * t.participants_limit), 0)
    const currentRevenue = tournaments.reduce((sum, t) => sum + (Number(t.price) * t.current_participants), 0)
    const totalParticipants = tournaments.reduce((sum, t) => sum + t.current_participants, 0)

    const tourneyChartData = tournaments.slice(0, 7).map(t => ({
        name: t.name.substring(0, 10),
        revenue: Number(t.price) * t.current_participants
    }))

    const maxTourneyRev = Math.max(...tourneyChartData.map(d => d.revenue), 1)

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background relative">
            <div className="bg-mesh opacity-30 fixed inset-0 pointer-events-none" />

            {/* FIXED HEADER COMPACT */}
            <div className="px-4 md:px-8 py-5 flex flex-wrap items-center justify-between gap-4 shrink-0 z-10 relative mt-4 lg:mt-0">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-[#2d5a27]/10 border border-[#2d5a27]/20 shrink-0">
                        <Trophy className="w-5 h-5 text-[#2d5a27]" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-white leading-tight uppercase tracking-tighter">Torneos</h1>
                        <p className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5 whitespace-nowrap">Gestión de campeonatos y premios</p>
                    </div>

                    {/* SEGMENTED CONTROL */}
                    <div className="bg-[#1c1c1e] p-1 rounded-xl flex border border-white/5 sm:ml-4">
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase transition-all ${activeTab === 'list' ? 'bg-[#2d5a27] text-black shadow-lg shadow-[#2d5a27]/20' : 'text-gray-500 hover:text-white'}`}
                        >
                            Listado
                        </button>
                        <button
                            onClick={() => setActiveTab('finance')}
                            className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase transition-all ${activeTab === 'finance' ? 'bg-[#2d5a27] text-black shadow-lg shadow-[#2d5a27]/20' : 'text-gray-500 hover:text-white'}`}
                        >
                            Finanzas
                        </button>
                    </div>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                    <button className="apple-button-primary apple-button-sm w-full sm:w-auto py-2.5 md:py-2! px-6 flex items-center justify-center">
                        <Plus className="w-4.5 h-4.5 mr-2" /> Programar Torneo
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 p-4 md:p-8 pt-2 md:pt-4 flex flex-col gap-4 md:gap-6 overflow-hidden relative z-10">

                {activeTab === 'list' ? (
                    <>
                        {/* STICKY FILTER BAR */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shrink-0">
                            <div className="flex gap-1 bg-white/2 p-1 rounded-full border border-white/5 overflow-x-auto no-scrollbar shrink-0">
                                {['Todos', 'Abierto', 'En Curso', 'Finalizados'].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-3 md:px-4 py-1.5 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === f
                                            ? 'bg-white/10 text-white shadow-sm border border-white/10'
                                            : 'text-gray-600 hover:text-gray-400'
                                            }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                            <div className="relative group min-w-0 sm:min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar torneo..."
                                    className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/5 rounded-full text-[10px] text-white focus:outline-none focus:border-accent/30 transition-all font-bold placeholder:text-gray-700 h-9"
                                />
                            </div>
                        </div>

                        {/* TOURNAMENT CARDS GRID */}
                        <div className="flex-1 overflow-auto custom-scrollbar pr-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-6">
                                {loading ? (
                                    [...Array(3)].map((_, i) => (
                                        <div key={i} className="apple-card h-[400px] animate-pulse" />
                                    ))
                                ) : (
                                    filteredTournaments.map((t) => (
                                        <div key={t.id} className="apple-card group hover:translate-y-[-4px] transition-all duration-300 flex flex-col h-full overflow-hidden">
                                            {t.image_url && (
                                                <div className="h-32 md:h-40 overflow-hidden relative">
                                                    <img src={t.image_url} alt={t.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                    <div className="absolute inset-0 bg-linear-to-t from-background/90 to-transparent" />
                                                    <div className="absolute top-4 left-4">
                                                        <span className="px-2 py-1 rounded-md bg-[#2d5a27] text-black text-[8px] font-black uppercase tracking-widest shadow-lg shadow-[#2d5a27]/20">ACTIVO</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="p-5 md:p-6 flex-1 flex flex-col">
                                                <h3 className="text-base md:text-lg font-black text-white group-hover:text-[#2d5a27] transition-colors leading-tight mb-4 pr-2 uppercase tracking-tight">
                                                    {t.name}
                                                </h3>

                                                <div className="space-y-3 mb-6">
                                                    <div className="flex items-center gap-3 text-[11px] md:text-xs text-gray-400 font-bold uppercase tracking-tight">
                                                        <Calendar className="w-3.5 h-3.5 text-[#2d5a27] shrink-0" />
                                                        {formatDate(t.date)}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-[11px] md:text-xs text-gray-400 font-bold uppercase tracking-tight">
                                                        <MapPin className="w-3.5 h-3.5 text-[#2d5a27] shrink-0" />
                                                        <span className="truncate">{t.club}</span>
                                                    </div>
                                                    <div className="pt-2">
                                                        <div className="flex justify-between text-[8px] md:text-[9px] font-black text-gray-500 uppercase mb-1.5 tracking-widest">
                                                            <span>Cupo {t.current_participants}/{t.participants_limit}</span>
                                                            <span className="text-[#2d5a27]">{Math.round((t.current_participants / (t.participants_limit || 1)) * 100)}%</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-linear-to-r from-[#2d5a27] to-primary" style={{ width: `${(t.current_participants / (t.participants_limit || 1)) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[8px] md:text-[9px] uppercase font-black text-gray-600 tracking-widest mb-0.5">Inscripción</p>
                                                        <p className="text-lg md:text-xl font-black text-white leading-none tracking-tighter">${Number(t.price).toLocaleString()}</p>
                                                    </div>
                                                    <button className="apple-button-primary apple-button-sm w-auto! py-2! px-6! transition-all hover:scale-105 active:scale-95">Ver</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    /* FINANCE DASHBOARD */
                    <div className="flex-1 flex flex-col gap-6 overflow-hidden overflow-y-auto no-scrollbar pb-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 shrink-0 font-bold tracking-tight">
                            <div className="apple-card p-6 border-l-4 border-l-[#2d5a27]">
                                <p className="text-[10px] md:text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">Recaudación Actual</p>
                                <h3 className="text-2xl md:text-3xl font-black text-white">${currentRevenue.toLocaleString()}</h3>
                                <p className="text-[10px] text-[#4c7c44] mt-2 font-bold flex items-center gap-1">
                                    <TrendingUp className="w-3.5 h-3.5" /> Ingresos confirmados
                                </p>
                            </div>
                            <div className="apple-card p-6">
                                <p className="text-[10px] md:text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">Potencial Proyectado</p>
                                <h3 className="text-2xl md:text-3xl font-black text-white">${totalPotentialRevenue.toLocaleString()}</h3>
                                <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-tight">Basado en cupos totales</p>
                            </div>
                            <div className="apple-card p-6 sm:col-span-2 lg:col-span-1">
                                <p className="text-[10px] md:text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Jugadores</p>
                                <h3 className="text-2xl md:text-3xl font-black text-white">{totalParticipants}</h3>
                                <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-tight">En {tournaments.length} torneos</p>
                            </div>
                        </div>

                        <div className="flex-1 apple-card p-5 md:p-8 flex flex-col overflow-hidden min-h-[400px]">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 md:mb-8 text-center sm:text-left">
                                <div>
                                    <h3 className="text-base md:text-lg font-black text-white uppercase tracking-tight">Ingresos por Torneo</h3>
                                    <p className="text-[9px] md:text-xs text-gray-500 font-bold uppercase tracking-tight">Rendimiento financiero por evento</p>
                                </div>
                            </div>

                            <div className="flex-1 flex items-end gap-4 md:gap-10 px-2 md:px-6 pb-4 overflow-x-auto no-scrollbar">
                                {tourneyChartData.map((d, i) => (
                                    <div key={i} className="min-w-[60px] md:min-w-[80px] flex-1 flex flex-col items-center gap-4 h-full justify-end group">
                                        <div className="w-full relative flex-1 flex flex-col justify-end">
                                            <div
                                                className="w-full bg-linear-to-t from-[#2d5a27]/40 to-[#2d5a27] transition-all duration-300 rounded-t-lg md:rounded-t-xl group-hover:scale-x-105"
                                                style={{ height: `${(d.revenue / maxTourneyRev) * 100}%`, minHeight: '8px' }}
                                            />
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl">
                                                ${d.revenue.toLocaleString()}
                                            </div>
                                        </div>
                                        <span className="text-[8px] md:text-[9px] font-black text-gray-500 uppercase text-center max-w-[80px] line-clamp-2 tracking-tighter leading-tight">{d.name}</span>
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

