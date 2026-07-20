import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function Patients({ setActivePage }) {
  const { patients, addPatient, visits } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('male');
  const [error, setError] = useState('');

  // Handle Search filter
  const filteredPatients = patients.filter(
    p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.phone.includes(searchQuery)
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
        gender
      });

      // Reset
      setName('');
      setPhone('');
      setEmail('');
      setDob('');
      setGender('male');
      setShowAddModal(false);
    } catch (err) {
      setError(err.message || 'حدث خطأ');
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
          const response = await fetch(`/api/v1/visits/patient/${selectedPatient.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setPatientVisits(data || []);
          }
        } catch (err) {
          console.error("Failed to fetch patient visits", err);
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
          placeholder="Search by name or phone..."
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
              <th scope="col" class="relative px-6 py-3">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-border-subtle">
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan="5" class="px-6 py-8 text-center text-secondary text-sm">
                  لا توجد نتائج مطابقة للبحث
                </td>
              </tr>
            ) : (
              filteredPatients.map((patient) => (
                <tr key={patient.id} class="hover:bg-surface-container-low transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-xs">
                        {patient.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div class="text-sm font-semibold text-on-surface">{patient.name}</div>
                        <div class="text-xs text-secondary">{patient.email || 'No Email'}</div>
                      </div>
                    </div>
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
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => setSelectedPatient(patient)}
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
            <form onSubmit={handleAddPatientSubmit} class="p-6 space-y-4">
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
                  <label class="block text-xs font-semibold text-on-surface-variant mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
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
          <div class="bg-white rounded-xl border border-border-subtle shadow-lg max-w-2xl w-full overflow-hidden">
            <div class="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas">
              <h3 class="font-headline-md text-base text-primary font-bold">Patient Medical Profile</h3>
              <button 
                onClick={() => setSelectedPatient(null)}
                class="p-1 hover:bg-surface-container rounded-full text-secondary"
              >
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div class="p-6 grid grid-cols-1 md:grid-cols-12 gap-gutter max-h-[75vh] overflow-y-auto">
              {/* General Details */}
              <div class="md:col-span-4 space-y-4 border-b md:border-b-0 md:border-r border-border-subtle pb-6 md:pb-0 md:pr-6">
                <div class="text-center md:text-left space-y-2">
                  <div class="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xl mx-auto md:mx-0 shadow-sm">
                    {selectedPatient.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <h4 class="font-button text-base text-on-surface font-bold">{selectedPatient.name}</h4>
                  <span class={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                    selectedPatient.gender === 'male' ? 'bg-primary-light text-primary' : 'bg-surface-container-high text-secondary'
                  }`}>
                    {selectedPatient.gender}
                  </span>
                </div>
                
                <div class="space-y-2 pt-4 text-xs text-secondary leading-relaxed">
                  <p><strong class="text-on-surface">Phone:</strong> {selectedPatient.phone}</p>
                  <p><strong class="text-on-surface">Email:</strong> {selectedPatient.email || 'No Email'}</p>
                  <p><strong class="text-on-surface">Date of Birth:</strong> {selectedPatient.date_of_birth || 'N/A'}</p>
                </div>
              </div>

              {/* Medical Visits History */}
              <div class="md:col-span-8 space-y-4">
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
                    {patientVisits.map(visit => (
                      <div key={visit.id} class="p-4 bg-bg-canvas border border-border-subtle rounded-lg space-y-2">
                        <div class="flex justify-between items-center text-[10px]">
                          <span class="px-2 py-0.5 bg-primary-light text-primary rounded-full font-bold">
                            {visit.visit_date}
                          </span>
                        </div>
                        {visit.diagnosis && (
                          <p class="text-xs font-bold text-on-surface">
                            Diagnosis: <span class="text-primary">{visit.diagnosis}</span>
                          </p>
                        )}
                        {visit.description && (
                          <p class="text-xs text-on-surface-variant leading-relaxed">
                            <strong class="text-on-surface">Symptoms:</strong> {visit.description}
                          </p>
                        )}
                        {visit.notes && (
                          <div class="text-[11px] bg-white p-2 border border-border-subtle text-secondary leading-relaxed rounded">
                            <strong class="text-on-surface">Notes:</strong> {visit.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div class="px-6 py-4 bg-bg-canvas border-t border-border-subtle flex justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => startAiChatForPatient(selectedPatient)}
                class="flex items-center gap-2 bg-primary hover:bg-primary-hover text-on-primary font-button py-2 px-4 rounded-lg text-xs transition-colors shadow-sm"
              >
                <span class="material-symbols-outlined text-[16px]">smart_toy</span>
                Chat with AI about this patient
              </button>
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
