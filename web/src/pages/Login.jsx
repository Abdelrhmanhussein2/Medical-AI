import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import SbrLogo from '../components/SbrLogo';

export default function Login({ setActivePage }) {
  const { login } = useApp();
  const [role, setRole] = useState('doctor'); // doctor, org, or admin
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    try {
      login(email, password, role);
      if (role === 'admin') {
        setActivePage('admin-overview');
      } else if (role === 'org') {
        setActivePage('org-dashboard');
      } else {
        setActivePage('dashboard');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div class="min-h-screen flex bg-bg-canvas font-body-md animate-fade-in">
      {/* Left side: Premium Branding & Illustration Panel */}
      <div class="hidden lg:flex lg:w-1/2 bg-gradient-to-tr from-primary-light via-white to-primary/10 items-center justify-center p-16 relative overflow-hidden border-r border-border-subtle">
        <div class="absolute -top-20 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-20 -right-20 w-96 h-96 bg-tertiary-fixed-dim/5 rounded-full blur-3xl"></div>
        
        <div class="max-w-md space-y-8 relative z-10 text-left">
          <div class="flex items-center gap-3">
            <SbrLogo size={56} color="#24564C" showText={true} textClass="text-primary" />
          </div>
          <div class="inline-flex items-center gap-2 px-3.5 py-1 bg-white border border-border-subtle rounded-full text-xs font-semibold text-primary shadow-sm">
            <span class="material-symbols-outlined text-[16px] fill">shield_locked</span>
            HIPAA Compliant & SOC2 Certified
          </div>
          <div class="space-y-4">
            <h2 class="text-4xl font-bold text-primary font-headline-lg leading-tight">
              Elevating Clinical Precision with Generative AI
            </h2>
            <p class="text-sm text-secondary leading-relaxed">
              Capture patient consultations naturally, auto-generate high-quality SOAP notes, and manage your schedules seamlessly with SBR AI.
            </p>
          </div>
          
          {/* Visual Floating Preview Card */}
          <div class="p-6 bg-white/90 backdrop-blur-md rounded-xl border border-border-subtle shadow-ambient animate-float-up">
            <div class="flex items-center gap-3 mb-3">
              <span class="material-symbols-outlined text-primary bg-primary-light p-2 rounded-lg text-lg">auto_awesome</span>
              <span class="text-xs font-bold text-on-surface uppercase tracking-wider font-label-caps">Clinical Engine</span>
            </div>
            <p class="text-xs text-secondary leading-relaxed">
              Our ambient AI listens in the background and structures the consultation data without manual intervention, allowing you to focus entirely on your patients.
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Login Form Container */}
      <div class="w-full lg:w-1/2 flex flex-col justify-center py-12 px-6 sm:px-12 lg:px-24 bg-white">
        <div class="mx-auto w-full max-w-sm">
          <div class="text-center lg:text-left mb-8 flex flex-col items-center lg:items-start">
            <div class="mb-4 lg:hidden">
              <SbrLogo size={44} color="#24564C" showText={true} textClass="text-primary" />
            </div>
            <h2 class="font-display-lg text-headline-lg text-primary font-bold">
              Welcome back
            </h2>
            <p class="mt-2 text-sm text-secondary text-center lg:text-left">
              Please enter your credentials to access your workspace.
            </p>
          </div>

          <div class="bg-white border border-border-subtle rounded-xl p-6 shadow-sm">
            {/* Role Switcher */}
            <div class="flex gap-1 mb-6 p-1 bg-surface-container-low rounded-lg">
              <button
                onClick={() => {
                  setRole('doctor');
                  setEmail('');
                  setPassword('');
                }}
                type="button"
                class={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-colors ${
                  role === 'doctor' 
                    ? 'bg-white text-primary shadow-sm' 
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Doctor
              </button>
              <button
                onClick={() => {
                  setRole('org');
                  setEmail('');
                  setPassword('');
                }}
                type="button"
                class={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-colors ${
                  role === 'org' 
                    ? 'bg-white text-primary shadow-sm' 
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Organization
              </button>
              <button
                onClick={() => {
                  setRole('admin');
                  setEmail('');
                  setPassword('');
                }}
                type="button"
                class={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-colors ${
                  role === 'admin' 
                    ? 'bg-white text-primary shadow-sm' 
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Admin
              </button>
            </div>

            {error && (
              <div class="mb-4 bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">error</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    role === 'admin' 
                      ? 'admin@medical-ai.com' 
                      : role === 'org' 
                        ? 'org@cardiology.com' 
                        : 'doctor@example.com'
                  }
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <button
                type="submit"
                class="w-full bg-primary hover:bg-primary-hover text-on-primary font-button py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm font-semibold mt-6 text-sm"
              >
                Sign In
              </button>
            </form>

            {role === 'doctor' && (
              <div class="mt-6 text-center">
                <p class="text-xs text-secondary">
                  New doctor?{' '}
                  <button
                    onClick={() => setActivePage('register')}
                    type="button"
                    class="text-primary hover:underline font-semibold"
                  >
                    Register here
                  </button>
                </p>
              </div>
            )}

            {role === 'org' && (
              <div class="mt-6 text-center">
                <p class="text-xs text-secondary">
                  New organization?{' '}
                  <button
                    onClick={() => setActivePage('register')}
                    type="button"
                    class="text-primary hover:underline font-semibold"
                  >
                    Register organization
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

