'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { toast } from 'sonner';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface LoginFormValues {
  name?: string;
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormValues>();

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setLoading(true);

    try {
      if (isLogin) {
        const res = await authAPI.login({ email: data.email, password: data.password });
        login(res.data.data.user, res.data.data.token);
        toast.success(`Welcome back, ${res.data.data.user.name}!`);
        router.push('/companies');
      } else {
        const res = await authAPI.register({ name: data.name ?? '', email: data.email, password: data.password });
        login(res.data.data.user, res.data.data.token);
        toast.success('Account created! Welcome to SmartERP.');
        router.push('/companies');
      }
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Authentication failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 1,
          background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            opacity: 0.3,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', textAlign: 'center', maxWidth: '420px' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: '800',
              color: 'white',
              margin: '0 auto 24px',
              boxShadow: '0 0 40px rgba(99,102,241,0.4)',
            }}
          >
            S
          </div>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: '800',
              color: 'white',
              marginBottom: '12px',
              letterSpacing: '-0.5px',
            }}
          >
            SmartERP
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6', marginBottom: '40px' }}>
            Professional business management system.
            <br />
            Ledgers • Vouchers • Inventory • GST Billing
          </p>
          {['📊 Real-time Inventory', '🧾 GST Invoice Generation', '📂 Multi-Company Support', '⌨️ Keyboard Shortcuts'].map((f) => (
            <div
              key={f}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px',
                padding: '6px 14px',
                margin: '4px',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              {f}
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          width: '440px',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
            {isLogin ? 'Sign in to your account' : 'Create account'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '28px' }}>
            {isLogin ? 'Enter your credentials to continue' : 'Start managing your business today'}
          </p>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {!isLogin && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="input"
                  placeholder="John Doe"
                  {...register('name', { required: !isLogin && 'Name is required' })}
                />
                {errors.name && <span className="form-error">{errors.name.message}</span>}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="input"
                type="email"
                placeholder="you@company.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' },
                })}
              />
              {errors.email && <span className="form-error">{errors.email.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="Min. 6 characters"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Minimum 6 characters' },
                })}
              />
              {errors.password && <span className="form-error">{errors.password.message}</span>}
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '10px' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg style={{ animation: 'spin 1s linear infinite', width: 16, height: 16 }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" />
                  </svg>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                reset();
              }}
              style={{ color: 'var(--accent-light)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
            >
              {isLogin ? 'Register' : 'Sign in'}
            </button>
          </p>
          <div
            style={{
              marginTop: '24px',
              padding: '12px',
              background: 'var(--bg-hover)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}
          >
            <p style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>SmartERP Features</p>
            <p>✓ Multi-company management (up to 5)</p>
            <p>✓ GST-compliant invoicing</p>
            <p>✓ Real-time inventory tracking</p>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
