import React from 'react';
import { Palette, Save, ShieldCheck, Target, UserRound } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useToast } from '@/components/ui/toast';

const emptyProfile = {
  display_name: '',
  email: '',
  bio: '',
  location: '',
  timezone: '',
  avatar_color: '#ff8c2a',
  fitness_goal: '',
  diet_goal: '',
  learning_goal: '',
  game_handle: '',
  privacy_level: 'Friends',
  password: ''
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function ProfileScreen() {
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const [draft, setDraft] = React.useState(emptyProfile);

  React.useEffect(() => {
    if (profile.data) {
      setDraft({
        ...emptyProfile,
        ...profile.data,
        display_name: profile.data.display_name || profile.data.username,
        password: ''
      });
    }
  }, [profile.data]);

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  const save = async () => {
    try {
      const { password, ...profilePatch } = draft;
      await updateProfile.mutateAsync({
        ...profilePatch,
        ...(password ? { password } : {})
      });
      setDraft((current) => ({ ...current, password: '' }));
      toast('Profile updated');
    } catch (error) {
      toast(error.message || 'Could not update profile', 'error');
    }
  };

  return (
    <section className="h-full overflow-y-auto px-4 pb-8 pt-4 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <UserRound size={15} />
              Account settings
            </p>
            <h2 className="text-3xl font-semibold tracking-tight lg:text-4xl">Profile</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Personalize the way your account appears across check-ins, challenges, and leaderboard spaces.
            </p>
          </div>
          <Button onClick={save} disabled={updateProfile.isPending || profile.isLoading}>
            <Save size={17} />
            Save profile
          </Button>
        </div>

        {profile.isLoading ? (
          <div className="skeleton h-96 rounded-lg" />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center gap-4 border-b border-border pb-4">
                  <div
                    className="grid h-16 w-16 shrink-0 place-items-center rounded-lg text-xl font-semibold text-black"
                    style={{ backgroundColor: draft.avatar_color || '#ff8c2a' }}
                  >
                    {(draft.display_name || profile.data?.username || 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-semibold tracking-tight">{draft.display_name || profile.data?.username}</h3>
                    <p className="truncate text-sm text-muted-foreground">@{profile.data?.username}</p>
                  </div>
                </div>

                <Field label="Username">
                  <Input value={profile.data?.username || ''} disabled />
                </Field>
                <Field label="Display name">
                  <Input value={draft.display_name} onChange={(event) => update('display_name', event.target.value)} />
                </Field>
                <Field label="Email">
                  <Input value={draft.email || ''} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Location">
                    <Input value={draft.location || ''} onChange={(event) => update('location', event.target.value)} placeholder="City, country" />
                  </Field>
                  <Field label="Timezone">
                    <Input value={draft.timezone || ''} onChange={(event) => update('timezone', event.target.value)} placeholder="Europe/London" />
                  </Field>
                </div>
                <Field label="Bio">
                  <Textarea value={draft.bio || ''} onChange={(event) => update('bio', event.target.value)} placeholder="What should your dashboard know about you?" />
                </Field>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <Card>
                <CardContent className="space-y-4 p-4">
                  <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight"><Target size={19} /> Goals</h3>
                  <div className="grid gap-3 lg:grid-cols-3">
                    <Field label="Fitness goal">
                      <Textarea value={draft.fitness_goal || ''} onChange={(event) => update('fitness_goal', event.target.value)} placeholder="Run farther, skip more, recover better..." />
                    </Field>
                    <Field label="Diet goal">
                      <Textarea value={draft.diet_goal || ''} onChange={(event) => update('diet_goal', event.target.value)} placeholder="Protein target, hydration, meal rhythm..." />
                    </Field>
                    <Field label="Learning goal">
                      <Textarea value={draft.learning_goal || ''} onChange={(event) => update('learning_goal', event.target.value)} placeholder="Topics, exam goals, mastery markers..." />
                    </Field>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="grid gap-4 p-4 lg:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight"><Palette size={19} /> Appearance</h3>
                    <Field label="Avatar color">
                      <Input type="color" value={draft.avatar_color || '#ff8c2a'} onChange={(event) => update('avatar_color', event.target.value)} className="h-12 p-1" />
                    </Field>
                    <Field label="Game handle">
                      <Input value={draft.game_handle || ''} onChange={(event) => update('game_handle', event.target.value)} placeholder="Leaderboard display handle" />
                    </Field>
                  </div>

                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight"><ShieldCheck size={19} /> Privacy and security</h3>
                    <Field label="Profile visibility">
                      <select
                        value={draft.privacy_level || 'Friends'}
                        onChange={(event) => update('privacy_level', event.target.value)}
                        className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm"
                      >
                        <option>Private</option>
                        <option>Friends</option>
                        <option>Public</option>
                      </select>
                    </Field>
                    <Field label="New password">
                      <Input
                        type="password"
                        value={draft.password}
                        onChange={(event) => update('password', event.target.value)}
                        placeholder="Leave blank to keep current password"
                      />
                    </Field>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
