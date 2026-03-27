// client/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import SegmentBuilder from './components/SegmentBuilder';
import CampaignCreator from './components/CampaignCreator';
import CampaignHistory from './pages/CampaignHistory';
import Login from './pages/Login';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './components/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './components/Landing';
import Register from './pages/Register';
import Navbar from './components/Navbar';
import VerifyEmail from './pages/VerifyEmail';
import ResetPasswordRequest from './pages/ResetPasswordRequest';
import ResetPassword from './pages/ResetPassword';
import ImportCustomers from './pages/ImportCustomers';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <main className="flex-1 w-full px-4 sm:px-8 py-8">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/segments" element={<ProtectedRoute><SegmentBuilder /></ProtectedRoute>} />
            <Route path="/campaigns" element={<ProtectedRoute><CampaignCreator /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><CampaignHistory /></ProtectedRoute>} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/reset-password-request" element={<ResetPasswordRequest />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/import-customers" element={<ImportCustomers />} />
          </Routes>
        </main>
        <Toaster position="top-right" />
      </Router>
    </AuthProvider>
  );
}
