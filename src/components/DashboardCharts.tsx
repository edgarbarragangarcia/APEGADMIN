'use client'

import React from 'react'
import {
    LineChart,
    Line,
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

interface ChartData {
    name: string
    activity: number
    revenue: number
    shipped: number
    received: number
    imageUrl?: string
}

interface DashboardChartsProps {
    data: ChartData[]
}

const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    if (!payload.imageUrl) return <circle cx={cx} cy={cy} r={4} fill="#8cf902" stroke="#1d1d1f" strokeWidth={2} />

    return (
        <foreignObject x={cx - 18} y={cy - 18} width={36} height={36}>
            <div className="w-full h-full rounded-full border-2 border-primary bg-[#1d1d1f] overflow-hidden shadow-[0_0_15px_rgba(140,249,2,0.4)] animate-in fade-in zoom-in duration-500 hover:scale-125 transition-transform cursor-pointer">
                <img
                    src={payload.imageUrl}
                    alt="product"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
            </div>
        </foreignObject>
    )
}

const CustomTooltip = ({ active, payload, label, payloadData }: any) => {
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
            </div>
        )
    }
    return null
}

export default function DashboardCharts({ data }: DashboardChartsProps) {
    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8 mt-6">
            {/* Activity Analysis Chart (Line/Area) */}
            <div className="apple-card p-6 min-h-[400px] flex flex-col">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xs font-black text-foreground uppercase tracking-widest mb-1">Análisis de Actividad</h3>
                        <p className="text-[9px] text-[#5c5c5e] font-bold uppercase tracking-tight">Interacciones de usuarios por mes</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span className="text-[8px] font-black text-primary uppercase tracking-widest">Tendencia</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8cf902" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8cf902" stopOpacity={0} />
                                </linearGradient>
                            </defs>
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
                            <Area
                                type="monotone"
                                dataKey="activity"
                                name="activity"
                                stroke="#8cf902"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorActivity)"
                                animationDuration={1500}
                                dot={<CustomDot />}
                                activeDot={{ r: 6, strokeWidth: 0 }}
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
        </div>
    )
}
