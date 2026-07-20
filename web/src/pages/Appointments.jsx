import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function Appointments({ setActivePage }) {
  const { appointments, patients, currentUser, addAppointment, updateAppointmentStatus, addPatient } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Modal Form States ---
  const [patientQuery, setPatientQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isCreatingNewPatient, setIsCreatingNewPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  // --- Calendar States ---
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  // --- Edit Modal States ---
  const [editAppt, setEditAppt] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editDuration, setEditDuration] = useState(30);
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState('');

  // --- Filter and Format Data ---
  const myAppts = appointments.filter(a => a.doctor_id === currentUser.id);

  const displayAppts = myAppts.filter(appt => {
    // Search query filter
    if (searchQuery) {
      const p = patients.find(p => p.id === appt.patient_id);
      if (!p || !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
    }
    
    // Date filter
    const selDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    return appt.appointment_date === selDateStr;
  }).sort((a, b) => {
     return a.appointment_time.localeCompare(b.appointment_time);
  });

  const formatTime = (timeStr) => {
    if (!timeStr) return { time: '', period: '' };
    const [h, m] = timeStr.split(':');
    let hours = parseInt(h);
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return { time: `${hours.toString().padStart(2, '0')}:${m}`, period };
  };

  const handleOpenEdit = (appt) => {
    setEditAppt(appt);
    setEditDate(appt.appointment_date || '');
    setEditTime(appt.appointment_time || '');
    setEditDuration(appt.duration_minutes || 30);
    setEditDescription(appt.description || '');
    setEditError('');
    setOpenMenuId(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    if (!editDate || !editTime) {
      setEditError('يرجى ملء التاريخ والوقت');
      return;
    }
    try {
      // For now update locally since we don't have a PATCH endpoint yet
      // updateAppointment(editAppt.id, { appointment_date: editDate, appointment_time: editTime, duration_minutes: Number(editDuration), description: editDescription });
      setEditAppt(null);
    } catch (err) {
      setEditError(err.message || 'حدث خطأ أثناء التعديل');
    }
  };
  const getStatusBadge = (status, id, appt) => {
    if (status === 'completed') {
      return (
        <div class="flex items-center gap-1.5 px-4 py-2 bg-surface-container-high rounded-full text-secondary text-sm font-semibold">
          <span class="material-symbols-outlined text-[16px]">check_circle</span>
          Completed
        </div>
      );
    }
    if (status === 'scheduled') {
      return (
        <div class="flex items-center gap-2 relative">
          <div class="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === id ? null : id); }}
              class="p-2 text-secondary hover:bg-surface-container rounded-lg transition-colors"
            >
              <span class="material-symbols-outlined text-[20px]">more_vert</span>
            </button>
            {openMenuId === id && (
              <div class="absolute right-0 top-10 w-44 bg-white border border-border-subtle rounded-xl shadow-lg z-30 overflow-hidden animate-fade-in">
                <button
                  onClick={() => handleOpenEdit(appt)}
                  class="w-full flex items-center gap-3 px-4 py-3 text-sm text-on-surface hover:bg-surface-container-low transition-colors text-left"
                >
                  <span class="material-symbols-outlined text-[18px] text-secondary">edit</span>
                  Edit
                </button>
                <div class="border-t border-border-subtle"></div>
                <button
                  onClick={() => { updateAppointmentStatus(id, 'cancelled'); setOpenMenuId(null); }}
                  class="w-full flex items-center gap-3 px-4 py-3 text-sm text-error hover:bg-error-container/30 transition-colors text-left"
                >
                  <span class="material-symbols-outlined text-[18px]">cancel</span>
                  Cancel Appointment
                </button>
              </div>
            )}
          </div>
          <button 
             onClick={() => setActivePage(`live-session-${id}`)}
             class="px-5 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-bold shadow-sm hover:bg-primary-hover transition-colors flex items-center gap-2 border border-primary/20"
          >
             Join Call
          </button>
        </div>
      );
    }
    if (status === 'cancelled') {
       return (
        <div class="flex items-center gap-1.5 px-4 py-2 bg-error-container/50 rounded-full text-error text-sm font-semibold">
          <span class="material-symbols-outlined text-[16px]">cancel</span>
          Cancelled
        </div>
       );
    }
    if (status === 'no_show') {
       return (
        <div class="flex items-center gap-1.5 px-4 py-2 bg-surface-container rounded-full text-secondary text-sm font-semibold">
          <span class="material-symbols-outlined text-[16px]">person_off</span>
          No Show
        </div>
       );
    }
    return (
       <div class="flex items-center gap-1.5 px-4 py-2 bg-surface-container rounded-full text-secondary text-sm font-semibold capitalize">
          {status}
       </div>
    );
  };

  const getTagStyle = (desc) => {
    const lower = (desc || '').toLowerCase();
    if (lower.includes('urgent')) return 'bg-error-container/30 text-error';
    if (lower.includes('pre-op') || lower.includes('surgery')) return 'bg-tertiary-fixed text-on-tertiary-fixed-variant';
    return 'bg-surface-container-high text-secondary';
  };

  // --- Modal Form Handlers ---
  const handleQueryChange = (val) => {
    setPatientQuery(val);
    setSelectedPatient(null);
    setIsCreatingNewPatient(false);
    setShowDropdown(true);
  };

  const selectPatientFromSearch = (patient) => {
    setSelectedPatient(patient);
    setPatientQuery(patient.name);
    setShowDropdown(false);
    setIsCreatingNewPatient(false);
  };

  const handleStartCreateNew = () => {
    setIsCreatingNewPatient(true);
    const containsNumbers = /\d/.test(patientQuery);
    if (containsNumbers) {
      setNewPatientPhone(patientQuery);
      setNewPatientName('');
    } else {
      setNewPatientName(patientQuery);
      setNewPatientPhone('');
    }
    setShowDropdown(false);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!date || !time) {
      setError('يرجى ملء جميع الحقول الإلزامية');
      return;
    }

    let finalPatientId = null;
    let finalPhone = '';

    if (isCreatingNewPatient) {
      if (!newPatientName.trim() || !newPatientPhone.trim()) {
        setError('يرجى كتابة الاسم ورقم الهاتف للمريض الجديد');
        return;
      }
      try {
        const created = await addPatient({
          name: newPatientName,
          phone: newPatientPhone,
        });
        finalPatientId = created.id;
        finalPhone = created.phone;
      } catch (err) {
        setError('تعذر إنشاء المريض الجديد');
        return;
      }
    } else {
      if (!selectedPatient) {
        setError('يرجى تحديد مريض أو إضافة مريض جديد من القائمة');
        return;
      }
      finalPatientId = selectedPatient.id;
      finalPhone = selectedPatient.phone;
    }

    try {
      await addAppointment({
        doctor_id: currentUser.id,
        patient_id: finalPatientId,
        appointment_date: date,
        appointment_time: time,
        duration_minutes: Number(duration),
        description,
        patient_phone: finalPhone
      });

      // Reset
      setPatientQuery('');
      setSelectedPatient(null);
      setIsCreatingNewPatient(false);
      setNewPatientName('');
      setNewPatientPhone('');
      setDate('');
      setTime('');
      setDuration(30);
      setDescription('');
      setShowAddModal(false);
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء حجز الموعد');
    }
  };

  const filteredSearchPatients = patientQuery.trim()
    ? patients.filter(p => 
        p.name.toLowerCase().includes(patientQuery.toLowerCase()) || 
        p.phone.includes(patientQuery)
      )
    : [];

  // --- Calendar Logic ---
  const currentMonthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    // Convert Sunday-first to Monday-first
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    
    const days = [];
    
    // Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Next month padding to complete the grid (usually 42 cells total)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const todayDate = new Date();

  // Helper to check if a day has appointments
  const hasAppointments = (dateObj) => {
    const dStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    return myAppts.some(a => a.appointment_date === dStr);
  };

  return (
    <div class="max-w-7xl mx-auto py-2">
      {/* Header */}
      <header class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pb-6 border-b border-border-subtle">
        <div>
          <h1 class="font-display-lg text-headline-lg text-on-surface font-bold">Appointments</h1>
          <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">Manage your schedule and upcoming clinical consultations.</p>
        </div>
        <div class="flex items-center gap-4 w-full md:w-auto">
          <div class="relative w-full md:w-64">
            <span class="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline-variant text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="Search patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              class="w-full pl-10 pr-4 py-2 border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            class="shrink-0 bg-primary hover:bg-primary-hover text-on-primary font-bold text-sm py-2 px-5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span class="material-symbols-outlined text-[18px]">add</span>
            New Appointment
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div class="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Column: Calendar & Insights */}
        <div class="w-full lg:w-[340px] shrink-0 flex flex-col gap-6">
          
          {/* Calendar Widget */}
          <div class="bg-white rounded-2xl border border-border-subtle shadow-sm p-6">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-xl font-bold text-on-surface">{currentMonthName}</h2>
              <div class="flex gap-2">
                <button onClick={prevMonth} class="text-secondary hover:text-primary"><span class="material-symbols-outlined text-[20px]">chevron_left</span></button>
                <button onClick={nextMonth} class="text-secondary hover:text-primary"><span class="material-symbols-outlined text-[20px]">chevron_right</span></button>
              </div>
            </div>
            
            <div class="grid grid-cols-7 gap-y-4 gap-x-2 text-center text-xs font-bold text-secondary mb-2">
              <div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div><div>Su</div>
            </div>
            
            <div class="grid grid-cols-7 gap-y-4 gap-x-2 text-center text-sm font-semibold">
              {calendarDays.map((dayObj, i) => {
                const isSelected = selectedDate.getDate() === dayObj.date.getDate() && selectedDate.getMonth() === dayObj.date.getMonth() && selectedDate.getFullYear() === dayObj.date.getFullYear();
                const isToday = todayDate.getDate() === dayObj.date.getDate() && todayDate.getMonth() === dayObj.date.getMonth() && todayDate.getFullYear() === dayObj.date.getFullYear();
                const hasAppts = hasAppointments(dayObj.date);
                
                return (
                  <div key={i} class="relative flex justify-center cursor-pointer" onClick={() => setSelectedDate(dayObj.date)}>
                    <div 
                      class={`w-8 h-8 rounded-full flex items-center justify-center transition-colors
                        ${!dayObj.isCurrentMonth ? 'text-outline-variant' : 'text-on-surface'}
                        ${isSelected ? 'bg-primary text-on-primary shadow-sm' : 'hover:bg-surface-container'}
                        ${isToday && !isSelected ? 'border border-primary text-primary' : ''}
                      `}
                    >
                      {dayObj.date.getDate()}
                    </div>
                    {hasAppts && (
                      <span class={`absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${isSelected ? 'bg-primary' : 'bg-secondary'}`}></span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Insights Widget */}
          <div class="bg-primary/5 rounded-2xl border border-primary/10 shadow-sm p-6 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10"></div>
            <div class="flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
              <h3 class="text-xs font-black tracking-widest uppercase text-primary">AI Schedule Insights</h3>
            </div>
            <p class="text-sm text-on-surface-variant leading-relaxed">
              Your afternoon schedule is heavily loaded. AI suggests prioritizing the 2:00 PM pre-op review due to recent lab anomalies detected for patient E. Carter.
            </p>
            <button class="mt-4 text-sm font-bold text-primary flex items-center gap-1 hover:underline">
              Review Details <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
          
        </div>

        {/* Right Column: Appointments List */}
        <div class="flex-1 min-w-0">
          
          <div class="flex justify-between items-end mb-6">
            <div>
              <h2 class="text-xl font-bold text-on-surface inline-block">
                {selectedDate.toDateString() === todayDate.toDateString() ? "Today's Schedule" : "Schedule"}
              </h2>
              <span class="text-outline-variant mx-3">|</span>
              <span class="text-secondary font-medium">{selectedDate.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            
            <div class="bg-surface-container-high rounded-lg p-1 flex items-center text-sm font-bold shadow-inner hidden sm:flex">
               <button class="px-4 py-1.5 bg-white text-on-surface rounded-md shadow-sm">List</button>
               <button class="px-4 py-1.5 text-secondary hover:text-on-surface transition-colors">Timeline</button>
            </div>
          </div>

          <div class="space-y-4">
            {displayAppts.length === 0 ? (
              <div class="bg-white border border-border-subtle rounded-2xl p-10 text-center shadow-sm">
                 <span class="material-symbols-outlined text-4xl text-outline-variant mb-3">event_available</span>
                 <p class="text-secondary font-medium">لا توجد مواعيد مجدولة لليوم</p>
              </div>
            ) : (
              displayAppts.map((appt, idx) => {
                const patientObj = patients.find(p => p.id === appt.patient_id);
                const { time: fTime, period } = formatTime(appt.appointment_time);
                
                // Highlight logic (mocking the second card as active)
                const isActive = appt.status === 'scheduled' && idx === 0;

                return (
                  <div 
                    key={appt.id} 
                    class={`bg-white rounded-2xl flex flex-col sm:flex-row items-stretch shadow-sm transition-all duration-200 relative ${
                      isActive ? 'border-[2.5px] border-primary shadow-md' : 'border border-border-subtle hover:border-outline-variant'
                    }`}
                  >
                    {/* Time Column */}
                    <div class="px-6 py-5 sm:w-36 flex sm:flex-col items-center justify-between sm:justify-center border-b sm:border-b-0 sm:border-r border-border-subtle bg-bg-canvas/50 shrink-0">
                      <div class="text-center flex flex-row sm:flex-col items-center sm:items-center gap-2 sm:gap-0">
                        <span class="text-2xl font-display-lg font-bold text-on-surface block">{fTime}</span>
                        <span class="text-xs font-bold text-secondary tracking-widest uppercase">{period}</span>
                      </div>
                    </div>
                    
                    {/* Details Column */}
                    <div class="flex-1 p-5 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                      <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-lg border border-border-subtle shadow-sm uppercase shrink-0">
                          {patientObj ? patientObj.name.substring(0, 2) : 'UK'}
                        </div>
                        <div>
                          <h3 class="text-lg font-bold text-on-surface mb-1">{patientObj ? patientObj.name : 'Unknown Patient'}</h3>
                          <div class="flex items-center flex-wrap gap-2">
                             <span class={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getTagStyle(appt.description)}`}>
                               {appt.description || 'Routine Checkup'}
                             </span>
                             <span class="text-outline-variant font-bold text-[10px]">•</span>
                             <span class="text-secondary text-sm font-medium">{appt.duration_minutes} min</span>
                             <span class="text-outline-variant font-bold text-[10px] hidden sm:inline">•</span>
                             <span class="text-secondary text-xs font-semibold flex items-center gap-1 hidden sm:flex">
                               <span class="material-symbols-outlined text-[14px]">videocam</span> Telehealth
                             </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Column */}
                      <div class="w-full xl:w-auto mt-2 xl:mt-0 flex justify-end">
                         {getStatusBadge(appt.status, appt.id, appt)}
                         <button onClick={() => handleOpenEdit(appt)} class="ml-2 p-2 hover:bg-surface-container rounded-full text-secondary">
                           <span class="material-symbols-outlined text-[18px]">edit</span>
                         </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
        </div>
      </div>

      {/* Book Appointment Modal */}
      {showAddModal && (
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div class="bg-white rounded-xl border border-border-subtle shadow-lg max-w-md w-full overflow-visible">
            <div class="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas">
              <h3 class="font-headline-md text-base text-primary font-bold">Schedule Appointment</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                class="p-1 hover:bg-surface-container rounded-full text-secondary"
              >
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleAddSubmit} class="p-6 space-y-4">
              {error && (
                <div class="bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2">
                  <span class="material-symbols-outlined text-[16px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Patient Autocomplete Input */}
              <div class="relative">
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Select Patient *</label>
                
                {!isCreatingNewPatient ? (
                  <>
                    <div class="relative">
                      <input
                        type="text"
                        value={patientQuery}
                        onChange={(e) => handleQueryChange(e.target.value)}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Type name or phone number..."
                        class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                      />
                      {patientQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setPatientQuery('');
                            setSelectedPatient(null);
                          }}
                          class="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary"
                        >
                          <span class="material-symbols-outlined text-sm">cancel</span>
                        </button>
                      )}
                    </div>
                    
                    {/* Search results dropdown */}
                    {showDropdown && patientQuery.trim() !== '' && (
                      <div class="absolute left-0 right-0 mt-1 bg-white border border-border-subtle rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-border-subtle">
                        {filteredSearchPatients.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => selectPatientFromSearch(p)}
                            class="w-full px-4 py-2 text-left text-xs text-on-surface hover:bg-surface-container-low transition-colors flex justify-between items-center"
                          >
                            <span class="font-bold">{p.name}</span>
                            <span class="text-secondary">{p.phone}</span>
                          </button>
                        ))}
                        
                        <button
                          type="button"
                          onClick={handleStartCreateNew}
                          class="w-full px-4 py-2.5 text-left text-xs text-primary font-bold hover:bg-primary-light transition-colors flex items-center gap-1.5"
                        >
                          <span class="material-symbols-outlined text-[16px]">person_add</span>
                          Add "{patientQuery}" as a New Patient & Book
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div class="bg-primary-light/50 border border-primary/20 p-4 rounded-lg space-y-3 animate-fade-in">
                    <div class="flex justify-between items-center pb-2 border-b border-primary/10">
                      <span class="text-xs font-bold text-primary flex items-center gap-1">
                        <span class="material-symbols-outlined text-[16px]">person_add</span>
                        New Patient Details
                      </span>
                      <button 
                        type="button"
                        onClick={() => {
                          setIsCreatingNewPatient(false);
                          setPatientQuery('');
                        }}
                        class="text-[10px] text-secondary hover:underline"
                      >
                        Cancel new patient
                      </button>
                    </div>
                    
                    <div class="grid grid-cols-1 gap-2">
                      <div>
                        <label class="block text-[10px] font-bold text-secondary mb-1">Patient Full Name *</label>
                        <input
                          type="text"
                          required
                          value={newPatientName}
                          onChange={(e) => setNewPatientName(e.target.value)}
                          placeholder="e.g. احمد حسن"
                          class="w-full px-3 py-1.5 bg-white border border-border-subtle rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label class="block text-[10px] font-bold text-secondary mb-1">Patient Phone Number *</label>
                        <input
                          type="text"
                          required
                          value={newPatientPhone}
                          onChange={(e) => setNewPatientPhone(e.target.value)}
                          placeholder="e.g. 01012345678"
                          class="w-full px-3 py-1.5 bg-white border border-border-subtle rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-on-surface-variant mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-on-surface-variant mb-1">Time *</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="30"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Reason / Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Follow-up consultation..."
                  rows={3}
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div class="flex gap-3 mt-6 pt-4 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  class="flex-1 bg-white border border-border-subtle text-secondary font-button py-2 rounded-lg text-sm hover:bg-surface-container-low transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-button py-2 rounded-lg text-sm transition-colors shadow-sm"
                >
                  Book Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Appointment Modal */}
      {editAppt && (
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div class="bg-white rounded-xl border border-border-subtle shadow-lg max-w-md w-full">
            <div class="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas">
              <h3 class="text-base text-primary font-bold flex items-center gap-2">
                <span class="material-symbols-outlined text-[20px]">edit_calendar</span>
                Edit Appointment
              </h3>
              <button onClick={() => setEditAppt(null)} class="p-1 hover:bg-surface-container rounded-full text-secondary">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleEditSubmit} class="p-6 space-y-4">
              {editError && (
                <div class="bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2">
                  <span class="material-symbols-outlined text-[16px]">error</span>
                  <span>{editError}</span>
                </div>
              )}
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-on-surface-variant mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-on-surface-variant mb-1">Time *</label>
                  <input
                    type="time"
                    required
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                  />
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Reason / Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>
              <div class="flex gap-3 mt-4 pt-4 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setEditAppt(null)}
                  class="flex-1 bg-white border border-border-subtle text-secondary py-2 rounded-lg text-sm hover:bg-surface-container-low transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="flex-1 bg-primary hover:bg-primary-hover text-on-primary py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
