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
            <div className="px-8 py-5 flex items-center justify-between shrink-0 z-10 relative">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-[#32d74b]/10 border border-[#32d74b]/20">
                        <Trophy className="w-5 h-5 text-[#32d74b]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white leading-tight">Master de Torneos</h1>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5 whitespace-nowrap">Gestión de campeonatos y premios</p>
                    </div>

                    {/* SEGMENTED CONTROL */}
                    <div className="bg-[#1c1c1e] p-1 rounded-xl flex ml-8 border border-white/5">
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'list' ? 'bg-[#32d74b] text-black shadow-lg shadow-[#32d74b]/20' : 'text-gray-500 hover:text-white'}`}
                        >
                            Listado
                        </button>
                        <button
                            onClick={() => setActiveTab('finance')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'finance' ? 'bg-[#32d74b] text-black shadow-lg shadow-[#32d74b]/20' : 'text-gray-500 hover:text-white'}`}
                        >
                            Finanzas
                        </button>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button className="apple-button-primary apple-button-sm !w-auto !py-2 px-6">
                        <Plus className="w-4.5 h-4.5 mr-2" /> Programar Torneo
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 p-6 px-8 flex flex-col gap-6 overflow-hidden relative z-10">

                {activeTab === 'list' ? (
                    <>
                        {/* STICKY FILTER BAR */}
                        <div className="flex items-center justify-between shrink-0">
                            <div className="flex gap-2 bg-white/2 p-1 rounded-full border border-white/5">
                                {['Todos', 'Abierto', 'En Curso', 'Finalizados'].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${filter === f
                                            ? 'bg-white/10 text-white shadow-sm'
                                            : 'text-gray-600 hover:text-gray-400'
                                            }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                            <div className="relative group min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    className="w-full pl-9 pr-4 py-1.5 bg-white/5 border border-white/5 rounded-full text-[10px] text-white focus:outline-none focus:border-accent/30 transition-all font-bold placeholder:text-gray-700"
                                />
                            </div>
                        </div>

                        {/* TOURNAMENT CARDS GRID */}
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
                                {loading ? (
                                    [...Array(3)].map((_, i) => (
                                        <div key={i} className="apple-card h-[400px] animate-pulse" />
                                    ))
                                ) : (
                                    filteredTournaments.map((t) => (
                                        <div key={t.id} className="apple-card group hover:translate-y-[-4px] transition-all duration-300 flex flex-col h-full overflow-hidden">
                                            {t.image_url && (
                                                <div className="h-32 overflow-hidden relative">
                                                    <img src={t.image_url} alt={t.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                    <div className="absolute inset-0 bg-linear-to-t from-background/90 to-transparent" />
                                                    <div className="absolute top-3 left-3">
                                                        <span className="px-2 py-0.5 rounded-md bg-[#32d74b] text-black text-[8px] font-black uppercase">ACTIVO</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="p-6 flex-1 flex flex-col">
                                                <h3 className="text-lg font-black text-white group-hover:text-[#32d74b] transition-colors leading-tight mb-4 pr-2">
                                                    {t.name}
                                                </h3>

                                                <div className="space-y-3 mb-6">
                                                    <div className="flex items-center gap-3 text-xs text-gray-400 font-bold">
                                                        <Calendar className="w-3.5 h-3.5 text-[#32d74b]" />
                                                        {formatDate(t.date)}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-gray-400 font-bold">
                                                        <MapPin className="w-3.5 h-3.5 text-[#32d74b]" />
                                                        {t.club}
                                                    </div>
                                                    <div className="pt-2">
                                                        <div className="flex justify-between text-[9px] font-black text-gray-500 uppercase mb-1.5">
                                                            <span>Cupo {t.current_participants}/{t.participants_limit}</span>
                                                            <span>{Math.round((t.current_participants / t.participants_limit) * 100)}%</span>
                                                        </div>
                                                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-linear-to-r from-[#32d74b] to-[#c1ff72]" style={{ width: `${(t.current_participants / t.participants_limit) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[9px] uppercase font-black text-gray-600 tracking-widest mb-0.5">Inscripción</p>
                                                        <p className="text-xl font-black text-white">${Number(t.price).toLocaleString()}</p>
                                                    </div>
                                                    <button className="apple-button-primary apple-button-sm !w-auto !py-2 px-6">Ver</button>
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
                    <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                        <div className="grid grid-cols-3 gap-6 shrink-0">
                            <div className="apple-card p-6 border-l-4 border-l-[#32d74b]">
                                <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">Recaudación Actual</p>
                                <h3 className="text-3xl font-black text-white">${currentRevenue.toLocaleString()}</h3>
                                <p className="text-xs text-emerald-400 mt-2 font-bold flex items-center gap-1">
                                    <TrendingUp className="w-3.5 h-3.5" /> Ingresos confirmados
                                </p>
                            </div>
                            <div className="apple-card p-6">
                                <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">Potencial Proyectado</p>
                                <h3 className="text-3xl font-black text-white">${totalPotentialRevenue.toLocaleString()}</h3>
                                <p className="text-xs text-gray-500 mt-2 font-bold">Basado en cupos totales</p>
                            </div>
                            <div className="apple-card p-6">
                                <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Jugadores</p>
                                <h3 className="text-3xl font-black text-white">{totalParticipants}</h3>
                                <p className="text-xs text-gray-500 mt-2 font-bold uppercase tracking-tight">En {tournaments.length} torneos</p>
                            </div>
                        </div>

                        <div className="flex-1 apple-card p-8 flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-lg font-black text-white">Ingresos por Torneo</h3>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-tight">Rendimiento financiero por evento</p>
                                </div>
                            </div>

                            <div className="flex-1 flex items-end gap-10 px-6 pb-4 overflow-x-auto custom-scrollbar">
                                {tourneyChartData.map((d, i) => (
                                    <div key={i} className="min-w-[80px] flex-1 flex flex-col items-center gap-4 h-full justify-end group">
                                        <div className="w-full relative flex-1 flex flex-col justify-end">
                                            <div
                                                className="w-full bg-linear-to-t from-[#32d74b]/40 to-[#32d74b] transition-all duration-300 rounded-t-xl group-hover:scale-x-105"
                                                style={{ height: `${(d.revenue / maxTourneyRev) * 100}%`, minHeight: '12px' }}
                                            />
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                                                ${d.revenue.toLocaleString()}
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-black text-gray-500 uppercase text-center max-w-[80px] line-clamp-1">{d.name}</span>
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

