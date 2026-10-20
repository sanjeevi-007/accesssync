import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiClient, type ApiError } from '../api/client';
import { KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ChangePasswordPage: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setMustChangePassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      // Update auth state so user is no longer forced to change password
      setMustChangePassword(false);
      navigate('/app/dashboard');
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr?.error?.message) {
        setErrorMsg(apiErr.error.message);
      } else {
        setErrorMsg('Failed to update password. Please check your current password.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded bg-[var(--color-warning)] flex items-center justify-center text-white">
            <KeyRound className="w-6 h-6" aria-hidden="true" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-[var(--color-text)]">ACCESS-EASE</span>
        </div>
        <h1 className="text-center text-xl font-semibold text-[var(--color-text)]">
          Password Update Required
        </h1>
        <p className="mt-1 text-center text-sm text-[var(--color-muted)]">
          You must change your default password before accessing the system.
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
              <label htmlFor="currentPassword" className="block text-sm font-medium text-[var(--color-text)]">
                Current Password
              </label>
              <div className="mt-1">
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-[var(--color-text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] sm:text-sm"
                  placeholder="Enter current password"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-[var(--color-text)]">
                New Password (minimum 8 characters)
              </label>
              <div className="mt-1">
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-[var(--color-text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] sm:text-sm"
                  placeholder="At least 8 characters"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--color-text)]">
                Confirm New Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-[var(--color-text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] sm:text-sm"
                  placeholder="Re-enter new password"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded text-sm font-semibold text-white bg-[var(--color-primary)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] disabled:opacity-50 transition-none"
              >
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                {isSubmitting ? 'Updating Password...' : 'Save and Continue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
