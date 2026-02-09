'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Mail, Lock, Loader2, ArrowRight, Chrome, Apple, ArrowLeft } from 'lucide-react'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (authError) {
                setError(authError.message === 'Invalid login credentials' ? 'Credenciales incorrectas' : authError.message)
                setLoading(false)
                return
            }

            if (data.user) {
                document.cookie = "apeg_admin_session=true; path=/; max-age=86400"
                router.push('/dashboard')
            }
        } catch (err) {
            console.error('Login error:', err)
            setError('Error de conexión al servidor')
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-background p-0 sm:p-4 md:p-6 lg:p-8 font-outfit overflow-x-hidden">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-[1000px] bg-[#0a1f14] rounded-none sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/5 md:max-h-[85vh] h-screen sm:h-auto"
            >
                {/* MOBILE BRANDING (Visible only on mobile) */}
                <div className="md:hidden p-6 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg shadow-white/10 bg-white p-0.5">
                            <Image src="/images/logo.png" alt="APEG Logo" width={40} height={40} className="w-full h-full object-contain" />
                        </div>
                        <span className="text-lg font-black text-white tracking-tighter uppercase">APEG</span>
                    </div>
                </div>

                {/* LEFT PANEL: IMAGE & BRANDING (DESKTOP) */}
                <div className="md:w-5/12 relative hidden md:block overflow-hidden group">
                    <Image
                        src="/images/login-sidebar.png"
                        alt="APEG Golf"
                        fill
                        className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-10000 ease-linear"
                        priority
                    />
                    {/* Gradient Overlay - Dark Green */}
                    <div className="absolute inset-0 bg-linear-to-t from-[#0a1f14] via-transparent to-[#0a1f14]/40" />

                    {/* Content on Image */}
                    <div className="absolute inset-0 p-10 flex flex-col justify-between z-10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg shadow-white/10 bg-white p-1 text-center">
                                    <Image src="/images/logo.png" alt="APEG Logo" width={64} height={64} className="w-full h-full object-contain mx-auto" />
                                </div>

                                <span className="text-xl font-black text-white tracking-tighter uppercase">APEG</span>
                            </div>
                            <button className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 group/btn">
                                <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                                Website
                            </button>
                        </div>

                        <div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.8 }}
                            >
                                <h2 className="text-3xl lg:text-4xl font-black text-white leading-tight tracking-tighter mb-4 uppercase">
                                    Pasión por el Golf,<br />
                                    <span className="text-primary italic">Control Total.</span>
                                </h2>
                                <p className="text-white/40 text-xs font-medium max-w-[280px] leading-relaxed mb-6">
                                    Gestiona usuarios, torneos y green fees en la plataforma líder para administradores de golf.
                                </p>

                                {/* Carousel Indicators style */}
                                <div className="flex gap-1.5">
                                    <div className="h-1 w-10 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary w-full" />
                                    </div>
                                    <div className="h-1 w-6 bg-white/10 rounded-full" />
                                    <div className="h-1 w-6 bg-white/10 rounded-full" />
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: FORM */}
                <div className="flex-1 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-linear-to-br from-[#0a1f14] to-background overflow-y-auto custom-scrollbar h-full sm:h-auto">
                    <div className="max-w-[340px] mx-auto w-full py-8 sm:py-0">
                        <div className="mb-8">
                            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2 uppercase italic">Bienvenido</h1>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
                                Accede a tu cuenta administrativa
                            </p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-4 md:space-y-3.5">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Profesional</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-700 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-white/2 border border-white/5 rounded-xl pl-11 pr-4 py-4 md:py-3.5 text-xs md:text-[11px] text-white focus:outline-none focus:border-primary/30 focus:bg-white/4 transition-all font-bold placeholder:text-gray-800"
                                            placeholder="admin@apeg.mx"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Contraseña</label>
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-700 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-white/2 border border-white/5 rounded-xl pl-11 pr-4 py-4 md:py-3.5 text-xs md:text-[11px] text-white focus:outline-none focus:border-primary/30 focus:bg-white/4 transition-all font-bold placeholder:text-gray-800"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-1">
                                <div className="flex items-center gap-2.5">
                                    <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-white/5 accent-primary cursor-pointer" id="remember" />
                                    <label htmlFor="remember" className="text-[9px] text-gray-500 font-black uppercase tracking-widest cursor-pointer">Recordarme</label>
                                </div>
                                <span className="text-[9px] text-primary font-black uppercase tracking-widest cursor-pointer hover:underline italic">Recuperar</span>
                            </div>

                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[9px] font-black uppercase text-center tracking-widest"
                                    >
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full py-4.5 md:py-4 rounded-[16px] flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed group shadow-xl shadow-primary/10 relative overflow-hidden"
                            >
                                <span className="font-black uppercase tracking-widest text-[11px] md:text-xs relative z-10 text-black">
                                    {loading ? 'Validando' : 'Acceder'}
                                </span>
                                {!loading && <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform relative z-10 text-black" />}
                                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin relative z-10 text-black" />}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/5"></div>
                            </div>
                            <div className="relative flex justify-center text-[8px] font-black uppercase tracking-[0.3em]">
                                <span className="bg-[#0a1f14] px-4 text-gray-600">Otras opciones</span>
                            </div>
                        </div>

                        {/* Social-style buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <button className="flex items-center justify-center gap-2.5 py-4 sm:py-3 bg-white/2 border border-white/5 rounded-xl hover:bg-white/5 transition-all font-black text-[9px] text-white uppercase tracking-widest">
                                <Chrome className="w-3.5 h-3.5" />
                                Google
                            </button>
                            <button className="flex items-center justify-center gap-2.5 py-4 sm:py-3 bg-white/2 border border-white/5 rounded-xl hover:bg-white/5 transition-all font-black text-[9px] text-white uppercase tracking-widest">
                                <Apple className="w-3.5 h-3.5" />
                                Apple
                            </button>
                        </div>

                        <div className="mt-10 text-center">
                            <p className="text-[7px] text-gray-700 font-black uppercase tracking-[0.4em] leading-relaxed">
                                APEG Global &bull; Security &bull; {new Date().getFullYear()}
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </main>
    )
}
