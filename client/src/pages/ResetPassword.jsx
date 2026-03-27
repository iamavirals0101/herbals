import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage('Password reset successful! You can now log in.');
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to reset password.');
      }
    } catch {
      setStatus('error');
      setMessage('Failed to reset password.');
    }
  };

  return (
    <div className="flex flex-col min-h-[80vh] bg-gradient-to-br from-green-50 to-blue-50 justify-center items-center py-8">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Set New Password</h1>
        {!token && <div className="text-red-600">No reset token provided.</div>}
        {token && status === 'success' ? (
          <>
            <div className="text-green-600">{message}</div>
            <Link to="/login" className="mt-6 bg-blue-600 text-white rounded-lg py-2 px-4 font-semibold hover:bg-blue-700 transition">Go to Login</Link>
          </>
        ) : token && (
          <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
            <input
              type="password"
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-200"
              placeholder="New Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={status === 'loading'}
            />
            <button
              type="submit"
              className="bg-green-600 text-white rounded-lg py-2 font-semibold hover:bg-green-700 transition"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Resetting...' : 'Reset Password'}
            </button>
            {status === 'error' && <div className="text-red-600 text-sm">{message}</div>}
          </form>
        )}
      </div>
    </div>
  );
} 