import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { LogoMark } from '@/components/layout/Logo';
import { Avatar } from '@/components/layout/Navbar';
import { cn } from '@/lib/format';

interface AuthPageProps {
  mode: 'login' | 'register';
}

const PERKS = [
  {
    icon: '★',
    title: 'Curated collections',
    text: 'Star developers and repositories, they persist across sessions.',
  },
  {
    icon: '◌',
    title: 'Live GitHub intelligence',
    text: 'Stars, forks, languages, commits and contribution calendars.',
  },
  {
    icon: '⇄',
    title: 'Head-to-head compare',
    text: 'Radar-score any two repositories or developers.',
  },
];

export function AuthPage({ mode }: AuthPageProps) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated } = useAuth();
  const toast = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  useEffect(() => {
    if (isAuthenticated) navigate(redirectTo, { replace: true });
  }, [isAuthenticated, navigate, redirectTo]);

  const fieldError = (name: string) =>
    error?.fieldIssues.find((issue) => issue.path.toLowerCase().includes(name))?.message;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isRegister) {
        await register({
          email,
          username,
          password,
          ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
        });
        toast.success('Welcome aboard', 'Your DevHub workspace is ready.');
      } else {
        await login(identifier, password);
        toast.success('Signed in', 'Good to see you again.');
      }
      navigate(redirectTo, { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught
          : new ApiError(0, 'UNKNOWN', 'Something went wrong. Please try again.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-[calc(100vh-8rem)] items-center gap-10 py-8 lg:grid-cols-[1.05fr_.95fr]">
      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-md">
        <div className="glass card lit relative overflow-hidden p-6 sm:p-8">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,.35),transparent_70%)] blur-2xl"
            aria-hidden
          />

          <div className="relative mb-6 flex items-center gap-3">
            <LogoMark size={34} />
            <div>
              <p className="eyebrow">{isRegister ? 'create account' : 'welcome back'}</p>
              <h1 className="text-2xl font-bold">
                {isRegister ? 'Start your DevHub' : 'Sign in to DevHub'}
              </h1>
            </div>
          </div>

          <div className="relative mb-6 grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-white/4 p-1 text-[13px] font-semibold">
            <Link
              to="/login"
              className={cn(
                'rounded-full py-2 text-center transition',
                !isRegister ? 'bg-white/10 text-ink-100' : 'text-ink-500 hover:text-ink-200',
              )}
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className={cn(
                'rounded-full py-2 text-center transition',
                isRegister ? 'bg-white/10 text-ink-100' : 'text-ink-500 hover:text-ink-200',
              )}
            >
              Register
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="relative space-y-4" noValidate>
            {error && !error.fieldIssues.length ? (
              <div
                role="alert"
                className="rounded-xl border border-energy-rose/30 bg-energy-rose/10 px-3.5 py-2.5 text-[13px] text-energy-rose"
              >
                {error.message}
              </div>
            ) : null}

            {isRegister ? (
              <>
                <Field
                  label="Username"
                  error={fieldError('username')}
                  hint="Letters, numbers and hyphens."
                >
                  {({ id, describedBy, invalid }) => (
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      autoComplete="username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="octo-labs"
                      required
                    />
                  )}
                </Field>
                <Field label="Email" error={fieldError('email')}>
                  {({ id, describedBy, invalid }) => (
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@studio.dev"
                      required
                    />
                  )}
                </Field>
                <Field
                  label="Display name"
                  error={fieldError('display')}
                  hint="Optional — shown across your workspace."
                >
                  {({ id, describedBy, invalid }) => (
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      autoComplete="name"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Ada Lovelace"
                    />
                  )}
                </Field>
              </>
            ) : (
              <Field label="Email or username" error={fieldError('identifier')}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    autoComplete="username"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="you@studio.dev"
                    required
                  />
                )}
              </Field>
            )}

            <Field
              label="Password"
              error={fieldError('password')}
              hint={isRegister ? 'At least 8 characters.' : undefined}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  type="password"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                />
              )}
            </Field>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              className="w-full"
            >
              {isRegister ? 'Create my workspace' : 'Enter DevHub'}
            </Button>
          </form>

          <p className="relative mt-5 text-center text-[13px] text-ink-500">
            {isRegister ? 'Already have an account? ' : 'New to DevHub? '}
            <Link
              to={isRegister ? '/login' : '/register'}
              className="font-semibold text-energy-cyan hover:underline"
            >
              {isRegister ? 'Sign in' : 'Create one free'}
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-ink-600">
          Credentials are hashed with bcrypt · sessions are httpOnly JWT cookies.
        </p>
      </div>

      {/* ── Visual ───────────────────────────────────────────────────────── */}
      <aside className="relative hidden lg:block">
        <div className="glass card lit relative overflow-hidden p-8">
          <div className="absolute inset-0 bg-dots opacity-40" aria-hidden />

          <div className="relative">
            <p className="eyebrow mb-3">why devhub</p>
            <h2 className="text-3xl font-bold leading-tight">
              Your personal <span className="text-gradient">mission control</span> for the GitHub
              universe.
            </h2>

            <div className="mt-8 space-y-4">
              {PERKS.map((perk, index) => (
                <div
                  key={perk.title}
                  className="flex gap-3 rounded-2xl border border-white/8 bg-white/[.03] p-4 transition hover:border-energy-indigo/40"
                  style={{
                    animation: `rise .6s cubic-bezier(.2,.8,.2,1) ${0.1 + index * 0.1}s both`,
                  }}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-energy-cyan/25 to-energy-pink/25 text-sm text-energy-cyan">
                    {perk.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-100">{perk.title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-500">{perk.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[.03] p-4">
              <div className="flex -space-x-2">
                {['torvalds', 'gaearon', 'sindresorhus'].map((login) => (
                  <Avatar
                    key={login}
                    name={login}
                    src={`https://github.com/${login}.png?size=64`}
                    size={34}
                    className="ring-2 ring-void-900"
                  />
                ))}
              </div>
              <p className="text-[13px] leading-snug text-ink-400">
                Track the people and projects that shape your stack.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
