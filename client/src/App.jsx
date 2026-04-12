import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { ArrowDownToLine, CalendarDays, Loader2, LogOut, Moon, Sparkles, SunMedium, UserRound } from 'lucide-react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { exportWeek } from '@/api';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { LoginScreen } from '@/components/LoginScreen';
import { CheckInScreen } from '@/components/CheckInScreen';
import { Dashboard } from '@/components/Dashboard';
import { DietScreen } from '@/components/DietScreen';
import { BottomNav } from '@/components/BottomNav';
import { ProfileScreen } from '@/components/ProfileScreen';
import { LearningScreen } from '@/components/LearningScreen';
import { LeaderboardScreen } from '@/components/LeaderboardScreen';
import { EyeCareScreen } from '@/components/EyeCareScreen';
import { WeekSelector } from '@/components/WeekSelector';
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

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = React.useState(() => localStorage.getItem('token'));
  const [selectedDate, setSelectedDate] = React.useState(todayIso);
  const [dashboardWeek, setDashboardWeek] = React.useState(currentWeekIso);
  const [theme, setTheme] = React.useState(() => localStorage.getItem('theme') || 'dark');
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const { toast } = useToast();
  const path = location.pathname;
  const isDashboard = path === '/dashboard';
  const isCheckin = path === '/checkin' || path === '/';
  const activeWeek = isDashboard ? dashboardWeek : weekForDate(selectedDate);
  const routine = useRoutine(token && (isDashboard || isCheckin) ? activeWeek : null);

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

  if (!token) {
    return (
      <div className="app-shell">
        <LoginScreen onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="app-shell relative flex flex-col overflow-hidden">
      <header className="safe-top sticky top-0 z-30 border-b border-border/80 bg-background/95 px-4 pb-3 backdrop-blur-xl lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {isDashboard ? <CalendarDays size={15} /> : <Sparkles size={15} />}
              {isDashboard
                ? `Week of ${format(parseISO(dashboardWeek), 'MMM d')}`
                : isCheckin
                  ? format(parseISO(selectedDate), 'EEEE, MMM d')
                  : path === '/diet'
                    ? 'Diet and food log'
                    : path === '/learning'
                      ? 'Learning progress'
                      : path === '/eye-care'
                        ? '20-20-20 eye care'
                      : path === '/leaderboard'
                        ? 'Leaderboard and challenges'
                        : 'User profile'}
            </div>
            <h1 className="truncate text-2xl font-semibold leading-tight tracking-tight lg:text-3xl">Morning Ritual</h1>
          </div>
          <div className="grid gap-3">
            <div className="flex items-center justify-end gap-2">
              {isDashboard ? (
                <div className="mr-auto grid min-w-0 flex-1 grid-cols-[minmax(210px,1fr)_auto] gap-2 lg:mr-2 lg:w-[430px] lg:flex-none">
                  <WeekSelector week={dashboardWeek} onPrevious={() => setDashboardWeek((current) => iso(addDays(parseISO(current), -7)))} onNext={() => setDashboardWeek((current) => iso(addDays(parseISO(current), 7)))} />
                  <Button onClick={download} disabled={exporting || routine.isFetching}>
                    {exporting ? <Loader2 className="animate-spin" size={17} /> : <ArrowDownToLine size={17} />}
                    Export
                  </Button>
                </div>
              ) : null}
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
        <div className="mx-auto mt-3 w-full max-w-6xl">
          <BottomNav active={path.replace('/', '') || 'checkin'} onChange={(next) => navigate(`/${next}`)} />
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden">
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
                    navigate('/dashboard');
                  }}
                />
              )} />
              <Route path="/dashboard" element={<Dashboard week={dashboardWeek} rows={routine.data || []} isLoading={routine.isLoading} onWeekSelect={setDashboardWeek} />} />
              <Route path="/diet" element={<DietScreen />} />
              <Route path="/learning" element={<LearningScreen />} />
              <Route path="/eye-care" element={<EyeCareScreen />} />
              <Route path="/leaderboard" element={<LeaderboardScreen />} />
              <Route path="/profile" element={<ProfileScreen />} />
              <Route path="*" element={<Navigate to="/checkin" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
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
