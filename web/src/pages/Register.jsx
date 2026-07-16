import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import SbrLogo from '../components/SbrLogo';

export default function Register({ setActivePage }) {
  const { registerDoctor, registerOrg } = useApp();
  const [role, setRole] = useState('doctor'); // doctor or org
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [specialty, setSpecialty] = useState('Cardiology'); // default for orgs
  const [file, setFile] = useState(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (role === 'doctor') {
      if (!file) {
        setError('يرجى تحميل مستند إثبات المهنة أو الشهادة الطبية');
        return;
      }

      try {
        await registerDoctor(name, email, phone, password, specialty, null, 'pending', file);
        setSuccess(true);
      } catch (err) {
        setError(err.message || 'حدث خطأ أثناء التسجيل');
      }
    } else {
      // Organization registration
      try {
        await registerOrg(name, email, phone, specialty, password);
        setSuccess(true);
      } catch (err) {
        setError(err.message || 'حدث خطأ أثناء تسجيل المنظمة');
      }
    }
  };

  if (success) {
    return (
      <div class="min-h-screen bg-bg-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-body-md animate-fade-in">
        <div class="sm:mx-auto sm:w-full sm:max-w-md">
          <div class="bg-white py-8 px-4 border border-border-subtle rounded-xl shadow-sm sm:px-10 text-center">
            <span class="material-symbols-outlined text-[64px] text-primary mb-4">
              check_circle
            </span>
            <h2 class="font-headline-md text-headline-md text-primary font-bold mb-2">
              Registration Successful!
            </h2>
            {role === 'doctor' ? (
              <p class="text-sm text-secondary mb-6 leading-relaxed">
                Your medical profile has been registered. You can now log in to access your clinic portal.
              </p>
            ) : (
              <p class="text-sm text-secondary mb-6 leading-relaxed">
                Your organization profile has been registered. You can now log in to assign doctors and view analytics.
              </p>
            )}
            <button
              onClick={() => setActivePage('login')}
              type="button"
              class="w-full bg-primary hover:bg-primary-hover text-on-primary font-button py-2.5 px-4 rounded-lg transition-colors font-semibold"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              {role === 'doctor' ? 'Join the SBR AI Clinician Community' : 'Empower Your Clinical Teams'}
            </h2>
            <p class="text-sm text-secondary leading-relaxed">
              {role === 'doctor' 
                ? 'Register your workspace to start utilizing high-trust clinical AI assistants, ambient SOAP notes, and modern scheduler boards.'
                : 'Establish an administrative workspace. Assign multiple doctors, monitor performance, and manage enterprise subscriptions.'
              }
            </p>
          </div>
          
          {/* Visual Floating Preview Card */}
          <div class="p-6 bg-white/90 backdrop-blur-md rounded-xl border border-border-subtle shadow-ambient animate-float-up">
            <div class="flex items-center gap-3 mb-3">
              <span class="material-symbols-outlined text-primary bg-primary-light p-2 rounded-lg text-lg">
                {role === 'doctor' ? 'medical_information' : 'corporate_fare'}
              </span>
              <span class="text-xs font-bold text-on-surface uppercase tracking-wider font-label-caps">
                {role === 'doctor' ? 'Secure Onboarding' : 'Departmental Board'}
              </span>
            </div>
            <p class="text-xs text-secondary leading-relaxed">
              {role === 'doctor'
                ? 'We require medical credential checks to verify clinical users and secure the workspace.'
                : 'Easily manage clinical departments, seat distributions, and AI transcription analytics.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Register Form Container */}
      <div class="w-full lg:w-1/2 flex flex-col justify-center py-12 px-6 sm:px-12 lg:px-24 bg-white overflow-y-auto">
        <div class="mx-auto w-full max-w-sm">
          <div class="text-center lg:text-left mb-6 flex flex-col items-center lg:items-start">
            <div class="mb-4 lg:hidden">
              <SbrLogo size={44} color="#24564C" showText={true} textClass="text-primary" />
            </div>
            <h2 class="font-display-lg text-headline-lg text-primary font-bold">
              {role === 'doctor' ? 'Register Doctor' : 'Register Organization'}
            </h2>
            <p class="mt-2 text-sm text-secondary text-center lg:text-left">
              {role === 'doctor' ? 'Join SBR AI Clinical Team' : 'Create administrative clinic workspace'}
            </p>
          </div>

          <div class="bg-white border border-border-subtle rounded-xl p-6 shadow-sm">
            {/* Role Switcher */}
            <div class="flex gap-2 mb-6 p-1 bg-surface-container-low rounded-lg">
              <button
                onClick={() => {
                  setRole('doctor');
                  setName('');
                  setEmail('');
                  setPhone('');
                  setFile(null);
                  setError('');
                }}
                type="button"
                class={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  role === 'doctor' 
                    ? 'bg-white text-primary shadow-sm' 
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Doctor Profile
              </button>
              <button
                onClick={() => {
                  setRole('org');
                  setName('');
                  setEmail('');
                  setPhone('');
                  setFile(null);
                  setError('');
                }}
                type="button"
                class={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  role === 'org' 
                    ? 'bg-white text-primary shadow-sm' 
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Organization
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
                  {role === 'doctor' ? 'Full Name' : 'Organization Name'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === 'doctor' ? 'Dr. Ahmed Hassan' : 'Cairo Medical Group'}
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">
                  {role === 'doctor' ? 'Email Address' : 'Organization Email'}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === 'doctor' ? 'doctor@example.com' : 'org@cairomed.com'}
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01012345678"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">
                  {role === 'doctor' ? 'Specialization' : 'Specialty / Clinical Department'}
                </label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                >
                  <option value="Cardiology">Cardiology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Oncology">Oncology</option>
                  <option value="General Practice">General Practice</option>
                </select>
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

              {role === 'doctor' && (
                <div>
                  <label class="block text-xs font-semibold text-on-surface-variant mb-1">
                    Medical Certificate / ID (PDF or Image)
                  </label>
                  <div class="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-border-subtle border-dashed rounded-lg">
                    <div class="space-y-1 text-center">
                      <span class="material-symbols-outlined text-[36px] text-outline-variant">
                        upload_file
                      </span>
                      <div class="flex text-xs text-secondary justify-center">
                        <label class="relative cursor-pointer bg-white rounded-md font-semibold text-primary hover:text-primary-hover focus-within:outline-none">
                          <span>Upload a file</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            class="sr-only"
                            onChange={(e) => setFile(e.target.files[0])}
                          />
                        </label>
                      </div>
                      <p class="text-[10px] text-secondary-fixed-dim">
                        {file ? file.name : 'PDF, PNG, JPG up to 10MB'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                class="w-full bg-primary hover:bg-primary-hover text-on-primary font-button py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm font-semibold mt-6 text-sm"
              >
                Submit Registration
              </button>
            </form>

            <div class="mt-6 text-center">
              <p class="text-xs text-secondary">
                Already registered?{' '}
                <button
                  onClick={() => setActivePage('login')}
                  type="button"
                  class="text-primary hover:underline font-semibold"
                >
                  Sign In
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
