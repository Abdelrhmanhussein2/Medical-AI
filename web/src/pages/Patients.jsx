import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function Patients({ setActivePage }) {
  const { patients, addPatient, updatePatient, visits } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Add Patient Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('male');
  const [fileId, setFileId] = useState('');
  const [diseases, setDiseases] = useState('');
  const [habits, setHabits] = useState('');
  const [error, setError] = useState('');

  // Edit Patient Form states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editGender, setEditGender] = useState('male');
  const [editFileId, setEditFileId] = useState('');
  const [editDiseases, setEditDiseases] = useState('');
  const [editHabits, setEditHabits] = useState('');
  const [editError, setEditError] = useState('');

  // Handle Search filter
  const filteredPatients = patients.filter(
    p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
         p.phone.includes(searchQuery) ||
         (p.file_id && p.file_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddPatientSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name || !phone) {
      setError('الاسم ورقم الهاتف مطلوبين');
      return;
    }

    try {
      addPatient({
        name,
        phone,
        email: email || null,
        date_of_birth: dob || null,
        gender,
        file_id: fileId || null,
        diseases: diseases || null,
        habits: habits || null
      });

      // Reset
      setName('');
      setPhone('');
      setEmail('');
      setDob('');
      setGender('male');
      setFileId('');
      setDiseases('');
      setHabits('');
      setShowAddModal(false);
    } catch (err) {
      setError(err.message || 'حدث خطأ');
    }
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setIsEditMode(false);
    setEditName(patient.name || '');
    setEditPhone(patient.phone || '');
    setEditEmail(patient.email || '');
    setEditDob(patient.date_of_birth || '');
    setEditGender(patient.gender || 'male');
    setEditFileId(patient.file_id || '');
    setEditDiseases(patient.diseases || '');
    setEditHabits(patient.habits || '');
    setEditError('');
  };

  const handleEditPatientSubmit = async (e) => {
    e.preventDefault();
    setEditError('');

    if (!editName || !editPhone) {
      setEditError('الاسم ورقم الهاتف مطلوبين');
      return;
    }

    try {
      const updated = await updatePatient(selectedPatient.id, {
        name: editName,
        phone: editPhone,
        email: editEmail || null,
        date_of_birth: editDob || null,
        gender: editGender,
        file_id: editFileId || null,
        diseases: editDiseases || null,
        habits: editHabits || null
      });
      setSelectedPatient(updated);
      setIsEditMode(false);
    } catch (err) {
      setEditError(err.message || 'حدث خطأ أثناء تعديل بيانات المريض');
    }
  };

  const startAiChatForPatient = async (patient) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/v1/chat/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          title: `AI - ${patient.name}`,
          patient_id: patient.id
        })
      });
      if (res.ok) {
        setSelectedPatient(null);
        setActivePage(`aichat-patient-${patient.id}`);
      }
    } catch (err) {
      console.error('Failed to create AI thread', err);
    }
  };

  const [patientVisits, setPatientVisits] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(false);

  useEffect(() => {
    if (selectedPatient) {
      const getVisits = async () => {
        setLoadingVisits(true);
        try {
          const token = localStorage.getItem("accessToken");
          const response = await fetch(`/api/v1/sessions/by-patient/${selectedPatient.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            // Filter only completed or summarized sessions
            const completed = (data || []).filter(s => s.status === 'summarized' || s.status === 'completed');
            setPatientVisits(completed);
          }
        } catch (err) {
          console.error("Failed to fetch patient sessions", err);
        } finally {
          setLoadingVisits(false);
        }
      };
      getVisits();
    } else {
      setPatientVisits([]);
    }
  }, [selectedPatient]);

  return (
    <div>
      {/* Header */}
      <header class="flex justify-between items-end mb-stack-lg border-b border-border-subtle pb-stack-md">
        <div>
          <h1 class="font-display-lg text-headline-lg text-on-surface font-bold">Patient Directory</h1>
          <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">Manage and search your registered patients.</p>
        </div>
        <div>
          <button
            onClick={() => setShowAddModal(true)}
            class="bg-primary hover:bg-primary-hover text-on-primary font-button text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span class="material-symbols-outlined text-[18px]">person_add</span>
            Add New Patient
          </button>
        </div>
      </header>

      {/* Search Input */}
      <div class="mb-6 max-w-md relative">
        <span class="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, phone or File ID..."
          class="w-full pl-10 pr-4 py-2.5 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
        />
      </div>

      {/* Patients Grid */}
      <div class="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
        <table class="min-w-full divide-y divide-border-subtle">
          <thead class="bg-bg-canvas">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Name</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Phone</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Date of Birth</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Gender</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">File ID</th>
              <th scope="col" class="relative px-6 py-3">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-border-subtle">
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan="6" class="px-6 py-8 text-center text-secondary text-sm">
                  لا توجد نتائج مطابقة للبحث
                </td>
              </tr>
            ) : (
              filteredPatients.map((patient) => (
                <tr key={patient.id} class="hover:bg-surface-container-low transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-on-surface">
                    {patient.name}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                    {patient.phone}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                    {patient.date_of_birth || 'N/A'}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      patient.gender === 'male' 
                        ? 'bg-primary-light text-primary' 
                        : 'bg-surface-container-high text-secondary'
                    }`}>
                      {patient.gender}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary font-mono">
                    {patient.file_id || '—'}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleSelectPatient(patient)}
                      class="text-primary hover:text-primary-hover font-semibold"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl border border-border-subtle shadow-lg max-w-md w-full overflow-hidden">
            <div class="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas">
              <h3 class="font-headline-md text-base text-primary font-bold">Add New Patient</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                class="p-1 hover:bg-surface-container rounded-full text-secondary"
              >
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleAddPatientSubmit} class="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {error && (
                <div class="bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2">
                  <span class="material-symbols-outlined text-[16px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="محمد علي"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01012345678"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patient@example.com"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-on-surface-variant mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-on-surface-variant mb-1">File ID (رقم الملف)</label>
                  <input
                    type="text"
                    value={fileId}
                    onChange={(e) => setFileId(e.target.value)}
                    placeholder="F-12345"
                    class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Chronic Diseases (الأمراض المزمنة)</label>
                <textarea
                  value={diseases}
                  onChange={(e) => setDiseases(e.target.value)}
                  placeholder="مثال: الضغط، السكري، الحساسية..."
                  rows="2"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Lifestyle Habits (العادات)</label>
                <input
                  type="text"
                  value={habits}
                  onChange={(e) => setHabits(e.target.value)}
                  placeholder="مثال: يشرب سجائر، يمارس الرياضة..."
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                  Save Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Details & Visit History Modal */}
      {selectedPatient && (
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl border border-border-subtle shadow-lg max-w-3xl w-full overflow-hidden">
            <div class="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas">
              <h3 class="font-headline-md text-base text-primary font-bold">
                {isEditMode ? 'Edit Patient Profile' : 'Patient Medical Profile'}
              </h3>
              <button 
                onClick={() => setSelectedPatient(null)}
                class="p-1 hover:bg-surface-container rounded-full text-secondary"
              >
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div class="p-6 grid grid-cols-1 md:grid-cols-12 gap-gutter max-h-[75vh] overflow-y-auto">
              
              {/* General Details & Editor */}
              <div class="md:col-span-5 space-y-4 border-b md:border-b-0 md:border-r border-border-subtle pb-6 md:pb-0 md:pr-6">
                {!isEditMode ? (
                  /* VIEW MODE */
                  <div class="space-y-4">
                    <div class="text-center md:text-left space-y-2">
                      <div class="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xl mx-auto md:mx-0 shadow-sm font-mono">
                        {selectedPatient.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <h4 class="font-button text-base text-on-surface font-bold">{selectedPatient.name}</h4>
                      <span class={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        selectedPatient.gender === 'male' ? 'bg-primary-light text-primary' : 'bg-surface-container-high text-secondary'
                      }`}>
                        {selectedPatient.gender}
                      </span>
                    </div>
                    
                    <div class="space-y-3 pt-4 text-xs text-secondary leading-relaxed border-t border-border-subtle">
                      <p><strong class="text-on-surface">File ID:</strong> <span class="font-mono text-primary font-bold">{selectedPatient.file_id || '—'}</span></p>
                      <p><strong class="text-on-surface">Phone:</strong> {selectedPatient.phone}</p>
                      <p><strong class="text-on-surface">Email:</strong> {selectedPatient.email || 'No Email'}</p>
                      <p><strong class="text-on-surface">Date of Birth:</strong> {selectedPatient.date_of_birth || 'N/A'}</p>
                      
                      <div class="mt-4 pt-4 border-t border-border-subtle space-y-2">
                        <strong class="text-xs text-on-surface block">Chronic Diseases (الأمراض المزمنة):</strong>
                        <p class="p-2 bg-surface-container-low rounded border border-border-subtle text-on-surface-variant text-[11px] whitespace-pre-wrap">
                          {selectedPatient.diseases || 'لا يوجد'}
                        </p>
                      </div>

                      <div class="space-y-2">
                        <strong class="text-xs text-on-surface block">Lifestyle Habits (العادات):</strong>
                        <p class="p-2 bg-surface-container-low rounded border border-border-subtle text-on-surface-variant text-[11px]">
                          {selectedPatient.habits || 'لا يوجد'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* EDIT MODE */
                  <form onSubmit={handleEditPatientSubmit} class="space-y-4">
                    {editError && (
                      <div class="bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2">
                        <span class="material-symbols-outlined text-[16px]">error</span>
                        <span>{editError}</span>
                      </div>
                    )}

                    <div>
                      <label class="block text-[11px] font-semibold text-on-surface-variant mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        class="w-full px-3 py-1.5 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-semibold text-on-surface-variant mb-1">Phone Number *</label>
                      <input
                        type="text"
                        required
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        class="w-full px-3 py-1.5 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-semibold text-on-surface-variant mb-1">Email Address</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        class="w-full px-3 py-1.5 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="block text-[11px] font-semibold text-on-surface-variant mb-1">Gender</label>
                        <select
                          value={editGender}
                          onChange={(e) => setEditGender(e.target.value)}
                          class="w-full px-3 py-1.5 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div>
                        <label class="block text-[11px] font-semibold text-on-surface-variant mb-1">File ID</label>
                        <input
                          type="text"
                          value={editFileId}
                          onChange={(e) => setEditFileId(e.target.value)}
                          class="w-full px-3 py-1.5 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label class="block text-[11px] font-semibold text-on-surface-variant mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={editDob}
                        onChange={(e) => setEditDob(e.target.value)}
                        class="w-full px-3 py-1.5 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-semibold text-on-surface-variant mb-1">Chronic Diseases</label>
                      <textarea
                        value={editDiseases}
                        onChange={(e) => setEditDiseases(e.target.value)}
                        rows="2"
                        class="w-full px-3 py-1.5 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-semibold text-on-surface-variant mb-1">Lifestyle Habits</label>
                      <input
                        type="text"
                        value={editHabits}
                        onChange={(e) => setEditHabits(e.target.value)}
                        class="w-full px-3 py-1.5 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div class="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditMode(false)}
                        class="flex-1 bg-white border border-border-subtle text-secondary py-1.5 rounded-lg text-xs hover:bg-surface-container"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        class="flex-1 bg-primary hover:bg-primary-hover text-on-primary py-1.5 rounded-lg text-xs transition-colors font-bold shadow-sm"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Medical Visits History */}
              <div class="md:col-span-7 space-y-4">
                <h4 class="font-button text-sm text-on-surface font-bold">Consultation History ({patientVisits.length})</h4>
                
                {loadingVisits ? (
                  <div class="text-center py-12 text-secondary text-xs">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    Loading consultation history...
                  </div>
                ) : patientVisits.length === 0 ? (
                  <div class="text-center py-12 bg-bg-canvas border border-border-subtle rounded-lg text-xs text-secondary">
                    <span class="material-symbols-outlined text-[32px] text-outline-variant block mb-1">history</span>
                    No recorded medical visits for this patient yet.
                  </div>
                ) : (
                  <div class="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
                    {patientVisits.map(visit => {
                      const visitDate = new Date(visit.created_at).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });
                      const visitTime = new Date(visit.created_at).toLocaleTimeString('ar-EG', {
                        hour: 'numeric',
                        minute: '2-digit'
                      });
                      
                      return (
                        <div key={visit.id} class="p-5 bg-surface-container-low border border-border-subtle rounded-xl space-y-4 text-right" dir="rtl">
                          {/* Header */}
                          <div class="flex justify-between items-center pb-2 border-b border-border-subtle/60">
                            <span class="text-xs font-bold text-primary">
                              زيارة يوم {visitDate} ({visitTime})
                            </span>
                            <span class="text-[10px] font-bold text-secondary bg-surface-container-high px-2 py-0.5 rounded font-mono">
                              المدة: {Math.floor((visit.duration_seconds || 0) / 60)}د و {(visit.duration_seconds || 0) % 60}ث
                            </span>
                          </div>

                          {/* Summary */}
                          {visit.summary_text && (
                            <div class="space-y-1">
                              <span class="text-[10px] font-bold text-secondary block">التلخيص الطبي:</span>
                              <p class="text-xs text-on-surface leading-relaxed">{visit.summary_text}</p>
                            </div>
                          )}

                          {/* SOAP Note details */}
                          {visit.soap_note && (
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                              {[['S', 'Subjective (الشكوى)'], ['O', 'Objective (الفحص)'], ['A', 'Assessment (التشخيص)'], ['P', 'Plan (الخطة)']].map(([key, label]) => (
                                <div key={key} class="bg-white p-2.5 rounded-lg border border-border-subtle/50 space-y-1">
                                  <span class="text-[9px] font-black text-primary block">{label}</span>
                                  <p class="text-[11px] text-on-surface-variant leading-relaxed min-h-[18px]">
                                    {visit.soap_note[key] || 'لا يوجد'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Prescriptions */}
                          {visit.prescriptions && visit.prescriptions.length > 0 && (
                            <div class="space-y-2 pt-2 border-t border-border-subtle/40">
                              <span class="text-[10px] font-black text-secondary block">الروشتة العلاجية:</span>
                              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {visit.prescriptions.map((rx, idx) => (
                                  <div key={idx} class="bg-white px-3 py-2 rounded-lg border border-border-subtle/50 text-[11px]">
                                    <div class="font-bold text-on-surface">{rx.medication}</div>
                                    <div class="text-secondary text-[10px] mt-0.5">
                                      {rx.dose} • {rx.frequency} • {rx.duration}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tasks */}
                          {visit.tasks && visit.tasks.length > 0 && (
                            <div class="space-y-1 pt-2 border-t border-border-subtle/40">
                              <span class="text-[10px] font-black text-secondary block">مهام المتابعة المطلوبة:</span>
                              <ul class="list-disc list-inside text-[11px] text-on-surface-variant space-y-1 pr-2">
                                {visit.tasks.map((task, idx) => (
                                  <li key={idx}>{task}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div class="px-6 py-4 bg-bg-canvas border-t border-border-subtle flex justify-between items-center gap-3">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startAiChatForPatient(selectedPatient)}
                  class="flex items-center gap-2 bg-primary hover:bg-primary-hover text-on-primary font-button py-2 px-4 rounded-lg text-xs transition-colors shadow-sm"
                >
                  <span class="material-symbols-outlined text-[16px]">smart_toy</span>
                  Chat with AI
                </button>
                {!isEditMode && (
                  <button
                    type="button"
                    onClick={() => setIsEditMode(true)}
                    class="flex items-center gap-2 border border-border-subtle text-secondary hover:bg-surface-container py-2 px-4 rounded-lg text-xs transition-colors"
                  >
                    <span class="material-symbols-outlined text-[16px]">edit</span>
                    Edit Profile
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                class="border border-border-subtle text-secondary hover:bg-surface-container py-2 px-4 rounded-lg text-xs transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
