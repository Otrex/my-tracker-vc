import React from 'react';
import { Check, Plus, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useChallenges, useCreateChallenge, useLeaderboard, useUpdateChallenge } from '@/hooks/useSocial';
import { useToast } from '@/components/ui/toast';

export function LeaderboardScreen() {
  const leaderboard = useLeaderboard();
  const challenges = useChallenges();
  const createChallenge = useCreateChallenge();
  const updateChallenge = useUpdateChallenge();
  const { toast } = useToast();
  const [draft, setDraft] = React.useState({ opponent_username: '', type: 'Learning', target: '' });

  const create = async () => {
    try {
      await createChallenge.mutateAsync(draft);
      setDraft({ opponent_username: '', type: 'Learning', target: '' });
      toast('Challenge created');
    } catch (error) {
      toast(error.message || 'Could not create challenge', 'error');
    }
  };

  const setStatus = async (challenge, status) => {
    try {
      await updateChallenge.mutateAsync({ id: challenge.id, data: { status, winner_username: status === 'Completed' ? challenge.challenger_username : undefined } });
      toast('Challenge updated');
    } catch (error) {
      toast(error.message || 'Could not update challenge', 'error');
    }
  };

  return (
    <section className="h-full overflow-y-auto px-4 pb-8 pt-4 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-5">
          <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><Trophy size={15} /> Social progress</p>
          <h2 className="text-3xl font-semibold tracking-tight lg:text-4xl">Leaderboard</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Scores combine learning minutes, completed sessions, and challenge wins.</p>
        </div>

        <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-[52px_1fr_auto] border-b border-border bg-muted/25 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <span>Rank</span><span>User</span><span>Score</span>
              </div>
              {leaderboard.isLoading ? (
                <div className="p-4"><div className="skeleton h-32 rounded-lg" /></div>
              ) : leaderboard.data?.length ? (
                leaderboard.data.map((row, index) => (
                  <div key={row.username} className="grid grid-cols-[52px_1fr_auto] border-b border-border px-3 py-3 last:border-b-0">
                    <span className="font-mono text-sm text-muted-foreground">#{index + 1}</span>
                    <div>
                      <p className="font-semibold">{row.display_name}</p>
                      <p className="text-xs text-muted-foreground">{row.learning_minutes} min · {row.completed_sessions} sessions · {row.challenge_wins} wins</p>
                    </div>
                    <Badge>{row.score}</Badge>
                  </div>
                ))
              ) : (
                <div className="p-6 text-sm text-muted-foreground">No leaderboard data yet.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4">
              <h3 className="text-xl font-semibold tracking-tight">Create challenge</h3>
              <Input value={draft.opponent_username} onChange={(event) => setDraft((current) => ({ ...current, opponent_username: event.target.value }))} placeholder="Opponent username" />
              <Input value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))} placeholder="Challenge type" />
              <Textarea value={draft.target} onChange={(event) => setDraft((current) => ({ ...current, target: event.target.value }))} placeholder="Target or rules" />
              <Button onClick={create}><Plus size={17} /> Challenge</Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="border-b border-border p-4">
              <h3 className="text-xl font-semibold tracking-tight">Challenges</h3>
            </div>
            {challenges.isLoading ? (
              <div className="p-4"><div className="skeleton h-24 rounded-lg" /></div>
            ) : challenges.data?.length ? (
              challenges.data.map((challenge) => (
                <div key={challenge.id} className="grid gap-3 border-b border-border p-4 last:border-b-0 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <p className="font-semibold">{challenge.type}: {challenge.target || 'No target set'}</p>
                    <p className="text-sm text-muted-foreground">{challenge.challenger_username} vs {challenge.opponent_username}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={challenge.status === 'Completed' ? 'secondary' : challenge.status === 'Accepted' ? 'amber' : 'muted'}>{challenge.status}</Badge>
                    {challenge.status === 'Pending' ? <Button size="sm" variant="outline" onClick={() => setStatus(challenge, 'Accepted')}>Accept</Button> : null}
                    {challenge.status !== 'Completed' ? <Button size="sm" onClick={() => setStatus(challenge, 'Completed')}><Check size={15} /> Complete</Button> : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-sm text-muted-foreground">No challenges yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
