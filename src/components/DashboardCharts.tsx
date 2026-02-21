'use client'

import React, { useState } from 'react'
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    Legend
} from 'recharts'
import { X, ChevronRight, User, MousePointer2, Calendar, Star } from 'lucide-react'

interface Interaction {
    userName: string
    avatarUrl?: string | null
    type: string
    date: string
}

interface ProductDetail {
    id: string
    name: string
    imageUrl: string
    count: number
    interactions: Interaction[]
}

interface ChartData {
    name: string
    activity: number
    revenue: number
    shipped: number
    received: number
    imageUrl?: string
    products: ProductDetail[]
}

interface DashboardChartsProps {
    data: ChartData[]
}

const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '...'
    const now = new Date()
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000)
    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `${diffMins}m`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h`
    return `${Math.floor(diffHours / 24)}d`
}

const CustomDot = (props: any) => {
    const { cx, cy, payload, onClick } = props
    if (!payload.imageUrl) return (
        <circle
            cx={cx}
            cy={cy}
            r={6}
            fill="#8cf902"
            stroke="#1d1d1f"
            strokeWidth={3}
            onClick={() => onClick(payload)}
            className="cursor-pointer hover:scale-150 transition-transform shadow-[0_0_10px_rgba(140,249,2,0.8)]"
        />
    )

    return (
        <foreignObject x={cx - 30} y={cy - 30} width={60} height={60}>
            <div className="w-full h-full flex items-center justify-center pointer-events-none">
                <div
                    onClick={() => onClick(payload)}
                    className="w-9 h-9 rounded-full border-2 border-primary bg-[#1d1d1f] overflow-hidden shadow-[0_0_15px_rgba(140,249,2,0.5)] animate-in fade-in zoom-in duration-500 hover:scale-125 transition-transform cursor-pointer pointer-events-auto"
                >
                    <img
                        src={payload.imageUrl}
                        alt="product"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                </div>
            </div>
        </foreignObject>
    )
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-[#1d1d1f] border border-white/10 p-4 rounded-2xl shadow-xl backdrop-blur-md z-50">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/5">
                    {data.imageUrl && (
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0">
                            <img src={data.imageUrl} alt="top-product" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div>
                        <p className="text-[10px] font-black text-[#86868b] uppercase tracking-widest">{label}</p>
                        <p className="text-[8px] text-primary font-bold uppercase tracking-tight">Producto más activo</p>
                    </div>
                </div>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <p className="text-xs font-bold text-white uppercase tracking-tight">
                            {entry.name === 'revenue' ? 'Ingresos' :
                                entry.name === 'activity' ? 'Actividad' :
                                    entry.name === 'shipped' ? 'Enviados' : 'Recibidos'}:
                            <span className="ml-2 text-primary">
                                {entry.name === 'revenue' ? `$${entry.value.toLocaleString()}` : entry.value}
                            </span>
                        </p>
                    </div>
                ))}
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                    <MousePointer2 className="w-3 h-3 text-[#86868b]" />
                    <p className="text-[8px] text-[#86868b] font-bold uppercase tracking-widest">Click para ver detalle</p>
                </div>
            </div>
        )
    }
    return null
}

export default function DashboardCharts({ data }: DashboardChartsProps) {
    const [selectedMonth, setSelectedMonth] = useState<ChartData | null>(null)
    const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null)

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8 mt-6 relative">
            {/* Activity Analysis Chart (Line/Area) */}
            <div className="apple-card p-6 min-h-[400px] flex flex-col">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xs font-black text-foreground uppercase tracking-widest mb-1">Análisis de Actividad</h3>
                        <p className="text-[9px] text-[#5c5c5e] font-bold uppercase tracking-tight">Interacciones de usuarios por mes</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(140,249,2,0.5)]" />
                            <span className="text-[8px] font-black text-primary uppercase tracking-widest">Tendencia</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 w-full h-full min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ top: 20, right: 30, left: -10, bottom: 10 }}
                            onClick={(e: any) => {
                                if (e && e.activePayload && e.activePayload.length > 0) {
                                    setSelectedMonth(e.activePayload[0].payload);
                                }
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#86868b', fontSize: 10, fontWeight: 900 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#86868b', fontSize: 10, fontWeight: 900 }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#8cf902', strokeWidth: 1, strokeDasharray: '5 5' }} />
                            <Area
                                type="monotone"
                                dataKey="activity"
                                name="activity"
                                stroke="#8cf902"
                                strokeWidth={4}
                                fill="transparent"
                                animationDuration={1000}
                                dot={<CustomDot onClick={(payload: any) => setSelectedMonth(payload)} />}
                                activeDot={{ r: 8, strokeWidth: 0, fill: '#8cf902' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Sales & Logistics Chart (Bar) */}
            <div className="apple-card p-6 min-h-[400px] flex flex-col">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xs font-black text-foreground uppercase tracking-widest mb-1">Logística y Ventas</h3>
                        <p className="text-[9px] text-[#5c5c5e] font-bold uppercase tracking-tight">Productos enviados vs recibidos</p>
                    </div>
                </div>

                <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={8}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#86868b', fontSize: 10, fontWeight: 900 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#86868b', fontSize: 10, fontWeight: 900 }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                verticalAlign="top"
                                align="right"
                                iconType="circle"
                                wrapperStyle={{
                                    paddingBottom: '20px',
                                    fontSize: '9px',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    color: '#86868b'
                                }}
                            />
                            <Bar
                                dataKey="shipped"
                                name="shipped"
                                fill="#3b82f6"
                                radius={[4, 4, 0, 0]}
                                animationDuration={1500}
                                barSize={20}
                            />
                            <Bar
                                dataKey="received"
                                name="received"
                                fill="#8cf902"
                                radius={[4, 4, 0, 0]}
                                animationDuration={1500}
                                barSize={20}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Floating Card: Products for the Month */}
            {selectedMonth && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedMonth(null)} />
                    <div className="apple-card w-full max-w-2xl border-white/10 p-0 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in slide-in-from-bottom-8 duration-500">
                        <div className="p-6 border-b border-white/10 bg-white/2 flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-black text-foreground uppercase tracking-widest leading-none mb-2">Actividad Detallada: {selectedMonth.name}</h4>
                                <p className="text-xs text-[#86868b] font-medium uppercase tracking-tight">Análisis de productos con mayor interacción en el mes</p>
                            </div>
                            <button onClick={() => setSelectedMonth(null)} className="p-3 hover:bg-white/10 rounded-xl transition-all text-[#86868b] hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {selectedMonth.products.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {selectedMonth.products.map((prod: ProductDetail) => (
                                        <button
                                            key={prod.id}
                                            onClick={() => setSelectedProduct(prod)}
                                            className="w-full p-4 rounded-3xl bg-white/2 hover:bg-primary/10 border border-white/5 hover:border-primary/30 transition-all flex items-center gap-5 group"
                                        >
                                            <div className="w-16 h-16 rounded-2xl border border-white/10 overflow-hidden shrink-0 shadow-2xl relative">
                                                <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                                                    <MousePointer2 className="w-4 h-4 text-primary" />
                                                </div>
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <p className="text-xs font-black text-foreground truncate group-hover:text-primary transition-colors uppercase tracking-tight">{prod.name}</p>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <div className="px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30">
                                                        <p className="text-[10px] text-primary font-black uppercase tracking-widest">{prod.count} {prod.count === 1 ? 'Interacción' : 'Interacciones'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-[#86868b] group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 flex flex-col items-center justify-center text-center">
                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                        <Calendar className="w-10 h-10 text-[#5c5c5e]" />
                                    </div>
                                    <h5 className="text-sm font-black text-foreground uppercase tracking-widest">Sin actividad registrada</h5>
                                    <p className="text-[10px] text-[#86868b] font-bold uppercase tracking-tight mt-1">No hay datos de interacciones para este mes</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-primary/5 border-t border-white/5">
                            <p className="text-[10px] text-center font-black text-primary uppercase tracking-widest">Haz clic en un producto para ver el historial detallado</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Card: Users for the Product */}
            {selectedProduct && (
                <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={() => setSelectedProduct(null)} />
                    <div className="apple-card w-full max-w-lg border-white/20 p-0 relative overflow-hidden shadow-[0_0_60px_rgba(140,249,2,0.15)] animate-in zoom-in slide-in-from-bottom-8 duration-500">
                        <div className="p-8 border-b border-white/10 bg-linear-to-br from-primary/15 via-transparent to-transparent">
                            <div className="flex items-center gap-6">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-primary/30 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                    <div className="w-24 h-24 rounded-2xl border-2 border-primary/50 overflow-hidden shadow-2xl relative bg-[#1d1d1f]">
                                        <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="px-2 py-0.5 rounded-full bg-primary text-[8px] font-black text-background uppercase tracking-widest">
                                            Historial Full
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-black text-foreground leading-tight tracking-tighter">{selectedProduct.name}</h4>
                                    <p className="text-xs text-[#86868b] font-bold uppercase tracking-widest mt-1">Registro cronológico de actividad</p>
                                </div>
                                <button onClick={() => setSelectedProduct(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all self-start text-[#86868b] hover:text-foreground">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 max-h-[50vh] overflow-y-auto custom-scrollbar bg-black/20">
                            <div className="space-y-2">
                                {selectedProduct.interactions.map((int: Interaction, i: number) => (
                                    <div key={i} className="p-5 rounded-3xl bg-white/2 border border-white/5 flex items-center gap-5 group hover:bg-white/5 hover:border-primary/20 transition-all">
                                        {int.avatarUrl ? (
                                            <div className="w-12 h-12 rounded-full border-2 border-primary/30 overflow-hidden shrink-0 shadow-[0_0_12px_rgba(140,249,2,0.2)]">
                                                <img src={int.avatarUrl} alt={int.userName} className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div
                                                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-white font-black text-lg border-2 border-white/10"
                                                style={{ backgroundColor: `hsl(${int.userName.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360}, 60%, 35%)` }}
                                            >
                                                {int.userName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-foreground truncate uppercase tracking-tight">{int.userName}</p>
                                            <div className="flex items-center gap-2.5 mt-1.5">
                                                <span className="text-[10px] text-primary font-black uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-md">{int.type}</span>
                                                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                                <span className="text-[10px] text-[#86868b] font-black uppercase tracking-widest font-mono">{formatRelativeTime(int.date)}</span>
                                            </div>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                            <Star className="w-4 h-4 text-primary fill-primary" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedProduct(null)}
                            className="w-full p-6 text-xs font-black text-primary uppercase tracking-widest bg-primary/10 hover:bg-primary/20 transition-all border-t border-white/10"
                        >
                            Cerrar Historial
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
