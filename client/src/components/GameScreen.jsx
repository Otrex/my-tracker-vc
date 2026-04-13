import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Gamepad2, Loader2, Play, Plus, Sparkles, Swords, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useProfile } from '@/hooks/useProfile';
import { useAcceptGameMatch, useCreateGameMatch, useGameMatches, useSubmitGameScore } from '@/hooks/useSocial';

function seedNumber(seed) {
  return seed.split('').reduce((total, char) => total + char.charCodeAt(0) * 17, 97);
}

function targetPosition(seed, index) {
  const value = Math.sin(seedNumber(seed) + index * 999) * 10000;
  const next = Math.sin(seedNumber(seed) * 3 + index * 733) * 10000;
  return {
    left: `${10 + (Math.abs(value) % 76)}%`,
    top: `${12 + (Math.abs(next) % 68)}%`
  };
}

function opponentFor(match, username) {
  return match.challenger_username === username ? match.opponent_username : match.challenger_username;
}

export function GameScreen() {
  const { toast } = useToast();
  const profile = useProfile();
  const matches = useGameMatches();
  const createMatch = useCreateGameMatch();
  const acceptMatch = useAcceptGameMatch();
  const submitScore = useSubmitGameScore();
  const [opponent, setOpponent] = React.useState('');
  const [round, setRound] = React.useState(null);
  const roundRef = React.useRef(round);
  const username = profile.data?.username;
  const activeMatch = round?.match;

  React.useEffect(() => {
    roundRef.current = round;
  }, [round]);

  React.useEffect(() => {
    if (!round?.active) return undefined;

    const timer = window.setInterval(() => {
      const current = roundRef.current;
      if (!current?.active) return;

      const timeLeft = Math.max(0, Math.ceil((current.endsAt - Date.now()) / 1000));
      if (timeLeft <= 0 && !current.submitted) {
        const finalScore = current.score;
        setRound({ ...current, active: false, submitted: true, timeLeft: 0 });
        submitScore.mutateAsync({ id: current.match.id, score: finalScore })
          .then(() => toast(`Score submitted: ${finalScore}`))
          .catch((error) => toast(error.message || 'Could not submit score', 'error'));
        return;
      }

      setRound((existing) => existing ? { ...existing, timeLeft } : existing);
    }, 200);

    return () => window.clearInterval(timer);
  }, [round?.active]);

  const startMatch = (match) => {
    setRound({
      match,
      active: true,
      submitted: false,
      score: 0,
      streak: 0,
      target: 0,
      timeLeft: 30,
      endsAt: Date.now() + 30000
    });
  };

  const hitTarget = () => {
    setRound((current) => {
      if (!current?.active) return current;
      const streak = current.streak + 1;
      return {
        ...current,
        score: current.score + 10 + Math.min(streak, 10),
        streak,
        target: current.target + 1
      };
    });
  };

  const create = async () => {
    try {
      const match = await createMatch.mutateAsync({ opponent_username: opponent });
      setOpponent('');
      toast('Game challenge created');
      startMatch(match);
    } catch (error) {
      toast(error.message || 'Could not create match', 'error');
    }
  };

  const accept = async (match) => {
    try {
      const accepted = await acceptMatch.mutateAsync(match.id);
      toast('Match accepted');
      startMatch(accepted);
    } catch (error) {
      toast(error.message || 'Could not accept match', 'error');
    }
  };

  const boardPosition = activeMatch ? targetPosition(activeMatch.seed, round?.target || 0) : { left: '50%', top: '50%' };
  const sortedMatches = matches.data || [];
  const completed = sortedMatches.filter((match) => match.status === 'Completed');
  const wins = completed.filter((match) => match.winner_username === username).length;
  const bestScore = completed.reduce((best, match) => {
    const score = match.challenger_username === username ? match.challenger_score : match.opponent_score;
    return Math.max(best, Number(score || 0));
  }, 0);

  return (
    <section className="h-full overflow-y-auto px-4 pb-8 pt-4 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-5 xl:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-5">
            <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Gamepad2 size={15} />
              Multiplayer focus sprint
            </p>
            <h2 className="text-3xl font-semibold tracking-tight lg:text-4xl">Aim, tap, win points</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Challenge another user, play the same 30-second target pattern, and feed your game points into the leaderboard.
            </p>
          </div>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="mb-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/25 p-3">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Score</p>
                  <p className="text-3xl font-semibold">{round?.score || 0}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/25 p-3">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Timer</p>
                  <p className="text-3xl font-semibold">{round?.timeLeft ?? 30}s</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/25 p-3">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Streak</p>
                  <p className="text-3xl font-semibold">{round?.streak || 0}</p>
                </div>
              </div>

              <div className="relative h-[380px] overflow-hidden rounded-lg border border-border bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.16),transparent_42%),hsl(var(--background))] sm:h-[460px]">
                <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
                  <Badge variant={round?.active ? 'secondary' : 'muted'}>{round?.active ? 'Live round' : 'Pick a match'}</Badge>
                  {activeMatch ? <Badge variant="amber">vs {opponentFor(activeMatch, username)}</Badge> : null}
                </div>

                {round?.active ? (
                  <motion.button
                    type="button"
                    key={`${activeMatch?.seed}-${round.target}`}
                    onClick={hitTarget}
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
                ) : (
                  <div className="absolute inset-0 grid place-items-center p-6 text-center">
                    <div>
                      <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full border border-primary/50 bg-primary/15 text-primary">
                        <Swords size={34} />
                      </div>
                      <h3 className="text-2xl font-semibold tracking-tight">Choose a match to play</h3>
                      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                        Every player gets the same target sequence, so the faster hands take the points.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="grid content-start gap-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight"><Plus size={19} /> New match</h3>
              <Input value={opponent} onChange={(event) => setOpponent(event.target.value)} placeholder="Opponent username" />
              <Button className="w-full" onClick={create} disabled={createMatch.isPending || !opponent.trim()}>
                {createMatch.isPending ? <Loader2 className="animate-spin" size={17} /> : <Swords size={17} />}
                Challenge user
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
                <h3 className="text-xl font-semibold tracking-tight">Matches</h3>
              </div>
              {matches.isLoading ? (
                <div className="p-4"><div className="skeleton h-24 rounded-lg" /></div>
              ) : sortedMatches.length ? (
                sortedMatches.map((match) => {
                  const mine = match.challenger_username === username ? match.challenger_score : match.opponent_score;
                  const theirs = match.challenger_username === username ? match.opponent_score : match.challenger_score;
                  const canAccept = match.status === 'Pending' && match.opponent_username === username;
                  const canPlay = match.status !== 'Completed' && !canAccept && (mine === null || mine === undefined);

                  return (
                    <div key={match.id} className="grid gap-3 border-b border-border p-4 last:border-b-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">vs {opponentFor(match, username)}</p>
                          <p className="text-xs text-muted-foreground">You {mine ?? '-'} · Them {theirs ?? '-'}</p>
                        </div>
                        <Badge variant={match.status === 'Completed' ? 'secondary' : match.status === 'Active' ? 'amber' : 'muted'}>
                          {match.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        {canAccept ? (
                          <Button size="sm" onClick={() => accept(match)}>Accept</Button>
                        ) : null}
                        {canPlay ? (
                          <Button size="sm" variant="outline" onClick={() => startMatch(match)}>
                            <Play size={15} />
                            Play
                          </Button>
                        ) : null}
                        {!canPlay && match.status !== 'Completed' && !canAccept ? <Badge variant="muted">Waiting</Badge> : null}
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
                <div className="p-6 text-sm text-muted-foreground">No game matches yet. Challenge someone to start.</div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}
