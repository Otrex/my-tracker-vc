import { Activity, BarChart3, BookOpenCheck, Eye, Gamepad2, Trophy, SunMedium, UserRound, Utensils } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const tabs = [
  { key: 'checkin', label: 'Check In', icon: SunMedium },
  { key: 'dashboard', label: 'Metrics', icon: BarChart3 },
  { key: 'fitness', label: 'Fitness', icon: Activity },
  { key: 'diet', label: 'Diet', icon: Utensils },
  { key: 'learning', label: 'Learning', icon: BookOpenCheck },
  { key: 'eye-care', label: 'Eye Care', icon: Eye },
  { key: 'game', label: 'Game', icon: Gamepad2 },
  { key: 'leaderboard', label: 'Leaders', icon: Trophy },
  { key: 'profile', label: 'Profile', icon: UserRound }
];

export function BottomNav({ active, onChange }) {
  return (
    <nav className="w-full">
      <div className="grid gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={cn(
                'relative flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition active:scale-[0.98]',
                isActive ? 'text-primary' : 'text-muted-foreground hover:bg-muted/55 hover:text-foreground'
              )}
            >
              {isActive ? (
                <motion.span
                  layoutId="sidebar-nav-active"
                  className="absolute inset-0 rounded-lg bg-primary/12"
                  transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                />
              ) : null}
              <motion.span animate={isActive ? { x: 2, scale: 1.06 } : { x: 0, scale: 1 }} className="relative">
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
