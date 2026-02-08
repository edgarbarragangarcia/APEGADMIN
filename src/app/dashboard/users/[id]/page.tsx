'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Mail, Phone, MapPin, Calendar, ShoppingBag, Edit, User as UserIcon, Star, Target, Shield, ArrowLeft } from 'lucide-react'

export default function UserDetailsPage() {
    const { id } = useParams()
    const router = useRouter()
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetchData = useCallback(async () => {
        if (!id) return
        const { data: res } = await supabase.rpc('get_user_details', { target_user_id: id })
        if (res) setData(res)
        setLoading(false)
    }, [id, supabase])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    if (loading) return <div className="p-8 text-white uppercase font-black animate-pulse">Cargando Perfil...</div>

    if (!data || !data.profile) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="glass-panel p-8 text-center border-red-500/10">
                    <UserIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-black text-white mb-2 uppercase">Usuario Extraviado</h2>
                    <button onClick={() => router.back()} className="btn-secondary px-6 text-xs font-black uppercase border-white/10">Volver</button>
                </div>
            </div>
        )
    }

    const { profile, recent_orders } = data

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
            {/* COMPACT FIXED HEADER */}
            <div className="px-8 py-6 bg-background border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-gray-500 hover:text-white transition-all">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-white leading-tight">{profile.full_name || 'Sin Nombre'}</h1>
                        <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-0.5">Expediente de Jugador</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button className="h-10 px-6 btn-secondary border-white/5 text-xs font-black uppercase flex items-center gap-2"><Shield className="w-4 h-4" /> Roles</button>
                    <button className="h-10 px-6 btn-primary text-xs font-black uppercase flex items-center gap-2"><Edit className="w-4 h-4" /> Editar</button>
                </div>
            </div>

            {/* MAIN CONTENT - NO SCROLL */}
            <div className="flex-1 p-6 flex flex-col gap-6 overflow-hidden">

                {/* PROFILE OVERVIEW - COMPACT ROW */}
                <div className="glass-panel p-5 border-white/5 flex items-center gap-8 shrink-0 bg-linear-to-r from-primary/5 to-transparent">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl font-black text-white">
                            {profile.full_name?.charAt(0)}
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg border-2 border-background">
                            <Star className="w-4 h-4 text-background fill-background" />
                        </div>
                    </div>

                    <div className="flex-1 grid grid-cols-4 gap-6">
                        <div>
                            <p className="text-[9px] font-black text-gray-600 uppercase mb-1">Contacto</p>
                            <p className="text-xs font-black text-white truncate">{profile.email}</p>
                            <p className="text-[10px] font-bold text-gray-500 mt-0.5">{profile.phone || 'Sin teléfono'}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-black text-gray-600 uppercase mb-1">Handicap</p>
                            <p className="text-2xl font-black text-primary">{profile.handicap || '--'}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-black text-gray-600 uppercase mb-1">Rounds</p>
                            <p className="text-2xl font-black text-white">{profile.total_rounds || 0}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-gray-600 uppercase mb-1">Nivel</p>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${profile.is_premium ? 'bg-primary text-background' : 'bg-white/5 text-gray-500'}`}>
                                {profile.is_premium ? 'Premium' : 'Estándar'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* TWO COLUMNS DATA - FITS VIEWPORT */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden min-h-0">

                    {/* PURCHASES - LIMITED TO 3 ITEMS */}
                    <div className="glass-panel p-5 border-white/5 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <ShoppingBag className="w-3.5 h-3.5 text-primary" /> Recientes
                            </h3>
                            <button className="text-[9px] font-black text-gray-500 uppercase hover:text-white transition-colors">Ver Historial</button>
                        </div>
                        <div className="flex-1 space-y-3 overflow-hidden">
                            {recent_orders.length === 0 ? (
                                <div className="h-full flex items-center justify-center border-2 border-dashed border-white/2 rounded-2xl text-[10px] font-black text-gray-700 uppercase">Sin transacciones</div>
                            ) : (
                                recent_orders.slice(0, 3).map((order: any) => (
                                    <div key={order.id} className="p-3 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-white/5 group-hover:text-primary transition-colors"><Target className="w-4 h-4" /></div>
                                            <div>
                                                <p className="text-[11px] font-black text-white">${Number(order.total_amount).toLocaleString()}</p>
                                                <p className="text-[9px] text-gray-600 font-bold uppercase">{new Date(order.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 rounded-full">{order.status}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* NOTES - REDUCED HEIGHT */}
                    <div className="flex flex-col gap-6 overflow-hidden">
                        <div className="glass-panel p-5 border-white/5 flex flex-col flex-1">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2 shrink-0">
                                <Edit className="w-3.5 h-3.5 text-primary" /> Notas CRM
                            </h3>
                            <textarea
                                className="flex-1 bg-white/2 border border-white/10 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-primary/30 transition-all resize-none font-bold placeholder:text-gray-800"
                                placeholder="Escriba seguimientos internos..."
                                defaultValue="Usuario activo. Interesado en torneos nacionales. Seguimiento para upgrade premium."
                            />
                            <button className="mt-4 w-full py-3 bg-primary text-background text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shrink-0">Actualizar Notas</button>
                        </div>
                    </div>
                </div>

                {/* FOOTER METRICS COMPACT */}
                <div className="px-6 py-3 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between shrink-0">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Sincronización de Perfil <span className="text-emerald-400">— ACTIVE</span></p>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase"><Calendar className="w-3 h-3" /> Registrado: {new Date(profile.created_at).toLocaleDateString()}</div>
                        <div className="w-px h-3 bg-white/10" />
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase"><MapPin className="w-3 h-3" /> Geolocalización Activa</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
