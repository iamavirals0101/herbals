import React, { useState } from 'react';

export default function ResetPasswordRequest() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/request-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage('If an account with that email exists, a reset link has been sent.');
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to send reset email.');
      }
    } catch {
      setStatus('error');
      setMessage('Failed to send reset email.');
    }
  };

  return (
    <div className="flex flex-col min-h-[80vh] bg-gradient-to-br from-blue-50 to-green-50 justify-center items-center py-8">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Reset Password</h1>
        {status === 'success' ? (
          <div className="text-green-600">{message}</div>
        ) : (
          <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
            <input
              type="email"
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={status === 'loading'}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white rounded-lg py-2 font-semibold hover:bg-blue-700 transition"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
            </button>
            {status === 'error' && <div className="text-red-600 text-sm">{message}</div>}
          </form>
        )}
      </div>
    </div>
  );
} 