import React from 'react';
import { Bell, BellOff, Eye, Pause, Play, RotateCcw, Settings2, SkipForward, Timer, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const SETTINGS_KEY = 'eye-care-settings';
const STATS_KEY = 'eye-care-stats';

const presets = [
  { key: 'classic', label: '20-20-20', workMinutes: 20, restSeconds: 20, distanceFeet: 20 },
  { key: 'deep', label: '30-30 reset', workMinutes: 30, restSeconds: 30, distanceFeet: 20 },
  { key: 'long', label: '45-60 recovery', workMinutes: 45, restSeconds: 60, distanceFeet: 20 }
];

const guidance = [
  'Look at the farthest object you can see.',
  'Blink slowly five times.',
  'Relax your jaw and shoulders.',
  'Trace a window edge or distant line.',
  'Let your eyes soften before returning.'
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function defaultSettings() {
  return {
    workMinutes: 20,
    restSeconds: 20,
    distanceFeet: 20,
    sound: true,
    notifications: false
  };
}

function defaultStats() {
  return {
    date: todayKey(),
    cycles: 0,
    skipped: 0,
    focusSeconds: 0,
    breakSeconds: 0
  };
}

function loadJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    return parsed || fallback;
  } catch (error) {
    return fallback;
  }
}

function formatClock(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

function minutes(seconds) {
  return Math.round((seconds / 60) * 10) / 10;
}

function playChime() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 660;
  gain.gain.setValueAtTime(0.001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.55);
}

export function EyeCareScreen() {
  const [settings, setSettings] = React.useState(() => ({ ...defaultSettings(), ...loadJson(SETTINGS_KEY, {}) }));
  const [phase, setPhase] = React.useState('work');
  const [seconds, setSeconds] = React.useState(() => settings.workMinutes * 60);
  const [running, setRunning] = React.useState(false);
  const [stats, setStats] = React.useState(() => {
    const saved = loadJson(STATS_KEY, defaultStats());
    return saved.date === todayKey() ? saved : defaultStats();
  });
  const settingsRef = React.useRef(settings);
  const phaseRef = React.useRef(phase);

  React.useEffect(() => {
    settingsRef.current = settings;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  React.useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  React.useEffect(() => {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }, [stats]);

  const notify = React.useCallback((nextPhase) => {
    const currentSettings = settingsRef.current;
    if (currentSettings.sound) playChime();
    if (currentSettings.notifications && 'Notification' in window && Notification.permission === 'granted') {
      const title = nextPhase === 'rest' ? 'Eye break time' : 'Back to focus';
      const body = nextPhase === 'rest'
        ? `Look ${currentSettings.distanceFeet} feet away for ${currentSettings.restSeconds} seconds.`
        : 'Nice. Start the next focus block.';
      new Notification(title, { body });
    }
  }, []);

  React.useEffect(() => {
    if (!running) return undefined;

    const interval = window.setInterval(() => {
      setSeconds((current) => {
        const currentPhase = phaseRef.current;

        if (current > 1) {
          setStats((value) => ({
            ...value,
            focusSeconds: value.focusSeconds + (currentPhase === 'work' ? 1 : 0),
            breakSeconds: value.breakSeconds + (currentPhase === 'rest' ? 1 : 0)
          }));
          return current - 1;
        }

        const nextPhase = currentPhase === 'work' ? 'rest' : 'work';
        setPhase(nextPhase);
        notify(nextPhase);

        if (currentPhase === 'rest') {
          setStats((value) => ({ ...value, cycles: value.cycles + 1, breakSeconds: value.breakSeconds + 1 }));
        } else {
          setStats((value) => ({ ...value, focusSeconds: value.focusSeconds + 1 }));
        }

        return nextPhase === 'work'
          ? settingsRef.current.workMinutes * 60
          : settingsRef.current.restSeconds;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [running, notify]);

  const reset = () => {
    setRunning(false);
    setPhase('work');
    setSeconds(settings.workMinutes * 60);
  };

  const resetStats = () => {
    setStats(defaultStats());
  };

  const startBreakNow = () => {
    setRunning(true);
    setPhase('rest');
    setSeconds(settings.restSeconds);
    notify('rest');
  };

  const skipBreak = () => {
    setPhase('work');
    setSeconds(settings.workMinutes * 60);
    setStats((value) => ({ ...value, skipped: value.skipped + 1 }));
  };

  const requestNotifications = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setSettings((value) => ({ ...value, notifications: permission === 'granted' }));
  };

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const applyPreset = (preset) => {
    setSettings((current) => ({
      ...current,
      workMinutes: preset.workMinutes,
      restSeconds: preset.restSeconds,
      distanceFeet: preset.distanceFeet
    }));
    setRunning(false);
    setPhase('work');
    setSeconds(preset.workMinutes * 60);
  };

  const phaseTotal = phase === 'work' ? settings.workMinutes * 60 : settings.restSeconds;
  const progress = Math.min(100, 100 - (seconds / Math.max(1, phaseTotal)) * 100);
  const currentGuidance = guidance[Math.min(guidance.length - 1, Math.floor(((phaseTotal - seconds) / Math.max(1, phaseTotal)) * guidance.length))];
  const activePreset = presets.find((preset) => preset.workMinutes === Number(settings.workMinutes) && preset.restSeconds === Number(settings.restSeconds));

  return (
    <section className="h-full overflow-y-auto px-4 pb-8 pt-4 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
        <div className="grid gap-5">
          <Card>
            <CardContent className="p-5">
              <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Eye size={15} />
                Eye care protocol
              </p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight lg:text-5xl">Give your eyes a proper recovery rhythm.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
                Run focus blocks, take guided distance breaks, track skipped breaks, and use browser reminders when you are deep in work.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="border border-border/80 bg-muted/25 p-3">
                  <p className="font-mono text-[11px] uppercase text-muted-foreground">Focus today</p>
                  <p className="text-2xl font-semibold">{minutes(stats.focusSeconds)}m</p>
                </div>
                <div className="border border-border/80 bg-muted/25 p-3">
                  <p className="font-mono text-[11px] uppercase text-muted-foreground">Breaks done</p>
                  <p className="text-2xl font-semibold">{stats.cycles}</p>
                </div>
                <div className="border border-border/80 bg-muted/25 p-3">
                  <p className="font-mono text-[11px] uppercase text-muted-foreground">Skipped</p>
                  <p className="text-2xl font-semibold">{stats.skipped}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    <Settings2 size={15} />
                    Presets and settings
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight">Tune the reminder</h3>
                </div>
                {activePreset ? <Badge>{activePreset.label}</Badge> : <Badge variant="muted">Custom</Badge>}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {presets.map((preset) => (
                  <Button
                    key={preset.key}
                    variant={activePreset?.key === preset.key ? 'primary' : 'outline'}
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label>
                  <span className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Focus minutes</span>
                  <Input
                    type="number"
                    min="1"
                    max="120"
                    value={settings.workMinutes}
                    onChange={(event) => updateSetting('workMinutes', Math.max(1, Number(event.target.value || 1)))}
                  />
                </label>
                <label>
                  <span className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Break seconds</span>
                  <Input
                    type="number"
                    min="5"
                    max="300"
                    value={settings.restSeconds}
                    onChange={(event) => updateSetting('restSeconds', Math.max(5, Number(event.target.value || 5)))}
                  />
                </label>
                <label>
                  <span className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Distance feet</span>
                  <Input
                    type="number"
                    min="5"
                    max="100"
                    value={settings.distanceFeet}
                    onChange={(event) => updateSetting('distanceFeet', Math.max(5, Number(event.target.value || 5)))}
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <Button variant={settings.sound ? 'secondary' : 'outline'} onClick={() => updateSetting('sound', !settings.sound)}>
                  {settings.sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
                  Sound
                </Button>
                <Button variant={settings.notifications ? 'secondary' : 'outline'} onClick={settings.notifications ? () => updateSetting('notifications', false) : requestNotifications}>
                  {settings.notifications ? <Bell size={17} /> : <BellOff size={17} />}
                  Reminders
                </Button>
                <Button variant="outline" onClick={resetStats}>
                  <RotateCcw size={17} />
                  Clear stats
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5">
          <Card>
            <CardContent className="p-5">
              <div className="border border-border/80 bg-muted/20 p-5 text-center">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Badge variant={phase === 'work' ? 'default' : 'secondary'}>{phase === 'work' ? 'Focus block' : 'Eye break'}</Badge>
                  <Badge variant="muted">
                    <Timer size={13} />
                    {settings.workMinutes}m / {settings.restSeconds}s
                  </Badge>
                </div>

                <div className="my-8 font-mono text-7xl font-bold tracking-tight lg:text-8xl">{formatClock(seconds)}</div>

                <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
                  {phase === 'work'
                    ? `Work normally. The next break asks you to look ${settings.distanceFeet} feet away.`
                    : currentGuidance}
                </p>
              </div>

              <div className="mt-4 h-2 border border-border bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                <Button onClick={() => setRunning((value) => !value)}>
                  {running ? <Pause size={17} /> : <Play size={17} />}
                  {running ? 'Pause' : 'Start'}
                </Button>
                <Button variant="outline" onClick={reset}>
                  <RotateCcw size={17} />
                  Reset
                </Button>
                <Button variant="outline" onClick={startBreakNow}>
                  <Eye size={17} />
                  Break now
                </Button>
                <Button variant="outline" onClick={skipBreak} disabled={phase !== 'rest'}>
                  <SkipForward size={17} />
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Break checklist</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight">Make the 20 seconds count</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {guidance.map((item, index) => (
                  <div key={item} className="flex gap-3 border border-border/80 bg-muted/20 p-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center border border-border bg-background font-mono text-xs text-muted-foreground">{index + 1}</span>
                    <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
