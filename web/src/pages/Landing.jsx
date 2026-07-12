import React from 'react';

export default function Landing({ setActivePage }) {
  return (
    <div class="bg-bg-canvas text-on-surface antialiased min-h-screen flex flex-col font-body-md">
      {/* TopNavBar */}
      <nav class="fixed w-full top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-border-subtle transition-all duration-300">
        <div class="max-w-container-max mx-auto px-margin-desktop flex items-center justify-between h-16">
          <div class="flex items-center gap-stack-lg">
            <a class="font-headline-md text-headline-md font-bold text-primary flex items-center gap-stack-sm group" href="#">
              <span class="material-symbols-outlined text-primary-container group-hover:rotate-12 transition-transform duration-300" style={{ fontVariationSettings: "'FILL' 1" }}>
                medical_services
              </span>
              MedAI Core
            </a>
            <div class="hidden md:flex items-center gap-stack-lg ml-stack-lg font-body-md text-body-md">
              <a class="text-on-surface-variant hover:text-primary-hover transition-colors" href="#platform">Platform</a>
              <a class="text-on-surface-variant hover:text-primary-hover transition-colors" href="#solutions">Solutions</a>
              <a class="text-on-surface-variant hover:text-primary-hover transition-colors" href="#resources">Resources</a>
              <a class="text-on-surface-variant hover:text-primary-hover transition-colors" href="#pricing">Pricing</a>
            </div>
          </div>
          <div class="flex items-center gap-stack-md font-button text-button">
            <button 
              onClick={() => setActivePage('login')}
              class="text-primary hover:text-primary-hover transition-colors px-stack-md py-stack-sm rounded-lg hover:bg-primary-light font-semibold"
            >
              Log In
            </button>
            <button 
              onClick={() => setActivePage('register')}
              class="bg-primary hover:bg-primary-hover text-on-primary px-stack-md py-stack-sm rounded-lg transition-all duration-300 shadow-sm active:scale-95 font-semibold"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <main class="flex-grow pt-16">
        {/* Hero Section */}
        <section class="relative overflow-hidden bg-gradient-to-b from-white to-bg-canvas pt-stack-lg pb-24 lg:pt-24 lg:pb-32 px-margin-desktop">
          <div class="max-w-container-max mx-auto grid grid-cols-1 lg:grid-cols-2 gap-gutter items-center">
            <div class="flex flex-col gap-stack-lg z-10">
              <div class="inline-flex items-center gap-stack-sm bg-primary-light text-primary px-stack-md py-stack-sm rounded-full font-label-caps text-xs self-start border border-border-subtle">
                <span class="relative flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Introducing MedAI Assistant 2.0
              </div>
              <h1 class="font-display-lg text-display-lg text-on-surface font-bold max-w-2xl leading-tight">
                AI becomes the doctor's assistant
              </h1>
              <p class="font-body-lg text-body-lg text-on-surface-variant max-w-xl leading-relaxed">
                Streamline your clinical workflow with our high-trust AI. From ambient voice dictation to predictive patient analytics, regain the time you need to focus on what matters most—your patients.
              </p>
              <div class="flex flex-col sm:flex-row gap-stack-md pt-stack-sm">
                <button 
                  onClick={() => setActivePage('register')}
                  class="bg-primary hover:bg-primary-hover text-on-primary font-button text-button px-stack-lg py-3 rounded-lg shadow-sm transition-all duration-300 flex items-center justify-center gap-stack-sm active:scale-95 font-semibold"
                >
                  Start Free Trial
                  <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
                <button class="bg-white hover:bg-surface-container-low text-primary font-button text-button px-stack-lg py-3 rounded-lg border border-border-subtle transition-all duration-300 flex items-center justify-center gap-stack-sm active:scale-95 font-semibold">
                  <span class="material-symbols-outlined text-sm">play_circle</span>
                  Watch Demo
                </button>
              </div>
              <div class="mt-stack-lg flex items-center gap-stack-md text-on-surface-variant font-body-sm text-sm">
                <div class="flex -space-x-2">
                  <div class="w-8 h-8 rounded-full bg-surface-container-high border-2 border-white flex items-center justify-center">
                    <span class="material-symbols-outlined text-xs text-secondary">person</span>
                  </div>
                  <div class="w-8 h-8 rounded-full bg-surface-container-high border-2 border-white flex items-center justify-center">
                    <span class="material-symbols-outlined text-xs text-secondary">person</span>
                  </div>
                  <div class="w-8 h-8 rounded-full bg-surface-container-high border-2 border-white flex items-center justify-center">
                    <span class="material-symbols-outlined text-xs text-secondary">person</span>
                  </div>
                </div>
                <p>Trusted by 10,000+ clinicians globally</p>
              </div>
            </div>

            <div class="relative mt-12 lg:mt-0 z-0 flex justify-center">
              {/* Abstract Medical Tech Illustration */}
              <div class="relative w-full max-w-lg aspect-square">
                <div class="absolute inset-0 bg-primary-light rounded-full blur-3xl opacity-50 mix-blend-multiply"></div>
                <div class="absolute right-0 top-0 w-64 h-64 bg-tertiary-fixed-dim/20 rounded-full blur-3xl opacity-20 mix-blend-multiply"></div>
                
                {/* Floating UI Elements */}
                <div class="bg-white/80 backdrop-blur-md border border-border-subtle shadow-ambient rounded-xl p-stack-md absolute top-10 left-0 w-64 animate-float-up z-10">
                  <div class="flex items-center gap-stack-sm mb-stack-md border-b border-border-subtle pb-stack-sm">
                    <span class="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
                    <span class="font-label-caps text-[10px] uppercase font-bold text-secondary">Live Dictation Active</span>
                  </div>
                  <p class="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                    "Patient presents with mild hypertension. Recommending low-sodium diet and follow-up in 2 weeks..."
                  </p>
                  <div class="mt-stack-md flex gap-2">
                    <span class="px-2 py-1 bg-surface-container-low text-secondary text-[10px] rounded">ICD-10 Extracted</span>
                    <span class="px-2 py-1 bg-primary-light text-primary text-[10px] rounded">Auto-Saved</span>
                  </div>
                </div>

                <div class="bg-white/80 backdrop-blur-md border border-border-subtle shadow-ambient rounded-xl p-stack-md absolute bottom-20 right-0 w-72 animate-float-down z-10">
                  <div class="flex items-center justify-between mb-stack-sm">
                    <span class="font-label-caps text-[10px] uppercase font-bold text-secondary">Risk Analysis</span>
                    <span class="text-status-warning text-xs font-bold">Moderate</span>
                  </div>
                  <div class="w-full bg-surface-container-low rounded-full h-2 mb-stack-md">
                    <div class="bg-status-warning h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                  <div class="space-y-2 font-body-sm text-xs">
                    <div class="flex justify-between border-b border-border-subtle pb-1">
                      <span class="text-on-surface-variant">Cardiovascular</span>
                      <span class="text-on-surface font-semibold">65%</span>
                    </div>
                    <div class="flex justify-between border-b border-border-subtle pb-1">
                      <span class="text-on-surface-variant">Metabolic</span>
                      <span class="text-on-surface font-semibold">42%</span>
                    </div>
                  </div>
                </div>

                {/* Main Hero Image Area */}
                <div class="absolute inset-10 rounded-2xl overflow-hidden border border-border-subtle shadow-xl bg-white z-0">
                  <div 
                    class="bg-cover bg-center w-full h-full opacity-80"
                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB3oOLyIkPH93Bw9IoTc5frn1YBvotqJwVMhRQGcesuy4nPxUSU1Pv0t6kA3Gp3E1oK-3FI2iS4mLzHRa2jGL8mdz2yrNxSDUbWp3GD6H1EUhoFZGJj6mGf2-PdFa2n-APoknpJmLotzLF_4okYEUB6bjxWxGtJyE56Y0H9EYaytJ3gTDKmoaHs6JcM3uBuStqzRA-kwSfbZVXiV1rzzLYz17FhOxlWqdroOFq6wEOmULkFpY1FIDK_xA')" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Section */}
        <section class="py-24 px-margin-desktop bg-white" id="platform">
          <div class="max-w-container-max mx-auto">
            <div class="text-center max-w-3xl mx-auto mb-16">
              <h2 class="font-headline-lg text-headline-lg text-on-surface font-bold mb-stack-md">Intelligent Clinical Engine</h2>
              <p class="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                MedAI Core is an AI-powered clinical engine designed from the ground up to automate complex documentation, intuitively streamline your daily workflows, and strictly ensure HIPAA compliance across all operations.
              </p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              <div class="bg-bg-canvas p-stack-lg rounded-xl border border-border-subtle text-center hover:shadow-lg transition-shadow">
                <div class="w-16 h-16 mx-auto bg-primary-light rounded-full flex items-center justify-center mb-stack-md text-primary">
                  <span class="material-symbols-outlined text-3xl">auto_awesome</span>
                </div>
                <h3 class="font-headline-md text-base text-on-surface font-bold mb-stack-sm">Automated Documentation</h3>
                <p class="font-body-md text-sm text-on-surface-variant leading-relaxed">
                  Eliminate hours of manual data entry with our advanced natural language processing that understands medical context.
                </p>
              </div>
              <div class="bg-bg-canvas p-stack-lg rounded-xl border border-border-subtle text-center hover:shadow-lg transition-shadow">
                <div class="w-16 h-16 mx-auto bg-primary-light rounded-full flex items-center justify-center mb-stack-md text-primary">
                  <span class="material-symbols-outlined text-3xl">account_tree</span>
                </div>
                <h3 class="font-headline-md text-base text-on-surface font-bold mb-stack-sm">Streamlined Workflows</h3>
                <p class="font-body-md text-sm text-on-surface-variant leading-relaxed">
                  Integrate seamlessly with your existing processes to reduce clicks and keep the focus entirely on patient care.
                </p>
              </div>
              <div class="bg-bg-canvas p-stack-lg rounded-xl border border-border-subtle text-center hover:shadow-lg transition-shadow">
                <div class="w-16 h-16 mx-auto bg-primary-light rounded-full flex items-center justify-center mb-stack-md text-primary">
                  <span class="material-symbols-outlined text-3xl">shield_locked</span>
                </div>
                <h3 class="font-headline-md text-base text-on-surface font-bold mb-stack-sm">HIPAA Compliant</h3>
                <p class="font-body-md text-sm text-on-surface-variant leading-relaxed">
                  Enterprise-grade security architecture ensuring all patient health information is encrypted and strictly protected.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Solutions Section */}
        <section class="py-24 px-margin-desktop bg-bg-canvas" id="solutions">
          <div class="max-w-container-max mx-auto">
            <div class="mb-16">
              <h2 class="font-headline-lg text-headline-lg text-on-surface font-bold mb-stack-md">Solutions for Modern Practice</h2>
              <p class="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
                Practical, cutting-edge tools built to solve the real-world challenges faced by medical professionals every day.
              </p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              <div class="flex gap-stack-md bg-white p-stack-lg rounded-xl border border-border-subtle">
                <div class="flex-shrink-0 mt-1">
                  <span class="material-symbols-outlined text-primary text-3xl">mic</span>
                </div>
                <div>
                  <h3 class="font-headline-md text-base text-on-surface font-bold mb-stack-sm">Ambient Voice Dictation</h3>
                  <p class="font-body-md text-sm text-on-surface-variant leading-relaxed">
                    Capture complete patient encounters naturally. Our ambient AI listens in the background and intelligently structures the consultation data without manual intervention.
                  </p>
                </div>
              </div>
              <div class="flex gap-stack-md bg-white p-stack-lg rounded-xl border border-border-subtle">
                <div class="flex-shrink-0 mt-1">
                  <span class="material-symbols-outlined text-primary text-3xl">description</span>
                </div>
                <div>
                  <h3 class="font-headline-md text-base text-on-surface font-bold mb-stack-sm">Automated SOAP Notes</h3>
                  <p class="font-body-md text-sm text-on-surface-variant leading-relaxed">
                    Instantly generate accurate, comprehensive SOAP notes ready for review immediately after the patient visit concludes.
                  </p>
                </div>
              </div>
              <div class="flex gap-stack-md bg-white p-stack-lg rounded-xl border border-border-subtle">
                <div class="flex-shrink-0 mt-1">
                  <span class="material-symbols-outlined text-primary text-3xl">calendar_month</span>
                </div>
                <div>
                  <h3 class="font-headline-md text-base text-on-surface font-bold mb-stack-sm">Schedule Management</h3>
                  <p class="font-body-md text-sm text-on-surface-variant leading-relaxed">
                    Optimize your organizational efficiency with smart scheduling that anticipates appointment durations and minimizes patient wait times.
                  </p>
                </div>
              </div>
              <div class="flex gap-stack-md bg-white p-stack-lg rounded-xl border border-border-subtle">
                <div class="flex-shrink-0 mt-1">
                  <span class="material-symbols-outlined text-primary text-3xl">insights</span>
                </div>
                <div>
                  <h3 class="font-headline-md text-base text-on-surface font-bold mb-stack-sm">Predictive Analytics</h3>
                  <p class="font-body-md text-sm text-on-surface-variant leading-relaxed">
                    Leverage historical data to identify potential patient risks early, supporting proactive and preventative care strategies.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section class="py-24 px-margin-desktop bg-white border-t border-border-subtle" id="pricing">
          <div class="max-w-container-max mx-auto">
            <div class="text-center mb-16">
              <h2 class="font-headline-lg text-headline-lg text-on-surface font-bold mb-stack-md">Transparent Pricing Plans</h2>
              <p class="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
                Scalable solutions designed for practices of every size.
              </p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-gutter items-start">
              {/* Starter Plan */}
              <div class="bg-bg-canvas rounded-2xl p-stack-lg border border-border-subtle shadow-sm flex flex-col">
                <h3 class="font-headline-md text-base text-on-surface font-bold mb-2">Starter</h3>
                <p class="font-body-sm text-xs text-on-surface-variant mb-6">Perfect for individual practitioners.</p>
                <div class="mb-8">
                  <span class="font-display-lg text-4xl font-bold text-on-surface">$99</span>
                  <span class="text-on-surface-variant font-body-md text-sm">/month</span>
                </div>
                <ul class="space-y-4 mb-8 font-body-sm text-xs text-on-surface-variant flex-grow">
                  <li class="flex items-center gap-2"><span class="material-symbols-outlined text-primary text-sm">check_circle</span> Unlimited Ambient Dictation</li>
                  <li class="flex items-center gap-2"><span class="material-symbols-outlined text-primary text-sm">check_circle</span> Automated SOAP Notes</li>
                  <li class="flex items-center gap-2"><span class="material-symbols-outlined text-primary text-sm">check_circle</span> Standard EMR Export</li>
                  <li class="flex items-center gap-2"><span class="material-symbols-outlined text-primary text-sm">check_circle</span> Email Support</li>
                </ul>
                <button 
                  onClick={() => setActivePage('register')}
                  class="w-full bg-white hover:bg-surface-container text-primary font-button py-3 rounded-lg border border-border-subtle transition-colors font-semibold"
                >
                  Get Started
                </button>
              </div>

              {/* Professional Plan */}
              <div class="bg-white rounded-2xl p-stack-lg border-2 border-primary shadow-lg flex flex-col relative transform md:-translate-y-4">
                <div class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-on-primary font-label-caps text-[9px] px-3 py-1 rounded-full uppercase tracking-wider font-bold">
                  Most Popular
                </div>
                <h3 class="font-headline-md text-base text-on-surface font-bold mb-2">Professional</h3>
                <p class="font-body-sm text-xs text-on-surface-variant mb-6">Ideal for growing clinics.</p>
                <div class="mb-8">
                  <span class="font-display-lg text-4xl font-bold text-on-surface">$249</span>
                  <span class="text-on-surface-variant font-body-md text-sm">/month per user</span>
                </div>
                <ul class="space-y-4 mb-8 font-body-sm text-xs text-on-surface-variant flex-grow">
                  <li class="flex items-center gap-2"><span class="material-symbols-outlined text-primary text-sm">check_circle</span> Everything in Starter</li>
                  <li class="flex items-center gap-2"><span class="material-symbols-outlined text-primary text-sm">check_circle</span> Advanced Schedule Management</li>
                  <li class="flex items-center gap-2"><span class="material-symbols-outlined text-primary text-sm">check_circle</span> Direct EMR API Integration</li>
                  <li class="flex items-center gap-2"><span class="material-symbols-outlined text-primary text-sm">check_circle</span> Priority 24/7 Support</li>
                </ul>
                <button 
                  onClick={() => setActivePage('register')}
                  class="w-full bg-primary hover:bg-primary-hover text-on-primary font-button py-3 rounded-lg transition-colors shadow-sm font-semibold"
                >
                  Start Free Trial
                </button>
              </div>

              {/* Enterprise Plan */}
              <div class="bg-bg-canvas rounded-2xl p-stack-lg border border-border-subtle shadow-sm flex flex-col">
                <h3 class="font-headline-md text-base text-on-surface font-bold mb-2">Enterprise</h3>
                <p class="font-body-sm text-xs text-on-surface-variant mb-6">Custom solutions for hospitals.</p>
                <div class="mb-8">
                  <span class="font-display-lg text-4xl font-bold text-on-surface">Custom</span>
                  <span class="text-on-surface-variant font-body-md text-sm">/annual billing</span>
                </div>
                <ul class="space-y-4 mb-8 font-body-sm text-xs text-on-surface-variant flex-grow">
                  <li class="flex items-center gap-2"><span class="material-symbols-outlined text-primary text-sm">check_circle</span> Everything in Professional</li>
                  <li class="flex items-center gap-2"><span class="material-symbols-outlined text-primary text-sm">check_circle</span> Predictive Patient Analytics</li>
                  <li class="flex items-center gap-2"><span class="material-symbols-outlined text-primary text-sm">check_circle</span> Custom Workflows & Templates</li>
                  <li class="flex items-center gap-2"><span class="material-symbols-outlined text-primary text-sm">check_circle</span> Dedicated Account Manager</li>
                </ul>
                <button 
                  onClick={() => setActivePage('register')}
                  class="w-full bg-white hover:bg-surface-container text-primary font-button py-3 rounded-lg border border-border-subtle transition-colors font-semibold"
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer class="bg-white border-t border-border-subtle mt-auto">
        <div class="max-w-container-max mx-auto px-margin-desktop py-stack-lg flex flex-col md:flex-row justify-between items-center gap-stack-md">
          <div class="flex flex-col items-center md:items-start gap-stack-sm">
            <div class="font-label-caps text-xs font-black text-on-surface flex items-center gap-2">
              <span class="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                medical_services
              </span>
              MEDAI CORE
            </div>
            <p class="font-body-sm text-xs text-on-surface-variant">© 2026 MedAI Systems. HIPAA Compliant & SOC2 Certified.</p>
          </div>
          <div class="flex flex-wrap justify-center gap-stack-md font-body-sm text-xs text-on-surface-variant">
            <a class="hover:text-primary transition-colors" href="#">Privacy Policy</a>
            <a class="hover:text-primary transition-colors" href="#">Terms of Service</a>
            <a class="hover:text-primary transition-colors" href="#">Security</a>
            <a class="hover:text-primary transition-colors" href="#">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
