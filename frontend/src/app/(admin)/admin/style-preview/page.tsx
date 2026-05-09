"use client";

import { useState } from "react";
import { Users, BookOpen, DollarSign, TrendingUp, Flame } from "lucide-react";

const STATS = [
 { label: "Total Users", value: "7", icon: Users, color: "indigo" },
 { label: "Courses", value: "3", icon: BookOpen, color: "emerald" },
 { label: "Enrollments", value: "6", icon: BookOpen, color: "violet" },
 { label: "MRR", value: "$0", icon: DollarSign, color: "amber" },
];

const EXTRA_STATS = [
 { label: "Completion Rate", value: "16.7%", icon: TrendingUp, color: "emerald" },
 { label: "Active Students", value: "5", icon: Flame, color: "orange" },
];

const colorMap: Record<string, { bg: string; iconBg: string; text: string; border: string; gradient: string; ring: string }> = {
 indigo: { bg: "bg-green-50", iconBg: "bg-green-100", text: "text-green-600", border: "border-green-400", gradient: "from-green-50/80 to-white", ring: "ring-green-200" },
 emerald: { bg: "bg-emerald-50", iconBg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-400", gradient: "from-emerald-50/80 to-white", ring: "ring-emerald-200" },
 violet: { bg: "bg-emerald-50", iconBg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-400", gradient: "from-emerald-50/80 to-white", ring: "ring-emerald-200" },
 amber: { bg: "bg-amber-50", iconBg: "bg-amber-100", text: "text-amber-600", border: "border-amber-400", gradient: "from-amber-50/80 to-white", ring: "ring-amber-200" },
 orange: { bg: "bg-orange-50", iconBg: "bg-orange-100", text: "text-orange-600", border: "border-orange-400", gradient: "from-orange-50/80 to-white", ring: "ring-orange-200" },
};

const STYLES = [
 { id: "gradient", name: "Gradient Accent", desc: "Мягкий градиентный фон в цвет иконки" },
 { id: "leftbar", name: "Left Color Bar", desc: "Цветная полоска слева, контент по центру" },
 { id: "minimal", name: "Minimal Clean", desc: "Без рамки, только тень, иконка сверху" },
 { id: "glass", name: "Glass Morphism", desc: "Полупрозрачные карточки с blur и цветным акцентом сверху" },
 { id: "neumorphism", name: "Neumorphism", desc: "Мягкие выпуклые тени, без рамок — 3D эффект" },
 { id: "outlined", name: "Outlined Accent", desc: "Тонкая цветная рамка целиком + иконка с цветным кольцом" },
];

function StatCard({ stat, style }: { stat: typeof STATS[0]; style: string }) {
 const Icon = stat.icon;
 const c = colorMap[stat.color];

 // Style 1: Gradient Accent
 if (style === "gradient") {
 return (
 <div className={`rounded-lg bg-gradient-to-br ${c.gradient} p-6 shadow-sm transition-all duration-200 hover:shadow-md`}>
 <div className="flex items-center gap-4">
 <div className={`rounded-lg ${c.iconBg} p-3`}>
 <Icon className={`h-5 w-5 ${c.text}`} />
 </div>
 <div>
 <p className="text-xs font-medium text-slate-400">{stat.label}</p>
 <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
 </div>
 </div>
 </div>
 );
 }

 // Style 2: Left Color Bar
 if (style === "leftbar") {
 return (
 <div className={`flex items-center gap-4 rounded-lg border-l-4 ${c.border} bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md`}>
 <div className={`rounded-lg ${c.iconBg} p-3`}>
 <Icon className={`h-5 w-5 ${c.text}`} />
 </div>
 <div>
 <p className="text-xs font-medium text-slate-400">{stat.label}</p>
 <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
 </div>
 </div>
 );
 }

 // Style 3: Minimal Clean (icon on top)
 if (style === "minimal") {
 return (
 <div className="rounded-lg bg-white p-6 shadow-md transition-all duration-200 hover:shadow-lg">
 <div className={`mb-4 inline-flex rounded-lg ${c.iconBg} p-3`}>
 <Icon className={`h-5 w-5 ${c.text}`} />
 </div>
 <p className="text-xs font-medium text-slate-400">{stat.label}</p>
 <p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
 </div>
 );
 }

 // Style 4: Glass Morphism
 if (style === "glass") {
 return (
 <div className="relative overflow-hidden rounded-lg border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md">
 <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${c.gradient.replace("to-white", `to-transparent`)} ${c.bg}`} />
 <div className="flex items-center gap-4">
 <div className={`rounded-lg ${c.iconBg} p-3`}>
 <Icon className={`h-5 w-5 ${c.text}`} />
 </div>
 <div>
 <p className="text-xs font-medium text-slate-400">{stat.label}</p>
 <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
 </div>
 </div>
 </div>
 );
 }

 // Style 5: Neumorphism
 if (style === "neumorphism") {
 return (
 <div className="rounded-lg bg-slate-50 p-6 shadow-[6px_6px_12px_#d1d5db,-6px_-6px_12px_#ffffff] transition-all duration-200 hover:shadow-[8px_8px_16px_#d1d5db,-8px_-8px_16px_#ffffff]">
 <div className="flex items-center gap-4">
 <div className={`rounded-lg ${c.iconBg} p-3 shadow-inner`}>
 <Icon className={`h-5 w-5 ${c.text}`} />
 </div>
 <div>
 <p className="text-xs font-medium text-slate-400">{stat.label}</p>
 <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
 </div>
 </div>
 </div>
 );
 }

 // Style 6: Outlined Accent
 if (style === "outlined") {
 return (
 <div className={`rounded-lg border-2 ${c.border}/30 bg-white p-6 transition-all duration-200 hover:${c.border}/60 hover:shadow-md`}>
 <div className="flex items-center gap-4">
 <div className={`rounded-lg ${c.bg} p-3 ring-2 ${c.ring}`}>
 <Icon className={`h-5 w-5 ${c.text}`} />
 </div>
 <div>
 <p className="text-xs font-medium text-slate-400">{stat.label}</p>
 <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
 </div>
 </div>
 </div>
 );
 }

 return null;
}

export default function StylePreviewPage() {
 const [activeStyle, setActiveStyle] = useState("gradient");

 return (
 <div className="mx-auto max-w-6xl">
 <div className="mb-8">
 <h1 className="text-2xl font-bold text-slate-900">Style Preview</h1>
 <p className="mt-1 text-sm text-slate-500">
 Переключайте стили, чтобы выбрать лучший вариант
 </p>
 </div>

 {/* Style Selector */}
 <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
 {STYLES.map((s) => (
 <button
 key={s.id}
 onClick={() => setActiveStyle(s.id)}
 className={`rounded-lg border-2 px-4 py-3 text-left transition-all duration-200 ${
 activeStyle === s.id
 ? "border-green-500 bg-green-50 shadow-md"
 : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
 }`}
 >
 <p className={`text-sm font-semibold ${activeStyle === s.id ? "text-green-700" : "text-slate-700"}`}>
 {s.name}
 </p>
 <p className="mt-0.5 text-[11px] text-slate-400">{s.desc}</p>
 </button>
 ))}
 </div>

 {/* Preview: Stats Grid (4 columns) */}
 <div className="mb-6">
 <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
 Stats Grid (4 columns) — как на Dashboard
 </h2>
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
 {STATS.map((stat) => (
 <StatCard key={stat.label} stat={stat} style={activeStyle} />
 ))}
 </div>
 </div>

 {/* Preview: Stats Grid (3 columns) */}
 <div className="mb-6">
 <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
 Stats Grid (3 columns) — как на Analytics
 </h2>
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
 {[...STATS.slice(0, 1), ...EXTRA_STATS].map((stat) => (
 <StatCard key={stat.label} stat={stat} style={activeStyle} />
 ))}
 </div>
 </div>

 {/* Preview: Quick Links style */}
 <div className="mb-6">
 <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
 Quick Links — как на Admin Dashboard
 </h2>
 <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
 {[
 { label: "Manage Users", icon: Users, color: "indigo" },
 { label: "Manage Courses", icon: BookOpen, color: "emerald" },
 { label: "View Analytics", icon: BookOpen, color: "violet" },
 ].map((item) => {
 const Icon = item.icon;
 const c = colorMap[item.color];

 if (activeStyle === "gradient") {
 return (
 <div key={item.label} className={`flex cursor-pointer items-center justify-between rounded-lg bg-gradient-to-br ${c.gradient} p-5 shadow-sm transition-all hover:shadow-md`}>
 <div className="flex items-center gap-3">
 <Icon className={`h-5 w-5 ${c.text}`} />
 <span className="text-sm font-medium text-slate-700">{item.label}</span>
 </div>
 <span className="text-slate-300">&rarr;</span>
 </div>
 );
 }
 if (activeStyle === "leftbar") {
 return (
 <div key={item.label} className={`flex cursor-pointer items-center justify-between rounded-lg border-l-4 ${c.border} bg-white p-5 shadow-sm transition-all hover:shadow-md`}>
 <div className="flex items-center gap-3">
 <Icon className={`h-5 w-5 ${c.text}`} />
 <span className="text-sm font-medium text-slate-700">{item.label}</span>
 </div>
 <span className="text-slate-300">&rarr;</span>
 </div>
 );
 }
 if (activeStyle === "minimal") {
 return (
 <div key={item.label} className="flex cursor-pointer items-center justify-between rounded-lg bg-white p-5 shadow-md transition-all hover:shadow-lg">
 <div className="flex items-center gap-3">
 <div className={`rounded-lg ${c.iconBg} p-2`}>
 <Icon className={`h-4 w-4 ${c.text}`} />
 </div>
 <span className="text-sm font-medium text-slate-700">{item.label}</span>
 </div>
 <span className="text-slate-300">&rarr;</span>
 </div>
 );
 }
 if (activeStyle === "glass") {
 return (
 <div key={item.label} className="relative flex cursor-pointer items-center justify-between overflow-hidden rounded-lg border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
 <div className={`absolute inset-x-0 top-0 h-1 ${c.bg}`} />
 <div className="flex items-center gap-3">
 <Icon className={`h-5 w-5 ${c.text}`} />
 <span className="text-sm font-medium text-slate-700">{item.label}</span>
 </div>
 <span className="text-slate-300">&rarr;</span>
 </div>
 );
 }
 if (activeStyle === "neumorphism") {
 return (
 <div key={item.label} className="flex cursor-pointer items-center justify-between rounded-lg bg-slate-50 p-5 shadow-[6px_6px_12px_#d1d5db,-6px_-6px_12px_#ffffff] transition-all hover:shadow-[8px_8px_16px_#d1d5db,-8px_-8px_16px_#ffffff]">
 <div className="flex items-center gap-3">
 <Icon className={`h-5 w-5 ${c.text}`} />
 <span className="text-sm font-medium text-slate-700">{item.label}</span>
 </div>
 <span className="text-slate-300">&rarr;</span>
 </div>
 );
 }
 if (activeStyle === "outlined") {
 return (
 <div key={item.label} className={`flex cursor-pointer items-center justify-between rounded-lg border-2 ${c.border}/30 bg-white p-5 transition-all hover:shadow-md`}>
 <div className="flex items-center gap-3">
 <div className={`rounded-lg ${c.bg} p-2 ring-2 ${c.ring}`}>
 <Icon className={`h-4 w-4 ${c.text}`} />
 </div>
 <span className="text-sm font-medium text-slate-700">{item.label}</span>
 </div>
 <span className="text-slate-300">&rarr;</span>
 </div>
 );
 }
 return null;
 })}
 </div>
 </div>

 {/* Side-by-side comparison */}
 <div className="mb-6">
 <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
 Текущий стиль (для сравнения)
 </h2>
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
 {STATS.map((stat) => {
 const Icon = stat.icon;
 const c = colorMap[stat.color];
 return (
 <div key={stat.label} className="rounded-lg border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:shadow-md">
 <div className="flex items-center gap-4">
 <div className={`rounded-lg ${c.bg} p-3`}>
 <Icon className={`h-5 w-5 ${c.text}`} />
 </div>
 <div>
 <p className="text-xs font-medium text-slate-400">{stat.label}</p>
 <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 );
}
