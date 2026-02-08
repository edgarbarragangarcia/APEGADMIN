"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Image from 'next/image'


export default function Home() {
    // Mouse follow logic solely for background glow, not cursor
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    // Spring physics for smooth movement
    const smoothX = useSpring(mouseX, { damping: 25, stiffness: 120 })
    const smoothY = useSpring(mouseY, { damping: 25, stiffness: 120 })

    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX)
            mouseY.set(e.clientY)
        }
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [mouseX, mouseY])

    const { scrollY } = useScroll()
    const heroOpacity = useTransform(scrollY, [0, 400], [1, 0])
    const heroScale = useTransform(scrollY, [0, 400], [1, 0.9])

    return (
        <main className="min-h-screen relative overflow-hidden bg-background text-white selection:bg-primary/30 font-outfit">
            {/* 1. BACKGROUND GLOW (Follows mouse but NO custom cursor) */}
            <motion.div
                className="fixed top-0 left-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none z-0"
                style={{ x: smoothX, y: smoothY, translateX: '-50%', translateY: '-50%' }}
            />

            {/* 2. BACKGROUND DEPTH ELEMENTS (Floating Shapes) */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                {mounted && [...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full border border-primary/20 bg-linear-to-br from-primary/5 to-transparent"
                        style={{
                            width: 100 + i * 50,
                            height: 100 + i * 50,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                            y: [0, -40, 0],
                            x: [0, 20, 0],
                            rotate: [0, 360],
                            scale: [1, 1.1, 1],
                        }}
                        transition={{
                            duration: 10 + i * 2,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                    />
                ))}
            </div>

            {/* 3. ENHANCED CINEMATIC WAVES */}
            <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-0 px-10">
                <svg className="relative block w-full h-[300px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
                    {[...Array(4)].map((_, i) => (
                        <motion.path
                            key={i}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{
                                pathLength: 1,
                                opacity: 0.1,
                                d: [
                                    `M0,60 Q300,${80 - i * 15} 600,60 T1200,60`,
                                    `M0,60 Q300,${40 + i * 15} 600,60 T1200,60`,
                                    `M0,60 Q300,${80 - i * 15} 600,60 T1200,60`
                                ]
                            }}
                            transition={{
                                duration: 10 + i * 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            d={`M0,60 Q300,${80 - i * 15} 600,60 T1200,60`}
                            stroke="#c1ff72"
                            strokeWidth="0.8"
                            fill="none"
                        />
                    ))}
                </svg>
            </div>

            {/* 4. PREMIUM NAVIGATION */}
            <motion.nav
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-50 flex items-center justify-between px-8 md:px-16 py-8"
            >
                <div className="flex items-center gap-3 group">
                    <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="w-16 h-16 rounded-full overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all bg-white p-1"
                    >
                        <Image src="/images/logo.png" alt="APEG Logo" width={64} height={64} className="w-full h-full object-contain" />
                    </motion.div>


                    <span className="text-3xl font-black tracking-tighter uppercase">APEG</span>
                </div>

                <Link href="/login">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-8 py-3 rounded-full bg-white/5 border border-white/10 text-[10px] font-black tracking-[0.2em] uppercase hover:bg-white/10 transition-all backdrop-blur-md"
                    >
                        INGRESAR
                    </motion.button>
                </Link>
            </motion.nav>

            {/* 5. HERO CONTENT WITH SHINE & REVEAL */}
            <motion.section
                style={{ opacity: heroOpacity, scale: heroScale }}
                className="relative z-10 pt-20 md:pt-40 pb-20 px-8 md:px-16 max-w-7xl mx-auto flex flex-col items-start"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: 'backOut' }}
                    className="flex items-center gap-3 px-4 py-2 rounded-full bg-primary/5 border border-primary/20 text-[10px] font-black tracking-widest text-primary uppercase mb-12 shadow-[0_0_20px_rgba(193,255,114,0.1)]"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    Plataforma Oficial v2.0
                </motion.div>

                <div className="relative">
                    <motion.h1
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                        className="text-[80px] md:text-[140px] lg:text-[160px] font-black leading-[0.8] tracking-tighter uppercase mb-10"
                    >
                        AMOR POR <br />
                        <span className="italic animate-shine bg-linear-to-r from-primary via-white to-primary bg-size-[200%_auto] bg-clip-text text-transparent">EL GOLF</span>
                    </motion.h1>

                    {/* Floating Accent Line */}
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: 300 }}
                        transition={{ duration: 1.5, delay: 0.8 }}
                        className="h-[2px] bg-linear-to-r from-primary to-transparent mb-12"
                    />
                </div>

                <motion.p
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="text-xl md:text-2xl text-white/40 mb-16 max-w-2xl font-medium leading-tight"
                >
                    Redefiniendo la administración del golf digital con inteligencia,
                    diseño de vanguardia y rendimiento sin límites.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    className="flex flex-wrap items-center gap-8"
                >
                    <Link href="/login">
                        <motion.button
                            whileHover={{ scale: 1.1, boxShadow: '0 0 50px rgba(193,255,114,0.4)' }}
                            whileTap={{ scale: 0.9 }}
                            className="group relative px-12 py-7 bg-primary text-background text-lg font-black rounded-full transition-all duration-300 flex items-center gap-4 overflow-hidden"
                        >
                            <span className="relative z-10 uppercase tracking-widest">DESCUBRIR</span>
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                            <ArrowRight className="w-6 h-6 relative z-10 group-hover:translate-x-2 transition-transform" />
                        </motion.button>
                    </Link>

                    <div className="flex -space-x-4">
                        {[1, 2, 3, 4].map(i => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 1 + i * 0.1 }}
                                className="w-14 h-14 rounded-full border-4 border-background bg-white/10 backdrop-blur-lg overflow-hidden flex items-center justify-center font-black text-[10px] text-primary/60"
                            >
                                {i}K+
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </motion.section>

            {/* 6. INTERACTIVE FOOTER DECO */}
            <div className="absolute bottom-20 right-16 z-20 hidden md:block">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                    className="relative w-40 h-40 border-2 border-dashed border-white/5 rounded-full flex items-center justify-center"
                >
                    <span className="text-[10px] font-black text-white/20 tracking-[1em] uppercase -rotate-90">SCROLL</span>
                </motion.div>
            </div>

            {/* Bottom Glow */}
            <div className="absolute bottom-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
        </main>
    )
}
