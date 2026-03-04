'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    Trophy, Plus, Search, Filter, Calendar, MapPin,
    Users, ChevronLeft, ChevronRight, Eye, Settings,
    ArrowRight, Star, Clock, Share2, TrendingUp,
    CheckCircle, XCircle, AlertCircle, User,
    DollarSign, TrendingDown, Target, Wallet, Receipt
} from 'lucide-react'
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
    ReferenceLine
} from 'recharts'

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
    approval_status: 'pending' | 'approved' | 'rejected'
    creator_full_name?: string
    creator_avatar_url?: string
    budget_per_player?: number
    budget_prizes?: number
    budget_operational?: number
    guests?: string
    budget_items?: any[]
}

interface RegistrationCount {
    total: number
    paid: number
}

export default function TournamentsPage() {
    const [tournaments, setTournaments] = useState<Tournament[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [filter, setFilter] = useState('Todos')
    const [activeTab, setActiveTab] = useState<'list' | 'finance' | 'requests'>('list')
    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
    const [selectedFinanceTournament, setSelectedFinanceTournament] = useState<string>('Global')
    const [regCounts, setRegCounts] = useState<Record<string, RegistrationCount>>({})
    const supabase = createClient()

    const fetchTournaments = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        const { data: tourneys } = await supabase.rpc('get_all_tournaments')

        if (tourneys) {
            setTournaments(tourneys)

            // Fetch registration counts for all tourneys
            const { data: regs } = await supabase
                .from('tournament_registrations')
                .select('tournament_id, registration_status')

            if (regs) {
                const counts: Record<string, RegistrationCount> = {}
                regs.forEach(r => {
                    if (!counts[r.tournament_id]) counts[r.tournament_id] = { total: 0, paid: 0 }
                    counts[r.tournament_id].total += 1
                    // Consideramos 'paid' y 'Confirmado' como pagados
                    if (['paid', 'Confirmado', 'completado', 'Completado'].includes(r.registration_status)) {
                        counts[r.tournament_id].paid += 1
                    }
                })
                setRegCounts(counts)
            }
        }
        if (!silent) setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchTournaments()

        // Suscripción en tiempo real para mantener sincronía
        const channel = supabase
            .channel('tournaments_changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'tournaments' },
                () => fetchTournaments(true)
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchTournaments, supabase])

    const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
        setActionLoading(id)
        const { error } = await supabase
            .from('tournaments')
            .update({
                approval_status: newStatus,
                // Si se aprueba, nos aseguramos que el status sea correcto
                ...(newStatus === 'approved' ? { status: 'Abierto' } : {})
            })
            .eq('id', id)

        if (error) {
            console.error('Error updating tournament status:', error)
            alert('Error al actualizar el estado: ' + error.message)
        } else {
            // Actualización local inmediata para mejor UX
            setTournaments(prev => prev.map(t =>
                t.id === id ? { ...t, approval_status: newStatus, status: newStatus === 'approved' ? 'Abierto' : t.status } : t
            ))

            // Si el modal está abierto con el torneo actualizado, lo actualizamos o cerramos
            if (selectedTournament?.id === id) {
                if (newStatus === 'approved' || newStatus === 'rejected') {
                    setIsDetailsModalOpen(false)
                    setSelectedTournament(null)
                } else {
                    setSelectedTournament(prev => prev ? { ...prev, approval_status: newStatus } : null)
                }
            }

            // Refrescar datos del servidor para asegurar sincronía final
            await fetchTournaments(true)
        }
        setActionLoading(null)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
    }

    const filteredTournaments = tournaments.filter(t =>
        t.approval_status === 'approved' && (filter === 'Todos' || t.status === filter)
    )

    const pendingRequests = tournaments.filter(t => t.approval_status === 'pending')

    // Finance Calculations
    const getFinanceBase = () => {
        if (selectedFinanceTournament === 'Global') return tournaments;
        return tournaments.filter(t => t.id === selectedFinanceTournament);
    }
    const financeBase = getFinanceBase();

    // Potential revenue should be 0 if it's still at the default limit (100) and no one has registered, 
    // indicating it hasn't been configured yet.
    const calculatePotential = (t: any) => {
        if (t.current_participants === 0 && t.participants_limit === 100) return 0;
        return Number(t.price) * t.participants_limit;
    }

    const totalPotentialRevenue = financeBase.reduce((sum, t) => sum + calculatePotential(t), 0)
    const currentRevenue = financeBase.reduce((sum, t) => sum + (Number(t.price) * t.current_participants), 0)
    const totalParticipants = financeBase.reduce((sum, t) => sum + t.current_participants, 0)

    // Advanced Finance Metrics for Selected Tournament
    const getFinanceMetrics = (tournamentId: string) => {
        if (tournamentId === 'Global') {
            const totalFixedCosts = tournaments.reduce((sum, t) => {
                const itemsFixed = t.budget_items?.filter((i: any) => i.type === 'fixed').reduce((s: number, i: any) => s + Number(i.amount || 0), 0) || 0
                return sum + itemsFixed + Number(t.budget_prizes || 0) + Number(t.budget_operational || 0)
            }, 0)

            const totalVariableCosts = tournaments.reduce((sum, t) => {
                const itemsVar = t.budget_items?.filter((i: any) => i.type === 'per_player').reduce((s: number, i: any) => s + Number(i.amount || 0), 0) || 0
                const players = regCounts[t.id]?.total || t.current_participants
                const guests = t.guests ? t.guests.split(/\\n|\n/).filter((g: string) => g.trim()).length : 0
                return sum + ((itemsVar + Number(t.budget_per_player || 0)) * (players + guests))
            }, 0)

            const totalGuests = tournaments.reduce((sum, t) => sum + (t.guests ? t.guests.split(/\\n|\n/).filter((g: string) => g.trim()).length : 0), 0)
            const income = tournaments.reduce((sum, t) => sum + (Number(t.price) * (regCounts[t.id]?.paid || 0)), 0)
            const totalCosts = totalFixedCosts + totalVariableCosts
            const balance = income - totalCosts

            return {
                totalFixedCosts,
                totalVariableCosts,
                totalGuests,
                totalCosts,
                income,
                balance,
                breakEvenPercent: totalCosts > 0 ? Math.min(Math.round((income / totalCosts) * 100), 100) : 0,
                breakEvenPlayers: 0,
                participants: tournaments.reduce((sum, t) => sum + (regCounts[t.id]?.total || t.current_participants), 0),
                paid: tournaments.reduce((sum, t) => sum + (regCounts[t.id]?.paid || 0), 0),
                guests: totalGuests,
                limit: tournaments.reduce((sum, t) => sum + t.participants_limit, 0)
            }
        }

        const t = tournaments.find(tourney => tourney.id === tournamentId)
        if (!t) return null

        const currentRegs = regCounts[t.id] || { total: t.current_participants, paid: 0 }

        // Sumar costos fijos desde budget_items y campos legacy
        const fixedCosts = (t.budget_items?.filter((i: any) => i.type === 'fixed').reduce((s: number, i: any) => s + Number(i.amount || 0), 0) || 0) +
            Number(t.budget_prizes || 0) + Number(t.budget_operational || 0)

        // Sumar costos variables por jugador
        const varPerPlayer = (t.budget_items?.filter((i: any) => i.type === 'per_player').reduce((s: number, i: any) => s + Number(i.amount || 0), 0) || 0) +
            Number(t.budget_per_player || 0)

        const guests = t.guests ? t.guests.split(/\\n|\n/).filter((g: string) => g.trim()).length : 0
        const totalVariableCosts = varPerPlayer * (currentRegs.total + guests)
        const totalCosts = fixedCosts + totalVariableCosts
        const income = Number(t.price) * currentRegs.paid
        const balance = income - totalCosts

        const netPerPlayer = Number(t.price) - varPerPlayer
        const breakEvenCount = netPerPlayer > 0 ? Math.ceil(fixedCosts / netPerPlayer) : 0

        return {
            fixedCosts,
            variableCosts: totalVariableCosts,
            guests,
            totalCosts,
            income,
            balance,
            breakEvenCount,
            netPerPlayer,
            participants: currentRegs.total,
            paid: currentRegs.paid,
            limit: t.participants_limit
        }
    }

    const metrics = getFinanceMetrics(selectedFinanceTournament)

    const tourneyChartData = selectedFinanceTournament === 'Global'
        ? tournaments.slice(0, 7).map(t => ({
            name: t.name.length > 12 ? t.name.substring(0, 10) + '...' : t.name,
            revenue: Number(t.price) * t.current_participants,
            target: 0 // No se muestra meta en global para no ensuciar
        }))
        : [
            {
                name: 'Inicio',
                revenue: 0,
                target: metrics?.fixedCosts || 0
            },
            {
                name: 'Actual',
                revenue: metrics?.income || 0,
                target: (metrics?.fixedCosts || 0) + (metrics?.variableCosts || 0)
            },
            {
                name: 'Equilibrio',
                revenue: metrics?.totalCosts || 0,
                target: metrics?.totalCosts || 0
            },
            {
                name: 'Potencial',
                revenue: totalPotentialRevenue,
                target: (metrics?.fixedCosts || 0) + (Number(financeBase[0]?.budget_per_player || 0) * (metrics?.limit || 0))
            }
        ];

    const maxTourneyRev = Math.max(...tourneyChartData.map(d => Math.max(d.revenue, d.target)), 1)
    const chartTitle = selectedFinanceTournament === 'Global' ? 'Rendimiento por Torneo' : `Análisis: ${financeBase[0]?.name}`;
    const chartSubtitle = selectedFinanceTournament === 'Global' ? 'Ingresos confirmados de la plataforma' : 'Intersección de Ingresos vs Punto de Equilibrio (Gastos)';

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#1d1d1f] border border-white/10 p-4 rounded-2xl shadow-xl backdrop-blur-md z-50">
                    <p className="text-[10px] font-black text-[#86868b] uppercase tracking-widest mb-3">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-6 mb-2 last:mb-0">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <p className="text-[10px] font-bold text-white uppercase tracking-tight">
                                    {entry.name === 'revenue' ? 'Ingresos' : 'Gastos/Meta'}
                                </p>
                            </div>
                            <p className="text-[10px] font-black" style={{ color: entry.color }}>
                                ${entry.value.toLocaleString()}
                            </p>
                        </div>
                    ))}
                    {payload.length > 1 && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[#86868b]">
                                Balance: <span className={payload[0].value - payload[1].value >= 0 ? 'text-primary' : 'text-red-500'}>
                                    ${(payload[0].value - payload[1].value).toLocaleString()}
                                </span>
                            </p>
                        </div>
                    )}
                </div>
            )
        }
    }

    const CustomDot = (props: any) => {
        const { cx, cy } = props
        if (!cx || !cy) return null
        return (
            <circle
                cx={cx}
                cy={cy}
                r={4}
                fill="#8cf902"
                stroke="#1d1d1f"
                strokeWidth={2}
            />
        )
    }

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
                            onClick={() => setActiveTab('requests')}
                            className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase transition-all ${activeTab === 'requests' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-[#86868b] hover:text-foreground'}`}
                        >
                            Solicitudes {pendingRequests.length > 0 && <span className="ml-1 inline-flex items-center justify-center w-4 h-4 bg-red-500 text-white rounded-full text-[8px]">{pendingRequests.length}</span>}
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
                                    className="apple-input pl-10 h-10 rounded-full"
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

                                            <button
                                                onClick={() => {
                                                    setSelectedTournament(t)
                                                    setIsDetailsModalOpen(true)
                                                }}
                                                className="w-full py-3.5 md:py-4 rounded-2xl bg-white/5 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-foreground hover:bg-primary hover:text-white border border-white/10 transition-all flex items-center justify-center gap-3 group/btn shadow-lg"
                                            >
                                                Ver Detalles
                                                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                ) : activeTab === 'requests' ? (
                    /* TOURNAMENT REQUESTS */
                    <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base md:text-lg font-black text-foreground uppercase tracking-tight">Solicitudes Pendientes</h3>
                                <p className="text-[9px] md:text-xs text-[#5c5c5e] font-bold uppercase tracking-tight">Propuestas de torneos creadas por usuarios</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar pr-1 md:pr-2 pb-10">
                            {pendingRequests.length === 0 ? (
                                <div className="apple-card flex flex-col items-center justify-center py-20 text-center border-dashed border-white/10">
                                    <div className="p-4 rounded-full bg-white/5 mb-4">
                                        <CheckCircle className="w-8 h-8 text-[#5c5c5e]" />
                                    </div>
                                    <h4 className="text-lg font-black text-foreground uppercase tracking-tight mb-2">No hay solicitudes pendientes</h4>
                                    <p className="text-xs text-[#5c5c5e] font-bold uppercase tracking-widest">Buen trabajo! Todas las propuestas han sido revisadas.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {pendingRequests.map((request) => (
                                        <div key={request.id} className="apple-card p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between group hover:border-primary/30 transition-all">
                                            <div className="flex-1 flex gap-4 min-w-0">
                                                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                                    {request.creator_avatar_url ? (
                                                        <img src={request.creator_avatar_url} alt="" className="w-full h-full rounded-xl object-cover" />
                                                    ) : (
                                                        <User className="w-5 h-5 text-primary" />
                                                    )}
                                                </div>
                                                <div
                                                    className="min-w-0 cursor-pointer"
                                                    onClick={() => {
                                                        setSelectedTournament(request)
                                                        setIsDetailsModalOpen(true)
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="text-base font-black text-foreground uppercase tracking-tighter truncate">{request.name}</h4>
                                                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[8px] font-black text-[#86868b] uppercase tracking-widest">PROPUESTA</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                                                        <div className="flex items-center gap-1.5 text-[9px] text-[#5c5c5e] font-bold uppercase tracking-widest">
                                                            <Calendar className="w-3 h-3 text-primary/50" /> {formatDate(request.date)}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[9px] text-[#5c5c5e] font-bold uppercase tracking-widest">
                                                            <MapPin className="w-3 h-3 text-primary/50" /> {request.club}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[9px] text-[#5c5c5e] font-bold uppercase tracking-widest">
                                                            <User className="w-3 h-3 text-primary/50" /> {request.creator_full_name || 'Usuario desconocido'}
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-[#86868b] line-clamp-2 leading-relaxed">
                                                        {request.description || 'Sin descripción proporcionada.'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 w-full md:w-auto shrink-0">
                                                <button
                                                    onClick={() => handleUpdateStatus(request.id, 'rejected')}
                                                    disabled={actionLoading === request.id}
                                                    className={`flex-1 md:flex-none h-11 px-6 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 group/btn ${actionLoading === request.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {actionLoading === request.id ? (
                                                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <XCircle className="w-4 h-4" />
                                                    )}
                                                    Rechazar
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(request.id, 'approved')}
                                                    disabled={actionLoading === request.id}
                                                    className={`flex-1 md:flex-none h-11 px-6 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group/btn ${actionLoading === request.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {actionLoading === request.id ? (
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <CheckCircle className="w-4 h-4" />
                                                    )}
                                                    Aceptar Propuesta
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* FINANCE DASHBOARD - PREMIUM VERSION */
                    <div className="flex-1 flex flex-col gap-6 overflow-hidden overflow-y-auto no-scrollbar pb-10">

                        {/* SELECTOR DE TORNEO PARA FINANZAS */}
                        <div className="flex items-center justify-between shrink-0 mb-2">
                            <div className="flex gap-1 bg-black/5 p-1 rounded-xl border border-black/5">
                                <button
                                    onClick={() => setSelectedFinanceTournament('Global')}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${selectedFinanceTournament === 'Global' ? 'bg-primary text-white' : 'text-[#86868b] hover:text-foreground'}`}
                                >
                                    Global
                                </button>
                                {tournaments.slice(0, 3).map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelectedFinanceTournament(t.id)}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all truncate max-w-[120px] ${selectedFinanceTournament === t.id ? 'bg-primary text-white' : 'text-[#86868b] hover:text-foreground'}`}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] font-black text-[#5c5c5e] uppercase tracking-widest hidden sm:block">Filtro de Análisis Financiero</p>
                        </div>

                        {/* STATS HIGHLIGHTS */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 shrink-0">
                            <div className="apple-card p-4 flex flex-col justify-between border-l-4 border-l-primary relative overflow-hidden group">
                                <div className="absolute top-[-10px] right-[-10px] opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                                    <DollarSign size={80} />
                                </div>
                                <p className="text-[10px] font-black text-[#86868b] uppercase tracking-widest mb-2">Ingresos Totales</p>
                                <div>
                                    <h3 className="text-2xl md:text-3xl font-black text-foreground">${currentRevenue.toLocaleString()}</h3>
                                    <div className="flex items-center gap-1.5 mt-1.5 text-primary">
                                        <TrendingUp className="w-3 h-3" />
                                        <span className="text-[10px] font-bold uppercase tracking-tight">Confirmado</span>
                                    </div>
                                </div>
                            </div>

                            <div className="apple-card p-4 flex flex-col justify-between border-white/10 relative overflow-hidden group">
                                <div className="absolute top-[-10px] right-[-10px] opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                                    <TrendingDown size={80} />
                                </div>
                                <p className="text-[10px] font-black text-[#86868b] uppercase tracking-widest mb-2">Gastos Operativos</p>
                                <div>
                                    <h3 className="text-2xl md:text-3xl font-black text-foreground">${metrics?.totalCosts.toLocaleString()}</h3>
                                    <div className="flex items-center gap-1.5 mt-1.5 text-red-500">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        <span className="text-[10px] font-bold uppercase tracking-tight flex items-center gap-1">Proyectado {(metrics as any)?.balance < 0 ? 'Déficit' : 'Controlado'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="apple-card p-4 flex flex-col justify-between border-white/10 relative overflow-hidden group">
                                <div className="absolute top-[-10px] right-[-10px] opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                                    <Target size={80} />
                                </div>
                                <p className="text-[10px] font-black text-[#86868b] uppercase tracking-widest mb-2">Potencial Total</p>
                                <div>
                                    <h3 className="text-2xl md:text-3xl font-black text-foreground">${totalPotentialRevenue.toLocaleString()}</h3>
                                    <div className="flex items-center gap-1.5 mt-1.5 text-[#5c5c5e]">
                                        <span className="text-[10px] font-bold uppercase tracking-tight">Capacidad Máxima</span>
                                    </div>
                                </div>
                            </div>

                            <div className="apple-card p-4 flex flex-col justify-between border-white/10 relative overflow-hidden group">
                                <div className="absolute top-[-10px] right-[-10px] opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                                    <Users size={80} />
                                </div>
                                <p className="text-[10px] font-black text-[#86868b] uppercase tracking-widest mb-2">Jugadores Activos</p>
                                <div>
                                    <h3 className="text-2xl md:text-3xl font-black text-foreground">{totalParticipants + (metrics?.totalGuests || 0)}</h3>
                                    <div className="flex items-center gap-1.5 mt-1.5 text-[#5c5c5e]">
                                        <span className="text-[10px] font-bold uppercase tracking-tight">{totalParticipants} Pago + {(metrics as any).guests || (metrics as any).totalGuests} Invitados</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* MAIN FINANCIAL CHART */}
                            <div className="lg:col-span-2 apple-card p-4 flex flex-col min-h-[320px]">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-base font-black text-foreground uppercase tracking-tight">{chartTitle}</h3>
                                        <p className="text-[10px] text-[#5c5c5e] font-bold uppercase tracking-widest">{chartSubtitle}</p>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">Live Updates</span>
                                    </div>
                                </div>

                                <div className="flex-1 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={tourneyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8cf902" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#8cf902" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#86868b', fontSize: 9, fontWeight: 900 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#86868b', fontSize: 9, fontWeight: 900 }}
                                                tickFormatter={(value) => `$${value / 1000}k`}
                                                domain={[0, maxTourneyRev * 1.1]}
                                            />
                                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />

                                            {/* ÁREA DE GASTOS/META (AZUL) */}
                                            <Area
                                                type="monotone"
                                                dataKey="target"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                strokeDasharray="5 5"
                                                fillOpacity={1}
                                                fill="url(#colorTarget)"
                                                animationDuration={1500}
                                                dot={false}
                                                activeDot={{ r: 4, fill: '#3b82f6' }}
                                            />

                                            {/* ÁREA DE INGRESOS (VERDE) */}
                                            <Area
                                                type="monotone"
                                                dataKey="revenue"
                                                stroke="#8cf902"
                                                strokeWidth={4}
                                                fillOpacity={1}
                                                fill="url(#colorRevenue)"
                                                animationDuration={1500}
                                                dot={<CustomDot />}
                                                activeDot={{ r: 6, strokeWidth: 0, fill: '#8cf902' }}
                                            />

                                            {selectedFinanceTournament !== 'Global' && metrics?.totalCosts && (
                                                <ReferenceLine
                                                    y={metrics.totalCosts}
                                                    stroke="#3b82f6"
                                                    strokeDasharray="3 3"
                                                    label={{ position: 'right', value: 'Umbral Costos', fill: '#3b82f6', fontSize: 8, fontWeight: 900 }}
                                                />
                                            )}
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* ACCOUNTING SUMMARY (AS REQUESTED) */}
                            <div className="flex flex-col gap-4">
                                <div className="apple-card p-4 flex flex-col border-white/10 shadow-xl relative overflow-hidden bg-linear-to-br from-white/5 to-transparent">
                                    <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                                        <Receipt className="w-4 h-4 text-primary" />
                                        <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Resumen Contable</h3>
                                    </div>

                                    {/* Stats Grid from Image */}
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        <div className="flex-1 apple-card p-3 flex flex-col items-center justify-center border border-white/5">
                                            <p className="text-[14px] font-black text-white">{metrics?.participants || 0}</p>
                                            <p className="text-[8px] font-black text-[#86868b] uppercase tracking-widest mt-1">Total Jug.</p>
                                        </div>
                                        <div className="flex-1 apple-card p-3 flex flex-col items-center justify-center border border-white/5">
                                            <p className="text-[14px] font-black text-primary/80">{metrics?.paid || 0}</p>
                                            <p className="text-[8px] font-black text-[#5c5c5e] uppercase tracking-widest mt-1">Pagados</p>
                                        </div>
                                        <div className="flex-1 apple-card p-3 flex flex-col items-center justify-center border border-white/5">
                                            <p className="text-[14px] font-black text-orange-500">{metrics?.guests || 0}</p>
                                            <p className="text-[8px] font-black text-[#5c5c5e] uppercase tracking-widest mt-1">Invitados</p>
                                        </div>
                                    </div>

                                    {/* Progress Bars (Pagos Recibidos) */}
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-tight mb-1">
                                                <span className="text-[#86868b]">Pagos Recibidos:</span>
                                                <span className="text-foreground">{(metrics as any).participants} / {(metrics as any).limit}</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden border border-white/5 p-[1px]">
                                                <div
                                                    className="h-full bg-linear-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-1000"
                                                    style={{ width: `${Math.round((((metrics as any).participants || 0) / ((metrics as any).limit || 1)) * 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        {selectedFinanceTournament !== 'Global' && (
                                            <div>
                                                <div className="flex justify-between text-[9px] font-black uppercase tracking-tight mb-1">
                                                    <span className="text-[#86868b]">Punto de Equilibrio:</span>
                                                    <span className="text-foreground">{(metrics as any).participants} / {(metrics as any).breakEvenCount}</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden border border-white/5 p-[1px]">
                                                    <div
                                                        className="h-full bg-linear-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000"
                                                        style={{ width: `${Math.min(Math.round(((metrics as any).participants) / ((metrics as any).breakEvenCount || 1) * 100), 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className={`p-3 rounded-xl border transition-all ${(metrics as any).balance >= 0 ? 'bg-primary/5 border-primary/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                            <div className="flex justify-between items-center">
                                                <p className="text-[9px] font-black text-[#86868b] uppercase tracking-widest">Balance:</p>
                                                <p className={`text-lg font-black ${(metrics as any).balance >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                                    ${(metrics as any).balance.toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="apple-card p-3 flex items-center justify-between border-white/10 shadow-sm bg-linear-to-r from-primary/10 via-transparent to-transparent">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                                            <Wallet className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-bold text-[#86868b] uppercase tracking-widest leading-none mb-0.5">Costo Total Estimado</p>
                                            <h4 className="text-base font-black text-foreground leading-tight">${metrics?.totalCosts.toLocaleString()}</h4>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-[#5c5c5e]" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* DETAILS MODAL */}
            {isDetailsModalOpen && selectedTournament && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsDetailsModalOpen(false)} />
                    <div className="apple-card w-full max-w-2xl max-h-[90vh] border-white/10 p-0 relative overflow-hidden shadow-2xl flex flex-col z-50">
                        {/* Modal Header Image */}
                        <div className="h-48 w-full relative shrink-0">
                            {selectedTournament?.image_url ? (
                                <img src={selectedTournament.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-linear-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                                    <Trophy className="w-16 h-16 text-primary" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent" />
                            <button
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all backdrop-blur-sm"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                            <div className="absolute bottom-6 left-8 right-8">
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border mb-2 w-fit tracking-widest inline-block ${selectedTournament?.approval_status === 'pending'
                                    ? 'bg-amber-500/20 text-amber-500 border-amber-500/20'
                                    : 'bg-primary/20 text-primary border-primary/20'
                                    }`}>
                                    {selectedTournament?.status || (selectedTournament?.approval_status === 'pending' ? 'PROPUESTA' : 'ACTIVO')}
                                </span>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{selectedTournament?.name}</h3>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-[10px] font-black text-[#86868b] uppercase tracking-widest mb-3">Descripción General</h4>
                                        <p className="text-xs text-[#5c5c5e] font-medium leading-relaxed">
                                            {selectedTournament?.description || 'Sin descripción proporcionada.'}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <p className="text-[8px] font-black text-[#86868b] uppercase tracking-widest mb-1">Fecha</p>
                                            <p className="text-xs font-black text-foreground uppercase truncate tracking-tighter">{formatDate(selectedTournament.date)}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <p className="text-[8px] font-black text-[#86868b] uppercase tracking-widest mb-1">Costo</p>
                                            <p className="text-xs font-black text-primary uppercase truncate tracking-tighter">${Number(selectedTournament.price).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                        <p className="text-[8px] font-black text-[#86868b] uppercase tracking-widest mb-2">Ubicación</p>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-3.5 h-3.5 text-primary" />
                                            <p className="text-xs font-black text-foreground uppercase tracking-tighter truncate">{selectedTournament.club}</p>
                                        </div>
                                        <p className="text-[10px] text-[#86868b] font-bold mt-1 ml-5">{selectedTournament.address || 'Ubicación no especificada'}</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-[10px] font-black text-[#86868b] uppercase tracking-widest mb-3">Detalles de Participación</h4>
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-black text-foreground uppercase tracking-tight">Cupo de Jugadores</span>
                                                <span className="text-[10px] font-black text-primary uppercase">{selectedTournament?.current_participants}/{selectedTournament?.participants_limit}</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden mb-4">
                                                <div className="h-full bg-primary" style={{ width: `${((selectedTournament?.current_participants || 0) / (selectedTournament?.participants_limit || 1)) * 100}%` }} />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Users className="w-3.5 h-3.5 text-[#5c5c5e]" />
                                                <span className="text-[10px] font-bold text-[#5c5c5e] uppercase tracking-widest">Modo de Juego: {selectedTournament?.game_mode || 'Stroke Play'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-[10px] font-black text-[#86868b] uppercase tracking-widest mb-3">Información del Organizador</h4>
                                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                                {selectedTournament?.creator_avatar_url ? (
                                                    <img src={selectedTournament.creator_avatar_url} alt="" className="w-full h-full rounded-xl object-cover" />
                                                ) : (
                                                    <User className="w-5 h-5 text-primary" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-foreground uppercase tracking-tight leading-none">{selectedTournament?.creator_full_name || 'Organizador'}</p>
                                                <p className="text-[9px] text-[#86868b] font-bold uppercase tracking-widest mt-1">Organizador Autorizado</p>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedTournament?.budget_per_player || selectedTournament?.budget_prizes ? (
                                        <div>
                                            <h4 className="text-[10px] font-black text-[#86868b] uppercase tracking-widest mb-3">Presupuesto Estimado</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest p-2 border-b border-white/5">
                                                    <span className="text-[#5c5c5e]">Por Jugador</span>
                                                    <span className="text-foreground">${Number(selectedTournament?.budget_per_player || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest p-2 border-b border-white/5">
                                                    <span className="text-[#5c5c5e]">Premios</span>
                                                    <span className="text-foreground">${Number(selectedTournament?.budget_prizes || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest p-2">
                                                    <span className="text-[#5c5c5e]">Operacional</span>
                                                    <span className="text-foreground">${Number(selectedTournament?.budget_operational || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        {selectedTournament?.approval_status === 'pending' && (
                            <div className="p-6 bg-black/20 border-t border-white/10 flex gap-4 shrink-0">
                                <button
                                    disabled={actionLoading === selectedTournament.id}
                                    onClick={() => handleUpdateStatus(selectedTournament!.id, 'rejected')}
                                    className="flex-1 h-12 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-[11px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 group/btn"
                                >
                                    Rechazar Propuesta
                                </button>
                                <button
                                    disabled={actionLoading === selectedTournament.id}
                                    onClick={() => handleUpdateStatus(selectedTournament!.id, 'approved')}
                                    className="flex-1 h-12 rounded-xl bg-primary text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group/btn"
                                >
                                    Aprobar y Publicar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

