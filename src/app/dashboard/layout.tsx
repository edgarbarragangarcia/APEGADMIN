'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { motion, useSpring, useMotionValue } from 'framer-motion'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isCollapsed, setIsCollapsed] = useState(false)
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

    return (
        <div className="min-h-screen bg-background text-white flex overflow-hidden font-outfit">
            {/* 1. MODERN GOLF BACKGROUND */}
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 pointer-events-none"
                style={{ backgroundImage: `url('/images/bg-golf.png')` }}
            />

            {/* Dark Overlay for Readability */}
            <div className="fixed inset-0 z-0 bg-black/60 pointer-events-none" />

            {/* 2. FLOATING GREEN ORBS */}
            <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
                {mounted && [...Array(4)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full blur-[80px]"
                        style={{
                            width: 300 + i * 100,
                            height: 300 + i * 100,
                            left: `${[10, 70, 20, 80][i]}%`,
                            top: `${[20, 10, 80, 60][i]}%`,
                            background: i % 2 === 0 ? 'rgba(52, 199, 89, 0.4)' : 'rgba(193, 255, 114, 0.3)', // Apple Green & Lime
                        }}
                        animate={{
                            y: [0, -40, 0],
                            x: [0, 20, 0],
                            scale: [1, 1.1, 1],
                        }}
                        transition={{
                            duration: 20 + i * 5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                ))}
            </div>

            {/* Existing background utility classes */}
            <div className="bg-mesh opacity-20" />
            <div className="bg-noise opacity-[0.02]" />

            {/* Sidebar */}
            <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

            {/* Main Content Area */}
            <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'} flex flex-col h-screen relative overflow-hidden z-10`}>
                {/* Content gradient overlay */}
                <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-accent/2 pointer-events-none" />

                <div className="flex-1 flex flex-col relative overflow-hidden">
                    {children}
                </div>
            </main>
        </div>
    )
}
