'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    ChevronLeft, Calendar, Clock, User,
    ArrowLeft, MapPin, Star, Users, ArrowRight,
    CheckCircle2, AlertCircle, Save, Trash2,
    Settings, Activity, Info, DollarSign,
    Plus, X, List, LayoutGrid, TrendingUp, Search,
    TrendingDown, Target, Receipt, Trophy,
    Mail, Phone, Award, FileSpreadsheet, FileText,
    Check, Play, HelpCircle
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

interface Registration {
    id: string
    player_name: string
    player_email: string
    player_phone: string
    player_federation_code: string
    player_handicap: number
    player_document: string
    player_birthdate: string | null
    player_nationality: string | null
    registration_status: string
    payment_date: string | null
    created_at: string
    // Contabilidad / Mercado Pago
    selected_package: string | null
    package_price: number | null
    payment_currency: string | null
    mp_status: string | null
    mp_status_detail: string | null
    mp_amount: number | null
    mp_payment_id: string | null
    mp_reference: string | null
}

interface Tournament {
    id: string
    name: string
    description: string
    date: string
    club: string
    price: number
    participants_limit: number
    current_participants: number
    status: string
    image_url: string
    game_mode: string
    address: string
    budget_per_player: number
    budget_prizes: number
    budget_operational: number
    approval_status: 'pending' | 'approved' | 'rejected'
    rules: string[]
    custom_rules: string
    sponsors: string
    prizes: string
    guests: string
    notes: string
    payment_method: string
    payment_phone: string
    payment_key: string
    slug: string
    event_type: 'torneo' | 'viaje'
    packages: { id: string; name: string; price: number; currency: string }[]
}

interface FinanceItem {
    id: string
    label: string
    amount: number
    category: 'income' | 'expense'
    amount_type: 'fixed' | 'per_player'
    description: string
}

export default function TournamentDashboardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const supabase = createClient()

    // Main States
    const [tournament, setTournament] = useState<Tournament | null>(null)
    const [registrations, setRegistrations] = useState<Registration[]>([])
    const [finances, setFinances] = useState<FinanceItem[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'dashboard' | 'players' | 'settings'>('dashboard')

    // Filter & Search states for players tab
    const [playerSearch, setPlayerSearch] = useState('')
    const [playerFilter, setPlayerFilter] = useState<'all' | 'paid' | 'pending' | 'rejected' | 'guests'>('all')

    // Modal States
    const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false)
    const [newGuestName, setNewGuestName] = useState('')
    const [newPlayer, setNewPlayer] = useState({
        player_name: '',
        player_email: '',
        player_phone: '',
        player_federation_code: '',
        player_handicap: '',
        registration_status: 'registered'
    })

    // Edit settings form state
    const [editForm, setEditForm] = useState<Partial<Tournament>>({})

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            // 1. Fetch Tournament
            const { data: tourney, error: tErr } = await supabase
                .from('tournaments')
                .select('*')
                .eq('id', id)
                .single()

            if (tErr || !tourney) {
                console.error("Tournament not found", tErr)
                setTournament(null)
                setLoading(false)
                return
            }

            setTournament(tourney)
            setEditForm(tourney)

            // 2. Fetch Registrations
            const { data: regs } = await supabase
                .from('tournament_registrations')
                .select('*')
                .eq('tournament_id', id)
                .order('created_at', { ascending: false })

            if (regs) {
                setRegistrations(regs.map((r: any) => ({
                    id: r.id,
                    player_name: r.player_name || 'Desconocido',
                    player_email: r.player_email || 'Sin email',
                    player_phone: r.player_phone || 'Sin teléfono',
                    player_federation_code: r.player_federation_code || '',
                    player_handicap: Number(r.player_handicap) || 0,
                    player_document: r.player_document || '',
                    player_birthdate: r.player_birthdate || null,
                    player_nationality: r.player_nationality || null,
                    registration_status: r.registration_status || 'registered',
                    payment_date: r.payment_date || null,
                    created_at: r.created_at,
                    selected_package: r.selected_package || null,
                    package_price: r.package_price != null ? Number(r.package_price) : null,
                    payment_currency: r.payment_currency || null,
                    mp_status: r.mp_status || null,
                    mp_status_detail: r.mp_status_detail || null,
                    mp_amount: r.mp_amount != null ? Number(r.mp_amount) : null,
                    mp_payment_id: r.mp_payment_id || null,
                    mp_reference: r.mp_reference || null,
                })))
            }

            // 3. Fetch Finances
            const { data: finData } = await supabase
                .from('tournament_finances')
                .select('*')
                .eq('tournament_id', id)

            if (finData) {
                setFinances(finData)
            }

        } catch (err) {
            console.error("Error loading tournament details", err)
        } finally {
            setLoading(false)
        }
    }, [id, supabase])

    useEffect(() => {
        fetchData()

        // Realtime updates
        const channel = supabase
            .channel(`tournament-dashboard-${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_registrations', filter: `tournament_id=eq.${id}` }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_finances', filter: `tournament_id=eq.${id}` }, () => fetchData())
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchData, id, supabase])

    // Guest lists
    const guestList = tournament?.guests
        ? tournament.guests.split('\n').map(g => g.trim()).filter(g => g.length > 0)
        : []

    // Tipo de evento
    const isViaje = tournament?.event_type === 'viaje'
    const tPackages = Array.isArray(tournament?.packages) ? tournament!.packages : []

    // Estados de pago
    const PAID_STATES = ['paid', 'Confirmado', 'completado', 'Completado']
    const REJECTED_STATES = ['Rechazado', 'rejected', 'cancelled', 'Cancelado']
    const isRegPaid = (r: Registration) => PAID_STATES.includes(r.registration_status)
    const isRegRejected = (r: Registration) => REJECTED_STATES.includes(r.registration_status) || r.mp_status === 'rejected' || r.mp_status === 'cancelled'
    const isRegPending = (r: Registration) => !isRegPaid(r) && !isRegRejected(r) && r.registration_status !== 'Invitado'

    // Helper counts
    const totalRegCount = registrations.length
    const paidRegCount = registrations.filter(isRegPaid).length
    const pendingRegCount = registrations.filter(isRegPending).length
    const rejectedRegCount = registrations.filter(isRegRejected).length
    const guestsCount = guestList.length
    const totalPlayersCount = paidRegCount + guestsCount // Paid players + Invited guests (actual fields/confirmed attendees)

    // Monto pagado real de una inscripción (COP)
    const regAmount = (r: Registration) => Number(r.mp_amount) || Number(r.package_price) || (Number(tournament?.price) || 0)

    // Financial Metrics
    const price = Number(tournament?.price) || 0
    const incomeFromRegistrations = isViaje
        ? registrations.filter(isRegPaid).reduce((acc, r) => acc + regAmount(r), 0)
        : paidRegCount * price

    // Parse extra income/expenses
    let otherIncome = 0
    let otherExpenses = 0
    finances.forEach(item => {
        const val = Number(item.amount) || 0
        if (item.category === 'income') {
            otherIncome += item.amount_type === 'per_player' ? val * paidRegCount : val
        } else {
            otherExpenses += item.amount_type === 'per_player' ? val * totalPlayersCount : val
        }
    })

    const baseExpenses = Number(tournament?.budget_prizes || 0) + Number(tournament?.budget_operational || 0)
    const totalRevenue = incomeFromRegistrations + otherIncome
    const totalCosts = baseExpenses + otherExpenses
    const netBalance = totalRevenue - totalCosts

    // Break even logic
    const breakEvenCount = price > 0 ? Math.ceil(totalCosts / price) : 0

    // ─── MODELO DE NEGOCIO: VIAJE ───────────────────────────────
    // Un viaje se rige por costo por viajero (hotel, comidas, golf, traslados,
    // kit) + costos fijos (acompañante, logística, imprevistos). No hay bolsa
    // de premios. La utilidad viene del margen por viajero.
    const fixedExpenseItems = finances
        .filter(i => i.category === 'expense' && i.amount_type === 'fixed')
        .reduce((a, i) => a + (Number(i.amount) || 0), 0)
    const perTravelerExpenseItems = finances
        .filter(i => i.category === 'expense' && i.amount_type === 'per_player')
        .reduce((a, i) => a + (Number(i.amount) || 0), 0)
    // budget_per_player = costo operativo APEG por persona; budget_operational = costos fijos del viaje
    const unitCost = Number(tournament?.budget_per_player || 0) + perTravelerExpenseItems
    const fixedTripCosts = Number(tournament?.budget_operational || 0) + fixedExpenseItems
    const avgPaidAmount = paidRegCount > 0 ? incomeFromRegistrations / paidRegCount : 0
    const marginPerTraveler = avgPaidAmount - unitCost
    const tripVariableCosts = unitCost * paidRegCount
    const tripTotalCosts = tripVariableCosts + fixedTripCosts
    const tripNet = incomeFromRegistrations + otherIncome - tripTotalCosts
    const tripBreakEven = marginPerTraveler > 0 ? Math.ceil(fixedTripCosts / marginPerTraveler) : 0
    const fmtM = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

    const renderTripFinance = () => (
        <>
            {/* Resumen económico del viaje */}
            <div className="apple-card p-6 border-white/5 bg-white/5 backdrop-blur-md flex flex-col justify-between lg:col-span-1 min-h-[300px]">
                <div>
                    <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                        <Receipt className="w-5 h-5 text-primary" />
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Economía del Viaje</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="space-y-1 pb-2">
                            <span className="text-[10px] text-[#86868b] font-black uppercase tracking-wider">Paquetes (por persona)</span>
                            {tPackages.length === 0 && <p className="text-xs text-white/40">Sin paquetes configurados</p>}
                            {tPackages.map((p, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <span className="text-[11px] text-white/70">{p.name}</span>
                                    <span className="text-xs font-black text-white">{(p.currency || 'USD').toUpperCase()} {Number(p.price).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center py-1 border-t border-white/5 pt-3">
                            <span className="text-[10px] text-[#86868b] font-black uppercase tracking-wider">Ingreso viajeros ({paidRegCount} pagados):</span>
                            <span className="text-sm font-black text-primary">+{fmtM(incomeFromRegistrations)} COP</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-t border-white/5 pt-3">
                            <span className="text-[10px] text-[#86868b] font-black uppercase tracking-wider">Otros ingresos:</span>
                            <span className="text-sm font-black text-primary">+{fmtM(otherIncome)} COP</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-t border-white/5 pt-3">
                            <span className="text-[10px] text-[#86868b] font-black uppercase tracking-wider">Costo por viajero ({fmtM(unitCost)}) × {paidRegCount}:</span>
                            <span className="text-sm font-black text-red-500">-{fmtM(tripVariableCosts)} COP</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-t border-white/5 pt-3">
                            <span className="text-[10px] text-[#86868b] font-black uppercase tracking-wider">Costos fijos del viaje:</span>
                            <span className="text-sm font-black text-red-500">-{fmtM(fixedTripCosts)} COP</span>
                        </div>
                    </div>
                </div>
                <div className={`p-4 rounded-xl border mt-6 ${tripNet >= 0 ? 'bg-primary/5 border-primary/20' : 'bg-red-500/5 border-red-500/20'}`}>
                    <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black text-[#86868b] uppercase tracking-widest">Utilidad Neta:</p>
                        <p className={`text-lg font-black ${tripNet >= 0 ? 'text-primary' : 'text-red-500'}`}>
                            {tripNet >= 0 ? '+' : ''}{fmtM(tripNet)} COP
                        </p>
                    </div>
                </div>
            </div>

            {/* Margen y punto de equilibrio del viaje */}
            <div className="apple-card p-6 border-white/5 bg-white/5 backdrop-blur-md lg:col-span-2 flex flex-col justify-between min-h-[300px]">
                <div>
                    <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-3">
                        <Target className="w-5 h-5 text-blue-400" />
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Rentabilidad del Viaje</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <p className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5">Precio promedio pagado</p>
                            <span className="text-2xl font-black text-white">{fmtM(avgPaidAmount)}</span>
                            <p className="text-[9px] text-[#86868b] uppercase mt-1">COP / viajero</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5">Margen por viajero</p>
                            <span className={`text-2xl font-black ${marginPerTraveler >= 0 ? 'text-primary' : 'text-red-500'}`}>{marginPerTraveler >= 0 ? '+' : ''}{fmtM(marginPerTraveler)}</span>
                            <p className="text-[9px] text-[#86868b] uppercase mt-1">precio − costo</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5">Punto de equilibrio</p>
                            <span className="text-2xl font-black text-white">{marginPerTraveler > 0 ? tripBreakEven : '—'}</span>
                            <p className="text-[9px] text-[#86868b] uppercase mt-1">viajeros para cubrir fijos</p>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-white/2 rounded-2xl border border-white/5">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-wider mb-2">
                            <span className="text-[#86868b]">Progreso ({paidRegCount} / {marginPerTraveler > 0 ? tripBreakEven : '?'} viajeros)</span>
                            <span className={tripNet >= 0 ? 'text-primary' : 'text-amber-400'}>
                                {marginPerTraveler > 0 ? `${Math.min(Math.round((paidRegCount / Math.max(tripBreakEven, 1)) * 100), 100)}%` : 'Define el costo por viajero'}
                            </span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full ${tripNet >= 0 ? 'bg-primary' : 'bg-amber-500'}`} style={{ width: `${marginPerTraveler > 0 ? Math.min((paidRegCount / Math.max(tripBreakEven, 1)) * 100, 100) : 0}%` }} />
                        </div>
                        <p className="text-[9px] font-bold text-[#86868b] uppercase tracking-widest mt-3">
                            {marginPerTraveler <= 0
                                ? 'Configura "Costo Op. por Jugador" y "Presupuesto Operativo" en Configuración para calcular la rentabilidad.'
                                : paidRegCount >= tripBreakEven
                                    ? `¡Cubierto! Cada viajero adicional deja ${fmtM(marginPerTraveler)} de utilidad.`
                                    : `Faltan ${tripBreakEven - paidRegCount} viajeros pagados para cubrir los costos fijos.`}
                        </p>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white/2 rounded-xl border border-white/5">
                        <p className="text-[8px] font-black text-[#86868b] uppercase tracking-widest">Pendientes de pago</p>
                        <p className="text-lg font-black text-amber-400">{pendingRegCount}</p>
                    </div>
                    <div className="p-3 bg-white/2 rounded-xl border border-white/5">
                        <p className="text-[8px] font-black text-[#86868b] uppercase tracking-widest">Pagos rechazados</p>
                        <p className="text-lg font-black text-red-400">{rejectedRegCount}</p>
                    </div>
                </div>
            </div>
        </>
    )

    // Handlers for Registration status
    const handleTogglePayment = async (regId: string, currentStatus: string) => {
        setActionLoading(regId)
        const isPaid = ['paid', 'Confirmado', 'completado', 'Completado'].includes(currentStatus)
        const newStatus = isPaid ? 'registered' : 'paid'

        const { error } = await supabase
            .from('tournament_registrations')
            .update({
                registration_status: newStatus,
                payment_date: newStatus === 'paid' ? new Date().toISOString() : null
            })
            .eq('id', regId)

        if (error) {
            alert('Error al actualizar el pago: ' + error.message)
        } else {
            fetchData()
        }
        setActionLoading(null)
    }

    const handleDeleteRegistration = async (regId: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este registro?')) return
        setActionLoading(regId)
        const { error } = await supabase
            .from('tournament_registrations')
            .delete()
            .eq('id', regId)

        if (error) {
            alert('Error al eliminar registro: ' + error.message)
        } else {
            fetchData()
        }
        setActionLoading(null)
    }

    const handleManualRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setActionLoading('register')

        const { error } = await supabase
            .from('tournament_registrations')
            .insert([{
                tournament_id: id,
                player_name: newPlayer.player_name,
                player_email: newPlayer.player_email || 'sin@correo.com',
                player_phone: newPlayer.player_phone || '',
                player_federation_code: newPlayer.player_federation_code || '',
                player_handicap: Number(newPlayer.player_handicap) || 0,
                registration_status: newPlayer.registration_status,
                payment_date: newPlayer.registration_status === 'paid' ? new Date().toISOString() : null
            }])

        if (error) {
            alert('Error al registrar jugador: ' + error.message)
        } else {
            setIsAddPlayerOpen(false)
            setNewPlayer({
                player_name: '',
                player_email: '',
                player_phone: '',
                player_federation_code: '',
                player_handicap: '',
                registration_status: 'registered'
            })
            fetchData()
        }
        setActionLoading(null)
    }

    // Guest handlers (newline separated string)
    const handleAddGuest = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newGuestName.trim() || !tournament) return
        setActionLoading('add_guest')

        const updatedGuestsList = [...guestList, newGuestName.trim()]
        const { error } = await supabase
            .from('tournaments')
            .update({ guests: updatedGuestsList.join('\n') })
            .eq('id', id)

        if (error) {
            alert('Error al añadir invitado: ' + error.message)
        } else {
            setNewGuestName('')
            fetchData()
        }
        setActionLoading(null)
    }

    const handleRemoveGuest = async (guestToRemove: string) => {
        if (!tournament) return
        setActionLoading('remove_guest')

        const updatedGuestsList = guestList.filter(g => g !== guestToRemove)
        const { error } = await supabase
            .from('tournaments')
            .update({ guests: updatedGuestsList.join('\n') })
            .eq('id', id)

        if (error) {
            alert('Error al quitar invitado: ' + error.message)
        } else {
            fetchData()
        }
        setActionLoading(null)
    }

    // Edit settings save
    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault()
        setActionLoading('save_settings')

        const { error } = await supabase
            .from('tournaments')
            .update({
                name: editForm.name,
                description: editForm.description,
                date: editForm.date,
                club: editForm.club,
                event_type: editForm.event_type === 'viaje' ? 'viaje' : 'torneo',
                price: editForm.event_type === 'viaje' ? 0 : (Number(editForm.price) || 0),
                packages: (editForm.event_type === 'viaje' ? (editForm.packages || []) : []) as any,
                participants_limit: Number(editForm.participants_limit) || 120,
                game_mode: editForm.game_mode,
                address: editForm.address,
                image_url: editForm.image_url,
                budget_per_player: Number(editForm.budget_per_player) || 0,
                budget_prizes: Number(editForm.budget_prizes) || 0,
                budget_operational: Number(editForm.budget_operational) || 0,
                status: editForm.status,
                custom_rules: editForm.custom_rules,
                sponsors: editForm.sponsors,
                prizes: editForm.prizes,
                notes: editForm.notes,
                payment_method: editForm.payment_method,
                payment_phone: editForm.payment_phone,
                payment_key: editForm.payment_key
            })
            .eq('id', id)

        if (error) {
            alert('Error al guardar configuración: ' + error.message)
        } else {
            alert('Configuración guardada exitosamente!')
            fetchData()
        }
        setActionLoading(null)
    }

    const handleUpdateApproval = async (newStatus: 'approved' | 'rejected') => {
        setActionLoading('approval_' + newStatus)
        const { error } = await supabase
            .from('tournaments')
            .update({
                approval_status: newStatus,
                ...(newStatus === 'approved' ? { status: 'Abierto' } : {})
            })
            .eq('id', id)

        if (error) {
            alert('Error al actualizar propuesta: ' + error.message)
        } else {
            fetchData()
        }
        setActionLoading(null)
    }

    // Report Downloads
    const downloadPDF = () => {
        const doc = new jsPDF()
        const brandDark = [6, 20, 13] as [number, number, number]
        const brandPrimary = [140, 249, 2] as [number, number, number]
        const textGray = [80, 80, 80] as [number, number, number]

        doc.setFillColor(...brandPrimary)
        doc.rect(0, 0, 210, 6, 'F')

        doc.setFont("helvetica", "bold")
        doc.setFontSize(22)
        doc.setTextColor(...brandDark)
        doc.text("REPORTE DE TORNEO", 14, 25)

        doc.setFontSize(10)
        doc.setTextColor(...textGray)
        doc.setFont("helvetica", "normal")
        doc.text(`Generado: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 200, 25, { align: 'right' })

        // General Info Box
        doc.setFillColor(248, 248, 248)
        doc.roundedRect(14, 35, 182, 35, 3, 3, 'F')

        doc.setFont("helvetica", "bold")
        doc.setFontSize(14)
        doc.setTextColor(0, 0, 0)
        doc.text(tournament?.name || "Torneo", 20, 45)

        doc.setFontSize(9)
        doc.setTextColor(...textGray)
        doc.setFont("helvetica", "normal")
        doc.text(`Sede: ${tournament?.club || '--'}`, 20, 52)
        doc.text(`Fecha: ${tournament?.date ? new Date(tournament.date).toLocaleDateString() : '--'}`, 20, 58)
        doc.text(`Modo: ${tournament?.game_mode || '--'}`, 20, 64)

        doc.text(`Inscritos (Pagados): ${paidRegCount} / ${tournament?.participants_limit}`, 120, 52)
        doc.text(`Inscritos (Pendientes): ${pendingRegCount}`, 120, 58)
        doc.text(`Invitados: ${guestsCount}`, 120, 64)

        // Player Table
        const tableColumn = ["NOMBRE", "EMAIL", "TELÉFONO", "CÓD. FED", "HCP", "ESTADO"]
        const tableRows = registrations.map(res => [
            res.player_name,
            res.player_email,
            res.player_phone,
            res.player_federation_code,
            res.player_handicap,
            ['paid', 'Confirmado', 'completado', 'Completado'].includes(res.registration_status) ? 'PAGADO' : 'PENDIENTE'
        ])

        // Append guests to the table too
        guestList.forEach(guest => {
            tableRows.push([guest, 'Invitado Directo', '--', '--', '--', 'INVITADO'])
        })

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 78,
            theme: 'plain',
            styles: { fontSize: 8, cellPadding: 3, textColor: [50, 50, 50], lineColor: [230, 230, 230], lineWidth: 0.1 },
            headStyles: { fillColor: brandDark, textColor: brandPrimary, fontStyle: 'bold', cellPadding: 3 },
            alternateRowStyles: { fillColor: [250, 252, 250] },
            didDrawPage: (data) => {
                const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
                doc.setFillColor(...brandDark)
                doc.rect(0, pageHeight - 10, 210, 10, 'F')
                doc.setFontSize(8)
                doc.setTextColor(255, 255, 255)
                doc.text(`Reporte Oficial de Jugadores - APEG ADMIN`, 105, pageHeight - 4, { align: 'center' })
            }
        })

        doc.save(`Reporte_Torneo_${tournament?.name.replace(/\s+/g, '_')}.pdf`)
    }

    const downloadExcel = () => {
        const wsData = [
            ...registrations.map(res => ({
                Nombre: res.player_name,
                Email: res.player_email,
                Telefono: res.player_phone,
                Federacion: res.player_federation_code,
                Handicap: res.player_handicap,
                Tipo: 'Inscrito',
                Estado: ['paid', 'Confirmado', 'completado', 'Completado'].includes(res.registration_status) ? 'Pagado' : 'Pendiente',
                FechaRegistro: new Date(res.created_at).toLocaleDateString()
            })),
            ...guestList.map(guest => ({
                Nombre: guest,
                Email: 'Invitado',
                Telefono: '--',
                Federacion: '--',
                Handicap: '--',
                Tipo: 'Invitado',
                Estado: 'Confirmado (Invitado)',
                FechaRegistro: '--'
            }))
        ]

        const ws = XLSX.utils.json_to_sheet(wsData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Participantes")
        XLSX.writeFile(wb, `Participantes_${tournament?.name.replace(/\s+/g, '_')}.xlsx`)
    }

    // Filter players list
    const filteredPlayers = registrations.filter(r => {
        const q = playerSearch.toLowerCase()
        const matchSearch =
            r.player_name.toLowerCase().includes(q) ||
            r.player_email.toLowerCase().includes(q) ||
            r.player_federation_code.toLowerCase().includes(q) ||
            (r.player_document || '').toLowerCase().includes(q) ||
            (r.player_phone || '').toLowerCase().includes(q)

        if (playerFilter === 'paid') return matchSearch && isRegPaid(r)
        if (playerFilter === 'pending') return matchSearch && isRegPending(r)
        if (playerFilter === 'rejected') return matchSearch && isRegRejected(r)
        if (playerFilter === 'guests') return false // Guests are separated
        return matchSearch
    })

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-primary animate-pulse" />
                    </div>
                </div>
            </div>
        )
    }

    if (!tournament) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-background text-white p-6">
                <div className="apple-card p-12 flex flex-col items-center text-center max-w-md border-white/5 bg-white/5 backdrop-blur-md">
                    <AlertCircle className="w-20 h-20 text-red-500/50 mb-6" />
                    <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Torneo no encontrado</h2>
                    <p className="text-[#86868b] font-bold mb-8 uppercase text-xs tracking-widest leading-relaxed">
                        Lo sentimos, no pudimos localizar la información de este torneo. Verifica el enlace o vuelve al panel general.
                    </p>
                    <Link href="/dashboard/tournaments" className="apple-button apple-button-primary w-full flex items-center justify-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Volver a Torneos
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background relative font-outfit">
            <div className="bg-mesh opacity-30 fixed inset-0 pointer-events-none" />

            {/* TOP BAR / HEADER */}
            <div className="px-4 md:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 border-b border-white/5 relative z-10 bg-background/50 backdrop-blur-xl">
                <div className="flex items-center gap-4 min-w-0">
                    <Link href="/dashboard/tournaments"
                        className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-[#86868b] hover:text-foreground shrink-0 border border-white/5"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tighter uppercase truncate max-w-[200px] sm:max-w-none">
                                {tournament.name}
                            </h1>
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-widest shrink-0
                                ${tournament.approval_status === 'pending'
                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                    : 'bg-primary/10 text-primary border-primary/20'
                                }`}
                            >
                                {tournament.approval_status === 'pending' ? 'Propuesta' : tournament.status || 'Abierto'}
                            </span>
                        </div>
                        <p className="text-xs text-[#86868b] font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-primary/60" /> {tournament.club}
                        </p>
                    </div>
                </div>

                {/* SEGMENTED CONTROL */}
                <div className="bg-black/20 p-1 rounded-xl flex text-xs font-semibold w-full sm:w-auto border border-white/5">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-all uppercase tracking-widest text-[9px] font-black
                            ${activeTab === 'dashboard' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-[#86868b] hover:text-foreground'}`}
                    >
                        Resumen
                    </button>
                    <button
                        onClick={() => setActiveTab('players')}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-all uppercase tracking-widest text-[9px] font-black
                            ${activeTab === 'players' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-[#86868b] hover:text-foreground'}`}
                    >
                        Jugadores
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-all uppercase tracking-widest text-[9px] font-black
                            ${activeTab === 'settings' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-[#86868b] hover:text-foreground'}`}
                    >
                        Configurar
                    </button>
                </div>
            </div>

            {/* PENDING APPROVAL WARNING */}
            {tournament.approval_status === 'pending' && (
                <div className="mx-4 md:mx-6 mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                        <div>
                            <p className="text-xs font-black text-white uppercase tracking-wider">Torneo en espera de aprobación</p>
                            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mt-0.5">Esta es una propuesta creada por un organizador. Debes aprobarla para hacerla pública.</p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => handleUpdateApproval('rejected')}
                            disabled={actionLoading === 'approval_rejected'}
                            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest border border-red-500/20"
                        >
                            Rechazar
                        </button>
                        <button
                            onClick={() => handleUpdateApproval('approved')}
                            disabled={actionLoading === 'approval_approved'}
                            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-primary text-white hover:scale-[1.02] active:scale-[0.98] transition-all text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                        >
                            Aprobar y Publicar
                        </button>
                    </div>
                </div>
            )}

            {/* WORKSPACE AREA */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pb-20 relative z-0">

                {/* TAB 1: DASHBOARD / OVERVIEW */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* KPI GRID */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* KPI 1: Total Players */}
                            <div className="apple-card p-5 border-white/5 bg-white/5 backdrop-blur-md flex flex-col justify-between group overflow-hidden relative min-h-[140px]">
                                <div className="absolute -top-4 -right-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                                    <Users size={90} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1">Capacidad Jugadores</p>
                                    <h3 className="text-3xl font-black text-white">{totalPlayersCount} <span className="text-xs text-[#86868b]">/ {tournament.participants_limit}</span></h3>
                                </div>
                                <div className="mt-3">
                                    <div className="flex justify-between text-[8px] font-black text-[#86868b] uppercase tracking-wider mb-1">
                                        <span>Ocupación</span>
                                        <span className="text-primary">{Math.round((totalPlayersCount / (tournament.participants_limit || 1)) * 100)}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary" style={{ width: `${Math.min((totalPlayersCount / (tournament.participants_limit || 1)) * 100, 100)}%` }} />
                                    </div>
                                </div>
                            </div>

                            {/* KPI 2: Paid Registrations */}
                            <div className="apple-card p-5 border-white/5 bg-white/5 backdrop-blur-md flex flex-col justify-between group overflow-hidden relative min-h-[140px]">
                                <div className="absolute -top-4 -right-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                                    <CheckCircle2 size={90} className="text-primary" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1">Inscritos Pagados</p>
                                    <h3 className="text-3xl font-black text-primary">{paidRegCount}</h3>
                                </div>
                                <div className="text-[9px] font-bold text-[#86868b] uppercase tracking-wider mt-3 flex items-center gap-1">
                                    <TrendingUp className="w-3.5 h-3.5 text-primary" /> Recaudación directa
                                </div>
                            </div>

                            {/* KPI 3: Pending Registrations */}
                            <div className="apple-card p-5 border-white/5 bg-white/5 backdrop-blur-md flex flex-col justify-between group overflow-hidden relative min-h-[140px]">
                                <div className="absolute -top-4 -right-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                                    <Clock size={90} className="text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1">Inscritos Pendientes</p>
                                    <h3 className="text-3xl font-black text-amber-500">{pendingRegCount}</h3>
                                </div>
                                <div className="text-[9px] font-bold text-[#86868b] uppercase tracking-wider mt-3">
                                    En proceso de validación
                                </div>
                            </div>

                            {/* KPI 4: Invitados (torneo) / Pagos rechazados (viaje) */}
                            <div className="apple-card p-5 border-white/5 bg-white/5 backdrop-blur-md flex flex-col justify-between group overflow-hidden relative min-h-[140px]">
                                <div className="absolute -top-4 -right-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                                    {isViaje ? <X size={90} className="text-red-500" /> : <Award size={90} className="text-blue-500" />}
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1">{isViaje ? 'Pagos Rechazados' : 'Invitados Directos'}</p>
                                    <h3 className={`text-3xl font-black ${isViaje ? 'text-red-400' : 'text-blue-400'}`}>{isViaje ? rejectedRegCount : guestsCount}</h3>
                                </div>
                                <div className="text-[9px] font-bold text-[#86868b] uppercase tracking-wider mt-3">
                                    {isViaje ? 'Requieren seguimiento' : 'Cupos especiales autorizados'}
                                </div>
                            </div>
                        </div>

                        {/* FINANCIAL DASHBOARD */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {isViaje ? renderTripFinance() : (<>
                            {/* Summary Card */}
                            <div className="apple-card p-6 border-white/5 bg-white/5 backdrop-blur-md flex flex-col justify-between lg:col-span-1 min-h-[300px]">
                                <div>
                                    <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                                        <Receipt className="w-5 h-5 text-primary" />
                                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Resumen Financiero</h3>
                                    </div>

                                    <div className="space-y-4">
                                        {isViaje ? (
                                            <div className="py-1 space-y-1">
                                                <span className="text-[10px] text-[#86868b] font-black uppercase tracking-wider">Paquetes:</span>
                                                {tPackages.length === 0 && <p className="text-xs text-white/50">Sin paquetes configurados</p>}
                                                {tPackages.map((p, i) => (
                                                    <div key={i} className="flex justify-between items-center">
                                                        <span className="text-[11px] text-white/70">{p.name}</span>
                                                        <span className="text-xs font-black text-white">
                                                            {(p.currency || 'USD').toUpperCase()} {Number(p.price).toLocaleString()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center py-1">
                                                <span className="text-[10px] text-[#86868b] font-black uppercase tracking-wider">Costo Inscripción:</span>
                                                <span className="text-sm font-black text-white">${price.toLocaleString()} COP</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center py-1 border-t border-white/5 pt-3">
                                            <span className="text-[10px] text-[#86868b] font-black uppercase tracking-wider">Ingreso Inscripciones:</span>
                                            <span className="text-sm font-black text-primary">+${incomeFromRegistrations.toLocaleString()} COP</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-t border-white/5 pt-3">
                                            <span className="text-[10px] text-[#86868b] font-black uppercase tracking-wider">Otros Ingresos (Patrocinios):</span>
                                            <span className="text-sm font-black text-primary">+${otherIncome.toLocaleString()} COP</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-t border-white/5 pt-3">
                                            <span className="text-[10px] text-[#86868b] font-black uppercase tracking-wider">Gastos Fijos/Base:</span>
                                            <span className="text-sm font-black text-red-500">-${baseExpenses.toLocaleString()} COP</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-t border-white/5 pt-3">
                                            <span className="text-[10px] text-[#86868b] font-black uppercase tracking-wider">Gastos Extra:</span>
                                            <span className="text-sm font-black text-red-500">-${otherExpenses.toLocaleString()} COP</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={`p-4 rounded-xl border mt-6 ${netBalance >= 0 ? 'bg-primary/5 border-primary/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] font-black text-[#86868b] uppercase tracking-widest">Balance Neto:</p>
                                        <p className={`text-lg font-black ${netBalance >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                            ${netBalance >= 0 ? '+' : ''}{netBalance.toLocaleString()} COP
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Operational Stats / Break Even */}
                            <div className="apple-card p-6 border-white/5 bg-white/5 backdrop-blur-md lg:col-span-2 flex flex-col justify-between min-h-[300px]">
                                <div>
                                    <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-3">
                                        <Target className="w-5 h-5 text-blue-400" />
                                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Punto de Equilibrio</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                        <div className="space-y-6 text-left">
                                            <div>
                                                <p className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5">
                                                    {isViaje ? 'Recaudado (viajeros pagados)' : 'Meta de Jugadores para Cubrir Gastos'}
                                                </p>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-3xl font-black text-white">
                                                        {isViaje ? `$${Math.round(incomeFromRegistrations).toLocaleString()}` : breakEvenCount}
                                                    </span>
                                                    <span className="text-xs font-bold text-[#86868b] uppercase">{isViaje ? `COP · ${paidRegCount} pagados` : 'Jugadores Pagados'}</span>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-2">Gastos Totales Presupuestados</p>
                                                <div className="flex items-center gap-2">
                                                    <TrendingDown className="w-4 h-4 text-red-500" />
                                                    <span className="text-xl font-black text-white">${totalCosts.toLocaleString()} COP</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Visualization / Progress radial mock */}
                                        <div className="flex flex-col items-center justify-center p-4 bg-white/2 rounded-2xl border border-white/5">
                                            <p className="text-[10px] font-black text-white uppercase tracking-wider mb-3">
                                                {isViaje ? 'Balance del Viaje' : 'Progreso de Sostenibilidad'}
                                            </p>
                                            {isViaje ? (
                                                <>
                                                    <div className={`text-4xl font-black mb-1 ${netBalance >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                                        {netBalance >= 0 ? '+' : ''}{Math.round(netBalance).toLocaleString()}
                                                    </div>
                                                    <p className="text-[8px] font-bold text-[#86868b] uppercase tracking-widest text-center mt-1">
                                                        {rejectedRegCount > 0 ? `${rejectedRegCount} pago(s) rechazado(s) · ` : ''}{pendingRegCount} pendiente(s)
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="text-4xl font-black text-primary mb-1">
                                                        {breakEvenCount > 0 ? Math.min(Math.round((paidRegCount / breakEvenCount) * 100), 100) : 100}%
                                                    </div>
                                                    <p className="text-[8px] font-bold text-[#86868b] uppercase tracking-widest text-center mt-1">
                                                        {paidRegCount >= breakEvenCount
                                                            ? "¡Superado! El torneo genera utilidades"
                                                            : `Faltan ${breakEvenCount - paidRegCount} jugadores pagados para cubrir gastos.`}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Budget progress bars */}
                                <div className="mt-8 space-y-4">
                                    <div>
                                        <div className="flex justify-between text-[9px] font-black uppercase tracking-wider mb-1.5">
                                            <span className="text-[#86868b]">Presupuesto Premios:</span>
                                            <span className="text-white">${(Number(tournament?.budget_prizes) || 0).toLocaleString()} COP</span>
                                        </div>
                                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-linear-to-r from-blue-500 to-blue-400" style={{ width: `${Number(tournament?.budget_prizes) > 0 ? 100 : 0}%` }} />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-[9px] font-black uppercase tracking-wider mb-1.5">
                                            <span className="text-[#86868b]">Presupuesto Operativo:</span>
                                            <span className="text-white">${(Number(tournament?.budget_operational) || 0).toLocaleString()} COP</span>
                                        </div>
                                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-linear-to-r from-amber-500 to-amber-400" style={{ width: `${Number(tournament?.budget_operational) > 0 ? 100 : 0}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            </>)}
                        </div>

                        {/* Extra general tournament guidelines read only info */}
                        <div className="apple-card p-6 border-white/5 bg-white/5 backdrop-blur-md grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-left">
                                <h4 className="text-[10px] font-black text-[#86868b] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <Trophy className="w-4 h-4 text-primary" /> Premios
                                </h4>
                                <p className="text-xs text-white/80 whitespace-pre-line leading-relaxed">
                                    {tournament.prizes || 'No se han configurado premios especiales.'}
                                </p>
                            </div>
                            <div className="text-left">
                                <h4 className="text-[10px] font-black text-[#86868b] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <Star className="w-4 h-4 text-primary" /> Patrocinadores
                                </h4>
                                <p className="text-xs text-white/80 whitespace-pre-line leading-relaxed">
                                    {tournament.sponsors || 'Sin patrocinadores añadidos.'}
                                </p>
                            </div>
                            <div className="text-left">
                                <h4 className="text-[10px] font-black text-[#86868b] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <Info className="w-4 h-4 text-primary" /> Reglas del Campo
                                </h4>
                                <p className="text-xs text-white/80 whitespace-pre-line leading-relaxed">
                                    {tournament.custom_rules || 'Se aplican las reglas oficiales de la federación.'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: PLAYERS & GUESTS MANAGEMENT */}
                {activeTab === 'players' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* SEARCH & FILTERS & DOWNLOADS */}
                        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shrink-0 bg-white/5 p-4 rounded-2xl border border-white/5">
                            {/* Search */}
                            <div className="relative group flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] group-focus-within:text-primary" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, email o federación..."
                                    className="apple-input pl-10 h-10 w-full"
                                    value={playerSearch}
                                    onChange={e => setPlayerSearch(e.target.value)}
                                />
                            </div>

                            {/* Filters */}
                            <div className="flex gap-1 bg-black/30 p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar shrink-0">
                                {(['all', 'paid', 'pending', 'rejected'] as const).map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setPlayerFilter(f)}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                                            ${playerFilter === f ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-[#86868b] hover:text-foreground'}`}
                                    >
                                        {f === 'all' ? `Todos (${totalRegCount})` : f === 'paid' ? `Pagados (${paidRegCount})` : f === 'pending' ? `Pendientes (${pendingRegCount})` : `Rechazados (${rejectedRegCount})`}
                                    </button>
                                ))}
                            </div>

                            {/* Actions / Downloads */}
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={downloadExcel}
                                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shrink-0"
                                >
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> <span>Excel</span>
                                </button>
                                <button
                                    onClick={downloadPDF}
                                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shrink-0"
                                >
                                    <FileText className="w-4 h-4 text-red-500" /> <span>PDF</span>
                                </button>
                                <button
                                    onClick={() => setIsAddPlayerOpen(true)}
                                    className="apple-button apple-button-primary apple-button-sm flex items-center justify-center gap-1.5 py-2! text-[9px] font-black"
                                >
                                    <Plus className="w-4 h-4 text-white" /> REGISTRAR JUGADOR
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                            {/* Main Registrations Table */}
                            <div className={`${isViaje ? 'xl:col-span-3' : 'xl:col-span-2'} apple-card overflow-hidden border-white/5 bg-white/5 backdrop-blur-md p-0`}>
                                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Lista de Jugadores Inscritos ({filteredPlayers.length})</h3>
                                    <span className="text-[10px] font-black text-primary uppercase">Directos de App / Web</span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-white/5 bg-white/2">
                                                <th className="p-4 text-[9px] font-black text-[#86868b] uppercase tracking-wider">Jugador</th>
                                                <th className="p-4 text-[9px] font-black text-[#86868b] uppercase tracking-wider">Contacto</th>
                                                <th className="p-4 text-[9px] font-black text-[#86868b] uppercase tracking-wider">Detalles</th>
                                                <th className="p-4 text-[9px] font-black text-[#86868b] uppercase tracking-wider">Estado Pago</th>
                                                <th className="p-4 text-[9px] font-black text-[#86868b] uppercase tracking-wider text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredPlayers.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="p-10 text-center text-xs text-[#86868b] font-bold uppercase tracking-widest">
                                                        No se encontraron jugadores que coincidan con la búsqueda.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredPlayers.map((player) => {
                                                    const isPaid = isRegPaid(player)
                                                    const isRejected = isRegRejected(player)
                                                    const amountCop = regAmount(player)
                                                    const fmtCop = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`
                                                    return (
                                                        <tr key={player.id} className="hover:bg-white/2 transition-colors align-top">
                                                            {/* Player name */}
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs uppercase shrink-0">
                                                                        {player.player_name.substring(0, 2)}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-black text-white uppercase tracking-tight">{player.player_name}</p>
                                                                        <p className="text-[8px] text-[#86868b] font-bold uppercase tracking-widest mt-0.5">
                                                                            Reg: {new Date(player.created_at).toLocaleDateString()}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* Contact */}
                                                            <td className="p-4">
                                                                <div className="space-y-1">
                                                                    <a href={`mailto:${player.player_email}`} className="flex items-center gap-1.5 text-[10px] text-white/80 hover:text-primary">
                                                                        <Mail className="w-3 h-3 text-primary/60 shrink-0" />
                                                                        <span className="truncate max-w-[170px]">{player.player_email}</span>
                                                                    </a>
                                                                    {player.player_phone && player.player_phone !== 'Sin teléfono' && (
                                                                        <a href={`tel:${player.player_phone}`} className="flex items-center gap-1.5 text-[10px] text-white/80 hover:text-primary">
                                                                            <Phone className="w-3 h-3 text-primary/60 shrink-0" />
                                                                            <span>{player.player_phone}</span>
                                                                        </a>
                                                                    )}
                                                                    {player.player_document && (
                                                                        <div className="flex items-center gap-1 text-[10px] text-white/60">
                                                                            <span className="text-[#86868b] font-bold">CC:</span>
                                                                            <span className="font-semibold">{player.player_document}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            {/* Details */}
                                                            <td className="p-4">
                                                                <div className="space-y-1 text-[10px]">
                                                                    {isViaje ? (
                                                                        <>
                                                                            {player.selected_package && (
                                                                                <div className="flex items-center gap-1 text-white/80">
                                                                                    <span className="text-[#86868b] font-bold">PLAN:</span>
                                                                                    <span className="font-semibold text-primary uppercase">{player.selected_package}</span>
                                                                                </div>
                                                                            )}
                                                                            {player.player_nationality && (
                                                                                <div className="flex items-center gap-1 text-white/70">
                                                                                    <span className="text-[#86868b] font-bold">NAC:</span>
                                                                                    <span className="font-semibold">{player.player_nationality}</span>
                                                                                </div>
                                                                            )}
                                                                            {player.player_birthdate && (
                                                                                <div className="flex items-center gap-1 text-white/70">
                                                                                    <span className="text-[#86868b] font-bold">NAC.:</span>
                                                                                    <span className="font-semibold">{new Date(player.player_birthdate).toLocaleDateString('es-CO', { timeZone: 'UTC' })}</span>
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <div className="flex items-center gap-1 text-white/80">
                                                                                <span className="text-[#86868b] font-bold">FED:</span>
                                                                                <span className="font-semibold uppercase">{player.player_federation_code || 'N/A'}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1 text-white/80">
                                                                                <span className="text-[#86868b] font-bold">HCP:</span>
                                                                                <span className="font-semibold text-primary">{player.player_handicap}</span>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            {/* Status payment */}
                                                            <td className="p-4">
                                                                <div className="space-y-1.5">
                                                                    <button
                                                                        onClick={() => handleTogglePayment(player.id, player.registration_status)}
                                                                        disabled={actionLoading === player.id}
                                                                        className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5
                                                                            ${isPaid
                                                                                ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                                                                                : isRejected
                                                                                    ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                                                                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
                                                                            }`}
                                                                    >
                                                                        {isPaid ? (<><Check className="w-3 h-3" /><span>Pagado</span></>)
                                                                            : isRejected ? (<><X className="w-3 h-3" /><span>Rechazado</span></>)
                                                                            : (<><Clock className="w-3 h-3" /><span>Pendiente</span></>)}
                                                                    </button>
                                                                    {(isViaje || player.mp_payment_id || player.package_price) && (
                                                                        <p className="text-[9px] font-bold text-white/70">{fmtCop(amountCop)} COP</p>
                                                                    )}
                                                                    {isRejected && player.mp_status_detail && (
                                                                        <p className="text-[8px] text-red-400/70 max-w-[140px]">{player.mp_status_detail}</p>
                                                                    )}
                                                                    {player.mp_payment_id && (
                                                                        <p className="text-[8px] text-[#86868b]">MP #{player.mp_payment_id}</p>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            {/* Actions */}
                                                            <td className="p-4 text-right">
                                                                <button
                                                                    onClick={() => handleDeleteRegistration(player.id)}
                                                                    disabled={actionLoading === player.id}
                                                                    className="p-2 rounded-lg hover:bg-red-500/10 text-[#86868b] hover:text-red-500 transition-all"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Guest / Invitados Card Manager — no aplica a viajes */}
                            {!isViaje && (
                            <div className="apple-card border-white/5 bg-white/5 backdrop-blur-md p-5 text-left space-y-6">
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Lista de Invitados ({guestsCount})</h3>
                                    <p className="text-[9px] text-[#86868b] font-bold uppercase tracking-widest mt-1">Jugadores especiales autorizados por el club</p>
                                </div>

                                {/* Form Add Guest */}
                                <form onSubmit={handleAddGuest} className="flex gap-2">
                                    <input
                                        required
                                        type="text"
                                        placeholder="Nombre completo..."
                                        className="apple-input h-10 flex-1 text-xs"
                                        value={newGuestName}
                                        onChange={e => setNewGuestName(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        disabled={actionLoading === 'add_guest'}
                                        className="h-10 px-4 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center shrink-0 shadow-lg shadow-primary/20"
                                    >
                                        Añadir
                                    </button>
                                </form>

                                {/* Guests Chips display */}
                                <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                                    {guestList.length === 0 ? (
                                        <div className="py-12 text-center opacity-30 border-2 border-dashed border-white/10 rounded-2xl">
                                            <Award className="w-10 h-10 mx-auto mb-2 text-[#86868b]" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground">No hay invitados en la lista</p>
                                        </div>
                                    ) : (
                                        guestList.map((guest, idx) => (
                                            <div key={`${guest}-${idx}`} className="p-3 rounded-xl bg-white/2 border border-white/5 flex items-center justify-between hover:border-white/10 transition-all">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-[9px] uppercase shrink-0">
                                                        {guest.substring(0, 2)}
                                                    </div>
                                                    <p className="text-xs font-black text-white uppercase tracking-tight truncate">{guest}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveGuest(guest)}
                                                    disabled={actionLoading === 'remove_guest'}
                                                    className="p-1 rounded-md hover:bg-red-500/10 text-[#86868b] hover:text-red-500 transition-all shrink-0"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 3: EDIT CONFIGURATION / SETTINGS */}
                {activeTab === 'settings' && (
                    <form onSubmit={handleSaveSettings} className="space-y-8 animate-fade-in max-w-4xl mx-auto text-left">
                        {/* 1. INFORMACIÓN GENERAL */}
                        <div className="apple-card p-6 border-white/5 bg-white/5 backdrop-blur-md space-y-6">
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Información General</h3>
                                <p className="text-[9px] text-[#86868b] font-bold uppercase tracking-widest mt-1">Configuración y textos visibles en la app móvil</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Nombre del Torneo</label>
                                    <input
                                        required
                                        type="text"
                                        className="apple-input w-full"
                                        value={editForm.name || ''}
                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Club / Sede</label>
                                    <input
                                        required
                                        type="text"
                                        className="apple-input w-full"
                                        value={editForm.club || ''}
                                        onChange={e => setEditForm({ ...editForm, club: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Fecha de Realización</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        className="apple-input w-full"
                                        value={editForm.date ? new Date(editForm.date).toISOString().slice(0, 16) : ''}
                                        onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Dirección del Club</label>
                                    <input
                                        required
                                        type="text"
                                        className="apple-input w-full"
                                        value={editForm.address || ''}
                                        onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Descripción General</label>
                                    <textarea
                                        rows={4}
                                        className="apple-input w-full py-3 resize-none"
                                        value={editForm.description || ''}
                                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">URL Imagen de Portada</label>
                                    <input
                                        type="text"
                                        className="apple-input w-full"
                                        value={editForm.image_url || ''}
                                        onChange={e => setEditForm({ ...editForm, image_url: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. COSTOS, CUPOS Y ESTADOS */}
                        <div className="apple-card p-6 border-white/5 bg-white/5 backdrop-blur-md space-y-6">
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Costos, Límites y Estados</h3>
                                <p className="text-[9px] text-[#86868b] font-bold uppercase tracking-widest mt-1">Control del registro y aforos</p>
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Tipo de Evento</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['torneo', 'viaje'] as const).map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setEditForm({ ...editForm, event_type: t })}
                                            className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all border
                                                ${(editForm.event_type || 'torneo') === t ? 'bg-primary text-white border-primary' : 'bg-white/5 text-[#86868b] border-white/10 hover:text-white'}`}
                                        >
                                            {t === 'torneo' ? 'Torneo (precio único)' : 'Viaje (por paquetes)'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {editForm.event_type === 'viaje' && (
                                <div className="rounded-xl border border-white/10 bg-white/2 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">Paquetes / Habitaciones</span>
                                        <button
                                            type="button"
                                            onClick={() => setEditForm({ ...editForm, packages: [...(editForm.packages || []), { id: Date.now().toString(), name: '', price: 0, currency: 'USD' }] })}
                                            className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[9px] font-black"
                                        >+ Agregar</button>
                                    </div>
                                    <p className="text-[9px] text-[#86868b] leading-relaxed">Los paquetes en USD se cobran en pesos (COP) a la TRM oficial del día de la inscripción.</p>
                                    {(editForm.packages || []).map((pkg, idx) => (
                                        <div key={pkg.id || idx} className="grid grid-cols-[1fr_90px_70px_28px] gap-2 items-center">
                                            <input
                                                type="text" placeholder="Nombre (ej: Habitación Doble)"
                                                className="apple-input w-full text-xs"
                                                value={pkg.name}
                                                onChange={e => { const n = [...(editForm.packages || [])]; n[idx] = { ...n[idx], name: e.target.value }; setEditForm({ ...editForm, packages: n }); }}
                                            />
                                            <input
                                                type="number" placeholder="Precio"
                                                className="apple-input w-full text-xs"
                                                value={pkg.price || ''}
                                                onChange={e => { const n = [...(editForm.packages || [])]; n[idx] = { ...n[idx], price: Number(e.target.value) }; setEditForm({ ...editForm, packages: n }); }}
                                            />
                                            <select
                                                className="apple-input w-full text-xs"
                                                value={pkg.currency || 'USD'}
                                                onChange={e => { const n = [...(editForm.packages || [])]; n[idx] = { ...n[idx], currency: e.target.value }; setEditForm({ ...editForm, packages: n }); }}
                                            >
                                                <option value="USD">USD</option>
                                                <option value="COP">COP</option>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => { const n = (editForm.packages || []).filter((_, i) => i !== idx); setEditForm({ ...editForm, packages: n }); }}
                                                className="p-1.5 rounded-lg text-[#86868b] hover:text-red-500 hover:bg-red-500/10"
                                            ><X className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                    {(editForm.packages || []).length === 0 && <p className="text-[10px] text-white/30 text-center py-1">Sin paquetes definidos</p>}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {editForm.event_type !== 'viaje' && (
                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Costo Inscripción ($)</label>
                                    <input
                                        type="number"
                                        className="apple-input w-full"
                                        value={editForm.price || 0}
                                        onChange={e => setEditForm({ ...editForm, price: Number(e.target.value) })}
                                    />
                                </div>
                                )}

                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Límite de Jugadores</label>
                                    <input
                                        required
                                        type="number"
                                        className="apple-input w-full"
                                        value={editForm.participants_limit || 0}
                                        onChange={e => setEditForm({ ...editForm, participants_limit: Number(e.target.value) })}
                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Estado Registro</label>
                                    <select
                                        className="apple-input w-full"
                                        value={editForm.status || 'Inscripciones Abiertas'}
                                        onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                    >
                                        <option value="Inscripciones Abiertas">Inscripciones Abiertas</option>
                                        <option value="Abierto">Abierto</option>
                                        <option value="En Curso">En Curso</option>
                                        <option value="Finalizado">Finalizado</option>
                                        <option value="Cancelado">Cancelado</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Modo de Juego</label>
                                    <select
                                        className="apple-input w-full"
                                        value={editForm.game_mode || 'Stroke Play'}
                                        onChange={e => setEditForm({ ...editForm, game_mode: e.target.value })}
                                    >
                                        <option value="Stroke Play">Stroke Play</option>
                                        <option value="Stableford">Stableford</option>
                                        <option value="Match Play">Match Play</option>
                                        <option value="Scramble">Scramble</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 3. PRESUPUESTO OPERATIVO INICIAL */}
                        <div className="apple-card p-6 border-white/5 bg-white/5 backdrop-blur-md space-y-6">
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Presupuesto Inicial Estimado</h3>
                                <p className="text-[9px] text-[#86868b] font-bold uppercase tracking-widest mt-1">Valores bases para el análisis financiero</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Presupuesto / Jugador ($)</label>
                                    <input
                                        type="number"
                                        className="apple-input w-full"
                                        value={editForm.budget_per_player || 0}
                                        onChange={e => setEditForm({ ...editForm, budget_per_player: Number(e.target.value) })}
                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Presupuesto Premios ($)</label>
                                    <input
                                        type="number"
                                        className="apple-input w-full"
                                        value={editForm.budget_prizes || 0}
                                        onChange={e => setEditForm({ ...editForm, budget_prizes: Number(e.target.value) })}
                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Presupuesto Operacional ($)</label>
                                    <input
                                        type="number"
                                        className="apple-input w-full"
                                        value={editForm.budget_operational || 0}
                                        onChange={e => setEditForm({ ...editForm, budget_operational: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 4. MEDIOS DE PAGO LOCALES */}
                        <div className="apple-card p-6 border-white/5 bg-white/5 backdrop-blur-md space-y-6">
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Instrucciones y Datos de Pago</h3>
                                <p className="text-[9px] text-[#86868b] font-bold uppercase tracking-widest mt-1">Configura cómo los jugadores pagan su inscripción</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Método de Pago</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. Nequi, Daviplata, Transfiya"
                                        className="apple-input w-full"
                                        value={editForm.payment_method || ''}
                                        onChange={e => setEditForm({ ...editForm, payment_method: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Celular / Cuenta</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. 312 456 7890"
                                        className="apple-input w-full"
                                        value={editForm.payment_phone || ''}
                                        onChange={e => setEditForm({ ...editForm, payment_phone: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Nombre Beneficiario / Llave</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. Edgar Barragan"
                                        className="apple-input w-full"
                                        value={editForm.payment_key || ''}
                                        onChange={e => setEditForm({ ...editForm, payment_key: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 5. TEXTOS Y DETALLES EXTRAS */}
                        <div className="apple-card p-6 border-white/5 bg-white/5 backdrop-blur-md space-y-6">
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Premios, Sponsors y Notas</h3>
                                <p className="text-[9px] text-[#86868b] font-bold uppercase tracking-widest mt-1">Información complementaria del evento</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Detalle de Premios</label>
                                    <textarea
                                        rows={3}
                                        className="apple-input w-full py-3 resize-none"
                                        placeholder="Ej. 1er puesto: Trofeo + Tulas..."
                                        value={editForm.prizes || ''}
                                        onChange={e => setEditForm({ ...editForm, prizes: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Patrocinadores / Sponsors</label>
                                    <textarea
                                        rows={3}
                                        className="apple-input w-full py-3 resize-none"
                                        placeholder="Ej. Adidas Golf, Garmin..."
                                        value={editForm.sponsors || ''}
                                        onChange={e => setEditForm({ ...editForm, sponsors: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Reglas y Términos Adicionales</label>
                                    <textarea
                                        rows={3}
                                        className="apple-input w-full py-3 resize-none"
                                        placeholder="Ej. Se requiere handicap oficial..."
                                        value={editForm.custom_rules || ''}
                                        onChange={e => setEditForm({ ...editForm, custom_rules: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Notas Internas</label>
                                    <textarea
                                        rows={3}
                                        className="apple-input w-full py-3 resize-none"
                                        placeholder="Solo visibles para administradores..."
                                        value={editForm.notes || ''}
                                        onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={actionLoading === 'save_settings'}
                                className="apple-button apple-button-primary flex items-center justify-center gap-2 px-8 py-3 text-xs font-black shadow-lg shadow-primary/20"
                            >
                                {actionLoading === 'save_settings' ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                GUARDAR CAMBIOS
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* MANUAL REGISTER PLAYER MODAL */}
            {isAddPlayerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsAddPlayerOpen(false)} />
                    <div className="apple-card w-full max-w-lg max-h-[90vh] border-white/10 p-0 relative overflow-hidden shadow-2xl flex flex-col z-50 animate-fade-up text-left bg-[#0c140d]">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-black/40">
                            <div>
                                <h3 className="text-base font-black text-white uppercase tracking-tighter">Registrar Jugador Manualmente</h3>
                                <p className="text-[9px] text-[#86868b] font-bold uppercase tracking-widest mt-1">Añade un jugador directamente a la base de datos</p>
                            </div>
                            <button onClick={() => setIsAddPlayerOpen(false)} className="p-2 rounded-full hover:bg-white/5 text-[#86868b] transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleManualRegister} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Nombre del Jugador</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Nombre completo..."
                                    className="apple-input w-full"
                                    value={newPlayer.player_name}
                                    onChange={e => setNewPlayer({ ...newPlayer, player_name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Email</label>
                                    <input
                                        type="email"
                                        placeholder="correo@ejemplo.com"
                                        className="apple-input w-full"
                                        value={newPlayer.player_email}
                                        onChange={e => setNewPlayer({ ...newPlayer, player_email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Teléfono</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. 312 000 0000"
                                        className="apple-input w-full"
                                        value={newPlayer.player_phone}
                                        onChange={e => setNewPlayer({ ...newPlayer, player_phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Código de Federación</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. 12345"
                                        className="apple-input w-full"
                                        value={newPlayer.player_federation_code}
                                        onChange={e => setNewPlayer({ ...newPlayer, player_federation_code: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Handicap</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="Ej. 12.5"
                                        className="apple-input w-full"
                                        value={newPlayer.player_handicap}
                                        onChange={e => setNewPlayer({ ...newPlayer, player_handicap: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-[#86868b] uppercase tracking-widest mb-1.5 block">Estado de Pago Inicial</label>
                                <select
                                    className="apple-input w-full"
                                    value={newPlayer.registration_status}
                                    onChange={e => setNewPlayer({ ...newPlayer, registration_status: e.target.value })}
                                >
                                    <option value="registered">Pendiente de Pago</option>
                                    <option value="paid">Confirmado / Pagado</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={actionLoading === 'register'}
                                className="w-full h-12 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group/btn mt-6"
                            >
                                {actionLoading === 'register' ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Plus className="w-4 h-4" />
                                )}
                                REGISTRAR Y CONFIRMAR JUGADOR
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
