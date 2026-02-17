'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    ChevronLeft, Calendar, Clock, User,
    ArrowLeft, MapPin, Star, Users, ArrowRight,
    CheckCircle2, AlertCircle, Save, Trash2,
    Settings, Activity, Info, Map as MapIcon,
    DollarSign, Ban, Plus, X, List, CalendarDays,
    LayoutGrid, History, ChevronRight, Flag
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

interface Reservation {
    id: string
    course_id?: string
    course_name: string
    reservation_date: string
    reservation_time: string
    status: string
    payment_status: string
    user_name: string
    user_email: string
}

interface BlockedDay {
    id: string
    blocked_date: string
    reason: string
}

interface PriceOverride {
    id: string
    start_date: string
    end_date: string
    price: number
    note: string
}

interface Course {
    id: string
    name: string
    location: string
    address: string
    price_weekday: number
    price_weekend: number
    holes: number
    status: string
    rating: number
    caddy_included: boolean
    description: string
    image_url: string
    source: string
}

export default function CourseManagementPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [course, setCourse] = useState<Course | null>(null)
    const [reservations, setReservations] = useState<Reservation[]>([])
    const [blockedDays, setBlockedDays] = useState<BlockedDay[]>([])
    const [overrides, setOverrides] = useState<PriceOverride[]>([])

    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'agenda' | 'prices' | 'blocks'>('agenda')
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDates, setSelectedDates] = useState<string[]>([
        `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
    ])
    const [lastClickedDate, setLastClickedDate] = useState<string | null>(null)

    // Form states
    const [isBlocking, setIsBlocking] = useState(false)
    const [isOverriding, setIsOverriding] = useState(false)

    const supabase = createClient()

    const fetchData = useCallback(async () => {
        setLoading(true)

        const { data: courseData } = await supabase
            .from('golf_courses')
            .select('*')
            .eq('id', id)
            .single()

        if (courseData) {
            setCourse(courseData)

            const [resRes, blockedRes, overridesRes] = await Promise.all([
                supabase
                    .from('reservations')
                    .select('*, profiles:user_id(full_name, email)')
                    .eq('course_id', id),
                supabase.from('course_blocked_days').select('*').eq('course_id', id),
                supabase.from('course_price_overrides').select('*').eq('course_id', id)
            ])

            if (resRes.data) {
                console.log('Reservations Found:', resRes.data)
                // Map the direct table data to our UI interface
                const mappedReservations: Reservation[] = resRes.data.map((r: any) => {
                    // Smart time extraction
                    let time = r.reservation_time || r.tee_time || r.time || ''
                    if (!time && r.reservation_date && r.reservation_date.includes('T')) {
                        time = new Date(r.reservation_date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
                    }

                    // Smart payment status from linked order if available
                    const realPaymentStatus = r.payment_status || 'pending'

                    return {
                        id: r.id,
                        course_id: r.course_id,
                        course_name: courseData.name,
                        reservation_date: r.reservation_date ? r.reservation_date.split('T')[0] : '',
                        reservation_time: time,
                        status: r.status || 'pending',
                        payment_status: realPaymentStatus,
                        user_name: r.profiles?.full_name || 'Usuario',
                        user_email: r.profiles?.email || 'Email no disponible'
                    }
                })
                setReservations(mappedReservations)
            }
            if (blockedRes.data) setBlockedDays(blockedRes.data)
            if (overridesRes.data) setOverrides(overridesRes.data)
        }

        setLoading(false)
    }, [id, supabase])

    const selectedReservations = reservations
        .filter(r => selectedDates.includes(r.reservation_date))
        .sort((a, b) => {
            const dateA = a.reservation_date || ''
            const dateB = b.reservation_date || ''
            if (dateA !== dateB) return dateA.localeCompare(dateB)

            const timeA = a.reservation_time || ''
            const timeB = b.reservation_time || ''
            return timeA.localeCompare(timeB)
        })

    useEffect(() => {
        fetchData()

        // 🟢 REAL-TIME SUBSCRIPTION
        const channel = supabase
            .channel(`course-management-${id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'golf_courses', filter: `id=eq.${id}` },
                () => fetchData()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'course_blocked_days', filter: `course_id=eq.${id}` },
                () => fetchData()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'course_price_overrides', filter: `course_id=eq.${id}` },
                () => fetchData()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'reservations', filter: `course_id=eq.${id}` },
                () => fetchData()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchData, id, supabase])

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(amount)
    }

    const handleBlockDay = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const reasonOption = formData.get('reason_option') as string
        const reasonCustom = formData.get('reason_custom') as string
        const reason = reasonOption === 'Otro' ? reasonCustom : reasonOption

        const startDate = formData.get('start_date') as string
        const endDate = formData.get('end_date') as string
        const startTime = formData.get('start_time') as string
        const endTime = formData.get('end_time') as string

        if (!startDate) return

        // Calculate dates to block
        const datesToBlock: string[] = []

        if (endDate && endDate >= startDate) {
            const start = new Date(startDate)
            const end = new Date(endDate)
            start.setMinutes(start.getMinutes() + start.getTimezoneOffset()) // Compensate TZ to keep local date
            end.setMinutes(end.getMinutes() + end.getTimezoneOffset())

            // Loop through dates
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                datesToBlock.push(d.toISOString().split('T')[0])
            }
        } else {
            datesToBlock.push(startDate)
        }

        const inserts = datesToBlock.map(date => ({
            course_id: id,
            blocked_date: date,
            reason,
            start_time: startTime || null,
            end_time: endTime || null
        }))

        const { error } = await supabase.from('course_blocked_days').insert(inserts)

        if (!error) {
            fetchData()
            setIsBlocking(false)
            setSelectedDates([])
        }
    }

    const handlePriceOverride = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const { error } = await supabase.from('course_price_overrides').insert([{
            course_id: id,
            start_date: formData.get('start_date'),
            end_date: formData.get('end_date'),
            price: Number(formData.get('price')?.toString().replace(/,/g, '')),
            note: formData.get('note')
        }])

        if (!error) {
            fetchData()
            setIsOverriding(false)
            setSelectedDates([])
        }
    }

    const handleDateClick = (dateStr: string, e: React.MouseEvent) => {
        if (e.shiftKey && lastClickedDate) {
            // Range selection
            const start = new Date(lastClickedDate < dateStr ? lastClickedDate : dateStr)
            const end = new Date(lastClickedDate < dateStr ? dateStr : lastClickedDate)
            const newRange: string[] = []

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                newRange.push(d.toISOString().split('T')[0])
            }

            setSelectedDates(prev => Array.from(new Set([...prev, ...newRange])))
        } else if (e.metaKey || e.ctrlKey) {
            // Toggle selection
            setSelectedDates(prev =>
                prev.includes(dateStr)
                    ? prev.filter(d => d !== dateStr)
                    : [...prev, dateStr]
            )
        } else {
            // Exclusive selection (View Info)
            setSelectedDates([dateStr])
        }
        setLastClickedDate(dateStr)
    }

    const clearSelection = () => {
        setSelectedDates([])
        setLastClickedDate(null)
    }

    const unblockDay = async (blockId: string) => {
        const { error } = await supabase.from('course_blocked_days').delete().eq('id', blockId)
        if (!error) fetchData()
    }

    const removeOverride = async (overrideId: string) => {
        const { error } = await supabase.from('course_price_overrides').delete().eq('id', overrideId)
        if (!error) fetchData()
    }

    const downloadPDF = async () => {
        const doc = new jsPDF()

        // Colors
        const brandDark = [6, 20, 13] as [number, number, number]
        const brandPrimary = [193, 255, 114] as [number, number, number]
        const textGray = [80, 80, 80] as [number, number, number]

        // 1. Top Bar
        doc.setFillColor(...brandPrimary)
        doc.rect(0, 0, 210, 6, 'F')

        // 2. Logo
        try {
            const response = await fetch('/images/logo.png')
            const blob = await response.blob()
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result as string)
                reader.readAsDataURL(blob)
            })
            if (base64) {
                doc.addImage(base64, 'PNG', 14, 15, 40, 40)
            }
        } catch (e) {
            console.error('Error loading logo', e)
        }

        // 3. Header Text (Right aligned)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(24)
        doc.setTextColor(...brandDark)
        doc.text("REPORTE DE OPERACIÓN", 200, 30, { align: 'right' })

        doc.setFontSize(10)
        doc.setTextColor(...textGray)
        doc.setFont("helvetica", "normal")
        doc.text(`Generado: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 200, 38, { align: 'right' })
        doc.text("APEG ADMIN PANEL", 200, 43, { align: 'right' })

        // 4. Report Metadata Box
        doc.setFillColor(248, 248, 248)
        doc.roundedRect(14, 60, 182, 25, 3, 3, 'F')

        doc.setFont("helvetica", "bold")
        doc.setFontSize(14)
        doc.setTextColor(0, 0, 0)
        doc.text(course?.name || "Campo Desconocido", 20, 70)

        doc.setFontSize(10)
        doc.setTextColor(...textGray)
        doc.setFont("helvetica", "normal")
        doc.text(`Ubicación: ${course?.location || '--'}`, 20, 77)

        // Metadata grid inside box
        doc.text("Fechas:", 120, 70)
        doc.setFont("helvetica", "bold")
        doc.text(selectedDates.length > 0 ? `${selectedDates[0]} ...` : 'Todas', 140, 70)

        doc.setFont("helvetica", "normal")
        doc.text("Reservas:", 120, 77)
        doc.setFont("helvetica", "bold")
        doc.text(selectedReservations.length.toString(), 140, 77)

        // 5. Data Table
        const tableColumn = ["HORA", "JUGADOR", "EMAIL", "ESTADO", "PAGO"]
        const tableRows = selectedReservations.map(res => [
            res.reservation_time.slice(0, 5), // HH:MM
            res.user_name,
            res.user_email,
            res.status === 'confirmed' ? 'CONFIRMADO' : res.status.toUpperCase(),
            res.payment_status === 'paid' ? 'PAGADO' : 'PENDIENTE'
        ])

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 95,
            theme: 'plain',
            styles: {
                fontSize: 9,
                cellPadding: 4,
                textColor: [50, 50, 50],
                lineColor: [230, 230, 230],
                lineWidth: 0.1,
            },
            headStyles: {
                fillColor: brandDark,
                textColor: brandPrimary,
                fontStyle: 'bold',
                halign: 'left',
                cellPadding: 4
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 20 },
                1: { fontStyle: 'bold' },
                3: { fontStyle: 'bold', fontSize: 8 },
                4: { fontStyle: 'bold', fontSize: 8 }
            },
            alternateRowStyles: {
                fillColor: [250, 252, 250]
            },
            didDrawPage: (data) => {
                // Footer bar
                const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
                doc.setFillColor(...brandDark)
                doc.rect(0, pageHeight - 10, 210, 10, 'F')

                doc.setFontSize(8)
                doc.setTextColor(255, 255, 255)
                doc.text(`Página ${data.pageNumber} - APEG Golf Management`, 105, pageHeight - 4, { align: 'center' })
            }
        })

        doc.save(`Reporte_APEG_${course?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
    }

    const downloadExcel = () => {
        const ws = XLSX.utils.json_to_sheet(selectedReservations.map(res => ({
            ID: res.id,
            Fecha: res.reservation_date,
            Hora: res.reservation_time,
            Jugador: res.user_name,
            Email: res.user_email,
            Estado: res.status,
            Pago: res.payment_status,
            Curso: res.course_name
        })))

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Reservas")
        XLSX.writeFile(wb, `APEG_Reservas_${course?.name}_${selectedDates[0]}.xlsx`)
    }

    if (loading) return (
        <div className="flex-1 flex items-center justify-center bg-background">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Flag className="w-6 h-6 text-primary animate-pulse" />
                </div>
            </div>
        </div>
    )

    if (!course) return (
        <div className="flex-1 flex flex-col items-center justify-center bg-background text-white p-6">
            <div className="glass-panel p-12 flex flex-col items-center text-center max-w-md">
                <AlertCircle className="w-20 h-20 text-red-500/50 mb-6" />
                <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Campo no encontrado</h2>
                <p className="text-gray-500 font-bold mb-8 uppercase text-xs tracking-widest leading-relaxed">Lo sentimos, no pudimos localizar la información de este club. Verifica el enlace o contacta a soporte.</p>
                <Link href="/dashboard/green-fees" className="btn-primary w-full flex items-center justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Volver a Green Fees
                </Link>
            </div>
        </div>
    )

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background relative">
            <div className="bg-mesh opacity-30 fixed inset-0 pointer-events-none" />

            {/* HEADER & SEGMENTED CONTROL */}
            <div className="px-4 md:px-6 py-4 md:py-5 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 z-10 relative">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <Link href="/dashboard/green-fees"
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-white/50 hover:text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight truncate max-w-[150px] sm:max-w-none">{course.name}</h1>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold border ${course.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                {course.status === 'active' ? 'Activo' : course.status.toUpperCase()}
                            </span>
                        </div>
                        <p className="text-xs md:text-sm text-gray-400 truncate">{course.location}</p>
                    </div>
                </div>

                {/* SEGMENTED CONTROL */}
                <div className="bg-[#2c2c2e] p-1 rounded-lg flex text-[10px] sm:text-xs font-medium w-full md:w-auto shadow-inner">
                    <button
                        onClick={() => setActiveTab('agenda')}
                        className={`flex-1 md:flex-none px-3 sm:px-4 py-1.5 rounded-md transition-all ${activeTab === 'agenda' ? 'bg-[#636366] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                        Agenda
                    </button>
                    <button
                        onClick={() => setActiveTab('prices')}
                        className={`flex-1 md:flex-none px-3 sm:px-4 py-1.5 rounded-md transition-all ${activeTab === 'prices' ? 'bg-[#636366] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                        Tarifas
                    </button>
                    <button
                        onClick={() => setActiveTab('blocks')}
                        className={`flex-1 md:flex-none px-3 sm:px-4 py-1.5 rounded-md transition-all ${activeTab === 'blocks' ? 'bg-[#636366] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                        Bloqueos
                    </button>
                </div>
            </div>

            {/* MAIN WORKSPACE Area */}
            <div className="flex-1 px-4 md:px-6 pb-6 flex flex-col lg:flex-row gap-4 md:gap-6 overflow-hidden overflow-y-auto lg:overflow-hidden relative z-0 custom-scrollbar">
                {/* DYNAMIC VIEW Area */}
                <div className="flex-1 animate-fade-in flex flex-col min-h-[500px] lg:min-h-0">
                    {activeTab === 'agenda' ? (
                        <div className="flex-1 apple-card p-4 md:p-5 flex flex-col overflow-hidden">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-6 shrink-0 gap-4">
                                <h3 className="text-base md:text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                                    Calendario Operativo
                                </h3>

                                <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full sm:w-auto">
                                    <div className="flex-1 sm:flex-none flex items-center gap-1 bg-[#2c2c2e] rounded-lg p-1 order-2 sm:order-1">
                                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-1 hover:bg-white/10 rounded-md transition-colors">
                                            <ChevronLeft className="w-4 h-4 text-gray-400" />
                                        </button>
                                        <span className="text-xs sm:text-sm font-medium text-white px-2 sm:px-3 min-w-[80px] sm:min-w-[100px] text-center capitalize">
                                            {new Intl.DateTimeFormat('es-MX', { month: 'short', year: 'numeric' }).format(currentDate)}
                                        </span>
                                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-1 hover:bg-white/10 rounded-md transition-colors">
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        </button>
                                    </div>

                                    <div className="flex gap-2 order-1 sm:order-2">
                                        <button
                                            onClick={() => {
                                                const today = new Date().toISOString().split('T')[0]
                                                setCurrentDate(new Date())
                                                setSelectedDates([today])
                                                setLastClickedDate(today)
                                            }}
                                            className="apple-button apple-button-secondary apple-button-sm font-medium py-1.5! px-3! text-[10px]"
                                        >
                                            Hoy
                                        </button>
                                        {selectedDates.length > 0 && (
                                            <button
                                                onClick={clearSelection}
                                                className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-medium hover:bg-red-500/20 transition-all border border-red-500/10"
                                            >
                                                Limpiar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 shrink-0 px-1">
                                {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                                    <div key={`${d}-${i}`} className="text-center text-[9px] md:text-[10px] font-bold text-gray-500">{d}</div>
                                ))}
                            </div>

                            <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-1 md:gap-2 p-1 min-h-[300px]">
                                {[...Array(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay())].map((_, i) => (
                                    <div key={`empty-${i}`} className="opacity-0" />
                                ))}
                                {[...Array(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate())].map((_, i) => {
                                    const day = i + 1
                                    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                    const dayRes = reservations.filter(r => String(r.reservation_date) === dateStr)
                                    const isBlocked = blockedDays.some(b => b.blocked_date === dateStr)
                                    const hasOverride = overrides.some(o => dateStr >= o.start_date && dateStr <= o.end_date)
                                    const isSelected = selectedDates.includes(dateStr)
                                    const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()

                                    return (
                                        <button
                                            key={day}
                                            onClick={(e) => handleDateClick(dateStr, e)}
                                            className={`relative h-full rounded-lg md:rounded-xl border transition-all duration-200 flex flex-col group overflow-hidden p-1 sm:p-2 text-left
                                                ${isSelected
                                                    ? 'bg-blue-500/20 border-blue-500 shadow-sm shadow-blue-500/20'
                                                    : isBlocked
                                                        ? 'bg-red-500/5 border-red-500/20 opacity-60'
                                                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}
                                            `}
                                        >
                                            <div className="flex items-center justify-between w-full mb-0.5 md:mb-1">
                                                <span className={`text-[11px] sm:text-sm font-semibold transition-colors ${isSelected ? 'text-blue-400' : isToday ? 'text-primary' : 'text-gray-400 group-hover:text-white'}`}>
                                                    {day}
                                                </span>
                                                <div className="flex gap-1">
                                                    {hasOverride && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />}
                                                    {isBlocked && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />}
                                                </div>
                                            </div>

                                            <div className="flex-1 w-full overflow-hidden space-y-0.5 hidden sm:block">
                                                {dayRes.slice(0, 2).map((res, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-[8px] md:text-[9px] font-medium text-gray-400">
                                                        <span className="text-gray-300">{res.reservation_time}</span>
                                                        <span className="truncate ml-1">{res.user_name?.split(' ')[0]}</span>
                                                    </div>
                                                ))}
                                                {dayRes.length > 2 && (
                                                    <div className="text-[8px] md:text-[9px] font-bold text-blue-400/80 text-center">
                                                        + {dayRes.length - 2}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Mobile indicators */}
                                            <div className="flex-1 flex items-center justify-center sm:hidden">
                                                {dayRes.length > 0 && !isBlocked && (
                                                    <div className="flex gap-0.5">
                                                        {[...Array(Math.min(dayRes.length, 3))].map((_, i) => (
                                                            <div key={i} className="w-1 h-1 rounded-full bg-blue-500/60" />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ) : activeTab === 'prices' ? (
                        <div className="h-full apple-card p-6 md:p-10 flex flex-col overflow-hidden">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 md:mb-12 shrink-0 gap-4">
                                <div>
                                    <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter mb-1 md:mb-2">Tarifas Dinámicas</h3>
                                    <p className="text-[9px] md:text-xs text-gray-500 font-bold uppercase tracking-widest">Establece precios por temporadas o eventos</p>
                                </div>
                                <button
                                    onClick={() => setIsOverriding(true)}
                                    className="btn-primary flex items-center gap-3 px-6 md:px-8 text-[10px] md:text-[11px] font-black uppercase tracking-widest shadow-primary/30 w-full sm:w-auto justify-center"
                                >
                                    <Plus className="w-4 h-4 md:w-5 md:h-5" /> Nueva Tarifa Especial
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-6 md:space-y-8 custom-scrollbar pr-1 md:pr-4">
                                <div className="mt-8 md:mt-12">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="h-px flex-1 bg-white/5" />
                                        <h4 className="text-[9px] md:text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2 md:gap-3">
                                            <History className="w-4 h-4" /> Historial de Excepciones
                                        </h4>
                                        <div className="h-px flex-1 bg-white/5" />
                                    </div>
                                    <div className="space-y-4">
                                        {overrides.length > 0 ? overrides.map(o => (
                                            <div key={o.id} className="glass-panel p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between border-white/5 bg-background/40 group hover:bg-white/5 transition-all relative overflow-hidden gap-4">
                                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                                <div className="flex items-center gap-4 md:gap-10 relative z-10 w-full sm:w-auto">
                                                    <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-lg shadow-amber-500/10 shrink-0">
                                                        <DollarSign className="w-5 h-5 md:w-6 md:h-6" />
                                                    </div>
                                                    <div className="text-left min-w-0">
                                                        <p className="text-base md:text-lg font-black text-white uppercase tracking-tighter mb-0.5 md:mb-1 truncate">
                                                            {o.start_date} <span className="text-gray-600 mx-1 md:mx-2">→</span> {o.end_date}
                                                        </p>
                                                        <p className="text-[9px] md:text-[10px] text-gray-500 font-black uppercase tracking-widest truncate">{o.note || 'Promocional / Temporal'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between sm:justify-end gap-6 md:gap-10 relative z-10 w-full sm:w-auto">
                                                    <div className="text-left sm:text-right">
                                                        <p className="text-[8px] md:text-xs font-black text-gray-500 uppercase tracking-widest mb-0.5 md:mb-1">Costo Especial</p>
                                                        <p className="text-xl md:text-2xl font-black text-primary">{formatCurrency(o.price)}</p>
                                                    </div>
                                                    <button onClick={() => removeOverride(o.id)} className="p-2.5 md:p-3 rounded-lg md:rounded-xl hover:bg-red-500/10 text-gray-600 hover:text-red-500 transition-all active:scale-90">
                                                        <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="py-16 md:py-24 flex flex-col items-center justify-center opacity-30 bg-white/1 rounded-3xl border-2 border-dashed border-white/10">
                                                <DollarSign className="w-12 h-12 md:w-16 md:h-16 mb-4 md:mb-6 text-gray-400" />
                                                <p className="text-[10px] md:text-sm font-black uppercase tracking-widest text-white text-center">No hay tarifas especiales configuradas</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full apple-card p-6 md:p-10 flex flex-col overflow-hidden">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 md:mb-12 shrink-0 gap-4">
                                <div>
                                    <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter mb-1 md:mb-2">Restricciones</h3>
                                    <p className="text-[9px] md:text-xs text-gray-500 font-bold uppercase tracking-widest">Cierra el campo por eventos o mantenimiento</p>
                                </div>
                                <button
                                    onClick={() => setIsBlocking(true)}
                                    className="btn-primary flex items-center gap-3 px-6 md:px-8 text-[10px] md:text-[11px] font-black uppercase tracking-widest w-full sm:w-auto justify-center"
                                >
                                    <Ban className="w-4 h-4 md:w-5 md:h-5" /> Bloquear Campo
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-6 md:space-y-8 custom-scrollbar pr-1 md:pr-4">
                                <div className="mt-8 md:mt-12">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="h-px flex-1 bg-white/5" />
                                        <h4 className="text-[9px] md:text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2 md:gap-3">
                                            <History className="w-4 h-4" /> Historial de Bloqueos
                                        </h4>
                                        <div className="h-px flex-1 bg-white/5" />
                                    </div>
                                    <div className="space-y-4">
                                        {blockedDays.length > 0 ? blockedDays.map(b => (
                                            <div key={b.id} className="glass-panel p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between border-white/5 bg-background/40 group hover:bg-white/5 transition-all relative overflow-hidden gap-4">
                                                <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                                <div className="flex items-center gap-4 md:gap-10 relative z-10 w-full sm:w-auto">
                                                    <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 shadow-lg shadow-red-500/10 shrink-0">
                                                        <Ban className="w-5 h-5 md:w-6 md:h-6" />
                                                    </div>
                                                    <div className="text-left min-w-0">
                                                        <p className="text-base md:text-lg font-black text-white uppercase tracking-tighter mb-0.5 md:mb-1 truncate">
                                                            {b.blocked_date}
                                                        </p>
                                                        <p className="text-[9px] md:text-[10px] text-gray-500 font-black uppercase tracking-widest leading-relaxed truncate">
                                                            {b.reason || 'Mantenimiento / Cierre'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between sm:justify-end gap-6 md:gap-10 relative z-10 w-full sm:w-auto">
                                                    <div className="text-left sm:text-right">
                                                        <p className="text-[8px] md:text-xs font-black text-gray-500 uppercase tracking-widest mb-0.5 md:mb-1">Estado</p>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                            <p className="text-[11px] md:text-sm font-black text-red-500 uppercase">Bloqueado</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => unblockDay(b.id)} className="p-2.5 md:p-3 rounded-lg md:rounded-xl hover:bg-emerald-500/10 text-gray-600 hover:text-emerald-500 transition-all active:scale-90">
                                                        <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="py-16 md:py-24 flex flex-col items-center justify-center opacity-30 bg-white/1 rounded-3xl border-2 border-dashed border-white/10">
                                                <LayoutGrid className="w-12 h-12 md:w-16 md:h-16 mb-4 md:mb-6 text-gray-400" />
                                                <p className="text-[10px] md:text-sm font-black uppercase tracking-widest text-white text-center">No hay bloqueos activos</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* SIDE AGENDA PANEL - DYNAMIC */}
                {activeTab === 'agenda' && (
                    <div className={`w-full lg:w-[340px] apple-card transition-all duration-500 flex flex-col border-white/5 relative bg-black/40 ${selectedDates.length === 0 ? 'opacity-50 pointer-events-none' : 'opacity-100'} min-h-[400px] lg:min-h-0`}>
                        <div className="p-5 md:p-6 border-b border-white/5 bg-white/2 text-left">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-[10px] md:text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <List className="w-4 h-4 text-primary" /> Agenda del día
                                </h3>
                                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-[8px] md:text-[9px] font-black text-primary border border-primary/20 italic">
                                    {selectedDates.length === 1 ? 'Individual' : `${selectedDates.length} Días`}
                                </span>
                            </div>
                            <p className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest truncate">
                                {selectedDates.length === 1 ? selectedDates[0] : 'Selección múltiple activa'}
                            </p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {selectedReservations.length > 0 ? (
                                selectedReservations.map((res) => (
                                    <div key={res.id} className="p-4 rounded-xl md:rounded-2xl bg-white/2 border border-white/5 hover:border-primary/20 transition-all group animate-fade-in text-left">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-background transition-colors">
                                                    <Clock className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="text-[10px] md:text-[11px] font-black text-white group-hover:text-primary transition-colors">{res.reservation_time}</span>
                                            </div>
                                            <div className="px-2 py-0.5 rounded-md bg-white/5 text-[8px] font-bold text-gray-500 uppercase">
                                                ID: {res.id.substring(0, 4)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-linear-to-br from-white/10 to-transparent flex items-center justify-center border border-white/10 shrink-0">
                                                <User className="w-4 h-4 text-gray-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-black text-white truncate uppercase">{res.user_name}</p>
                                                <p className="text-[9px] text-gray-500 truncate lowercase">{res.user_email}</p>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${res.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                {res.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                                            </span>
                                            <button className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline">Ver detalles</button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 text-center">
                                    <Users className="w-12 h-12 mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Sin reservas registradas</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-background/60 border-t border-white/5 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={downloadPDF} className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                    <div className="bg-red-500/20 text-red-500 p-1 rounded-md shrink-0"><ArrowRight className="w-3 h-3 rotate-45" /></div> PDF
                                </button>
                                <button onClick={downloadExcel} className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                    <div className="bg-emerald-500/20 text-emerald-500 p-1 rounded-md shrink-0"><List className="w-3 h-3" /></div> Excel
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setIsBlocking(true)} className="py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-2">
                                    <Ban className="w-3.5 h-3.5" /> Bloquear
                                </button>
                                <button onClick={() => setIsOverriding(true)} className="py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center justify-center gap-2">
                                    <DollarSign className="w-3.5 h-3.5" /> Cambiar Tarifa
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* FLOATING ACTION BAR */}
            {selectedDates.length > 1 && (
                <div className="fixed bottom-6 md:bottom-10 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-40 animate-slide-up">
                    <div className="bg-background/80 backdrop-blur-2xl border border-primary/30 p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-[0_20px_50px_rgba(20,184,166,0.3)] flex items-center justify-between md:justify-start gap-3 md:gap-6 ring-1 ring-white/10 max-w-lg mx-auto">
                        <div className="px-3 md:px-6 border-r border-white/10 text-left min-w-0">
                            <p className="text-[8px] md:text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">Selección</p>
                            <p className="text-xs md:text-sm font-black text-white uppercase tracking-tighter truncate">{selectedDates.length} Días</p>
                        </div>
                        <div className="flex items-center gap-2 md:gap-3">
                            <button onClick={() => setIsBlocking(true)} className="p-2.5 md:px-6 md:py-3 rounded-xl md:rounded-2xl bg-red-500/10 text-red-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all border border-red-500/20 flex items-center gap-2">
                                <Ban className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">Bloquear</span>
                            </button>
                            <button onClick={() => setIsOverriding(true)} className="p-2.5 md:px-6 md:py-3 rounded-xl md:rounded-2xl bg-primary/10 text-primary text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all border border-primary/20 flex items-center gap-2">
                                <DollarSign className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">Tarifa</span>
                            </button>
                            <div className="w-px h-6 md:h-8 bg-white/10 mx-1 md:mx-2" />
                            <button onClick={clearSelection} className="p-2 md:p-3 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all">
                                <X className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALS */}
            {/* MODALS */}
            {isBlocking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-6 animate-in fade-in duration-300">
                    <div className="apple-glass w-full max-w-lg flex flex-col shadow-2xl animate-in zoom-in-95 duration-300 text-left">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-semibold text-white tracking-tight">Bloquear Operación</h3>
                                <p className="text-sm text-gray-400 font-medium">Suspensión temporal de calendario</p>
                            </div>
                            <button onClick={() => setIsBlocking(false)} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleBlockDay} className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 ml-1">Fecha Inicio</label>
                                    <input
                                        name="start_date"
                                        type="date"
                                        required
                                        defaultValue={selectedDates.length > 0 ? selectedDates[0] : ''}
                                        className="apple-input"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 ml-1">Fecha Fin</label>
                                    <input
                                        name="end_date"
                                        type="date"
                                        defaultValue={selectedDates.length > 1 ? selectedDates[selectedDates.length - 1] : ''}
                                        className="apple-input"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 ml-1">Hora Inicio (Opcional)</label>
                                    <input
                                        name="start_time"
                                        type="time"
                                        className="apple-input"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 ml-1">Hora Fin (Opcional)</label>
                                    <input
                                        name="end_time"
                                        type="time"
                                        className="apple-input"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-400 ml-1">Motivo del Cierre</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Mantenimiento', 'Torneo Oficial', 'Evento Privado', 'Clima / Lluvia', 'Reparaciones', 'Otro'].map((opt) => (
                                        <label key={opt} className="cursor-pointer group relative">
                                            <input
                                                type="radio"
                                                name="reason_option"
                                                value={opt}
                                                defaultChecked={opt === 'Mantenimiento'}
                                                className="peer hidden"
                                                onChange={(e) => {
                                                    const textarea = document.getElementById('custom-reason-area');
                                                    if (textarea) textarea.style.display = e.target.value === 'Otro' ? 'block' : 'none';
                                                }}
                                            />
                                            <div className="p-3 rounded-[12px] bg-white/5 border border-white/5 peer-checked:bg-white peer-checked:text-black text-gray-400 text-xs font-medium text-center transition-all hover:bg-white/10 peer-checked:shadow-lg">
                                                {opt}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                <textarea
                                    id="custom-reason-area"
                                    name="reason_custom"
                                    placeholder="Detalles adicionales..."
                                    style={{ display: 'none' }}
                                    className="w-full bg-black/20 text-white rounded-[16px] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 mt-2 h-24 resize-none"
                                />
                            </div>
                            <button type="submit" className="apple-button apple-button-danger">
                                Ejecutar Bloqueo
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {isOverriding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-6 animate-in fade-in duration-300">
                    <div className="apple-glass w-full max-w-lg flex flex-col shadow-2xl animate-in zoom-in-95 duration-300 text-left">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-semibold text-white tracking-tight">Nueva Tarifa Especial</h3>
                                <p className="text-sm text-gray-400 font-medium">Configuración de precio dinámico</p>
                            </div>
                            <button onClick={() => setIsOverriding(false)} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handlePriceOverride} className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 ml-1">Fecha Inicio</label>
                                    <input name="start_date" type="date" required defaultValue={selectedDates.length > 0 ? selectedDates.sort()[0] : ''} className="apple-input" style={{ colorScheme: 'dark' }} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 ml-1">Fecha Fin</label>
                                    <input name="end_date" type="date" required defaultValue={selectedDates.length > 0 ? selectedDates.sort()[selectedDates.length - 1] : ''} className="apple-input" style={{ colorScheme: 'dark' }} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-400 ml-1">Valor Unitario (MXN)</label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-lg">$</span>
                                    <input
                                        name="price"
                                        type="text"
                                        required
                                        defaultValue={new Intl.NumberFormat('es-MX').format(course?.price_weekday || 0)}
                                        onInput={(e) => {
                                            const input = e.currentTarget
                                            const val = input.value.replace(/\D/g, '')
                                            input.value = val ? new Intl.NumberFormat('es-MX').format(parseInt(val)) : ''
                                        }}
                                        className="apple-input pl-10 text-xl"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-400 ml-1">Nota</label>
                                <input name="note" placeholder="Temporada alta, etc..." className="apple-input" />
                            </div>
                            <button type="submit" className="apple-button apple-button-primary">
                                Aplicar Tarifa
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
