import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { ApiError } from '../api/client';
import { LogIn, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const profile = await login(username, password);
      if (profile.must_change_password) {
        navigate('/change-password');
      } else {
        navigate('/app/dashboard');
      }
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr?.error?.message) {
        setErrorMsg(apiErr.error.message);
      } else {
        setErrorMsg('Unable to connect to the server. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded bg-[var(--color-primary)] flex items-center justify-center text-white">
            <LogIn className="w-6 h-6" aria-hidden="true" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-[var(--color-text)]">ACCESS-EASE</span>
        </div>
        <h1 className="text-center text-xl font-semibold text-[var(--color-text)]">
          Staff Portal Sign In
        </h1>
        <p className="mt-1 text-center text-sm text-[var(--color-muted)]">
          Accessibility Guidance Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[var(--color-surface)] py-8 px-6 sm:px-10 rounded-lg border border-[var(--color-surface)] shadow-none">
          {errorMsg && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-6 p-4 rounded bg-red-50 border border-[var(--color-danger)] text-[var(--color-danger)] flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-sm font-medium">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[var(--color-text)]">
                Username
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-[var(--color-text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] sm:text-sm"
                  placeholder="Enter username"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text)]">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-[var(--color-text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] sm:text-sm"
                  placeholder="Enter password"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded text-sm font-semibold text-white bg-[var(--color-primary)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] disabled:opacity-50 transition-none"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-gray-300 pt-4 text-center">
            <Link
              to="/visitor"
              className="text-xs font-medium text-[var(--color-primary)] hover:underline"
            >
              Go to Visitor Guidance Screen &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
