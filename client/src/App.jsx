import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { ArrowDownToLine, CalendarDays, Loader2, LogOut, Menu, Moon, Sparkles, SunMedium, UserRound } from 'lucide-react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { exportWeek } from '@/api';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { LoginScreen } from '@/components/LoginScreen';
import { CheckInScreen } from '@/components/CheckInScreen';
import { Dashboard } from '@/components/Dashboard';
import { FitnessScreen } from '@/components/FitnessScreen';
import { DietScreen } from '@/components/DietScreen';
import { BottomNav } from '@/components/BottomNav';
import { ProfileScreen } from '@/components/ProfileScreen';
import { LearningScreen } from '@/components/LearningScreen';
import { LeaderboardScreen } from '@/components/LeaderboardScreen';
import { EyeCareScreen } from '@/components/EyeCareScreen';
import { GameScreen } from '@/components/GameScreen';
import { WeekSelector } from '@/components/WeekSelector';
import { useProfile } from '@/hooks/useProfile';
import { useRoutine } from '@/hooks/useRoutine';
import { useToast } from '@/components/ui/toast';

function iso(date) {
  return format(date, 'yyyy-MM-dd');
}

function currentWeekIso() {
  return iso(startOfWeek(new Date(), { weekStartsOn: 1 }));
}

function weekForDate(value) {
  return iso(startOfWeek(parseISO(value), { weekStartsOn: 1 }));
}

function todayIso() {
  return iso(new Date());
}

function pageEyebrow(path, selectedDate, dashboardWeek, isDashboard, isFitness, isCheckin) {
  if (isDashboard) return 'All feature metrics';
  if (isFitness) return `Fitness week of ${format(parseISO(dashboardWeek), 'MMM d')}`;
  if (isCheckin) return format(parseISO(selectedDate), 'EEEE, MMM d');
  if (path.startsWith('/diet')) return 'Diet and food log';
  if (path.startsWith('/learning')) return 'Learning progress';
  if (path === '/eye-care') return '20-20-20 eye care';
  if (path === '/game') return 'Multiplayer focus game';
  if (path === '/leaderboard') return 'Leaderboard and challenges';
  return 'User profile';
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = React.useState(() => localStorage.getItem('token'));
  const [selectedDate, setSelectedDate] = React.useState(todayIso);
  const [dashboardWeek, setDashboardWeek] = React.useState(currentWeekIso);
  const [theme, setTheme] = React.useState(() => localStorage.getItem('theme') || 'dark');
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const { toast } = useToast();
  const profile = useProfile(Boolean(token));
  const path = location.pathname;
  const isDashboard = path === '/dashboard';
  const isFitness = path === '/fitness';
  const isCheckin = path === '/checkin' || path === '/';
  const activeRoot = path.split('/')[1] || 'checkin';
  const activeWeek = (isDashboard || isFitness) ? dashboardWeek : weekForDate(selectedDate);
  const routine = useRoutine(token && (isDashboard || isFitness || isCheckin) ? activeWeek : null);

  React.useEffect(() => {
    const onExpired = () => {
      setToken(null);
      navigate('/login', { replace: true });
    };

    window.addEventListener('auth-expired', onExpired);
    return () => window.removeEventListener('auth-expired', onExpired);
  }, []);

  React.useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogin = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setSelectedDate(todayIso());
    navigate('/checkin', { replace: true });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setLogoutOpen(false);
    navigate('/login', { replace: true });
  };

  const download = async () => {
    setExporting(true);
    try {
      await exportWeek(dashboardWeek);
      toast('Spreadsheet downloaded');
    } catch (error) {
      toast(error.message || 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const navigateFromMenu = (next) => {
    const target = next === 'diet'
      ? '/diet/today'
      : next === 'learning'
        ? '/learning/plan'
        : `/${next}`;
    navigate(target);
    setMenuOpen(false);
  };

  if (!token) {
    return (
      <div className="app-shell">
        <LoginScreen onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="app-shell relative flex overflow-hidden">
      <aside className="safe-top safe-bottom hidden w-60 shrink-0 border-r border-border bg-background px-3 lg:flex lg:flex-col">
        <div className="mb-5 border-b border-border px-3 pb-5">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Morning Ritual</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Control Room</h1>
        </div>
        <BottomNav active={activeRoot} onChange={navigateFromMenu} />
        <div className="mt-auto rounded-lg border border-border/80 bg-card/50 p-3 text-xs leading-5 text-muted-foreground">
          Check in first, then use the other spaces to improve the numbers.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="safe-top sticky top-0 z-40 shrink-0 border-b border-border bg-background/95 px-3 pb-3 backdrop-blur-xl sm:px-4 lg:px-6">
          <div className="grid w-full min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <Button className="mt-1 lg:hidden" variant="outline" size="icon" onClick={() => setMenuOpen(true)} aria-label="Open navigation">
                <Menu size={20} />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {isDashboard || isFitness ? <CalendarDays size={15} /> : <Sparkles size={15} />}
                  {pageEyebrow(path, selectedDate, dashboardWeek, isDashboard, isFitness, isCheckin)}
                </div>
                <h1 className="truncate text-xl font-semibold leading-tight tracking-tight lg:text-2xl">Morning Ritual</h1>
              </div>
            </div>
            <div className="grid min-w-0 gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center xl:flex xl:justify-end">
              {isDashboard || isFitness ? (
                <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(230px,360px)_auto] sm:items-center xl:w-auto">
                  <WeekSelector
                    className="w-full"
                    week={dashboardWeek}
                    onPrevious={() => setDashboardWeek((current) => iso(addDays(parseISO(current), -7)))}
                    onNext={() => setDashboardWeek((current) => iso(addDays(parseISO(current), 7)))}
                  />
                  {isFitness ? (
                    <Button className="w-full sm:w-auto" onClick={download} disabled={exporting || routine.isFetching}>
                      {exporting ? <Loader2 className="animate-spin" size={17} /> : <ArrowDownToLine size={17} />}
                      Export
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <div className="flex min-w-0 items-center justify-end gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 border border-border/80 bg-card/70 px-2 py-2 sm:max-w-[240px] sm:flex-none sm:px-3">
                  <div
                    className="grid h-7 w-7 shrink-0 place-items-center border border-border/40 text-xs font-semibold text-black"
                    style={{ backgroundColor: profile.data?.avatar_color || '#ff8c2a' }}
                  >
                    {(profile.data?.display_name || profile.data?.username || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-none">{profile.data?.display_name || profile.data?.username || 'Signed in'}</p>
                    <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">@{profile.data?.username || '...'}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
                  aria-label="Toggle light or dark mode"
                >
                  {theme === 'dark' ? <SunMedium size={20} /> : <Moon size={20} />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => setLogoutOpen(true)} aria-label="Open profile actions">
                  <UserRound size={20} />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ x: 28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -28, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              <Routes location={location}>
                <Route path="/" element={<Navigate to="/checkin" replace />} />
                <Route path="/checkin" element={(
                  <CheckInScreen
                    selectedDate={selectedDate}
                    week={activeWeek}
                    rows={routine.data || []}
                    isLoading={routine.isLoading}
                    onShiftDate={(days) => setSelectedDate((current) => iso(addDays(parseISO(current), days)))}
                    onOpenDashboard={() => {
                      setDashboardWeek(weekForDate(selectedDate));
                      navigate('/fitness');
                    }}
                  />
                )} />
                <Route path="/dashboard" element={<Dashboard week={dashboardWeek} rows={routine.data || []} isLoading={routine.isLoading} onWeekSelect={setDashboardWeek} />} />
                <Route path="/fitness" element={<FitnessScreen week={dashboardWeek} rows={routine.data || []} isLoading={routine.isLoading} onWeekSelect={setDashboardWeek} />} />
                <Route path="/diet/*" element={<DietScreen />} />
                <Route path="/learning/*" element={<LearningScreen />} />
                <Route path="/eye-care" element={<EyeCareScreen />} />
                <Route path="/game" element={<GameScreen />} />
                <Route path="/leaderboard" element={<LeaderboardScreen onOpenGame={() => navigate('/game')} />} />
                <Route path="/profile" element={<ProfileScreen />} />
                <Route path="*" element={<Navigate to="/checkin" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen} title="Navigation" side="left" className="max-w-[320px]">
        <BottomNav active={activeRoot} onChange={navigateFromMenu} />
      </Sheet>

      <Sheet open={logoutOpen} onOpenChange={setLogoutOpen} title="End session?">
        <p className="mb-4 text-sm leading-6 text-muted-foreground">
          Your routine is already saved. Log back in any time with your admin credentials.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => setLogoutOpen(false)}>Stay</Button>
          <Button variant="destructive" onClick={logout}>
            <LogOut size={18} />
            Logout
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
