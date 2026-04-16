import React from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { Eye, EyeOff, LockKeyhole, Loader2, UserRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPassword, login, registerUser, resetPassword } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().optional(),
  reset_token: z.string().optional(),
  confirm_password: z.string().optional()
});

export function LoginScreen({ onLogin }) {
  const [mode, setMode] = React.useState('login');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [issuedResetToken, setIssuedResetToken] = React.useState('');
  const controls = useAnimationControls();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: 'admin', password: 'morning2025', reset_token: '', confirm_password: '' }
  });

  React.useEffect(() => {
    setIssuedResetToken('');
    reset(mode === 'login'
      ? { username: 'admin', password: 'morning2025', reset_token: '', confirm_password: '' }
      : { username: '', password: '', reset_token: '', confirm_password: '' });
  }, [mode, reset]);

  const onSubmit = async (values) => {
    setIsLoading(true);
    try {
      if ((mode === 'login' || mode === 'register' || mode === 'reset') && !values.password) {
        throw new Error('Password is required');
      }

      if (mode === 'forgot') {
        const result = await forgotPassword({ username: values.username, reset_token: values.reset_token });
        setIssuedResetToken(result.reset_token || '');
        toast(result.reset_token ? 'Short-lived reset token issued' : result.message || 'Reset request processed');
        return;
      }

      if (mode === 'reset') {
        if (values.password !== values.confirm_password) throw new Error('Passwords do not match');
        await resetPassword(values);
        toast('Password reset. You can log in now.');
        setMode('login');
        return;
      }

      const result = mode === 'login' ? await login(values) : await registerUser(values);
      toast(mode === 'login' ? 'Welcome back' : 'Account created');
      window.setTimeout(() => onLogin(result.token), 260);
    } catch (error) {
      controls.start({
        x: [0, -10, 10, -8, 8, 0],
        transition: { duration: 0.36 }
      });
      toast(error.message || 'Invalid credentials', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="grid min-h-[100dvh] overflow-hidden px-5 pb-5 safe-top safe-bottom lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 lg:px-10">
      <section className="flex items-center py-8">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full">
          <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">Morning Ritual / Tracker</p>
          <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight lg:text-6xl">A concise dashboard for routine check-ins.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
            Track the current day quickly, review the week from the dashboard, and keep updates controlled with a back-office token.
          </p>
          <div className="mt-6 grid max-w-md grid-cols-3 border border-border bg-card">
            {['Check in', 'Review', 'Export'].map((item) => (
              <div key={item} className="border-r border-border p-3 last:border-r-0">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <motion.section
        animate={controls}
        initial={{ y: 80, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 170, damping: 22 }}
        className="mx-auto w-full max-w-md rounded-lg border border-border bg-card/90 p-5 backdrop-blur-xl"
      >
        <div className="mb-6">
          <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Register' : 'Account recovery'}
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">
            {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create your account' : mode === 'forgot' ? 'Request reset' : 'Reset password'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {mode === 'login'
              ? 'Use your account to open today’s check-in.'
              : mode === 'register'
                ? 'Choose a username and password to start tracking.'
                : mode === 'forgot'
                  ? 'Use the back-office token to issue a short-lived reset token.'
                  : 'Use the issued reset token. It expires quickly and works once.'}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/40 p-1 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`min-h-10 rounded-lg text-sm font-semibold transition ${mode === 'login' ? 'bg-card text-foreground' : 'text-muted-foreground'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`min-h-10 rounded-lg text-sm font-semibold transition ${mode === 'register' ? 'bg-card text-foreground' : 'text-muted-foreground'}`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className={`min-h-10 rounded-lg text-sm font-semibold transition ${mode === 'forgot' ? 'bg-card text-foreground' : 'text-muted-foreground'}`}
            >
              Forgot
            </button>
            <button
              type="button"
              onClick={() => setMode('reset')}
              className={`min-h-10 rounded-lg text-sm font-semibold transition ${mode === 'reset' ? 'bg-card text-foreground' : 'text-muted-foreground'}`}
            >
              Reset
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-muted-foreground">Username</span>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input className="pl-10" autoComplete="username" {...register('username')} />
            </div>
            {errors.username ? <span className="mt-1 block text-xs text-destructive">{errors.username.message}</span> : null}
          </label>

          {(mode === 'forgot' || mode === 'reset') ? (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-muted-foreground">
                {mode === 'forgot' ? 'Global reset token' : 'Issued reset token'}
              </span>
              <Input autoComplete="one-time-code" {...register('reset_token')} />
            </label>
          ) : null}

          {mode !== 'forgot' ? (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-muted-foreground">Password</span>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input className="pl-10 pr-12" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'reset' || mode === 'register' ? 'new-password' : 'current-password'} {...register('password')} />
              <button
                type="button"
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:text-foreground active:scale-95"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password ? <span className="mt-1 block text-xs text-destructive">{errors.password.message}</span> : null}
          </label>
          ) : null}

          {mode === 'reset' ? (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-muted-foreground">Confirm password</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input className="pl-10" type={showPassword ? 'text' : 'password'} autoComplete="new-password" {...register('confirm_password')} />
              </div>
            </label>
          ) : null}

          <Button type="submit" className="h-12 w-full text-base" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : null}
            {mode === 'login' ? 'Open dashboard' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Issue token' : 'Reset password'} -&gt;
          </Button>
        </form>

        {issuedResetToken ? (
          <div className="mt-4 border border-border bg-muted/40 p-3 text-sm">
            Reset token: <span className="font-mono font-semibold">{issuedResetToken}</span>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Use it on the Reset tab within 15 minutes. It can only be used once.</p>
          </div>
        ) : null}

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Default admin login: admin / morning2025
        </p>
      </motion.section>
    </main>
  );
}
