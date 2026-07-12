import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function Appointments() {
  const { appointments, patients, currentUser, addAppointment, updateAppointmentStatus, addPatient } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
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

  // Get current doctor's appointments
  const myAppts = appointments.filter(a => a.doctor_id === currentUser.id);

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
    // Pre-fill name or phone depending on if the typed query contains numbers
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

  const handleAddSubmit = (e) => {
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
        const created = addPatient({
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
      addAppointment({
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

  const getStatusStyle = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-tertiary-fixed text-on-tertiary-fixed-variant';
      case 'completed':
        return 'bg-primary-light text-primary';
      case 'cancelled':
        return 'bg-error-container text-error';
      case 'no_show':
        return 'bg-surface-container-high text-secondary';
      default:
        return 'bg-surface-container-high text-secondary';
    }
  };

  return (
    <div>
      {/* Header */}
      <header class="flex justify-between items-end mb-stack-lg border-b border-border-subtle pb-stack-md">
        <div>
          <h1 class="font-display-lg text-headline-lg text-on-surface font-bold">Appointment Schedule</h1>
          <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">Book and manage clinical schedules.</p>
        </div>
        <div>
          <button
            onClick={() => setShowAddModal(true)}
            class="bg-primary hover:bg-primary-hover text-on-primary font-button text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span class="material-symbols-outlined text-[18px]">add_task</span>
            Schedule Appointment
          </button>
        </div>
      </header>

      {/* Appointments List */}
      <div class="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
        <table class="min-w-full divide-y divide-border-subtle">
          <thead class="bg-bg-canvas">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Patient</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Date</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Time</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Duration</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Reason</th>
              <th scope="col" class="relative px-6 py-3">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-border-subtle">
            {myAppts.length === 0 ? (
              <tr>
                <td colSpan="7" class="px-6 py-8 text-center text-secondary text-sm">
                  لا توجد مواعيد مجدولة حالياً
                </td>
              </tr>
            ) : (
              myAppts.map((appt) => {
                const patientObj = patients.find(p => p.id === appt.patient_id);
                return (
                  <tr key={appt.id} class="hover:bg-surface-container-low transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm font-semibold text-on-surface">{patientObj ? patientObj.name : 'Unknown'}</div>
                      <div class="text-xs text-secondary">{appt.patient_phone || 'No Phone'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {appt.appointment_date}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {appt.appointment_time}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {appt.duration_minutes} min
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusStyle(appt.status)}`}>
                        {appt.status}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {appt.description || 'Routine checkup'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <select
                        value={appt.status}
                        onChange={(e) => updateAppointmentStatus(appt.id, e.target.value)}
                        class="text-xs bg-white border border-border-subtle rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-secondary"
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No Show</option>
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
    </div>
  );
}
