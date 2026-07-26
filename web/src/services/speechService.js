/**
 * SpeechService - خدمة التعرف على الصوت وتحويله لنص باستخدام Web Speech API المدمجة بالمتصفح.
 * تدعم هذه الخدمة التعرف المستمر (Continuous Recognition) وإعادة التشغيل التلقائي في حال الصمت الطويل.
 */
class SpeechService {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = SpeechRecognition ? new SpeechRecognition() : null;
    this.isStarted = false;
    this.shouldRestart = false;
    this.lang = 'ar-EG'; // اللغة الافتراضية: العربية (مصر)

    // إعدادات التعرف
    if (this.recognition) {
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.lang;

      this.recognition.onstart = () => {
        this.isStarted = true;
        if (this.onStartCallback) this.onStartCallback();
      };

      this.recognition.onend = () => {
        this.isStarted = false;
        if (this.onEndCallback) this.onEndCallback();
        
        // إعادة التشغيل التلقائي إذا توقف الكلام ولكن لم يقم المستخدم بإيقافه يدوياً
        if (this.shouldRestart) {
          try {
            this.recognition.start();
          } catch (e) {
            console.error("SpeechService: failed to auto-restart recognition", e);
          }
        }
      };

      this.recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (this.onResultCallback) {
          this.onResultCallback(finalTranscript, interimTranscript);
        }
      };

      this.recognition.onerror = (event) => {
        console.error("SpeechService Error:", event.error);
        if (this.onErrorCallback) this.onErrorCallback(event.error);

        // لا تعيد التشغيل في حال عدم السماح بصلاحية المايك
        if (event.error === 'not-allowed') {
          this.shouldRestart = false;
        }
      };
    }
  }

  /**
   * التحقق مما إذا كان المتصفح يدعم هذه الميزة
   */
  isSupported() {
    return this.recognition !== null;
  }

  /**
   * تغيير لغة التعرف
   * @param {string} langCode رمز اللغة (مثال: 'ar-EG', 'en-US')
   */
  setLanguage(langCode) {
    this.lang = langCode;
    if (this.recognition) {
      this.recognition.lang = langCode;
      // إذا كانت الخدمة تعمل بالفعل، نوقفها ونعيد تشغيلها باللغة الجديدة
      if (this.isStarted) {
        this.shouldRestart = true;
        this.recognition.stop();
      }
    }
  }

  /**
   * بدء التعرف على الكلام
   */
  start(onResult, onEnd = null, onStart = null, onError = null) {
    if (!this.isSupported()) {
      console.warn("SpeechService: Speech recognition is not supported in this browser.");
      return false;
    }

    this.onResultCallback = onResult;
    this.onEndCallback = onEnd;
    this.onStartCallback = onStart;
    this.onErrorCallback = onError;

    this.shouldRestart = true;

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      console.error("SpeechService: failed to start recognition", e);
      return false;
    }
  }

  /**
   * إيقاف التعرف يدويًا
   */
  stop() {
    this.shouldRestart = false;
    if (this.recognition && this.isStarted) {
      this.recognition.stop();
    }
  }
}

export const speechService = new SpeechService();
