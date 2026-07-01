'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { toast } from 'sonner';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface AuthFormValues {
  name?: string;
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, token } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement | null>(null);

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (token) router.replace('/companies');
  }, [token, router]);

  // Auto-focus email on mount and on tab switch
  useEffect(() => {
    setTimeout(() => emailRef.current?.focus(), 80);
  }, [isLogin]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setFocus,
  } = useForm<AuthFormValues>();

  const onSubmit: SubmitHandler<AuthFormValues> = async (data) => {
    setLoading(true);
    try {
      if (isLogin) {
        const res = await authAPI.login({ email: data.email, password: data.password });
        login(res.data.data.user, res.data.data.token);
        toast.success(`Welcome back, ${res.data.data.user.name}!`);
        router.push('/companies');
      } else {
        const res = await authAPI.register({
          name: data.name ?? '',
          email: data.email,
          password: data.password,
        });
        login(res.data.data.user, res.data.data.token);
        toast.success('Account created! Welcome to SmartERP.');
        router.push('/companies');
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Authentication failed. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  function switchMode() {
    setIsLogin(!isLogin);
    reset();
  }

  // The emailRef callback — needed to connect both useRef and react-hook-form register
  const { ref: emailRegisterRef, ...emailRegisterRest } = register('email', {
    required: 'Email is required',
    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
  });

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-6"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Background glow blobs */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 600,
            height: 400,
            background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            right: '10%',
            width: 300,
            height: 300,
            background: 'radial-gradient(ellipse, rgba(16,185,129,0.06) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Card */}
      <div
        className="relative w-full rounded-2xl"
        style={{
          maxWidth: 420,
          padding: '44px 40px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.08)',
          animation: 'fadeIn 0.3s ease',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 800,
              color: 'white',
              margin: '0 auto 14px',
              boxShadow: '0 0 32px rgba(99,102,241,0.35)',
            }}
          >
            S
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>
            SmartERP
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </div>
        </div>

        {/* Tab switcher */}
        <div
          className="mb-6 flex rounded-xl p-1"
          style={{ background: 'var(--bg-secondary)' }}
        >
          {[
            { key: true, label: 'Sign In' },
            { key: false, label: 'Register' },
          ].map((tab) => (
            <button
              key={String(tab.key)}
              type="button"
              onClick={() => { setIsLogin(tab.key); reset(); }}
              className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all"
              style={{
                background: isLogin === tab.key ? 'var(--accent)' : 'transparent',
                color: isLogin === tab.key ? 'white' : 'var(--text-muted)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Name — only for register */}
          {!isLogin && (
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Full Name</label>
              <input
                className="input"
                placeholder="e.g. Rahul Sharma"
                autoComplete="name"
                {...register('name', {
                  required: !isLogin ? 'Full name is required' : false,
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                })}
              />
              {errors.name && (
                <span className="form-error">{errors.name.message}</span>
              )}
            </div>
          )}

          {/* Email */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Email Address</label>
            <input
              className="input"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              ref={(el) => {
                emailRegisterRef(el);
                (emailRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
              }}
              {...emailRegisterRest}
            />
            {errors.email && (
              <span className="form-error">{errors.email.message}</span>
            )}
          </div>

          {/* Password */}
          <div className="form-group" style={{ marginBottom: 22 }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                placeholder={isLogin ? '••••••••' : 'Min. 6 characters'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                style={{ paddingRight: 42 }}
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: isLogin ? 1 : 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 transition"
                style={{ color: 'var(--text-muted)' }}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
            {errors.password && (
              <span className="form-error">{errors.password.message}</span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="mt-1 flex h-12 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: 'var(--accent)', boxShadow: '0 10px 30px color-mix(in srgb, var(--accent), transparent 60%)' }}
            disabled={loading}
          >
            {loading
              ? isLogin ? 'Signing in...' : 'Creating account...'
              : isLogin ? 'Sign In →' : 'Create Account →'}
          </button>
        </form>

        {/* Switch mode link */}
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
          </span>
          <button
            type="button"
            onClick={switchMode}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-light)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            {isLogin ? 'Register' : 'Sign In'}
          </button>
        </div>

        {/* Keyboard hint */}
        <div
          style={{
            marginTop: 24,
            padding: '10px 12px',
            background: 'var(--bg-secondary)',
            borderRadius: 8,
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 13 }}>⌨</span>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Use <span className="shortcut-key" style={{ display: 'inline' }}>TAB</span> to navigate fields ·{' '}
            <span className="shortcut-key" style={{ display: 'inline' }}>ENTER</span> to submit
          </div>
        </div>
      </div>
    </div>
  );
}
