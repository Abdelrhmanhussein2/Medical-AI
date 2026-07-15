import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function OrgDoctors() {
  const { currentUser, doctors, addOrgDoctor, toggleDoctorStatus, updateDoctor, deleteDoctor } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  // Selected doctor modal states
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Edit form fields
  const [editDocName, setEditDocName] = useState('');
  const [editDocEmail, setEditDocEmail] = useState('');
  const [editDocPhone, setEditDocPhone] = useState('');
  const [editDocPlan, setEditDocPlan] = useState('Pro AI Suite');
  const [editDocExpiry, setEditDocExpiry] = useState('');
  const [editDocStatus, setEditDocStatus] = useState('approved');

  // All doctors in state are already scoped to this department
  // (loaded via /departments/{id}/doctors endpoint)
  const deptDocs = doctors;

  // Filter roster by search only
  const filteredDocs = deptDocs.filter(d =>
    d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats calculations
  const totalAssigned = deptDocs.length;
  const avgConsults = deptDocs.length > 0
    ? Math.round(deptDocs.reduce((acc, curr) => acc + (curr.ai_consults || 0), 0) / deptDocs.length)
    : 0;

  const handleAddDoctorSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !phone) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await addOrgDoctor(name, email, phone, currentUser.id, currentUser.specialty);
      setName('');
      setEmail('');
      setPhone('');
      setShowAddModal(false);
    } catch (err) {
      setError(err.message || 'Failed to assign doctor');
    }
  };

  const openDoctorDetails = (doc) => {
    setSelectedDoctor(doc);
    setIsEditMode(false);
    setEditDocName(doc.name || '');
    setEditDocEmail(doc.email || '');
    setEditDocPhone(doc.phone || '');
    setEditDocPlan(doc.subscription_plan || 'Pro AI Suite');
    setEditDocExpiry(doc.subscription_expiry || '');
    setEditDocStatus(doc.status || 'approved');
  };

  const handleEditDoctorSubmit = (e) => {
    e.preventDefault();
    updateDoctor(selectedDoctor.id, {
      name: editDocName,
      email: editDocEmail,
      phone: editDocPhone,
      subscription_plan: editDocPlan,
      subscription_expiry: editDocExpiry,
      status: editDocStatus
    });
    setSelectedDoctor(null);
  };

  const handleDeleteDoctor = (id) => {
    if (window.confirm("Are you sure you want to remove this doctor from your department?")) {
      deleteDoctor(id);
      setSelectedDoctor(null);
    }
  };

  return (
    <div class="space-y-stack-lg font-body-md animate-fade-in">
      {/* Header */}
      <header class="flex justify-between items-end border-b border-border-subtle pb-stack-md">
        <div>
          <div class="flex items-center gap-1.5 text-xs text-secondary font-semibold">
            <span>{currentUser.name}</span>
            <span class="material-symbols-outlined text-[10px]">chevron_right</span>
            <span>Doctors</span>
          </div>
          <h1 class="font-display-lg text-headline-lg text-on-surface font-bold mt-1">Active Doctors Roster</h1>
          <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">
            Manage doctor assignments, monitor clinical AI usage, and track subscription health.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          class="bg-primary hover:bg-primary-hover text-on-primary font-button text-xs py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm font-semibold"
        >
          <span class="material-symbols-outlined text-[18px]">person_add</span>
          Assign Doctor
        </button>
      </header>

      {/* Mini KPIs & Search */}
      <div class="flex flex-col md:flex-row justify-between gap-gutter">
        {/* KPI Cards */}
        <div class="flex gap-4 w-full md:w-auto">
          <div class="bg-white border border-border-subtle py-3 px-6 rounded-lg shadow-sm flex items-center gap-4">
            <span class="material-symbols-outlined text-primary bg-primary-light p-2 rounded-full text-lg">group</span>
            <div>
              <span class="text-[10px] text-secondary font-semibold uppercase block">Total Assigned</span>
              <span class="text-sm font-bold text-on-surface">{totalAssigned} doctors</span>
            </div>
          </div>
          
          <div class="bg-white border border-border-subtle py-3 px-6 rounded-lg shadow-sm flex items-center gap-4">
            <span class="material-symbols-outlined text-primary bg-primary-light p-2 rounded-full text-lg">monitoring</span>
            <div>
              <span class="text-[10px] text-secondary font-semibold uppercase block">Avg AI Consults</span>
              <span class="text-sm font-bold text-on-surface">{avgConsults}/mo</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div class="relative w-full md:w-72 self-end">
          <span class="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary text-lg">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find doctor by name..."
            class="w-full pl-10 pr-4 py-2.5 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          />
        </div>
      </div>

      {/* Doctors Table */}
      <div class="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
        <table class="min-w-full divide-y divide-border-subtle text-left">
          <thead class="bg-bg-canvas">
            <tr>
              <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Doctor</th>
              <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Specialization</th>
              <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">AI Consults</th>
              <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Reports</th>
              <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Subscription</th>
              <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Last Activity</th>
              <th scope="col" class="relative px-6 py-3">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-border-subtle text-xs">
            {filteredDocs.length === 0 ? (
              <tr>
                <td colSpan="7" class="px-6 py-8 text-center text-secondary text-sm">
                  No doctors assigned to this department
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => (
                <tr key={doc.id} class="hover:bg-surface-container-low transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold font-display-md">
                        {doc.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div class="font-bold text-on-surface text-xs">{doc.name}</div>
                        <div class="text-[10px] text-secondary">{doc.email}</div>
                        <div class="text-[10px] text-secondary">{doc.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-secondary font-semibold">
                    {doc.specialization || doc.department}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-secondary font-bold text-sm">
                    {doc.ai_consults}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-secondary font-semibold">
                    {doc.reports} reports
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      doc.status === 'approved' 
                        ? 'bg-primary-light text-primary' 
                        : 'bg-error-container text-error'
                    }`}>
                      {doc.status === 'approved' ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-secondary">
                    {doc.last_login}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold">
                    <button
                      onClick={() => openDoctorDetails(doc)}
                      class="px-3 py-1.5 bg-primary-light hover:bg-primary/20 text-primary rounded font-bold text-xs shadow-sm transition-colors"
                    >
                      View Details & Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Assign Doctor Modal */}
      {showAddModal && (
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl border border-border-subtle shadow-lg max-w-md w-full overflow-hidden animate-fade-in">
            <div class="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas">
              <h3 class="font-headline-md text-base text-primary font-bold">Assign Existing Doctor</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                class="p-1 hover:bg-surface-container rounded-full text-secondary"
              >
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddDoctorSubmit} class="p-6 space-y-4">
              {error && (
                <div class="bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2">
                  <span class="material-symbols-outlined text-[16px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Doctor Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Ahmed Hassan"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Clinic Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. doctor@example.com"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Contact Phone *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 01012345678"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Department Specialty</label>
                <input
                  type="text"
                  disabled
                  value={currentUser.specialty}
                  class="w-full px-3 py-2 bg-surface-container-low border border-border-subtle rounded-lg text-sm text-secondary cursor-not-allowed font-semibold"
                />
              </div>

              <div class="flex gap-3 mt-6 pt-4 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  class="flex-1 bg-white border border-border-subtle text-secondary font-button py-2 rounded-lg text-xs hover:bg-surface-container-low transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-button py-2 rounded-lg text-xs transition-colors shadow-sm font-semibold"
                >
                  Assign Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details & Edit Doctor Modal */}
      {selectedDoctor && (
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl border border-border-subtle shadow-lg max-w-md w-full overflow-hidden animate-fade-in">
            <div class="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas">
              <h3 class="font-headline-md text-base text-primary font-bold">
                {isEditMode ? "Edit Doctor Profile" : "Doctor Profile Details"}
              </h3>
              <button 
                onClick={() => setSelectedDoctor(null)}
                class="p-1 hover:bg-surface-container rounded-full text-secondary"
              >
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            {isEditMode ? (
              <form onSubmit={handleEditDoctorSubmit} class="p-6 space-y-4">
                <div>
                  <label class="block text-xs font-semibold text-on-surface-variant mb-1">Doctor Name *</label>
                  <input
                    type="text"
                    required
                    value={editDocName}
                    onChange={(e) => setEditDocName(e.target.value)}
                    class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-on-surface-variant mb-1">Clinic Email *</label>
                  <input
                    type="email"
                    required
                    value={editDocEmail}
                    onChange={(e) => setEditDocEmail(e.target.value)}
                    class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-on-surface-variant mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={editDocPhone}
                    onChange={(e) => setEditDocPhone(e.target.value)}
                    class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                  />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-semibold text-on-surface-variant mb-1">Department</label>
                    <input
                      type="text"
                      disabled
                      value={currentUser.specialty}
                      class="w-full px-3 py-2 bg-surface-container-low border border-border-subtle rounded-lg text-sm text-secondary cursor-not-allowed font-semibold"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-on-surface-variant mb-1">Subscription Plan</label>
                    <select
                      value={editDocPlan}
                      onChange={(e) => setEditDocPlan(e.target.value)}
                      class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                    >
                      <option value="Basic Access">Basic Access</option>
                      <option value="Trial Access">Trial Access</option>
                      <option value="Clinical Pro">Clinical Pro</option>
                      <option value="Pro AI Suite">Pro AI Suite</option>
                      <option value="Enterprise AI">Enterprise AI</option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-semibold text-on-surface-variant mb-1">Subscription Expiry</label>
                    <input
                      type="date"
                      required
                      value={editDocExpiry}
                      onChange={(e) => setEditDocExpiry(e.target.value)}
                      class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-on-surface-variant mb-1">Status</label>
                    <select
                      value={editDocStatus}
                      onChange={(e) => setEditDocStatus(e.target.value)}
                      class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                    >
                      <option value="approved">Active</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                </div>

                <div class="flex gap-3 mt-6 pt-4 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setIsEditMode(false)}
                    class="flex-1 bg-white border border-border-subtle text-secondary font-button py-2 rounded-lg text-xs hover:bg-surface-container-low transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    class="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-button py-2 rounded-lg text-xs transition-colors shadow-sm font-semibold"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div class="p-6 space-y-6 text-xs text-secondary">
                <div class="grid grid-cols-2 gap-y-4 gap-x-2">
                  <div>
                    <span class="block font-semibold text-on-surface-variant mb-0.5">Doctor Name</span>
                    <span class="text-sm font-bold text-on-surface">{selectedDoctor.name}</span>
                  </div>
                  <div>
                    <span class="block font-semibold text-on-surface-variant mb-0.5">Department</span>
                    <span class="text-sm font-bold text-primary">{currentUser.specialty}</span>
                  </div>
                  <div>
                    <span class="block font-semibold text-on-surface-variant mb-0.5">Clinic Email</span>
                    <span class="text-sm font-semibold text-on-surface">{selectedDoctor.email}</span>
                  </div>
                  <div>
                    <span class="block font-semibold text-on-surface-variant mb-0.5">Contact Phone</span>
                    <span class="text-sm font-semibold text-on-surface">{selectedDoctor.phone}</span>
                  </div>
                  <div>
                    <span class="block font-semibold text-on-surface-variant mb-0.5">Subscription Plan</span>
                    <span class="text-sm font-semibold text-primary">{selectedDoctor.subscription_plan || 'N/A'}</span>
                  </div>
                  <div>
                    <span class="block font-semibold text-on-surface-variant mb-0.5">Expiry Date</span>
                    <span class="text-sm font-semibold text-on-surface">{selectedDoctor.subscription_expiry || 'N/A'}</span>
                  </div>
                  <div>
                    <span class="block font-semibold text-on-surface-variant mb-0.5">Status</span>
                    <span class={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      selectedDoctor.status === 'approved' 
                        ? 'bg-primary-light text-primary' 
                        : 'bg-error-container text-error'
                    }`}>
                      {selectedDoctor.status === 'approved' ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>

                <div class="flex flex-col gap-2 pt-6 border-t border-border-subtle mt-4">
                  <div class="flex gap-2">
                    <button
                      onClick={() => setIsEditMode(true)}
                      class="flex-1 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-lg font-bold transition-colors shadow-sm text-center"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => {
                        toggleDoctorStatus(selectedDoctor.id);
                        setSelectedDoctor(null);
                      }}
                      class={`flex-1 py-2 rounded-lg font-bold transition-colors ${
                        selectedDoctor.status === 'approved'
                          ? 'bg-status-warning/10 hover:bg-status-warning/20 text-status-warning'
                          : 'bg-primary-light text-primary hover:bg-primary/20'
                      }`}
                    >
                      {selectedDoctor.status === 'approved' ? 'Disable Doctor' : 'Enable Doctor'}
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteDoctor(selectedDoctor.id)}
                    class="w-full py-2 bg-error-container text-error hover:bg-error/10 rounded-lg font-bold transition-colors text-center"
                  >
                    Remove Doctor from Department
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
