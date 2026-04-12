import { BarChart3, BookOpenCheck, Eye, Trophy, SunMedium, UserRound, Utensils } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const tabs = [
  { key: 'checkin', label: 'Check In', icon: SunMedium },
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'diet', label: 'Diet', icon: Utensils },
  { key: 'learning', label: 'Learning', icon: BookOpenCheck },
  { key: 'eye-care', label: 'Eye Care', icon: Eye },
  { key: 'leaderboard', label: 'Leaders', icon: Trophy },
  { key: 'profile', label: 'Profile', icon: UserRound }
];

export function BottomNav({ active, onChange }) {
  return (
    <nav className="no-scrollbar w-full overflow-x-auto">
      <div className="flex min-w-max gap-1 rounded-lg border border-border bg-card/75 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={cn(
                'relative flex min-h-10 min-w-[116px] items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition active:scale-[0.98]',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {isActive ? (
                <motion.span
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 rounded-lg bg-primary/12"
                  transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                />
              ) : null}
              <motion.span animate={isActive ? { y: -2, scale: 1.08 } : { y: 0, scale: 1 }} className="relative">
                <Icon size={18} />
              </motion.span>
              <span className="relative">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
