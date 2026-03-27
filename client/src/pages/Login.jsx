import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../components/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendStatus, setResendStatus] = useState('idle');
  const [resendMsg, setResendMsg] = useState('');

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId: credentialResponse.credential })
      });
      if (!res.ok) throw new Error('Google login failed');
      const data = await res.json();
      login(data.token, data.user);
      navigate('/segments');
    } catch (err) {
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setShowResend(false);
    setResendStatus('idle');
    setResendMsg('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.message && data.message.toLowerCase().includes('verify')) {
          setShowResend(true);
          setError('Your email is not verified. Please check your inbox.');
          // Auto-resend verification email and show result
          try {
            const resendRes = await fetch(`${import.meta.env.VITE_API_URL}/auth/resend-verification`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
            const resendData = await resendRes.json();
            if (resendRes.ok) {
              setResendStatus('success');
              setResendMsg('Verification email resent!');
            } else {
              setResendStatus('error');
              setResendMsg(resendData.message || 'Failed to resend verification email.');
            }
          } catch {
            setResendStatus('error');
            setResendMsg('Failed to resend verification email.');
          }
        } else if (res.status === 400 && data.message && data.message.toLowerCase().includes('invalid')) {
          setError('Invalid email or password.');
        } else {
          setError(data.message || 'Login failed.');
        }
        return;
      }
      login(data.token, data.user);
      navigate('/segments');
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendStatus('loading');
    setResendMsg('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setResendStatus('success');
        setResendMsg('Verification email resent!');
      } else {
        setResendStatus('error');
        setResendMsg(data.message || 'Failed to resend verification email.');
      }
    } catch {
      setResendStatus('error');
      setResendMsg('Failed to resend verification email.');
    }
  };

  return (
    <div className="flex flex-col min-h-[80vh] bg-gradient-to-br from-blue-50 to-green-50 justify-center items-center py-8">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Sign in to Herbal CRM</h1>
        <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            type="email"
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded-lg py-2 font-semibold hover:bg-blue-700 transition"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="my-4 w-full flex items-center">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="mx-2 text-gray-400 text-xs">or</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError('Google login failed')}
          width="100%"
        />
        <div className="mt-4 text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">Register</Link>
        </div>
        <div className="w-full flex justify-end mt-2">
          <Link to="/reset-password-request" className="text-xs text-blue-600 hover:underline">Forgot password?</Link>
        </div>
        {showResend && (
          <div className="mt-4 w-full flex flex-col items-center">
            <button
              onClick={handleResend}
              className="bg-yellow-500 text-white rounded-lg py-2 px-4 font-semibold hover:bg-yellow-600 transition"
              disabled={resendStatus === 'loading'}
            >
              {resendStatus === 'loading' ? 'Resending...' : 'Resend Verification Email'}
            </button>
            {resendMsg && <div className={`mt-2 text-sm ${resendStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>{resendMsg}</div>}
          </div>
        )}
        {error && <div className="mt-4 text-red-600 text-sm">{error}</div>}
      </div>
    </div>
  );
} 
