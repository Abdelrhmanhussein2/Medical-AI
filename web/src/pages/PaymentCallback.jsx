import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import SbrLogo from '../components/SbrLogo';

/**
 * PaymentCallback.jsx
 * -------------------
 * Landing page after Moyasar 3DS redirect.
 *
 * Moyasar redirects to: /payment/callback?id=<payment_id>&status=<status>&message=<msg>
 *
 * Security contract:
 *   - The URL `status` param is NEVER trusted for subscription activation.
 *   - On mount, calls GET /api/v1/payments/callback?id=... (server-side).
 *   - Backend verifies: payment status, amount, and currency with Moyasar API.
 *   - Subscription is only activated if ALL checks pass.
 *
 * Flow:
 *   1. Read ?id from URL
 *   2. Call GET /payments/callback?id=... → server verifies with Moyasar
 *   3. Display success / failed / error UI
 *   4. On success → countdown → redirect to /subscription
 */
export default function PaymentCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { apiFetch, currentUser } = useApp();
  const { isArabic } = useLanguage();

  // Moyasar injects these into the redirect URL
  const moyasarPaymentId = searchParams.get('id')
    || sessionStorage.getItem('pendingMoyasarPaymentId')
    || '';
  const moyasarUrlStatus = searchParams.get('status') || '';   // NOT trusted for logic
  const moyasarMessage = searchParams.get('message') || '';

  const [verifyState, setVerifyState] = useState('loading');   // loading | success | failed | error
  const [verifiedResult, setVerifiedResult] = useState(null);  // Full response from backend
  const [countdown, setCountdown] = useState(5);
  const hasVerified = useRef(false);

  // ── Helper to translate and clarify decline reasons ────────────────────────
  const getFriendlyDeclineMessage = (message, isAr) => {
    if (!message) return '';
    const msgLower = message.toLowerCase();

    if (isAr) {
      // 1. Cancelled
      if (msgLower.includes('cancelled') || msgLower.includes('canceled')) {
        return 'تم إلغاء عملية التحقق والدفع من قبلك. يمكنك المحاولة مجدداً.';
      }
      // 2. Not Authenticated / Denied
      if (msgLower.includes('not authenticated') || msgLower.includes('denied') || msgLower.includes('not verified')) {
        return 'لم يتم توثيق الحساب أو البطاقة (Transaction Denied). يرجى التأكد من بيانات بطاقتك.';
      }
      // 3. Not Available
      if (msgLower.includes('not available')) {
        return 'خدمة التحقق الثنائي (3DS) غير متوفرة حالياً لهذه البطاقة. يرجى استخدام بطاقة أخرى.';
      }
      // 4. Server Error (Priority check for server errors)
      if (msgLower.includes('server error') || msgLower.includes('server_error') || msgLower.includes('server') || msgLower.includes('failed')) {
        return 'حدث خطأ في خادم التحقق الخاص بالبنك (3DS Server Error). يرجى المحاولة مرة أخرى لاحقاً.';
      }
      // 5. Rejected
      if (msgLower.includes('rejected')) {
        return 'تم رفض التوثيق من قبل البنك الخاص بك. يرجى مراجعة مصرفك أو استخدام بطاقة أخرى.';
      }
      // 6. Declined
      if (msgLower.includes('declined')) {
        return 'تم رفض العملية من قبل البنك المصدر للبطاقة (Declined).';
      }

      // Card details
      if (msgLower.includes('invalid card') || msgLower.includes('not found')) {
        return 'بيانات البطاقة غير صحيحة أو غير موجودة. يرجى التأكد من كتابة الأرقام الـ 16 والرمز السري وتاريخ الانتهاء بشكل سليم.';
      }
      if (msgLower.includes('insufficient') || msgLower.includes('funds')) {
        return 'رصيد البطاقة غير كافٍ لإتمام عملية الشراء. يرجى شحن الرصيد أو استخدام بطاقة دفع أخرى.';
      }
      if (msgLower.includes('expired')) {
        return 'البطاقة منتهية الصلاحية. يرجى استخدام بطاقة صالحة للدفع.';
      }
      if (msgLower.includes('limit exceeded')) {
        return 'تجاوزت الحد المسموح به للبطاقة. يرجى استخدام بطاقة أخرى أو مراجعة البنك الخاص بك.';
      }
      return `تم رفض العملية: ${message}`;
    } else {
      // English details
      if (msgLower.includes('cancelled') || msgLower.includes('canceled')) {
        return 'Payment verification was cancelled by the user.';
      }
      if (msgLower.includes('not authenticated') || msgLower.includes('denied') || msgLower.includes('not verified')) {
        return 'Account or card not authenticated. Transaction denied.';
      }
      if (msgLower.includes('not available')) {
        return 'Secure verification (3DS) is not available for this card.';
      }
      if (msgLower.includes('server error') || msgLower.includes('server_error') || msgLower.includes('server') || msgLower.includes('failed')) {
        return 'An authentication server error occurred. Please try again later.';
      }
      if (msgLower.includes('rejected')) {
        return 'Card authentication was rejected by your bank.';
      }
      if (msgLower.includes('declined')) {
        return 'Transaction declined by card issuer.';
      }

      if (msgLower.includes('invalid card') || msgLower.includes('not found')) {
        return 'Invalid card details or card not found. Please verify the card number, expiry date, and CVC.';
      }
      if (msgLower.includes('insufficient') || msgLower.includes('funds')) {
        return 'Insufficient funds in the card. Please top-up or use another card.';
      }
      if (msgLower.includes('expired')) {
        return 'The card has expired. Please use a valid card.';
      }
      if (msgLower.includes('limit exceeded')) {
        return 'Transaction limit exceeded. Please check with your bank or use a different card.';
      }
      return `Transaction declined: ${message}`;
    }
  };

  // ── Server-side verification ───────────────────────────────────────────────
  useEffect(() => {
    if (!moyasarPaymentId) {
      setVerifyState('error');
      return;
    }
    if (hasVerified.current) return;
    hasVerified.current = true;

    const verify = async () => {
      try {
        /**
         * Server verifies:
         *  1. Fetches payment from Moyasar API (not URL params)
         *  2. Checks amount == stored order amount
         *  3. Checks currency == stored order currency
         *  4. Only activates subscription if all pass
         */
        const result = await apiFetch(
          `/payments/callback?id=${encodeURIComponent(moyasarPaymentId)}&_t=${Date.now()}`
        );

        setVerifiedResult(result);
        const status = result?.status || '';

        if (status === 'paid' || status === 'authorized') {
          setVerifyState('success');
          sessionStorage.removeItem('pendingPaymentOrderId');
          sessionStorage.removeItem('pendingMoyasarPaymentId');
          sessionStorage.removeItem('pendingBundleId');
        } else if (status === 'initiated' || status === 'pending') {
          // Still in 3DS — unusual but handle gracefully
          setVerifyState('pending');
        } else {
          setVerifyState('failed');
        }
      } catch (err) {
        console.error('Callback verification error:', err);
        setVerifyState('error');
      }
    };

    verify();
  }, [moyasarPaymentId]);

  // ── Countdown redirect on success ──────────────────────────────────────────
  useEffect(() => {
    if (verifyState !== 'success') return;
    if (countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown(c => {
        if (c <= 1) {
          navigate(currentUser ? '/subscription' : '/login');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [verifyState, countdown, navigate, currentUser]);

  // ─────────────────────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className={`min-h-screen bg-bg-canvas flex flex-col items-center justify-center px-4 relative overflow-hidden ${
        isArabic ? 'rtl' : 'ltr'
      }`}
    >
      {/* Background orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Card */}
      <div className="bg-white border border-border-subtle rounded-2xl shadow-ambient w-full max-w-md p-10 flex flex-col items-center text-center relative z-10">
        <div className="mb-6">
          <SbrLogo size={40} color="#006973" showText={true} textClass="text-primary" />
        </div>

        {/* ── Loading ── */}
        {verifyState === 'loading' && (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary border-t-2" />
            </div>
            <h1 className="text-xl font-bold text-primary mb-2">
              {isArabic ? 'جاري التحقق من الدفع...' : 'Verifying Payment...'}
            </h1>
            <p className="text-sm text-secondary mb-4">
              {isArabic
                ? 'يتم التحقق من المبلغ والعملة وحالة الدفع مباشرةً مع موفق.'
                : 'Verifying amount, currency, and payment status directly with Moyasar.'}
            </p>
            <div className="w-full bg-border-subtle rounded-full h-1 overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            {/* Reassure user: DO NOT trust URL status */}
            <p className="mt-4 text-[10px] text-secondary italic">
              {isArabic
                ? '⚠️ لا يتم الاعتماد على بارامترات الرابط — التحقق يتم مباشرةً مع الخادم.'
                : '⚠️ URL params are not trusted — verifying directly with our server.'}
            </p>
          </>
        )}

        {/* ── Success ── */}
        {verifyState === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mb-6 shadow-sm">
              <span className="material-symbols-outlined text-emerald-500 text-[48px]">check_circle</span>
            </div>

            {/* Verification badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider mb-3 border border-emerald-100">
              <span className="material-symbols-outlined text-[12px]">verified</span>
              {isArabic ? 'تم التحقق من المبلغ والعملة ✓' : 'Amount & currency verified ✓'}
            </div>

            <h1 className="text-2xl font-bold text-primary mb-2">
              {isArabic ? '🎉 تم الدفع بنجاح!' : '🎉 Payment Successful!'}
            </h1>
            <p className="text-sm text-secondary mb-6">
              {isArabic
                ? 'تم التحقق من الدفع وتفعيل الاشتراك. سيتم تحويلك للوحة تحكمك.'
                : 'Payment verified and subscription activated. Redirecting to your dashboard.'}
            </p>

            {/* Transaction ID */}
            {moyasarPaymentId && (
              <div className="w-full bg-surface-container-low rounded-xl px-4 py-3 mb-6 text-start border border-border-subtle">
                <p className="text-[10px] text-secondary font-semibold uppercase tracking-wider mb-1">
                  {isArabic ? 'رقم المعاملة (موفق)' : 'Transaction ID (Moyasar)'}
                </p>
                <p className="font-mono text-xs text-primary break-all">{moyasarPaymentId}</p>
              </div>
            )}

            {/* Security note */}
            <div className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-3 mb-6 text-start">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-emerald-500 text-[16px] mt-0.5">security</span>
                <p className="text-[10px] text-emerald-700 leading-relaxed">
                  {isArabic
                    ? 'تم التحقق من المبلغ والعملة على الخادم مباشرةً مع موفق قبل تفعيل الاشتراك.'
                    : 'Amount and currency were verified server-side with Moyasar before activating your subscription.'}
                </p>
              </div>
            </div>

            {/* Countdown */}
            <div className="flex items-center gap-2 text-sm text-secondary mb-6">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                {countdown}
              </div>
              <span>
                {isArabic
                  ? `سيتم تحويلك خلال ${countdown} ثانية...`
                  : `Redirecting in ${countdown}s...`}
              </span>
            </div>

            <button
              onClick={() => navigate(currentUser ? '/subscription' : '/login')}
              className="w-full bg-primary hover:bg-primary-hover text-on-primary font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">dashboard</span>
              {isArabic ? 'انتقل لاشتراكاتك الآن' : 'Go to My Subscription Now'}
            </button>
          </>
        )}

        {/* ── Pending / Still in 3DS ── */}
        {verifyState === 'pending' && (
          <>
            <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mb-6 shadow-sm">
              <span className="material-symbols-outlined text-amber-500 text-[48px]">schedule</span>
            </div>
            <h1 className="text-2xl font-bold text-on-surface mb-2">
              {isArabic ? 'الدفع قيد المعالجة...' : 'Payment Processing...'}
            </h1>
            <p className="text-sm text-secondary mb-6">
              {isArabic
                ? 'عملية الدفع لا تزال قيد المعالجة. قد يستغرق الأمر بضع دقائق.'
                : 'Your payment is still being processed. This may take a few minutes.'}
            </p>
            <button
              onClick={() => navigate(currentUser ? '/subscription' : '/login')}
              className="w-full bg-primary hover:bg-primary-hover text-on-primary font-semibold py-3 rounded-xl transition-all duration-200 text-sm"
            >
              {isArabic ? 'تحقق من حالة الاشتراك' : 'Check Subscription Status'}
            </button>
          </>
        )}

        {/* ── Failed ── */}
        {verifyState === 'failed' && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mb-6 shadow-sm">
              <span className="material-symbols-outlined text-red-500 text-[48px]">cancel</span>
            </div>
            <h1 className="text-2xl font-bold text-on-surface mb-2">
              {isArabic ? 'فشلت عملية الدفع' : 'Payment Failed'}
            </h1>
            <p className="text-sm text-secondary mb-4">
              {isArabic
                ? 'لم تتم عملية الدفع. يمكنك المحاولة مجدداً أو اختيار طريقة دفع مختلفة.'
                : 'The payment was not completed. You can try again or use a different card.'}
            </p>

            {/* Moyasar's decline message (if any) */}
            {(verifiedResult?.message || moyasarMessage) && (
              <div className="w-full bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6 text-start">
                <p className="text-[10px] text-red-600 font-semibold uppercase tracking-wider mb-1">
                  {isArabic ? 'سبب الرفض' : 'Decline reason'}
                </p>
                <p className="text-xs text-red-700 leading-relaxed">
                  {getFriendlyDeclineMessage(verifiedResult?.message || moyasarMessage, isArabic)}
                </p>
              </div>
            )}

            <button
              onClick={() => navigate('/checkout?plan=starter')}
              className="w-full bg-primary hover:bg-primary-hover text-on-primary font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm mb-3"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              {isArabic ? 'حاول مجدداً' : 'Try Again'}
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full border border-border-subtle text-secondary hover:text-primary hover:border-primary py-3 rounded-xl transition-all duration-200 text-sm"
            >
              {isArabic ? 'العودة للرئيسية' : 'Back to Home'}
            </button>
          </>
        )}

        {/* ── Error / Verification failed ── */}
        {verifyState === 'error' && (
          <>
            <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mb-6 shadow-sm">
              <span className="material-symbols-outlined text-amber-500 text-[48px]">warning</span>
            </div>
            <h1 className="text-2xl font-bold text-on-surface mb-2">
              {isArabic ? 'تعذّر التحقق من الدفع' : 'Payment Verification Error'}
            </h1>
            <p className="text-sm text-secondary mb-4">
              {isArabic
                ? 'تعذّر التحقق من حالة الدفع. إذا تم خصم المبلغ، يرجى التواصل مع الدعم مع رقم المعاملة.'
                : 'Could not verify your payment status. If you were charged, please contact support with your transaction ID.'}
            </p>

            {moyasarPaymentId && (
              <div className="w-full bg-surface-container-low rounded-xl px-4 py-3 mb-6 text-start border border-border-subtle">
                <p className="text-[10px] text-secondary font-semibold uppercase tracking-wider mb-1">
                  {isArabic ? 'رقم المعاملة (للدعم)' : 'Transaction ID (for support)'}
                </p>
                <p className="font-mono text-xs text-primary break-all">{moyasarPaymentId}</p>
              </div>
            )}

            <button
              onClick={() => navigate('/')}
              className="w-full bg-primary hover:bg-primary-hover text-on-primary font-semibold py-3 rounded-xl transition-all duration-200 text-sm"
            >
              {isArabic ? 'العودة للرئيسية' : 'Back to Home'}
            </button>
          </>
        )}
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-secondary relative z-10">
        {isArabic
          ? 'نظام دفع آمن بواسطة موفق • PCI DSS Compliant • المبلغ يُتحقق منه على الخادم'
          : 'Secure payments by Moyasar • PCI DSS Compliant • Amount server-verified'}
      </p>
    </div>
  );
}
