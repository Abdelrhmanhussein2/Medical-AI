import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

export default function AiChat() {
  const { currentUser } = useApp();
  const messagesEndRef = useRef(null);

  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // New Thread Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDept, setNewDept] = useState('');

  // Delete Thread Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 1. Fetch threads on mount
  useEffect(() => {
    const fetchThreads = async () => {
      setLoadingThreads(true);
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch('/api/v1/chat/threads', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setThreads(data || []);
          if (data && data.length > 0) {
            setActiveThreadId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch threads", err);
      } finally {
        setLoadingThreads(false);
      }
    };
    fetchThreads();
  }, []);

  // 2. Fetch messages when activeThreadId changes
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(`/api/v1/chat/threads/${activeThreadId}/messages`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data || []);
        }
      } catch (err) {
        console.error("Failed to fetch messages", err);
      } finally {
        setLoadingMessages(false);
      }
    };
    fetchMessages();
  }, [activeThreadId]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const activeThread = threads.find(t => t.id === activeThreadId);

  // 3. Create a new thread session
  const handleCreateThreadSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch('/api/v1/chat/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle,
          dept: newDept || null
        })
      });

      if (res.ok) {
        const newThreadObj = await res.json();
        setThreads(prev => [newThreadObj, ...prev]);
        setActiveThreadId(newThreadObj.id);
        setNewTitle('');
        setNewDept('');
        setShowNewModal(false);
      }
    } catch (err) {
      console.error("Failed to create thread", err);
    }
  };

  // 4. Send user message and get static reply
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeThreadId) return;

    const messageText = inputText;
    setInputText('');

    try {
      const token = localStorage.getItem("accessToken");
      
      // Save user message to backend
      const res = await fetch(`/api/v1/chat/threads/${activeThreadId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sender_type: 'user',
          content: messageText
        })
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages(prev => [...prev, newMsg]);

        // Update last snippet in threads list locally
        setThreads(prev => prev.map(t => {
          if (t.id === activeThreadId) {
            return { ...t, updated_at: new Date().toISOString() };
          }
          return t;
        }).sort((a, b) => b.is_pinned - a.is_pinned || new Date(b.updated_at) - new Date(a.updated_at)));

        // Simulate AI reply after 1.5 seconds
        setIsTyping(true);
        setTimeout(async () => {
          try {
            const aiRes = await fetch(`/api/v1/chat/threads/${activeThreadId}/messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                sender_type: 'ai',
                content: `لقد تلقيت استفسارك الطبي: "${messageText}". بصفتي المساعد الذكي لمنصة SBR AI، أقوم الآن بتحليل هذا الاستعلام بمقارنته مع السجلات الطبية. سأزودك بالإرشادات السريرية المناسبة في أقرب وقت.`,
                insight_data: {
                  title: 'تحليل الاستفسار نشط',
                  desc: 'تم تسجيل ملاحظتك وجاري مراجعتها وتوليد التقرير السريري المناسب.'
                }
              })
            });
            if (aiRes.ok) {
              const aiMsg = await aiRes.json();
              setMessages(prev => [...prev, aiMsg]);
            }
          } catch (err) {
            console.error("Failed to save AI reply", err);
          } finally {
            setIsTyping(false);
          }
        }, 1500);
      }
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  // 5. Toggle Pin Thread status
  const handleTogglePin = async (e, threadId, currentPinStatus) => {
    e.stopPropagation(); // prevent selecting
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`/api/v1/chat/threads/${threadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          is_pinned: !currentPinStatus
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setThreads(prev => prev.map(t => t.id === threadId ? updated : t).sort((a, b) => b.is_pinned - a.is_pinned || new Date(b.updated_at) - new Date(a.updated_at)));
      }
    } catch (err) {
      console.error("Failed to toggle pin", err);
    }
  };

  // 6. Delete Thread - Open Modal
  const handleDeleteThread = (e, threadId) => {
    e.stopPropagation();
    setThreadToDelete(threadId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!threadToDelete) return;
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`/api/v1/chat/threads/${threadToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setThreads(prev => prev.filter(t => t.id !== threadToDelete));
        if (activeThreadId === threadToDelete) {
          const remaining = threads.filter(t => t.id !== threadToDelete);
          setActiveThreadId(remaining.length > 0 ? remaining[0].id : null);
        }
        setShowDeleteModal(false);
        setThreadToDelete(null);
      }
    } catch (err) {
      console.error("Failed to delete thread", err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredThreads = threads.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-bg-card overflow-hidden relative animate-fade-in">
      {/* Left Sidebar: Conversations List */}
      <div className={`flex flex-col border-r border-border-subtle bg-white flex-shrink-0 transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden border-r-0'}`}>
        {/* Search & Filter Header */}
        <div className="p-4 border-b border-border-subtle bg-bg-canvas/50">
          <button 
            onClick={() => setShowNewModal(true)}
            className="w-full bg-primary hover:bg-primary-hover text-on-primary font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 mb-4 transition-colors duration-300 active:scale-95 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            New AI Session
          </button>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">search</span>
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-on-surface font-body-sm text-xs rounded-lg pl-9 pr-4 py-2.5 border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none" 
              placeholder="Search chats..." 
              type="text" 
            />
          </div>
        </div>

        {/* List of Threads */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {loadingThreads ? (
            <div className="text-center py-8 text-secondary text-xs">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto mb-2"></div>
              Loading chat sessions...
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-8 text-secondary text-xs">
              No conversations found.
            </div>
          ) : (
            filteredThreads.map(t => {
              const isActive = t.id === activeThreadId;
              return (
                <div 
                  key={t.id}
                  onClick={() => setActiveThreadId(t.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border relative group ${
                    isActive 
                      ? 'bg-primary-light border-primary/20 shadow-sm' 
                      : 'hover:bg-bg-canvas border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1 gap-2 pr-12">
                    <div className={`text-xs font-bold truncate ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                      {t.title}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded-full bg-white text-primary text-[9px] font-label-caps border border-border-subtle">
                      {t.dept || 'General'}
                    </span>
                    {t.is_pinned && (
                      <span className="px-2 py-0.5 rounded-full bg-primary-light text-primary text-[9px] font-label-caps font-bold">Pinned</span>
                    )}
                  </div>

                  {/* Actions (hover triggers) */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1 rounded-lg">
                    <button 
                      onClick={(e) => handleTogglePin(e, t.id, t.is_pinned)}
                      className="p-1 hover:text-primary text-secondary rounded"
                      title={t.is_pinned ? "Unpin" : "Pin"}
                    >
                      <span className="material-symbols-outlined text-[16px]">{t.is_pinned ? 'push_pin' : 'push_pin'}</span>
                    </button>
                    <button 
                      onClick={(e) => handleDeleteThread(e, t.id)}
                      className="p-1 hover:text-error text-secondary rounded"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
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
            {activeThread ? (
              <div>
                <h2 className="text-sm font-bold text-on-surface leading-tight">{activeThread.title}</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse"></div>
                  <span className="text-[11px] text-secondary font-medium">SBR AI Assistant Active</span>
                </div>
              </div>
            ) : (
              <span className="text-xs text-secondary">Select or create a conversation to start</span>
            )}
          </div>
        </div>

        {/* Chat History (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {!activeThreadId ? (
            <div className="flex flex-col items-center justify-center h-full text-secondary">
              <span className="material-symbols-outlined text-5xl text-outline-variant mb-2">chat</span>
              <p className="text-xs">اضغط على "New AI Session" لبدء محادثة سريرية مشفرة جديدة.</p>
            </div>
          ) : loadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full text-secondary">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
              <p className="text-xs">جاري تحميل سجل المحادثة المشفرة...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center">
                <div className="bg-surface-container px-3 py-1 rounded-full text-[10px] font-bold text-secondary tracking-wider uppercase">TODAY</div>
              </div>

              {messages.map((message) => {
                const isAi = message.sender_type === 'ai';
                if (isAi) {
                  return (
                    <div key={message.id} className="flex gap-4 max-w-[85%] animate-fade-in">
                      <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center flex-shrink-0 shadow-sm relative overflow-hidden">
                        <span className="material-symbols-outlined text-[16px] relative z-10">smart_toy</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-secondary ml-1">SBR AI Assistant</span>
                        <div className="bg-white border border-border-subtle p-4 rounded-2xl rounded-tl-sm shadow-sm space-y-4">
                          <p className="text-xs text-on-surface leading-relaxed">{message.content}</p>
                          
                          {message.bento_data && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                              {message.bento_data.finding1 && (
                                <div className="bg-primary-light/50 p-3 rounded-xl border border-primary/10">
                                  <div className="flex items-center gap-1.5 mb-1 text-primary">
                                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                                    <span className="font-label-caps text-[10px] font-bold">FINDING 1</span>
                                  </div>
                                  <div className="text-xs text-on-surface-variant leading-relaxed">{message.bento_data.finding1}</div>
                                </div>
                              )}
                              {message.bento_data.comparison && (
                                <div className="bg-bg-canvas p-3 rounded-xl border border-border-subtle">
                                  <div className="flex items-center gap-1.5 mb-1 text-secondary">
                                    <span className="material-symbols-outlined text-[14px]">timeline</span>
                                    <span className="font-label-caps text-[10px] font-bold">COMPARISON</span>
                                  </div>
                                  <div className="text-xs text-on-surface-variant leading-relaxed">{message.bento_data.comparison}</div>
                                </div>
                              )}
                            </div>
                          )}

                          {message.insight_data && (
                            <div className="p-3 bg-bg-canvas rounded-xl border border-border-subtle flex items-start gap-3">
                              <div className="text-primary mt-0.5">
                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-on-surface mb-0.5">{message.insight_data.title}</p>
                                <p className="text-xs text-secondary leading-relaxed">{message.insight_data.desc}</p>
                              </div>
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
                        <div className="bg-primary text-on-primary p-3.5 rounded-2xl rounded-tr-sm shadow-sm">
                          <p className="text-xs leading-relaxed">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </>
          )}

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
                disabled={!activeThreadId}
                className="w-full bg-transparent border-none focus:ring-0 resize-none font-body-md text-xs text-on-surface py-2.5 max-h-24 min-h-[40px] outline-none disabled:opacity-50" 
                placeholder={activeThreadId ? "Ask SBR AI or type clinical notes..." : "اختر محادثة للكتابة فيها..."} 
                rows="1"
              ></textarea>
              <div className="flex items-center gap-1.5 mb-0.5">
                <button type="button" className="p-2 bg-primary-light text-primary hover:bg-primary/10 transition-all rounded-lg flex items-center justify-center" title="Record Voice Message">
                  <span className="material-symbols-outlined text-[20px]">mic</span>
                </button>
                <button 
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!activeThreadId}
                  className="p-2 bg-primary text-on-primary hover:bg-primary-hover transition-colors rounded-lg shadow-sm flex items-center justify-center disabled:opacity-50" 
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

      {/* New Thread Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-border-subtle shadow-lg max-w-sm w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas">
              <h3 className="text-sm text-primary font-bold">New Clinical Chat Session</h3>
              <button 
                onClick={() => setShowNewModal(false)}
                className="p-1 hover:bg-surface-container rounded-full text-secondary"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateThreadSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Title / Patient Name *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Patient: J. Doe - MRI Review"
                  className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Department / Specialty</label>
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  placeholder="e.g. Neurology, Cardiology"
                  className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>
              <div className="flex gap-3 pt-4 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 bg-white border border-border-subtle text-secondary py-2 rounded-lg text-xs hover:bg-surface-container-low transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-bold py-2 rounded-lg text-xs transition-colors shadow-sm"
                >
                  Create Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-border-subtle shadow-lg max-w-sm w-full overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-status-danger/10 text-status-danger flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-[28px]">warning</span>
              </div>
              <h3 className="text-sm font-bold text-on-surface mb-2">تأكيد حذف المحادثة</h3>
              <p className="text-xs text-secondary leading-relaxed mb-6">
                هل أنت متأكد من رغبتك في حذف هذه المحادثة بالكامل؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذف جميع الرسائل المرتبطة بها.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setThreadToDelete(null);
                  }}
                  className="flex-1 bg-white border border-border-subtle text-secondary py-2 rounded-lg text-xs hover:bg-surface-container-low transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-status-danger hover:bg-status-danger/90 text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-sm"
                >
                  نعم، احذف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
