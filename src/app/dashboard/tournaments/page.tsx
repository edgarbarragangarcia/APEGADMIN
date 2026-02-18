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
            <div className="px-4 md:px-8 py-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4 shrink-0 z-10 relative mt-4 lg:mt-0">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                        <Trophy className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-foreground leading-tight uppercase tracking-tighter">Torneos</h1>
                        <p className="text-[9px] md:text-[10px] text-[#5c5c5e] font-bold uppercase tracking-widest mt-0.5 whitespace-nowrap">Gestión de campeonatos y premios</p>
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

                <div className="flex justify-end">
                    <button className="apple-button apple-button-primary apple-button-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 text-white font-bold">
                        <Plus className="w-4 h-4 text-white" /> <span>Programar Torneo</span>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 p-4 md:p-8 pt-2 md:pt-4 flex flex-col gap-4 md:gap-6 overflow-hidden relative z-10">

                {activeTab === 'list' ? (
                    <>
                        {/* STICKY FILTER BAR */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shrink-0">
                            <div className="flex gap-1 bg-black/5 p-1 rounded-full border border-black/5 overflow-x-auto no-scrollbar shrink-0">
                                {['Todos', 'Abierto', 'En Curso', 'Finalizados'].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-3 md:px-4 py-1.5 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === f
                                            ? 'bg-primary text-white shadow-md shadow-primary/30'
                                            : 'text-[#86868b] hover:text-foreground hover:bg-white/50'
                                            }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                            <div className="relative group min-w-0 sm:min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#86868b] group-focus-within:text-primary" />
                                <input
                                    type="text"
                                    placeholder="Buscar torneo..."
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-black/5 rounded-full text-[10px] text-foreground focus:outline-none focus:border-primary/30 transition-all font-bold placeholder:text-[#86868b] h-9 shadow-sm"
                                />
                            </div>
                        </div>

                        {/* TOURNAMENT CARDS GRID */}
                        <div className="flex-1 overflow-auto custom-scrollbar pr-1 md:pr-2 pb-10">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 items-start">
                                {loading ? (
                                    [...Array(4)].map((_, i) => (
                                        <div key={i} className="apple-card h-[280px] md:h-[320px] animate-pulse shadow-sm" />
                                    ))
                                ) : (
                                    filteredTournaments.map((t) => (
                                        <div key={t.id} className="apple-card group hover:translate-y-[-4px] transition-all duration-300 flex flex-col justify-between overflow-hidden p-6 min-h-[280px] md:h-[320px] shadow-sm">
                                            <div>
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className={`text-[8px] md:text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border mb-3 w-fit tracking-widest ${t.status === 'Inscripciones Abiertas'
                                                            ? 'bg-primary/10 text-primary border-primary/20'
                                                            : 'bg-white/5 text-[#86868b] border-white/5'
                                                            }`}>
                                                            {t.status || 'ABIERTO'}
                                                        </span>
                                                        <h3 className="text-lg md:text-xl font-black text-foreground group-hover:text-primary transition-colors leading-tight mb-2 uppercase tracking-tighter truncate">
                                                            {t.name}
                                                        </h3>
                                                        <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-[#5c5c5e] font-bold uppercase tracking-widest truncate mb-2">
                                                            <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5 text-primary/50" /> {formatDate(t.date)}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-[#5c5c5e] font-bold uppercase tracking-widest truncate">
                                                            <MapPin className="w-3 h-3 md:w-3.5 md:h-3.5 text-primary/50" /> {t.club}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-3 mb-4">
                                                    <div className="pt-2">
                                                        <div className="flex justify-between text-[8px] md:text-[9px] font-black text-[#86868b] uppercase mb-1.5 tracking-widest">
                                                            <span>Cupo {t.current_participants}/{t.participants_limit}</span>
                                                            <span className="text-primary">{Math.round((t.current_participants / (t.participants_limit || 1)) * 100)}%</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-linear-to-r from-primary to-primary" style={{ width: `${(t.current_participants / (t.participants_limit || 1)) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <button className="w-full py-3.5 md:py-4 rounded-2xl bg-white/5 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-foreground hover:bg-primary hover:text-white border border-white/10 transition-all flex items-center justify-center gap-3 group/btn shadow-lg">
                                                Ver Detalles
                                                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                            </button>
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
                            <div className="apple-card p-6 border-l-4 border-l-primary bg-white border-black/5">
                                <p className="text-[10px] md:text-[11px] font-black text-[#86868b] uppercase tracking-widest mb-1">Recaudación Actual</p>
                                <h3 className="text-2xl md:text-3xl font-black text-foreground">${currentRevenue.toLocaleString()}</h3>
                                <p className="text-[10px] text-primary mt-2 font-bold flex items-center gap-1">
                                    <TrendingUp className="w-3.5 h-3.5" /> Ingresos confirmados
                                </p>
                            </div>
                            <div className="apple-card p-6 bg-white border-black/5">
                                <p className="text-[10px] md:text-[11px] font-black text-[#86868b] uppercase tracking-widest mb-1">Potencial Proyectado</p>
                                <h3 className="text-2xl md:text-3xl font-black text-foreground">${totalPotentialRevenue.toLocaleString()}</h3>
                                <p className="text-[10px] text-[#5c5c5e] mt-2 font-bold uppercase tracking-tight">Basado en cupos totales</p>
                            </div>
                            <div className="apple-card p-6 sm:col-span-2 lg:col-span-1 bg-white border-black/5">
                                <p className="text-[10px] md:text-[11px] font-black text-[#86868b] uppercase tracking-widest mb-1">Total Jugadores</p>
                                <h3 className="text-2xl md:text-3xl font-black text-foreground">{totalParticipants}</h3>
                                <p className="text-[10px] text-[#5c5c5e] mt-2 font-bold uppercase tracking-tight">En {tournaments.length} torneos</p>
                            </div>
                        </div>

                        <div className="flex-1 apple-card p-5 md:p-8 flex flex-col overflow-hidden min-h-[400px] bg-white border-black/5">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 md:mb-8 text-center sm:text-left">
                                <div>
                                    <h3 className="text-base md:text-lg font-black text-foreground uppercase tracking-tight">Ingresos por Torneo</h3>
                                    <p className="text-[9px] md:text-xs text-[#5c5c5e] font-bold uppercase tracking-tight">Rendimiento financiero por evento</p>
                                </div>
                            </div>

                            <div className="flex-1 flex items-end gap-4 md:gap-10 px-2 md:px-6 pb-4 overflow-x-auto no-scrollbar">
                                {tourneyChartData.map((d, i) => (
                                    <div key={i} className="min-w-[60px] md:min-w-[80px] flex-1 flex flex-col items-center gap-4 h-full justify-end group">
                                        <div className="w-full relative flex-1 flex flex-col justify-end">
                                            <div
                                                className="w-full bg-linear-to-t from-primary/40 to-primary transition-all duration-300 rounded-t-lg md:rounded-t-xl group-hover:scale-x-105"
                                                style={{ height: `${(d.revenue / maxTourneyRev) * 100}%`, minHeight: '8px' }}
                                            />
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl">
                                                ${d.revenue.toLocaleString()}
                                            </div>
                                        </div>
                                        <span className="text-[8px] md:text-[9px] font-black text-[#5c5c5e] uppercase text-center max-w-[80px] line-clamp-2 tracking-tighter leading-tight">{d.name}</span>
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

