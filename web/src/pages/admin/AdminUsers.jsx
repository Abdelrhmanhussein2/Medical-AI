import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function AdminUsers() {
  const { 
    doctors, 
    organizations, 
    toggleDoctorStatus, 
    toggleOrgStatus, 
    registerOrg, 
    registerDoctor,
    updateDoctor, 
    updateOrg, 
    deleteDoctor, 
    deleteOrg 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState('doctors'); // doctors or orgs
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, disabled/suspended

  // Add Org Modal states
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgPassword, setOrgPassword] = useState('');
  const [orgSpecialty, setOrgSpecialty] = useState('Cardiology');
  const [error, setError] = useState('');

  // Add Doctor Modal states
  const [showDocModal, setShowDocModal] = useState(false);
  const [docName, setDocName] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [docPhone, setDocPhone] = useState('');
  const [docPassword, setDocPassword] = useState('');
  const [docSpecialty, setDocSpecialty] = useState('Cardiology');
  const [docDept, setDocDept] = useState(''); // Empty means Independent

  // Editing states
  const [editingOrg, setEditingOrg] = useState(null);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState(null); // { title, description, icon, onConfirm }

  // Org edit form states
  const [editOrgName, setEditOrgName] = useState('');
  const [editOrgEmail, setEditOrgEmail] = useState('');
  const [editOrgPhone, setEditOrgPhone] = useState('');
  const [editOrgSpecialty, setEditOrgSpecialty] = useState('Cardiology');
  const [editOrgPlan, setEditOrgPlan] = useState('Pro AI Suite');
  const [editOrgExpiry, setEditOrgExpiry] = useState('');
  const [editOrgStatus, setEditOrgStatus] = useState('active');

  // Doctor edit form states
  const [editDocName, setEditDocName] = useState('');
  const [editDocEmail, setEditDocEmail] = useState('');
  const [editDocPhone, setEditDocPhone] = useState('');
  const [editDocDept, setEditDocDept] = useState('');
  const [editDocPlan, setEditDocPlan] = useState('Pro AI Suite');
  const [editDocExpiry, setEditDocExpiry] = useState('');
  const [editDocStatus, setEditDocStatus] = useState('approved');

  // Handle Add Org submit
  const handleAddOrgSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!orgName || !orgEmail || !orgPhone || !orgPassword) {
      setError('Please fill in all required fields');
      return;
    }
    try {
      await registerOrg(orgName, orgEmail, orgPhone, orgSpecialty, orgPassword);
      setOrgName('');
      setOrgEmail('');
      setOrgPhone('');
      setOrgPassword('');
      setOrgSpecialty('Cardiology');
      setShowOrgModal(false);
    } catch (err) {
      setError(err.message || 'Failed to register new organization');
    }
  };

  // Handle Add Doctor submit
  const handleAddDocSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!docName || !docEmail || !docPhone || !docPassword) {
      setError('Please fill in all required fields');
      return;
    }
    try {
      await registerDoctor(
        docName,
        docEmail,
        docPhone,
        docPassword,
        docSpecialty,
        docDept || null,
        'approved'
      );
      setDocName('');
      setDocEmail('');
      setDocPhone('');
      setDocPassword('');
      setDocSpecialty('Cardiology');
      setDocDept('');
      setShowDocModal(false);
    } catch (err) {
      setError(err.message || 'Failed to register new doctor');
    }
  };

  const openEditOrg = (org) => {
    setEditingOrg(org);
    setIsEditMode(false);
    setEditOrgName(org.name || '');
    setEditOrgEmail(org.email || '');
    setEditOrgPhone(org.phone || '');
    setEditOrgSpecialty(org.specialty || 'Cardiology');
    setEditOrgPlan(org.subscription_plan || 'Pro AI Suite');
    setEditOrgExpiry(org.subscription_expiry || '');
    setEditOrgStatus(org.status || 'active');
  };

  const openEditDoctor = (doc) => {
    setEditingDoctor(doc);
    setIsEditMode(false);
    setEditDocName(doc.name || '');
    setEditDocEmail(doc.email || '');
    setEditDocPhone(doc.phone || '');
    setEditDocDept(doc.department || 'Independent');
    setEditDocPlan(doc.subscription_plan || 'Pro AI Suite');
    setEditDocExpiry(doc.subscription_expiry || '');
    setEditDocStatus(doc.status || 'approved');
  };

  const handleEditOrgSubmit = (e) => {
    e.preventDefault();
    updateOrg(editingOrg.id, {
      name: editOrgName,
      email: editOrgEmail,
      phone: editOrgPhone,
      specialty: editOrgSpecialty,
      subscription_plan: editOrgPlan,
      subscription_expiry: editOrgExpiry,
      status: editOrgStatus
    });
    setEditingOrg(null);
  };

  const handleEditDoctorSubmit = (e) => {
    e.preventDefault();
    updateDoctor(editingDoctor.id, {
      name: editDocName,
      email: editDocEmail,
      phone: editDocPhone,
      department: editDocDept,
      subscription_plan: editDocPlan,
      subscription_expiry: editDocExpiry,
      status: editDocStatus
    });
    setEditingDoctor(null);
  };

  const handleDeleteDoctor = (id, name) => {
    setConfirmModal({
      title: 'Delete Doctor Account',
      description: `Are you sure you want to permanently delete Dr. ${name}'s account from the database? All associated appointments, visits, and subscriptions will be removed. This action cannot be undone.`,
      icon: 'delete_forever',
      iconColor: 'text-error',
      confirmLabel: 'Yes, Delete Permanently',
      confirmClass: 'bg-error text-white hover:bg-error/90',
      onConfirm: () => {
        deleteDoctor(id);
        setEditingDoctor(null);
        setConfirmModal(null);
      }
    });
  };

  const handleDeleteOrg = (id, name) => {
    setConfirmModal({
      title: 'Delete Department',
      description: `Are you sure you want to permanently delete "${name}" from the database? All associated records will be removed. This action cannot be undone.`,
      icon: 'domain_disabled',
      iconColor: 'text-error',
      confirmLabel: 'Yes, Delete Permanently',
      confirmClass: 'bg-error text-white hover:bg-error/90',
      onConfirm: () => {
        deleteOrg(id);
        setEditingOrg(null);
        setConfirmModal(null);
      }
    });
  };

  // Filter Doctors
  const filteredDoctors = (doctors || []).filter(doc => {
    const matchesSearch = (doc.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (doc.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'active' && doc.is_active) || 
                          (statusFilter === 'disabled' && !doc.is_active);
    return matchesSearch && matchesStatus;
  });

  // Filter Organizations
  const filteredOrgs = (organizations || []).filter(org => {
    const matchesSearch = (org.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (org.specialty || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'active' && org.is_active) || 
                          (statusFilter === 'disabled' && !org.is_active);
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <div class="space-y-stack-lg font-body-md animate-fade-in">
      {/* Header */}
      <header class="flex justify-between items-end border-b border-border-subtle pb-stack-md">
        <div>
          <h1 class="font-display-lg text-headline-lg text-on-surface font-bold">User Management</h1>
          <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">
            Manage practitioners, departments, access rights, and status.
          </p>
        </div>
        {activeTab === 'orgs' && (
          <button
            onClick={() => setShowOrgModal(true)}
            class="bg-primary hover:bg-primary-hover text-on-primary font-button text-xs py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm font-semibold"
          >
            <span class="material-symbols-outlined text-[18px]">add_business</span>
            Add New Department
          </button>
        )}
        {activeTab === 'doctors' && (
          <button
            onClick={() => setShowDocModal(true)}
            class="bg-primary hover:bg-primary-hover text-on-primary font-button text-xs py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm font-semibold"
          >
            <span class="material-symbols-outlined text-[18px]">person_add</span>
            Add New Doctor
          </button>
        )}
      </header>

      {/* Tabs & Search controls */}
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 border border-border-subtle rounded-xl shadow-sm">
        {/* Tabs */}
        <div class="flex gap-2 p-1 bg-surface-container-low rounded-lg w-full sm:w-auto">
          <button
            onClick={() => {
              setActiveTab('doctors');
              setSearchQuery('');
              setStatusFilter('all');
            }}
            type="button"
            class={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${
              activeTab === 'doctors' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-secondary hover:text-primary'
            }`}
          >
            Doctors
          </button>
          <button
            onClick={() => {
              setActiveTab('orgs');
              setSearchQuery('');
              setStatusFilter('all');
            }}
            type="button"
            class={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${
              activeTab === 'orgs' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-secondary hover:text-primary'
            }`}
          >
            Organizations
          </button>
        </div>

        {/* Filters */}
        <div class="flex gap-2 w-full sm:w-auto">
          <div class="relative flex-1 sm:flex-none sm:w-64">
            <span class="material-symbols-outlined absolute left-2.5 top-1/2 transform -translate-y-1/2 text-secondary text-lg">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'doctors' ? 'Search doctor name...' : 'Search organization...'}
              class="w-full pl-9 pr-3 py-2 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            class="bg-white border border-border-subtle rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-secondary font-semibold"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="disabled">Suspended / Disabled</option>
          </select>
        </div>
      </div>

      {/* Main Tables Grid */}
      <div class="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
        {activeTab === 'doctors' ? (
          <table class="min-w-full divide-y divide-border-subtle text-left">
            <thead class="bg-bg-canvas">
              <tr>
                <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Doctor</th>
                <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Department</th>
                <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Subscription Plan</th>
                <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
                <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Join Date</th>
                <th scope="col" class="relative px-6 py-3">
                  <span class="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-border-subtle text-xs">
              {filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan="6" class="px-6 py-8 text-center text-secondary text-sm">
                    No matching doctors found
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doc) => (
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
                      {doc.department || 'Independent'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-secondary">
                      <div class="font-semibold text-primary">{doc.subscription_plan || 'N/A'}</div>
                      <div class="text-[10px] text-secondary">Expires: {doc.subscription_expiry || 'N/A'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        doc.is_active 
                          ? 'bg-primary-light text-primary' 
                          : 'bg-error-container text-error'
                      }`}>
                        {doc.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-secondary">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold">
                      <div class="flex gap-2 justify-end">
                        <button
                          onClick={() => openEditDoctor(doc)}
                          class="px-3 py-1.5 bg-primary-light hover:bg-primary/20 text-primary rounded font-bold text-xs shadow-sm transition-colors"
                        >
                          View Details & Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table class="min-w-full divide-y divide-border-subtle text-left">
            <thead class="bg-bg-canvas">
              <tr>
                <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Organization</th>
                <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Specialty</th>
                <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Total Doctors</th>
                <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Subscription Plan</th>
                <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Created At</th>
                <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
                <th scope="col" class="relative px-6 py-3">
                  <span class="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-border-subtle text-xs">
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan="7" class="px-6 py-8 text-center text-secondary text-sm">
                    No matching organizations found
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => {
                  const assignedCount = doctors.filter(d => d.org_id === org.id).length;
                  return (
                    <tr key={org.id} class="hover:bg-surface-container-low transition-colors">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="font-bold text-on-surface text-xs">{org.name}</div>
                        <div class="text-[10px] text-secondary">{org.email}</div>
                        <div class="text-[10px] text-secondary">{org.phone}</div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-secondary font-semibold">
                        {org.specialty}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-secondary font-bold">
                        {assignedCount} doctors
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="font-semibold text-primary">{org.subscription_plan}</div>
                        <div class="text-[10px] text-secondary">Expires: {org.subscription_expiry}</div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-secondary">
                        {new Date(org.created_at).toLocaleDateString()}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          org.is_active 
                            ? 'bg-primary-light text-primary' 
                            : 'bg-error-container text-error'
                        }`}>
                          {org.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold">
                        <div class="flex gap-2 justify-end">
                          <button
                            onClick={() => openEditOrg(org)}
                            class="px-3 py-1.5 bg-primary-light hover:bg-primary/20 text-primary rounded font-bold text-xs shadow-sm transition-colors"
                          >
                            View Details & Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Organization Modal */}
      {showOrgModal && (
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl border border-border-subtle shadow-lg max-w-md w-full overflow-hidden animate-fade-in">
            <div class="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas">
              <h3 class="font-headline-md text-base text-primary font-bold">Add Clinical Department</h3>
              <button 
                onClick={() => setShowOrgModal(false)}
                class="p-1 hover:bg-surface-container rounded-full text-secondary"
              >
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddOrgSubmit} class="p-6 space-y-4">
              {error && (
                <div class="bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2">
                  <span class="material-symbols-outlined text-[16px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Organization Name *</label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Cairo Cardiology Center"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Contact Email *</label>
                <input
                  type="email"
                  required
                  value={orgEmail}
                  onChange={(e) => setOrgEmail(e.target.value)}
                  placeholder="e.g. contact@cairomed.com"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

               <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Contact Phone *</label>
                <input
                  type="text"
                  required
                  value={orgPhone}
                  onChange={(e) => setOrgPhone(e.target.value)}
                  placeholder="e.g. 01012345678"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={orgPassword}
                  onChange={(e) => setOrgPassword(e.target.value)}
                  placeholder="••••••••"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Medical Specialty</label>
                <select
                  value={orgSpecialty}
                  onChange={(e) => setOrgSpecialty(e.target.value)}
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                >
                  <option value="Cardiology">Cardiology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Oncology">Oncology</option>
                  <option value="General Practice">General Practice</option>
                </select>
              </div>

              <div class="flex gap-3 mt-6 pt-4 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setShowOrgModal(false)}
                  class="flex-1 bg-white border border-border-subtle text-secondary font-button py-2 rounded-lg text-xs hover:bg-surface-container-low transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-button py-2 rounded-lg text-xs transition-colors shadow-sm font-semibold"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Doctor Modal */}
      {showDocModal && (
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl border border-border-subtle shadow-lg max-w-md w-full overflow-hidden animate-fade-in">
            <div class="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas">
              <h3 class="font-headline-md text-base text-primary font-bold">Add Clinical Doctor</h3>
              <button 
                onClick={() => setShowDocModal(false)}
                class="p-1 hover:bg-surface-container rounded-full text-secondary"
              >
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddDocSubmit} class="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
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
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Dr. Ahmed Hassan"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Contact Email *</label>
                <input
                  type="email"
                  required
                  value={docEmail}
                  onChange={(e) => setDocEmail(e.target.value)}
                  placeholder="e.g. doctor@example.com"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Contact Phone *</label>
                <input
                  type="text"
                  required
                  value={docPhone}
                  onChange={(e) => setDocPhone(e.target.value)}
                  placeholder="e.g. 01012345678"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={docPassword}
                  onChange={(e) => setDocPassword(e.target.value)}
                  placeholder="••••••••"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Medical Specialty</label>
                <select
                  value={docSpecialty}
                  onChange={(e) => setDocSpecialty(e.target.value)}
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                >
                  <option value="Cardiology">Cardiology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Oncology">Oncology</option>
                  <option value="General Practice">General Practice</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Assign Clinical Department</label>
                <select
                  value={docDept}
                  onChange={(e) => setDocDept(e.target.value)}
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                >
                  <option value="">None (Independent Doctor)</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div class="flex gap-3 mt-6 pt-4 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  class="flex-1 bg-white border border-border-subtle text-secondary font-button py-2 rounded-lg text-xs hover:bg-surface-container-low transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-button py-2 rounded-lg text-xs transition-colors shadow-sm font-semibold"
                >
                  Save Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details & Edit Organization Modal */}
      {editingOrg && (
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl border border-border-subtle shadow-lg max-w-md w-full overflow-hidden animate-fade-in">
            <div class="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas">
              <h3 class="font-headline-md text-base text-primary font-bold">
                {isEditMode ? "Edit Organization" : "Organization Details"}
              </h3>
              <button 
                onClick={() => setEditingOrg(null)}
                class="p-1 hover:bg-surface-container rounded-full text-secondary"
              >
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            {isEditMode ? (
              <form onSubmit={handleEditOrgSubmit} class="p-6 space-y-4">
                <div>
                  <label class="block text-xs font-semibold text-on-surface-variant mb-1">Organization Name *</label>
                  <input
                    type="text"
                    required
                    value={editOrgName}
                    onChange={(e) => setEditOrgName(e.target.value)}
                    class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-on-surface-variant mb-1">Contact Email *</label>
                  <input
                    type="email"
                    required
                    value={editOrgEmail}
                    onChange={(e) => setEditOrgEmail(e.target.value)}
                    class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-on-surface-variant mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={editOrgPhone}
                    onChange={(e) => setEditOrgPhone(e.target.value)}
                    class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                  />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-semibold text-on-surface-variant mb-1">Specialty</label>
                    <select
                      value={editOrgSpecialty}
                      onChange={(e) => setEditOrgSpecialty(e.target.value)}
                      class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                    >
                      <option value="Cardiology">Cardiology</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Oncology">Oncology</option>
                      <option value="General Practice">General Practice</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-on-surface-variant mb-1">Subscription Plan</label>
                    <select
                      value={editOrgPlan}
                      onChange={(e) => setEditOrgPlan(e.target.value)}
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
                      value={editOrgExpiry}
                      onChange={(e) => setEditOrgExpiry(e.target.value)}
                      class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-on-surface-variant mb-1">Status</label>
                    <select
                      value={editOrgStatus}
                      onChange={(e) => setEditOrgStatus(e.target.value)}
                      class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
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
                    <span class="block font-semibold text-on-surface-variant mb-0.5">Organization Name</span>
                    <span class="text-sm font-bold text-on-surface">{editingOrg.name}</span>
                  </div>
                  <div>
                    <span class="block font-semibold text-on-surface-variant mb-0.5">Specialty</span>
                    <span class="text-sm font-bold text-primary">{editingOrg.specialty}</span>
                  </div>
                  <div>
                    <span class="block font-semibold text-on-surface-variant mb-0.5">Contact Email</span>
                    <span class="text-sm font-semibold text-on-surface">{editingOrg.email}</span>
                  </div>
                  <div>
                    <span class="block font-semibold text-on-surface-variant mb-0.5">Contact Phone</span>
                    <span class="text-sm font-semibold text-on-surface">{editingOrg.phone}</span>
                  </div>
                  <div>
                    <span class="block font-semibold text-on-surface-variant mb-0.5">Subscription Plan</span>
                    <span class="text-sm font-semibold text-primary">{editingOrg.subscription_plan}</span>
                  </div>
                  <div>
                    <span class="block font-semibold text-on-surface-variant mb-0.5">Expiry Date</span>
                    <span class="text-sm font-semibold text-on-surface">{editingOrg.subscription_expiry}</span>
                  </div>
                  <div>
                    <span class="block font-semibold text-on-surface-variant mb-0.5">Status</span>
                    <span class={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      editingOrg.is_active 
                        ? 'bg-primary-light text-primary' 
                        : 'bg-error-container text-error'
                    }`}>
                      {editingOrg.is_active ? 'Active' : 'Suspended'}
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
                      onClick={async () => {
                        const res = await toggleOrgStatus(editingOrg.id);
                        if (res) {
                          setEditingOrg(prev => ({ ...prev, is_active: res.is_active }));
                        }
                      }}
                      class={`flex-1 py-2 rounded-lg font-bold transition-colors ${
                        editingOrg.is_active
                          ? 'bg-status-warning/10 hover:bg-status-warning/20 text-status-warning'
                          : 'bg-primary-light text-primary hover:bg-primary/20'
                      }`}
                    >
                      {editingOrg.is_active ? 'Suspend Org' : 'Activate Org'}
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteOrg(editingOrg.id, editingOrg.name)}
                    class="w-full py-2 bg-error-container text-error hover:bg-error/10 rounded-lg font-bold transition-colors text-center"
                  >
                    Delete Organization
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Details & Edit Doctor Modal */}
      {editingDoctor && (
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl border border-border-subtle shadow-lg max-w-md w-full overflow-hidden animate-fade-in">
            <div class="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas">
              <h3 class="font-headline-md text-base text-primary font-bold">
                {isEditMode ? "Edit Doctor Profile" : "Doctor Profile Details"}
              </h3>
              <button 
                onClick={() => setEditingDoctor(null)}
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
                      value={editDocDept}
                      onChange={(e) => setEditDocDept(e.target.value)}
                      class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
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
                    <span class="text-sm font-bold text-on-surface">{editingDoctor.name}</span>
                  </div>
                  <div>
                    <span class="block font-semibold text-on-surface-variant mb-0.5">Department</span>
                    <span class="text-sm font-bold text-primary">{editingDoctor.department || 'Independent'}</span>
                  </div>
                  <div>
                    <span class="block font-semibold text-on-surface-variant mb-0.5">Clinic Email</span>
                    <span class="text-sm font-semibold text-on-surface">{editingDoctor.email}</span>
                  </div>
                  <div>
                    <span class="block font-semibold text-on-surface-variant mb-0.5">Contact Phone</span>
                    <span class="text-sm font-semibold text-on-surface">{editingDoctor.phone}</span>
                  </div>
                  <div>
                    <span class="block font-semibold text-on-surface-variant mb-0.5">Subscription Plan</span>
                    <span class="text-sm font-semibold text-primary">{editingDoctor.subscription_plan || 'N/A'}</span>
                  </div>
                  <div>
                    <span class="block font-semibold text-on-surface-variant mb-0.5">Expiry Date</span>
                    <span class="text-sm font-semibold text-on-surface">{editingDoctor.subscription_expiry || 'N/A'}</span>
                  </div>
                  <div>
                    <span class="block font-semibold text-on-surface-variant mb-0.5">Status</span>
                    <span class={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      editingDoctor.is_active 
                        ? 'bg-primary-light text-primary' 
                        : 'bg-error-container text-error'
                    }`}>
                      {editingDoctor.is_active ? 'Active' : 'Disabled'}
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
                      onClick={async () => {
                        const res = await toggleDoctorStatus(editingDoctor.id);
                        if (res) {
                          setEditingDoctor(prev => ({ ...prev, is_active: res.is_active }));
                        }
                      }}
                      class={`flex-1 py-2 rounded-lg font-bold transition-colors ${
                        editingDoctor.is_active
                          ? 'bg-status-warning/10 hover:bg-status-warning/20 text-status-warning'
                          : 'bg-primary-light text-primary hover:bg-primary/20'
                      }`}
                    >
                      {editingDoctor.is_active ? 'Disable Doctor' : 'Enable Doctor'}
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteDoctor(editingDoctor.id, editingDoctor.name)}
                    class="w-full py-2 bg-error-container text-error hover:bg-error/10 rounded-lg font-bold transition-colors text-center"
                  >
                    Delete Doctor Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

      {/* Custom Confirmation Modal */}
      {confirmModal && (
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setConfirmModal(null)}>
          <div
            class="bg-white rounded-2xl border border-border-subtle shadow-2xl max-w-sm w-full overflow-hidden animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div class="px-6 pt-6 pb-4 text-center">
              <div class="w-14 h-14 rounded-full bg-error-container flex items-center justify-center mx-auto mb-4">
                <span class={`material-symbols-outlined text-3xl ${confirmModal.iconColor}`}>{confirmModal.icon}</span>
              </div>
              <h3 class="font-bold text-base text-on-surface mb-2">{confirmModal.title}</h3>
              <p class="text-xs text-secondary leading-relaxed">{confirmModal.description}</p>
            </div>

            {/* Divider */}
            <div class="h-px bg-border-subtle mx-6" />

            {/* Actions */}
            <div class="px-6 py-4 flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                class="flex-1 py-2.5 rounded-xl border border-border-subtle text-secondary font-semibold text-sm hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                class={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm ${confirmModal.confirmClass}`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
