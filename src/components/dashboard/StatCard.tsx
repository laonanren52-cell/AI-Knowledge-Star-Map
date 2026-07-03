import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}

export default function StatCard({ label, value, detail, icon: Icon }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className="lux-card stat-glass-card hover-lift group rounded-2xl p-5"
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[var(--glow-accent)] blur-3xl transition group-hover:opacity-80" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--text-muted)]">{label}</p>
          <p className="mt-3 text-4xl font-semibold tracking-normal text-[var(--text-primary)]">{value}</p>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{detail}</p>
        </div>
        <span className="icon-tile grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-hover)] text-[var(--accent)]">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </motion.div>
  );
}
