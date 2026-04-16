import React from 'react';
import { motion } from 'framer-motion';
import { Brain, CheckCircle2, Gamepad2, Loader2, Play, Plus, Radio, Sparkles, Swords, Trophy } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useProfile } from '@/hooks/useProfile';
import { useGameMatches } from '@/hooks/useSocial';
import { createGameSocket, emitGame } from '@/realtime';

const gameModes = [
  {
    key: 'target',
    name: 'Target Rush',
    icon: Sparkles,
    seconds: 30,
    copy: 'Tap the moving target as fast as you can. Simple, sharp, satisfying.'
  },
  {
    key: 'math',
    name: 'Brain Blitz',
    icon: Brain,
    seconds: 45,
    copy: 'Answer quick arithmetic prompts. Fast minds collect bigger streaks.'
  },
  {
    key: 'memory',
    name: 'Memory Ladder',
    icon: Radio,
    seconds: 45,
    copy: 'Repeat the color sequence. Each correct round grows the ladder.'
  }
];

const colorClasses = {
  Orange: 'bg-primary text-primary-foreground',
  Mint: 'bg-secondary text-secondary-foreground',
  Gold: 'bg-accent text-accent-foreground',
  Red: 'bg-destructive text-destructive-foreground'
};

function seedNumber(seed) {
  return seed.split('').reduce((total, char) => total + char.charCodeAt(0) * 17, 97);
}

function targetPosition(seed, index) {
  const value = Math.sin(seedNumber(seed) + index * 997) * 10000;
  const next = Math.sin(seedNumber(seed) * 3 + index * 739) * 10000;
  return {
    left: `${9 + (Math.abs(value) % 78)}%`,
    top: `${14 + (Math.abs(next) % 66)}%`
  };
}

function opponentFor(match, username) {
  return match?.challenger_username === username ? match?.opponent_username : match?.challenger_username;
}

function modeFor(type) {
  return gameModes.find((mode) => mode.key === type) || gameModes[0];
}

export function GameScreen() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const profile = useProfile();
  const matches = useGameMatches();
  const username = profile.data?.username;
  const [socket, setSocket] = React.useState(null);
  const [connected, setConnected] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState('target');
  const [opponent, setOpponent] = React.useState('');
  const [activeMatch, setActiveMatch] = React.useState(null);
  const [liveState, setLiveState] = React.useState(null);
  const [prompt, setPrompt] = React.useState(null);
  const [targetIndex, setTargetIndex] = React.useState(0);
  const [mathAnswer, setMathAnswer] = React.useState('');
  const [memoryAnswer, setMemoryAnswer] = React.useState([]);
  const [busyAction, setBusyAction] = React.useState('');
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    const nextSocket = createGameSocket();
    setSocket(nextSocket);

    nextSocket.on('connect', () => setConnected(true));
    nextSocket.on('disconnect', () => setConnected(false));
    nextSocket.on('connect_error', (error) => toast(error.message || 'Could not connect to game server', 'error'));
    nextSocket.on('game:error', (payload) => toast(payload?.error || 'Game error', 'error'));
    nextSocket.on('game:match-updated', (match) => {
      queryClient.invalidateQueries({ queryKey: ['game-matches'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      setActiveMatch((current) => current?.id === match.id ? match : current);
    });
    nextSocket.on('game:ready', (match) => {
      setActiveMatch(match);
      toast('Match is ready');
    });
    nextSocket.on('game:started', (state) => {
      setLiveState(state);
      setActiveMatch(state.match);
      setTargetIndex(0);
      setMemoryAnswer([]);
      setMathAnswer('');
    });
    nextSocket.on('game:state', (state) => {
      setLiveState(state);
      setActiveMatch(state.match);
    });
    nextSocket.on('game:prompt', (nextPrompt) => {
      setPrompt(nextPrompt);
      setMemoryAnswer([]);
      setMathAnswer('');
    });
    nextSocket.on('game:finished', (match) => {
      setActiveMatch(match);
      setLiveState(null);
      setPrompt(null);
      queryClient.invalidateQueries({ queryKey: ['game-matches'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      toast(match.winner_username ? `${match.winner_username} wins` : 'Game ended in a draw');
    });

    return () => nextSocket.disconnect();
  }, [queryClient]);

  React.useEffect(() => {
    if (!liveState) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [liveState]);

  const send = async (event, payload) => {
    const response = await emitGame(socket, event, payload);
    return response;
  };

  const create = async () => {
    setBusyAction('create');
    try {
      const response = await send('game:create', { opponent_username: opponent, game_type: selectedType });
      setOpponent('');
      setActiveMatch(response.match);
      queryClient.invalidateQueries({ queryKey: ['game-matches'] });
      toast('Game invite sent');
    } catch (error) {
      toast(error.message || 'Could not create match', 'error');
    } finally {
      setBusyAction('');
    }
  };

  const accept = async (match) => {
    setBusyAction(`accept-${match.id}`);
    try {
      const response = await send('game:accept', { id: match.id });
      setActiveMatch(response.match);
      queryClient.invalidateQueries({ queryKey: ['game-matches'] });
    } catch (error) {
      toast(error.message || 'Could not accept match', 'error');
    } finally {
      setBusyAction('');
    }
  };

  const join = async (match) => {
    setBusyAction(`join-${match.id}`);
    try {
      const response = await send('game:join', { id: match.id });
      setActiveMatch(response.match);
      setSelectedType(response.match.game_type || 'target');
      if (!response.live) setLiveState(null);
    } catch (error) {
      toast(error.message || 'Could not join match', 'error');
    } finally {
      setBusyAction('');
    }
  };

  const start = async (match = activeMatch) => {
    if (!match) return;
    setBusyAction(`start-${match.id}`);
    try {
      const response = await send('game:start', { id: match.id });
      setLiveState(response.state);
      setActiveMatch(response.state.match);
    } catch (error) {
      toast(error.message || 'Could not start game', 'error');
    } finally {
      setBusyAction('');
    }
  };

  const targetHit = async () => {
    if (!activeMatch || !liveState) return;
    setTargetIndex((current) => current + 1);
    try {
      await send('game:action', { id: activeMatch.id, action: { kind: 'hit' } });
    } catch (error) {
      toast(error.message || 'Hit did not register', 'error');
    }
  };

  const submitMath = async () => {
    if (!activeMatch || !mathAnswer.trim()) return;
    try {
      await send('game:action', { id: activeMatch.id, action: { kind: 'answer', answer: mathAnswer } });
    } catch (error) {
      toast(error.message || 'Answer did not submit', 'error');
    }
  };

  const chooseMemory = async (color) => {
    if (!activeMatch || !prompt?.sequence) return;
    const next = [...memoryAnswer, color];
    setMemoryAnswer(next);
    if (next.length === prompt.sequence.length) {
      try {
        await send('game:action', { id: activeMatch.id, action: { kind: 'sequence', sequence: next } });
      } catch (error) {
        toast(error.message || 'Sequence did not submit', 'error');
      }
    }
  };

  const sortedMatches = matches.data || [];
  const selectedMode = modeFor(activeMatch?.game_type || selectedType);
  const completed = sortedMatches.filter((match) => match.status === 'Completed');
  const wins = completed.filter((match) => match.winner_username === username).length;
  const bestScore = completed.reduce((best, match) => {
    const score = match.challenger_username === username ? match.challenger_score : match.opponent_score;
    return Math.max(best, Number(score || 0));
  }, 0);
  const myScore = liveState?.scores?.[username] ?? (activeMatch?.challenger_username === username ? activeMatch?.challenger_score : activeMatch?.opponent_score) ?? 0;
  const rival = opponentFor(activeMatch, username);
  const rivalScore = liveState?.scores?.[rival] ?? (activeMatch?.challenger_username === username ? activeMatch?.opponent_score : activeMatch?.challenger_score) ?? 0;
  const secondsLeft = liveState ? Math.max(0, Math.ceil((liveState.ends_at - now) / 1000)) : selectedMode.seconds;
  const boardPosition = activeMatch ? targetPosition(activeMatch.seed || 'practice', targetIndex) : { left: '50%', top: '50%' };
  const canStart = activeMatch && activeMatch.status === 'Active' && !liveState;
  const SelectedModeIcon = selectedMode.icon;

  return (
    <section className="h-full overflow-y-auto px-4 pb-8 pt-4 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-5 xl:grid-cols-[1fr_370px]">
        <div>
          <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Gamepad2 size={15} />
                Live multiplayer arcade
              </p>
              <h2 className="text-3xl font-semibold tracking-tight lg:text-4xl">Pick a game. Beat a friend.</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Websocket rooms keep scores live while completed matches feed the leaderboard.
              </p>
            </div>
            <Badge variant={connected ? 'secondary' : 'destructive'}>{connected ? 'Socket online' : 'Socket offline'}</Badge>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-3">
            {gameModes.map((mode) => {
              const Icon = mode.icon;
              const active = selectedType === mode.key;
              return (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setSelectedType(mode.key)}
                  className={`min-h-[132px] rounded-lg border p-4 text-left transition active:scale-[0.98] ${active ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-card/70 text-muted-foreground hover:text-foreground'}`}
                >
                  <Icon className={active ? 'text-primary' : ''} size={24} />
                  <p className="mt-3 font-semibold text-foreground">{mode.name}</p>
                  <p className="mt-1 text-xs leading-5">{mode.copy}</p>
                </button>
              );
            })}
          </div>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="mb-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/25 p-3">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">You</p>
                  <p className="text-3xl font-semibold">{myScore}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/25 p-3">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Timer</p>
                  <p className="text-3xl font-semibold">{secondsLeft}s</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/25 p-3">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{rival || 'Rival'}</p>
                  <p className="text-3xl font-semibold">{rivalScore}</p>
                </div>
              </div>

              <div className="relative min-h-[390px] overflow-hidden rounded-lg border border-border bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.16),transparent_42%),hsl(var(--background))] sm:min-h-[480px]">
                <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
                  <Badge variant={liveState ? 'secondary' : 'muted'}>{liveState ? 'Live room' : selectedMode.name}</Badge>
                  {activeMatch ? <Badge variant="amber">vs {rival}</Badge> : null}
                </div>

                {!activeMatch ? (
                  <div className="absolute inset-0 grid place-items-center p-6 text-center">
                    <div>
                      <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-lg border border-primary/50 bg-primary/15 text-primary">
                        <Swords size={34} />
                      </div>
                      <h3 className="text-2xl font-semibold tracking-tight">Create or join a match</h3>
                      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                        Choose a game type, invite a user, and start once the match is accepted.
                      </p>
                    </div>
                  </div>
                ) : null}

                {activeMatch && !liveState ? (
                  <div className="absolute inset-0 grid place-items-center p-6 text-center">
                    <div>
                      <SelectedModeIcon className="mx-auto mb-4 text-primary" size={42} />
                      <h3 className="text-2xl font-semibold tracking-tight">{selectedMode.name}</h3>
                      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                        {activeMatch.status === 'Pending' ? 'Waiting for the opponent to accept.' : 'Ready. Start the live room when both players are set.'}
                      </p>
                      {canStart ? (
                        <Button className="mt-5" onClick={() => start()}>
                          <Play size={17} />
                          Start live round
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {liveState && selectedMode.key === 'target' ? (
                  <motion.button
                    type="button"
                    key={`${activeMatch?.id}-${targetIndex}`}
                    onClick={targetHit}
                    initial={{ scale: 0.35, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileTap={{ scale: 0.86 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                    className="absolute h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-background bg-primary text-primary-foreground"
                    style={boardPosition}
                    aria-label="Tap target"
                  >
                    <span className="absolute inset-2 rounded-full border border-primary-foreground/30" />
                    <Sparkles className="relative mx-auto" size={28} />
                  </motion.button>
                ) : null}

                {liveState && selectedMode.key === 'math' ? (
                  <div className="absolute inset-0 grid place-items-center p-5">
                    <div className="w-full max-w-sm rounded-lg border border-border bg-card/90 p-5 text-center">
                      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Solve fast</p>
                      <p className="my-5 text-5xl font-semibold tracking-tight">{prompt?.question || '...'}</p>
                      <form
                        className="grid gap-3"
                        onSubmit={(event) => {
                          event.preventDefault();
                          submitMath();
                        }}
                      >
                        <Input value={mathAnswer} onChange={(event) => setMathAnswer(event.target.value)} inputMode="numeric" autoFocus placeholder="Answer" />
                        <Button type="submit">Submit answer</Button>
                      </form>
                    </div>
                  </div>
                ) : null}

                {liveState && selectedMode.key === 'memory' ? (
                  <div className="absolute inset-0 grid place-items-center p-5">
                    <div className="w-full max-w-lg rounded-lg border border-border bg-card/90 p-5 text-center">
                      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Repeat the ladder</p>
                      <div className="my-5 flex flex-wrap justify-center gap-2">
                        {prompt?.sequence?.map((color, index) => (
                          <Badge key={`${color}-${index}`} className={colorClasses[color]}>{color}</Badge>
                        ))}
                      </div>
                      <div className="mb-4 min-h-8 text-sm text-muted-foreground">
                        Your sequence: {memoryAnswer.length ? memoryAnswer.join(' -> ') : 'tap colors below'}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.keys(colorClasses).map((color) => (
                          <Button key={color} variant="outline" onClick={() => chooseMemory(color)}>{color}</Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="grid content-start gap-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight"><Plus size={19} /> New live match</h3>
              <Input value={opponent} onChange={(event) => setOpponent(event.target.value)} placeholder="Opponent username" />
              <Button className="w-full" onClick={create} disabled={!connected || busyAction === 'create' || !opponent.trim()}>
                {busyAction === 'create' ? <Loader2 className="animate-spin" size={17} /> : <Swords size={17} />}
                Invite to {modeFor(selectedType).name}
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <Trophy className="mb-2 text-primary" size={22} />
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Wins</p>
                <p className="text-3xl font-semibold">{wins}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <CheckCircle2 className="mb-2 text-secondary" size={22} />
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Best</p>
                <p className="text-3xl font-semibold">{bestScore}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="border-b border-border p-4">
                <h3 className="text-xl font-semibold tracking-tight">Live rooms</h3>
              </div>
              {matches.isLoading ? (
                <div className="p-4"><div className="skeleton h-24 rounded-lg" /></div>
              ) : sortedMatches.length ? (
                sortedMatches.map((match) => {
                  const mine = match.challenger_username === username ? match.challenger_score : match.opponent_score;
                  const theirs = match.challenger_username === username ? match.opponent_score : match.challenger_score;
                  const canAccept = match.status === 'Pending' && match.opponent_username === username;
                  const canJoin = match.status !== 'Completed';
                  const mode = modeFor(match.game_type);

                  return (
                    <div key={match.id} className="grid gap-3 border-b border-border p-4 last:border-b-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{mode.name} vs {opponentFor(match, username)}</p>
                          <p className="text-xs text-muted-foreground">You {mine ?? '-'} · Them {theirs ?? '-'}</p>
                        </div>
                        <Badge variant={match.status === 'Completed' ? 'secondary' : match.status === 'Active' ? 'amber' : 'muted'}>
                          {match.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {canAccept ? (
                          <Button size="sm" onClick={() => accept(match)} disabled={busyAction === `accept-${match.id}`}>Accept</Button>
                        ) : null}
                        {canJoin ? (
                          <Button size="sm" variant="outline" onClick={() => join(match)} disabled={busyAction === `join-${match.id}`}>
                            <Play size={15} />
                            Join
                          </Button>
                        ) : null}
                        {match.status === 'Active' ? (
                          <Button size="sm" onClick={() => start(match)} disabled={busyAction === `start-${match.id}`}>
                            Start
                          </Button>
                        ) : null}
                        {match.status === 'Completed' ? (
                          <Badge variant={match.winner_username === username ? 'secondary' : 'muted'}>
                            {match.winner_username ? `${match.winner_username} won` : 'Draw'}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-sm text-muted-foreground">No live rooms yet. Invite someone to start.</div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}
