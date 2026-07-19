import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

export default function AiChat() {
  const { currentUser } = useApp();
  const messagesEndRef = useRef(null);

  const initialThreads = [
    {
      id: 'thread-1',
      title: 'Patient: J. Doe - MRI Review',
      snippet: 'The AI analysis of the cervical spine MRI indicates subtle demyelination...',
      dept: 'Neurology',
      priority: true,
      time: 'Just now',
      messages: [
        {
          id: 'm1-1',
          sender: 'ai',
          senderName: 'SBR AI Assistant',
          time: '09:41 AM',
          avatarIcon: 'neurology',
          content: "I've analyzed the uploaded MRI scans for patient John Doe. Here is the preliminary clinical summary based on the imaging data.",
          bento: {
            title1: 'FINDING 1',
            desc1: 'Subtle hyperintense lesions in the periventricular white matter on T2/FLAIR sequences.',
            title2: 'COMPARISON',
            desc2: 'Slight progression compared to the previous scan dated 6 months ago.'
          }
        },
        {
          id: 'm1-2',
          sender: 'user',
          time: '09:45 AM',
          content: 'Are there any signs of active inflammation? Check for gadolinium enhancement.'
        },
        {
          id: 'm1-3',
          sender: 'user',
          time: '09:46 AM',
          isAudio: true,
          audioDuration: '0:12'
        },
        {
          id: 'm1-4',
          sender: 'ai',
          senderName: 'SBR AI Assistant',
          time: '09:46 AM',
          avatarIcon: 'smart_toy',
          content: 'Reviewing T1 post-contrast sequences...',
          insight: {
            title: 'No abnormal gadolinium enhancement detected.',
            desc: 'This suggests the lesions are likely chronic rather than indicating an active acute inflammatory demyelinating process at this exact moment.'
          },
          actions: ['Generate Report', 'Find Similar Cases']
        }
      ]
    },
    {
      id: 'thread-2',
      title: 'Lab Results Analysis: P. Smith',
      snippet: 'Can you summarize the anomalies in the latest complete blood count?',
      dept: 'Hematology',
      priority: false,
      time: '2h ago',
      messages: [
        {
          id: 'm2-1',
          sender: 'user',
          time: '02:15 PM',
          content: 'Can you summarize the anomalies in the latest complete blood count for P. Smith?'
        },
        {
          id: 'm2-2',
          sender: 'ai',
          senderName: 'SBR AI Assistant',
          time: '02:16 PM',
          avatarIcon: 'smart_toy',
          content: 'Checking complete blood count (CBC) results for patient P. Smith.',
          insight: {
            title: 'Mild Leukocytosis Detected',
            desc: 'White blood cell (WBC) count is elevated at 12.5 x 10^3/µL (normal range: 4.5 - 11.0). Hemoglobin and hematocrit levels are within normal limits. Platelets are normal at 250 x 10^3/µL. The elevated WBC may indicate a localized inflammatory or infectious response.'
          }
        }
      ]
    },
    {
      id: 'thread-3',
      title: 'Differential Diagnosis: M. L.',
      snippet: 'Symptoms: vertigo, tinnitus, and hearing loss in left ear.',
      dept: 'ENT / Neurology',
      priority: false,
      time: 'Yesterday',
      messages: [
        {
          id: 'm3-1',
          sender: 'user',
          time: '11:02 AM',
          content: 'Differential diagnosis for a 45-year-old female presenting with persistent vertigo, tinnitus, and episodic hearing loss in the left ear.'
        },
        {
          id: 'm3-2',
          sender: 'ai',
          senderName: 'SBR AI Assistant',
          time: '11:03 AM',
          avatarIcon: 'smart_toy',
          content: 'Analyzing clinical presentation of unilateral vestibular-auditory symptoms.',
          insight: {
            title: 'Ménière\'s Disease (Primary Differential)',
            desc: 'The triad of episodic vertigo, tinnitus, and sensorineural hearing loss strongly suggests Ménière\'s disease. Secondary differentials to consider include Vestibular Schwannoma (acoustic neuroma) - warranting an MRI of the internal auditory canals - and Vestibular Migraine.'
          }
        }
      ]
    },
    {
      id: 'thread-4',
      title: 'Medication Interaction Check',
      snippet: 'Checking contraindications between Warfarin and newly prescribed Amiodarone.',
      dept: 'Cardiology',
      priority: false,
      time: 'Yesterday',
      messages: [
        {
          id: 'm4-1',
          sender: 'user',
          time: '04:50 PM',
          content: 'Checking contraindications between Warfarin and newly prescribed Amiodarone.'
        },
        {
          id: 'm4-2',
          sender: 'ai',
          senderName: 'SBR AI Assistant',
          time: '04:51 PM',
          avatarIcon: 'smart_toy',
          content: 'Running drug-drug interaction screening for Warfarin and Amiodarone.',
          insight: {
            title: 'Major Interaction Detected (CYP2C9 Inhibition)',
            desc: 'Amiodarone inhibits CYP2C9, the primary enzyme responsible for metabolizing S-warfarin. This leads to increased Warfarin levels and a significant rise in INR (bleeding risk). Recommendation: Reduce Warfarin dose by 30% to 50% upon initiating Amiodarone, and monitor INR closely every 2-3 days for the first two weeks.'
          }
        }
      ]
    }
  ];

  const [threads, setThreads] = useState(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState('thread-1');
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeThread = threads.find(t => t.id === activeThreadId) || threads[0];

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeThread.messages, isTyping]);

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = {
      id: `m-user-${Date.now()}`,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: inputText
    };

    const updatedThreads = threads.map(t => {
      if (t.id === activeThreadId) {
        return {
          ...t,
          snippet: inputText,
          time: 'Just now',
          messages: [...t.messages, userMessage]
        };
      }
      return t;
    });

    setThreads(updatedThreads);
    setInputText('');
    setIsTyping(true);

    // Simulate AI response after 1.5 seconds
    setTimeout(() => {
      const aiMessage = {
        id: `m-ai-${Date.now()}`,
        sender: 'ai',
        senderName: 'SBR AI Assistant',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatarIcon: 'smart_toy',
        content: `لقد تلقيت استفسارك الطبي: "${userMessage.content}". بصفتي المساعد الذكي لمنصة SBR AI، أقوم الآن بتحليل هذا الاستعلام بمقارنته مع السجلات الطبية. سأزودك بالإرشادات السريرية المناسبة في أقرب وقت.`,
        insight: {
          title: 'تحليل الاستفسار نشط',
          desc: 'تم تسجيل ملاحظتك وجاري مراجعتها وتوليد التقرير السريري المناسب.'
        }
      };

      setThreads(prevThreads => prevThreads.map(t => {
        if (t.id === activeThreadId) {
          return {
            ...t,
            messages: [...t.messages, aiMessage]
          };
        }
        return t;
      }));
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredThreads = threads.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.snippet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-bg-card overflow-hidden relative animate-fade-in">
      {/* Left Sidebar: Conversations List */}
      <div className={`flex flex-col border-r border-border-subtle bg-white flex-shrink-0 transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden border-r-0'}`}>
        {/* Search & Filter Header */}
        <div className="p-4 border-b border-border-subtle bg-bg-canvas/50">
          <div className="relative mb-3">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">search</span>
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-on-surface font-body-sm text-xs rounded-lg pl-9 pr-4 py-2.5 border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none" 
              placeholder="Search patients or terms..." 
              type="text" 
            />
          </div>
          {/* Mini Tabs */}
          <div className="flex gap-2 p-1 bg-surface-container rounded-lg">
            <button className="flex-1 py-1.5 px-3 bg-white text-primary font-bold rounded shadow-sm text-xs text-center">Recent</button>
            <button className="flex-1 py-1.5 px-3 text-secondary hover:text-primary transition-colors font-semibold text-xs text-center">Pinned</button>
          </div>
        </div>

        {/* List of Threads */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {filteredThreads.map(t => {
            const isActive = t.id === activeThreadId;
            return (
              <div 
                key={t.id}
                onClick={() => setActiveThreadId(t.id)}
                className={`p-3 rounded-xl cursor-pointer transition-all border ${
                  isActive 
                    ? 'bg-primary-light border-primary/20 shadow-sm' 
                    : 'hover:bg-bg-canvas border-transparent group'
                }`}
              >
                <div className="flex justify-between items-start mb-1 gap-2">
                  <div className={`text-xs font-bold truncate ${isActive ? 'text-primary font-bold' : 'text-on-surface group-hover:text-primary'}`}>
                    {t.title}
                  </div>
                  <div className="text-[10px] text-secondary whitespace-nowrap">{t.time}</div>
                </div>
                <p className="text-xs text-secondary line-clamp-2 leading-tight">{t.snippet}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded-full bg-white text-primary text-[9px] font-label-caps border border-border-subtle">{t.dept}</span>
                  {t.priority && (
                    <span className="px-2 py-0.5 rounded-full bg-status-warning/10 text-status-warning text-[9px] font-label-caps font-bold">Priority</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Area: Main Chat Window */}
      <div className="flex-1 flex flex-col bg-bg-canvas relative">
        {/* Chat Header */}
        <div className="h-16 border-b border-border-subtle flex items-center justify-between px-6 bg-white flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 text-secondary hover:text-primary hover:bg-primary-light rounded-lg transition-colors flex items-center justify-center"
              title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isSidebarOpen ? "menu_open" : "menu"}
              </span>
            </button>
            <div>
              <h2 className="text-sm font-bold text-on-surface leading-tight">{activeThread.title}</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse"></div>
                <span className="text-[11px] text-secondary font-medium">SBR AI Assistant Active</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-secondary hover:text-primary hover:bg-primary-light rounded-full transition-colors" title="Patient Info">
              <span className="material-symbols-outlined text-[20px]">info</span>
            </button>
            <button className="p-2 text-secondary hover:text-primary hover:bg-primary-light rounded-full transition-colors" title="Export Chat">
              <span className="material-symbols-outlined text-[20px]">ios_share</span>
            </button>
          </div>
        </div>

        {/* Chat History (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <div className="flex items-center justify-center">
            <div className="bg-surface-container px-3 py-1 rounded-full text-[10px] font-bold text-secondary tracking-wider uppercase">TODAY</div>
          </div>

          {activeThread.messages.map((message) => {
            const isAi = message.sender === 'ai';
            if (isAi) {
              return (
                <div key={message.id} className="flex gap-4 max-w-[85%] animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center flex-shrink-0 shadow-sm relative overflow-hidden">
                    <span className="material-symbols-outlined text-[16px] relative z-10">{message.avatarIcon || 'smart_toy'}</span>
                    {message.hasShimmer && (
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]"></div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-secondary ml-1">{message.senderName} • {message.time}</span>
                    <div className="bg-white border border-border-subtle p-4 rounded-2xl rounded-tl-sm shadow-sm space-y-4">
                      <p className="text-xs text-on-surface leading-relaxed">{message.content}</p>
                      
                      {message.bento && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <div className="bg-primary-light/50 p-3 rounded-xl border border-primary/10">
                            <div className="flex items-center gap-1.5 mb-1 text-primary">
                              <span className="material-symbols-outlined text-[14px]">visibility</span>
                              <span className="font-label-caps text-[10px] font-bold">{message.bento.title1}</span>
                            </div>
                            <div className="text-xs text-on-surface-variant leading-relaxed">{message.bento.desc1}</div>
                          </div>
                          <div className="bg-bg-canvas p-3 rounded-xl border border-border-subtle">
                            <div className="flex items-center gap-1.5 mb-1 text-secondary">
                              <span className="material-symbols-outlined text-[14px]">timeline</span>
                              <span className="font-label-caps text-[10px] font-bold">{message.bento.title2}</span>
                            </div>
                            <div className="text-xs text-on-surface-variant leading-relaxed">{message.bento.desc2}</div>
                          </div>
                        </div>
                      )}

                      {message.insight && (
                        <div className="p-3 bg-bg-canvas rounded-xl border border-border-subtle flex items-start gap-3">
                          <div className="text-primary mt-0.5">
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-on-surface mb-0.5">{message.insight.title}</p>
                            <p className="text-xs text-secondary leading-relaxed">{message.insight.desc}</p>
                          </div>
                        </div>
                      )}

                      {message.actions && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {message.actions.map((act, i) => (
                            <button key={i} className="px-3 py-1.5 rounded-full border border-primary/30 text-primary font-semibold text-[11px] hover:bg-primary-light transition-colors flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">{act.includes('Report') ? 'description' : 'search'}</span>
                              {act}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            } else {
              return (
                <div key={message.id} className="flex gap-4 max-w-[75%] self-end flex-row-reverse animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0 shadow-sm uppercase font-bold text-xs">
                    {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'U'}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span className="text-[11px] text-secondary mr-1">{message.time}</span>
                    {message.isAudio ? (
                      <div className="bg-primary-container text-white p-3 rounded-2xl rounded-tr-sm shadow-sm flex items-center gap-3 min-w-[200px]">
                        <button className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                        </button>
                        <div className="flex-1 flex items-center gap-0.5 h-5">
                          <div className="w-0.5 h-3 bg-white/40 rounded-full"></div>
                          <div className="w-0.5 h-5 bg-white/60 rounded-full"></div>
                          <div className="w-0.5 h-4 bg-white rounded-full"></div>
                          <div className="w-0.5 h-6 bg-white rounded-full"></div>
                          <div className="w-0.5 h-3 bg-white/60 rounded-full"></div>
                          <div className="w-0.5 h-5 bg-white/80 rounded-full"></div>
                          <div className="w-0.5 h-4 bg-white rounded-full"></div>
                          <div className="w-0.5 h-2 bg-white/40 rounded-full"></div>
                        </div>
                        <span className="text-[10px] font-semibold">{message.audioDuration}</span>
                      </div>
                    ) : (
                      <div className="bg-primary text-on-primary p-3.5 rounded-2xl rounded-tr-sm shadow-sm">
                        <p className="text-xs leading-relaxed">{message.content}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          })}

          {isTyping && (
            <div className="flex gap-4 max-w-[85%] animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[16px]">smart_toy</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-secondary ml-1">SBR AI Assistant is thinking...</span>
                <div className="bg-white border border-border-subtle px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-border-subtle z-10 relative">
          <div className="absolute inset-x-0 top-0 h-4 -mt-4 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-end gap-2 bg-bg-canvas rounded-xl border border-border-subtle p-2 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <button className="p-2.5 text-secondary hover:text-primary transition-colors rounded-lg hover:bg-primary-light mb-0.5" title="Attach Medical File">
                <span className="material-symbols-outlined text-[20px]">attach_file</span>
              </button>
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent border-none focus:ring-0 resize-none font-body-md text-xs text-on-surface py-2.5 max-h-24 min-h-[40px] outline-none" 
                placeholder="Ask SBR AI or type clinical notes..." 
                rows="1"
              ></textarea>
              <div className="flex items-center gap-1.5 mb-0.5">
                <button type="button" className="p-2 bg-primary-light text-primary hover:bg-primary/10 transition-all rounded-lg flex items-center justify-center" title="Record Voice Message">
                  <span className="material-symbols-outlined text-[20px]">mic</span>
                </button>
                <button 
                  type="button"
                  onClick={() => handleSendMessage()}
                  className="p-2 bg-primary text-on-primary hover:bg-primary-hover transition-colors rounded-lg shadow-sm flex items-center justify-center" 
                  title="Send Message"
                >
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                </button>
              </div>
            </div>
            <div className="text-center mt-2">
              <span className="font-body-sm text-[10px] text-secondary">AI generated content may be inaccurate. Always verify clinical information.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
