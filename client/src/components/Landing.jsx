import React from 'react';
import { Link } from 'react-router-dom';
import { FaUserPlus, FaUpload, FaUsers, FaRocket, FaBrain } from 'react-icons/fa';
import logo from '../assets/react.svg';

export default function Landing() {
  return (
    <div className="m-0 min-h-screen bg-gradient-to-br from-blue-100 to-green-100 flex flex-col">
      <main className="flex flex-1 flex-col items-center justify-center text-center px-4">
        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-4 mt-8 md:mb-6 md:mt-12 px-2 md:px-0">
          Grow Your Business with <span className="text-blue-600">AI Powered Herbal CRM</span>
        </h1>
        <p className="text-base md:text-lg text-gray-600 mb-8 max-w-2xl font-normal md:font-light px-2 md:px-0">
          A modern, multi-tenant CRM platform to manage your customers, campaigns, and analytics—all in one place. <span className="font-semibold text-blue-700">AI-powered insights</span>, secure, scalable, and easy to use for every business.
        </p>
        <div className="flex flex-col md:flex-row gap-4 mb-12">
          <Link to="/register" className="bg-green-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-green-700 transition">Start Free</Link>
          <Link to="/login" className="bg-white border border-blue-600 text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-50 transition">Sign In</Link>
        </div>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full mb-12">
        <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center hover:bg-blue-50 transition duration-300 ease-in-out transform hover:drop-shadow-md">
            <span className="text-3xl mb-2">🤖</span>
            <h2 className="text-xl font-bold mb-2 text-blue-700">AI Powered</h2>
            <p className="text-gray-600">Leverage advanced AI to segment customers, generate campaign content, and get actionable recommendations for growth.</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center hover:bg-blue-50 transition duration-300 ease-in-out transform hover:drop-shadow-md">
            <span className="text-3xl mb-2">🔒</span>
            <h2 className="text-xl font-bold mb-2">Secure & Private</h2>
            <p className="text-gray-600">Your business data is always safe, private, and never shared with others. Multi-tenant architecture ensures complete isolation.</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center hover:bg-blue-50 transition duration-300 ease-in-out transform hover:drop-shadow-md">
            <span className="text-3xl mb-2">🚀</span>
            <h2 className="text-xl font-bold mb-2">Easy Campaigns</h2>
            <p className="text-gray-600">Create, launch, and track campaigns with just a few clicks. Powerful segmentation and analytics built in.</p>
          </div>
        </section>
        <section className="max-w-4xl w-full mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center hover:bg-blue-50 transition duration-300 ease-in-out transform hover:drop-shadow-md">
              <FaUserPlus className="text-blue-500 text-3xl mb-2" />
              <span className="font-semibold">Register</span>
              <span className="text-gray-500 text-sm mt-1">Create your free account</span>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center hover:bg-blue-50 transition duration-300 ease-in-out transform hover:drop-shadow-md">
              <FaUpload className="text-green-500 text-3xl mb-2" />
              <span className="font-semibold">Import Contacts</span>
              <span className="text-gray-500 text-sm mt-1">Upload or sync your customer data</span>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center hover:bg-blue-50 transition duration-300 ease-in-out transform hover:drop-shadow-md">
              <FaUsers className="text-purple-500 text-3xl mb-2" />
              <span className="font-semibold">Build Segments</span>
              <span className="text-gray-500 text-sm mt-1">Use AI to group your audience</span>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center hover:bg-blue-50 transition duration-300 ease-in-out transform hover:drop-shadow-md">
              <FaRocket className="text-pink-500 text-3xl mb-2" />
              <span className="font-semibold">Launch Campaigns</span>
              <span className="text-gray-500 text-sm mt-1">Send targeted messages</span>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center hover:bg-blue-50 transition duration-300 ease-in-out transform hover:drop-shadow-md">
              <FaBrain className="text-yellow-500 text-3xl mb-2" />
              <span className="font-semibold">AI Insights</span>
              <span className="text-gray-500 text-sm mt-1">Analyze and optimize with AI</span>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="text-center text-gray-400 py-6 text-sm">© {new Date().getFullYear()} Herbal CRM. All rights reserved.</footer>
    </div>
  );
} 
