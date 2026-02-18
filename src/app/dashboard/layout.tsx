'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { motion, useSpring, useMotionValue, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [mounted, setMounted] = useState(false)

    // Mouse follow logic
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)
    const smoothX = useSpring(mouseX, { damping: 25, stiffness: 120 })
    const smoothY = useSpring(mouseY, { damping: 25, stiffness: 120 })

    useEffect(() => {
        setMounted(true)
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX)
            mouseY.set(e.clientY)
        }
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [mouseX, mouseY])

    // Close mobile menu on resize to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsMobileMenuOpen(false)
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Prevent scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isMobileMenuOpen])

    return (
        <div className="min-h-screen bg-background text-foreground flex overflow-hidden font-outfit">
            {/* 1. MODERN GOLF BACKGROUND DARK */}
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-5 pointer-events-none"
                style={{ backgroundImage: `url('/images/bg-golf.png')` }}
            />

            {/* 2. SOFT ORBS */}
            <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
                {mounted && [...Array(4)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full blur-[120px]"
                        style={{
                            width: 300 + i * 150,
                            height: 300 + i * 150,
                            left: `${[5, 65, 15, 75][i]}%`,
                            top: `${[15, 5, 75, 55][i]}%`,
                            background: i % 2 === 0 ? 'rgba(45, 90, 39, 0.4)' : 'rgba(212, 175, 55, 0.1)',
                        }}
                        animate={{
                            y: [0, -40, 0],
                            x: [0, 20, 0],
                            scale: [1, 1.1, 1],
                        }}
                        transition={{
                            duration: 25 + i * 5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                ))}
            </div>

            {/* Background utility classes */}
            <div className="bg-mesh opacity-50" />
            <div className="bg-noise opacity-[0.05]" />

            {/* Mobile Header Dark */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 px-6 flex items-center justify-between z-80 bg-background/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-2">
                    <img src="/images/logo.png" alt="APEG Logo" className="w-8 h-8 object-contain" />
                    <span className="font-black text-sm tracking-tighter text-foreground">APEG ADMIN</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-foreground active:scale-95 transition-all relative z-100"
                >
                    {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Sidebar with mobile state */}
            <div className={`fixed inset-y-0 left-0 z-100 transform lg:relative lg:translate-x-0 transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} w-64 lg:w-auto`}>
                <Sidebar
                    isCollapsed={isCollapsed}
                    onToggle={() => setIsCollapsed(!isCollapsed)}
                    isMobileOpen={isMobileMenuOpen}
                    onCloseMobile={() => setIsMobileMenuOpen(false)}
                />
            </div>

            {/* Mobile Overlay */}
            <AnimatePresence mode="wait">
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="fixed inset-0 bg-black z-90 lg:hidden blur-sm"
                    />
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main className="flex-1 transition-all duration-300 ml-0 flex flex-col h-screen relative overflow-hidden z-10 pt-16 lg:pt-0">
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    {children}
                </div>
            </main>
        </div>
    )
}
