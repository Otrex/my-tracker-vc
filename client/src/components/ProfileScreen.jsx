import React from 'react';
import { Save, UserRound } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useToast } from '@/components/ui/toast';

export function ProfileScreen() {
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const [draft, setDraft] = React.useState({ display_name: '', password: '' });

  React.useEffect(() => {
    if (profile.data) {
      setDraft({ display_name: profile.data.display_name || profile.data.username, password: '' });
    }
  }, [profile.data]);

  const save = async () => {
    try {
      await updateProfile.mutateAsync({
        display_name: draft.display_name,
        ...(draft.password ? { password: draft.password } : {})
      });
      setDraft((current) => ({ ...current, password: '' }));
      toast('Profile updated');
    } catch (error) {
      toast(error.message || 'Could not update profile', 'error');
    }
  };

  return (
    <section className="h-full overflow-y-auto px-4 pb-8 pt-4 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5">
          <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <UserRound size={15} />
            Account settings
          </p>
          <h2 className="text-3xl font-semibold tracking-tight lg:text-4xl">Profile</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Update the name shown on your account. Password is optional unless you want to change it.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            {profile.isLoading ? (
              <div className="skeleton h-48 rounded-lg" />
            ) : (
              <>
                <label className="block">
                  <span className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Username</span>
                  <Input value={profile.data?.username || ''} disabled />
                </label>
                <label className="block">
                  <span className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Name</span>
                  <Input value={draft.display_name} onChange={(event) => setDraft((current) => ({ ...current, display_name: event.target.value }))} />
                </label>
                <label className="block">
                  <span className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">New password</span>
                  <Input
                    type="password"
                    value={draft.password}
                    onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Leave blank to keep current password"
                  />
                </label>
                <Button onClick={save} disabled={updateProfile.isPending}>
                  <Save size={17} />
                  Save profile
                </Button>
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </section>
  );
}
