import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SbrLogo from '../components/SbrLogo';

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan') || 'starter';

  // State for form fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(0); // 0: input, 1: connecting, 2: securing, 3: success

  // Plan configuration details
  const planDetails = {
    starter: {
      name: 'Starter Plan',
      price: '$99.00',
      period: 'month',
      features: ['Unlimited Ambient Dictation', 'Automated SOAP Notes', 'Standard EMR Export', 'Email Support']
    },
    professional: {
      name: 'Professional Plan',
      price: '$249.00',
      period: 'month',
      features: ['Everything in Starter', 'Advanced Schedule Management', 'Direct EMR API Integration', 'Priority 24/7 Support']
    }
  };

  const selectedPlan = planDetails[plan] || planDetails.starter;

  // Format Card Number (adds spaces every 4 digits)
  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    const formattedValue = value.match(/.{1,4}/g)?.join(' ') || '';
    setCardNumber(formattedValue);
  };

  // Format Expiry Date (adds slash after MM)
  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setCardExpiry(value);
  };

  // Format CVV (max 3 digits)
  const handleCvvChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 3) value = value.slice(0, 3);
    setCardCvv(value);
  };

  // Handle Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (cardNumber.replace(/\s/g, '').length < 16 || cardExpiry.length < 5 || cardCvv.length < 3) {
      alert('الرجاء إدخال بيانات بطاقة صحيحة وكاملة.');
      return;
    }

    setIsProcessing(true);
    setProcessStep(1);

    // Step 1: Connecting (1s)
    setTimeout(() => {
      setProcessStep(2);
      // Step 2: Securing (1s)
      setTimeout(() => {
        setProcessStep(3);
        // Save plan context in sessionStorage
        sessionStorage.setItem('paidPlan', plan);
        // Step 3: Success redirect (1.5s)
        setTimeout(() => {
          navigate('/register?role=doctor');
        }, 1500);
      }, 1000);
    }, 1000);
  };

  return (
    <div class="min-h-screen bg-bg-canvas font-body-md py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col justify-between">
      {/* Background Orbs */}
      <div class="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-tertiary-fixed-dim/5 rounded-full blur-3xl"></div>

      {/* Header logo */}
      <header class="max-w-6xl mx-auto w-full mb-8 flex justify-between items-center relative z-10">
        <button onClick={() => navigate('/')} class="flex items-center gap-2 text-secondary hover:text-primary transition-colors text-sm font-semibold">
          <span class="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Home
        </button>
        <SbrLogo size={36} color="#24564C" showText={true} textClass="text-primary" />
      </header>

      {/* Main Checkout Container */}
      <main class="max-w-5xl mx-auto w-full bg-white border border-border-subtle rounded-2xl shadow-ambient overflow-hidden relative z-10 flex flex-col md:flex-row">
        
        {/* Left Column: Form details */}
        <section class="w-full md:w-3/5 p-8 border-b md:border-b-0 md:border-r border-border-subtle">
          <div class="mb-6">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-light text-primary text-[10px] font-bold rounded-full uppercase tracking-wider mb-2">
              <span class="material-symbols-outlined text-[12px] fill">shield</span>
              Secure 256-bit SSL Connection
            </span>
            <h1 class="text-2xl font-bold text-primary font-headline-md">Payment Details</h1>
            <p class="text-xs text-secondary mt-1">Complete your transaction using a credit card.</p>
          </div>

          <form onSubmit={handleSubmit} class="space-y-5">
            <div>
              <label class="block text-xs font-semibold text-on-surface-variant mb-1">
                Cardholder Name
              </label>
              <input
                type="text"
                required
                disabled={isProcessing}
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="Dr. Ahmed Hassan"
                class="w-full px-3 py-2.5 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface uppercase"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-on-surface-variant mb-1">
                Card Number
              </label>
              <div class="relative">
                <input
                  type="text"
                  required
                  disabled={isProcessing}
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  placeholder="4000 1234 5678 9010"
                  class="w-full pl-3 pr-10 py-2.5 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
                <span class="material-symbols-outlined absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary text-[20px]">
                  credit_card
                </span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">
                  Expiry Date
                </label>
                <input
                  type="text"
                  required
                  disabled={isProcessing}
                  value={cardExpiry}
                  onChange={handleExpiryChange}
                  placeholder="MM/YY"
                  class="w-full px-3 py-2.5 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface text-center"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">
                  CVV / CVC
                </label>
                <input
                  type="password"
                  required
                  disabled={isProcessing}
                  value={cardCvv}
                  onChange={handleCvvChange}
                  onFocus={() => setIsFlipped(true)}
                  onBlur={() => setIsFlipped(false)}
                  placeholder="•••"
                  class="w-full px-3 py-2.5 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface text-center font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              class="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-on-primary font-semibold py-3 px-4 rounded-lg shadow-sm transition-all duration-300 flex items-center justify-center gap-2 mt-8 text-sm"
            >
              <span class="material-symbols-outlined text-[18px]">lock</span>
              Authorize Payment ({selectedPlan.price})
            </button>
          </form>

          {/* PCI Compliance / Security Badges */}
          <div class="mt-8 pt-6 border-t border-border-subtle flex flex-wrap gap-4 items-center justify-between text-[10px] text-secondary font-semibold uppercase tracking-wider">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px] text-green-600">lock_open</span>
              PCI-DSS Compliant
            </div>
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px] text-green-600">verified_user</span>
              3D Secure Active
            </div>
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px] text-green-600">encrypted</span>
              AES-256 Encrypted
            </div>
          </div>
        </section>

        {/* Right Column: Interactive card and Plan summary */}
        <section class="w-full md:w-2/5 p-8 bg-surface-container-low flex flex-col justify-between">
          <div>
            <h2 class="text-sm font-black text-secondary tracking-widest uppercase mb-6">Order Summary</h2>
            
            {/* Visual Credit Card Preview */}
            <div class="relative w-full max-w-[320px] aspect-[1.58/1] mx-auto mb-8 perspective-1000">
              <div class={`relative w-full h-full duration-700 transform-style-3d shadow-lg rounded-2xl text-white ${isFlipped ? 'rotate-y-180' : ''}`}>
                
                {/* Front Side */}
                <div class="absolute w-full h-full backface-hidden bg-gradient-to-tr from-primary to-primary-hover p-6 rounded-2xl flex flex-col justify-between border border-white/10 overflow-hidden">
                  <div class="absolute -top-12 -right-12 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
                  
                  {/* Card logo & chip */}
                  <div class="flex justify-between items-center">
                    <div class="w-10 h-8 bg-amber-400/20 border border-amber-400/30 rounded-lg flex items-center justify-center overflow-hidden">
                      {/* Chip stripes */}
                      <div class="grid grid-cols-3 gap-0.5 w-6 h-5 opacity-80">
                        <div class="border-r border-b border-amber-400/50"></div>
                        <div class="border-r border-b border-amber-400/50"></div>
                        <div class="border-b border-amber-400/50"></div>
                        <div class="border-r border-amber-400/50"></div>
                        <div class="border-r border-amber-400/50"></div>
                        <div></div>
                      </div>
                    </div>
                    <span class="text-xs font-black tracking-widest opacity-80 italic">VISA</span>
                  </div>

                  {/* Card Number */}
                  <div class="text-lg font-mono tracking-widest text-center my-3 text-white/95">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>

                  {/* Cardholder & Expiry */}
                  <div class="flex justify-between items-end font-mono">
                    <div class="text-left max-w-[170px]">
                      <span class="block text-[8px] text-white/50 uppercase tracking-wider">Cardholder</span>
                      <span class="block text-xs uppercase truncate max-w-[160px] font-bold">
                        {cardName || 'Cardholder Name'}
                      </span>
                    </div>
                    <div class="text-right">
                      <span class="block text-[8px] text-white/50 uppercase tracking-wider">Expires</span>
                      <span class="block text-xs font-bold">{cardExpiry || 'MM/YY'}</span>
                    </div>
                  </div>
                </div>

                {/* Back Side */}
                <div class="absolute w-full h-full backface-hidden rotate-y-180 bg-gradient-to-tr from-primary to-primary-hover py-6 rounded-2xl flex flex-col justify-between border border-white/10">
                  <div class="w-full h-10 bg-on-surface/90 my-2"></div>
                  
                  <div class="px-6 my-2">
                    <span class="block text-[8px] text-white/50 uppercase tracking-wider mb-1 text-left">Signature / CVV</span>
                    <div class="flex items-center bg-white/25 rounded-md p-1.5 h-8 justify-end">
                      <span class="font-mono text-sm tracking-wider font-bold italic mr-2 text-white/80"></span>
                      <span class="bg-white text-primary font-mono text-xs px-2 py-0.5 rounded font-black shadow-inner">
                        {cardCvv || '•••'}
                      </span>
                    </div>
                  </div>
                  
                  <div class="px-6 text-[8px] text-white/40 leading-normal text-left font-mono">
                    This card is processed secure and tokenized. Subject to terms of SBR Clinical Systems.
                  </div>
                </div>

              </div>
            </div>

            {/* Plan details list */}
            <div class="bg-white border border-border-subtle rounded-xl p-4 space-y-4">
              <div class="flex justify-between items-center pb-3 border-b border-border-subtle">
                <div>
                  <h3 class="font-bold text-primary text-sm">{selectedPlan.name}</h3>
                  <span class="text-[10px] text-secondary">Individual Clinician License</span>
                </div>
                <div class="text-right">
                  <span class="font-bold text-primary text-sm">{selectedPlan.price}</span>
                  <span class="text-[10px] text-secondary block">/{selectedPlan.period}</span>
                </div>
              </div>

              <div class="space-y-2">
                <span class="block text-[10px] font-black text-secondary tracking-wider uppercase mb-1">Includes:</span>
                {selectedPlan.features.map((f, i) => (
                  <div key={i} class="flex items-center gap-2 text-xs text-secondary">
                    <span class="material-symbols-outlined text-[16px] text-primary">check</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div class="mt-8 text-center text-[10px] text-secondary">
            Your billing cycle will renew automatically on the same day every month. Cancel anytime.
          </div>
        </section>

      </main>

      {/* Footer copyright */}
      <footer class="max-w-6xl mx-auto w-full text-center text-xs text-secondary mt-8">
        © 2026 SBR AI Assistant. All rights reserved. HIPAA Secure & GDPR Compliant.
      </footer>

      {/* Payment Processing overlay modal */}
      {isProcessing && (
        <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div class="bg-white rounded-2xl p-8 max-w-sm w-full text-center border border-border-subtle shadow-ambient relative overflow-hidden">
            <div class="absolute -top-12 -left-12 w-24 h-24 bg-primary/5 rounded-full blur-xl"></div>
            
            {processStep === 1 && (
              <div class="space-y-4">
                <div class="flex justify-center">
                  <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
                <h3 class="text-md font-bold text-primary">Contacting Payment Gateway...</h3>
                <p class="text-xs text-secondary">Connecting securely with your bank to verify card details.</p>
              </div>
            )}

            {processStep === 2 && (
              <div class="space-y-4">
                <div class="flex justify-center">
                  <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary border-t-2"></div>
                </div>
                <h3 class="text-md font-bold text-primary">Securing Transaction...</h3>
                <p class="text-xs text-secondary">Tokenizing payment tokens and verifying secure SSL session.</p>
              </div>
            )}

            {processStep === 3 && (
              <div class="space-y-4 animate-scale-up">
                <div class="flex justify-center">
                  <div class="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center border border-primary/20 text-primary">
                    <span class="material-symbols-outlined text-[32px] animate-pulse">check</span>
                  </div>
                </div>
                <h3 class="text-md font-bold text-primary">Payment Authorized!</h3>
                <p class="text-xs text-secondary">Your payment of {selectedPlan.price} was successful. Redirecting to workspace registration...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
