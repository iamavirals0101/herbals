import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }
    fetch(`${import.meta.env.VITE_API_URL}/auth/verify-email?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.message && data.message.toLowerCase().includes('success')) {
          setStatus('success');
          setMessage('Your email has been verified! You can now log in.');
        } else if (data.message && data.message.toLowerCase().includes('invalid')) {
          setStatus('already');
          setMessage('Your email is already verified or the link has expired. You can now log in.');
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Verification failed.');
      });
  }, [searchParams]);

  return (
    <div className="flex flex-col min-h-[80vh] bg-gradient-to-br from-green-50 to-blue-50 justify-center items-center py-8">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Email Verification</h1>
        {status === 'loading' && <div className="text-blue-600">Verifying...</div>}
        {(status === 'success' || status === 'already') && (
          <>
            <div className="text-green-600">{message}</div>
            <Link to="/login" className="mt-6 bg-blue-600 text-white rounded-lg py-2 px-4 font-semibold hover:bg-blue-700 transition">Go to Login</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-red-600">{message}</div>
            <Link to="/login" className="mt-6 bg-blue-600 text-white rounded-lg py-2 px-4 font-semibold hover:bg-blue-700 transition">Go to Login</Link>
          </>
        )}
      </div>
    </div>
  );
} 