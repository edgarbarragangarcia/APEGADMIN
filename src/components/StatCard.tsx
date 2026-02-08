import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
    title: string
    value: string | number
    trend?: string
    trendDirection?: 'up' | 'down'
    icon?: LucideIcon
    iconColor?: string
    description?: string
}

export default function StatCard({
    title,
    value,
    trend,
    trendDirection = 'up',
    icon: Icon,
    iconColor = 'text-primary',
    description
}: StatCardProps) {
    const isPositive = trendDirection === 'up'

    return (
        <div className="stat-card group hover:border-primary/30 transition-all">
            {/* Glow effect on hover */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-gray-400 text-sm font-medium">{title}</p>
                        <h3 className="text-4xl font-black mt-2 text-white tracking-tight">{value}</h3>
                    </div>
                    {Icon && (
                        <div className={`p-3 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 ${iconColor} group-hover:scale-110 transition-transform`}>
                            <Icon className="w-6 h-6" />
                        </div>
                    )}
                </div>

                {(trend || description) && (
                    <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                        {trend && (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${isPositive
                                    ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                                    : 'bg-red-400/10 text-red-400 border border-red-400/20'
                                }`}>
                                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {trend}
                            </span>
                        )}
                        {description && (
                            <span className="text-xs text-gray-500">{description}</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
