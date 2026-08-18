import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { SPECIALTIES, getSpecialtyLabel } from '../../data/specialties';

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
  const { t, isArabic } = useLanguage();
  
  const [activeTab, setActiveTab] = useState('doctors'); // doctors or orgs
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, disabled/suspended

  // Advanced Filter Popover states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [deptFilter, setDeptFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [expirySort, setExpirySort] = useState('default');

  const resetFilters = () => {
    setStatusFilter('all');
    setDeptFilter('all');
    setPlanFilter('all');
    setSpecialtyFilter('all');
    setExpirySort('default');
  };

  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) +
    (deptFilter !== 'all' ? 1 : 0) +
    (planFilter !== 'all' ? 1 : 0) +
    (specialtyFilter !== 'all' ? 1 : 0) +
    (expirySort !== 'default' ? 1 : 0);

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
      setError(isArabic ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill in all required fields');
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
      setError(err.message || (isArabic ? 'فشل تسجيل المنظمة الجديدة' : 'Failed to register new organization'));
    }
  };

  // Handle Add Doctor submit
  const handleAddDocSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!docName || !docEmail || !docPhone || !docPassword) {
      setError(isArabic ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill in all required fields');
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
      setError(err.message || (isArabic ? 'فشل تسجيل الطبيب الجديد' : 'Failed to register new doctor'));
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
      title: isArabic ? 'حذف حساب الطبيب' : 'Delete Doctor Account',
      description: isArabic
        ? `هل أنت متأكد من رغبتك في حذف حساب د. ${name} نهائياً؟ سيتم إزالة جميع المواعيد والزيارات والاشتراكات المرتبطة به. لا يمكن التراجع عن هذا الإجراء.`
        : `Are you sure you want to permanently delete Dr. ${name}'s account from the database? All associated appointments, visits, and subscriptions will be removed. This action cannot be undone.`,
      icon: 'delete_forever',
      iconColor: 'text-error',
      confirmLabel: isArabic ? 'نعم، احذف نهائياً' : 'Yes, Delete Permanently',
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
      title: isArabic ? 'حذف القسم/المنظمة' : 'Delete Department',
      description: isArabic
        ? `هل أنت متأكد من رغبتك في حذف "${name}" نهائياً من قاعدة البيانات؟ سيتم إزالة جميع السجلات المرتبطة بها. لا يمكن التراجع عن هذا الإجراء.`
        : `Are you sure you want to permanently delete "${name}" from the database? All associated records will be removed. This action cannot be undone.`,
      icon: 'domain_disabled',
      iconColor: 'text-error',
      confirmLabel: isArabic ? 'نعم، احذف نهائياً' : 'Yes, Delete Permanently',
      confirmClass: 'bg-error text-white hover:bg-error/90',
      onConfirm: () => {
        deleteOrg(id);
        setEditingOrg(null);
        setConfirmModal(null);
      }
    });
  };

  // Filter Doctors
  const filteredDoctors = (doctors || [])
    .filter(doc => {
      const matchesSearch = (doc.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (doc.email || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
                            (statusFilter === 'active' && doc.is_active) || 
                            (statusFilter === 'disabled' && !doc.is_active);

      let matchesDept = true;
      if (deptFilter !== 'all') {
        if (deptFilter === 'independent') {
          matchesDept = !doc.department || doc.department === 'Independent' || doc.department === 'مستقل';
        } else {
          matchesDept = doc.department === deptFilter || doc.department_id === deptFilter;
        }
      }

      let matchesPlan = true;
      if (planFilter !== 'all') {
        const pLower = (doc.subscription_plan || '').toLowerCase();
        if (planFilter === 'none') {
          matchesPlan = !doc.subscription_plan || doc.subscription_plan === 'N/A';
        } else {
          matchesPlan = pLower.includes(planFilter);
        }
      }

      let matchesSpecialty = true;
      if (specialtyFilter !== 'all') {
        const docSpec = (doc.specialty || doc.specialization || '').toLowerCase();
        matchesSpecialty = docSpec === specialtyFilter.toLowerCase();
      }

      return matchesSearch && matchesStatus && matchesDept && matchesPlan && matchesSpecialty;
    })
    .sort((a, b) => {
      if (expirySort === 'default') return 0;
      const dateA = a.subscription_expiry ? new Date(a.subscription_expiry).getTime() : (expirySort === 'nearest' ? 9999999999999 : -9999999999999);
      const dateB = b.subscription_expiry ? new Date(b.subscription_expiry).getTime() : (expirySort === 'nearest' ? 9999999999999 : -9999999999999);
      if (expirySort === 'nearest') {
        return dateA - dateB;
      } else if (expirySort === 'furthest') {
        return dateB - dateA;
      }
      return 0;
    });

  // Filter Organizations
  const filteredOrgs = (organizations || []).filter(org => {
    const matchesSearch = (org.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (org.specialty || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'active' && org.is_active) || 
                          (statusFilter === 'disabled' && !org.is_active);
    let matchesSpecialty = true;
    if (specialtyFilter !== 'all') {
      matchesSpecialty = (org.specialty || '').toLowerCase() === specialtyFilter.toLowerCase();
    }
    return matchesSearch && matchesStatus && matchesSpecialty;
  });

  const getPlanLabel = (plan) => {
    if (!isArabic) return plan;
    const map = {
      'Basic Access': 'الوصول الأساسي',
      'Trial Access': 'الوصول التجريبي',
      'Clinical Pro': 'السريري المتقدم',
      'Pro AI Suite': 'باقة ذكاء اصطناعي برو',
      'Enterprise AI': 'الذكاء الاصطناعي للمؤسسات',
    };
    return map[plan] || plan;
  };

  return (
    <>
      <div className={`space-y-stack-lg font-body-md animate-fade-in ${isArabic ? 'text-right' : 'text-left'}`}>
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-border-subtle pb-stack-md gap-4">
          <div>
            <h1 className="font-display-lg text-headline-lg text-on-surface font-bold">
              {isArabic ? 'إدارة المستخدمين' : 'User Management'}
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
              {isArabic
                ? 'إدارة الأطباء الممارسين، الأقسام، صلاحيات الوصول، والنشاط.'
                : 'Manage practitioners, departments, access rights, and status.'}
            </p>
          </div>
          {activeTab === 'orgs' && (
            <button
              onClick={() => setShowOrgModal(true)}
              className="bg-primary hover:bg-primary-hover text-on-primary font-button text-xs py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm font-semibold"
            >
              <span className="material-symbols-outlined text-[18px]">add_business</span>
              {isArabic ? 'إضافة قسم جديد' : 'Add New Department'}
            </button>
          )}
          {activeTab === 'doctors' && (
            <button
              onClick={() => setShowDocModal(true)}
              className="bg-primary hover:bg-primary-hover text-on-primary font-button text-xs py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm font-semibold"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              {isArabic ? 'إضافة طبيب جديد' : 'Add New Doctor'}
            </button>
          )}
        </header>
        {/* Tabs & Search controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 border border-border-subtle rounded-xl shadow-sm">
          {/* Tabs with explicit active/inactive styles */}
          <div className="flex gap-2 p-1 bg-surface-container-low rounded-lg w-full sm:w-auto border border-border-subtle shadow-inner">
            <button
              onClick={() => {
                setActiveTab('doctors');
                setSearchQuery('');
                setStatusFilter('all');
              }}
              type="button"
              className={`flex-1 sm:flex-none px-5 py-2 text-xs font-black rounded-lg transition-all ${
                activeTab === 'doctors' 
                  ? 'bg-primary text-white shadow-md scale-[1.02]' 
                  : 'text-secondary hover:text-primary hover:bg-white/50'
              }`}
            >
              {isArabic ? 'الأطباء الممارسين' : 'Clinicians'}
            </button>
            <button
              onClick={() => {
                setActiveTab('orgs');
                setSearchQuery('');
                setStatusFilter('all');
              }}
              type="button"
              className={`flex-1 sm:flex-none px-5 py-2 text-xs font-black rounded-lg transition-all ${
                activeTab === 'orgs' 
                  ? 'bg-primary text-white shadow-md scale-[1.02]' 
                  : 'text-secondary hover:text-primary hover:bg-white/50'
              }`}
            >
              {isArabic ? 'المنظمات والشركاء' : 'Organizations'}
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <span className={`material-symbols-outlined absolute ${isArabic ? 'right-2.5' : 'left-2.5'} top-1/2 transform -translate-y-1/2 text-secondary text-lg`}>search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'doctors'
                    ? (isArabic ? 'ابحث عن اسم الطبيب...' : 'Search doctor name...')
                    : (isArabic ? 'ابحث عن المنظمة...' : 'Search organization...')
                }
                className={`w-full ${isArabic ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'} py-2 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary shadow-sm`}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className={`bg-white border border-border-subtle hover:bg-surface-container-low rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-secondary font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                activeFilterCount > 0 ? 'border-primary text-primary bg-primary-light/50' : ''
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span>{isArabic ? 'تصفية وترتيب' : 'Filters & Sort'}</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Main Tables Grid */}
        <div className="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
          {activeTab === 'doctors' ? (
            <table className={`min-w-full divide-y divide-border-subtle ${isArabic ? 'text-right' : 'text-left'}`}>
              <thead className="bg-bg-canvas">
                <tr>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'الطبيب' : 'Doctor'}</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'القسم' : 'Department'}</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'خطة الاشتراك' : 'Subscription Plan'}</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'الحالة' : 'Status'}</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'تاريخ الانضمام' : 'Join Date'}</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">
                    {isArabic ? 'الإجراء' : 'Action'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border-subtle text-xs">
                {filteredDoctors.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-secondary text-sm">
                      {isArabic ? 'لم يتم العثور على أطباء مطابقين' : 'No matching doctors found'}
                    </td>
                  </tr>
                ) : (
                  filteredDoctors.map((doc) => (
                    <tr key={doc.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold font-display-md shrink-0">
                            {doc.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex flex-col space-y-0.5 text-start">
                            <div className="font-bold text-on-surface text-xs leading-snug">{doc.name}</div>
                            <div className="text-xs text-secondary leading-snug">{doc.email}</div>
                            <div className="text-xs text-secondary leading-snug">{doc.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-secondary font-semibold">
                        {doc.department || (isArabic ? 'مستقل' : 'Independent')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-secondary">
                        <div className="flex flex-col space-y-0.5 text-start">
                          <div className="font-bold text-primary text-xs leading-snug">{getPlanLabel(doc.subscription_plan) || 'N/A'}</div>
                          {doc.subscription_expiry && (
                            <div className="text-xs text-secondary leading-snug">
                              {isArabic ? `ينتهي: ${doc.subscription_expiry}` : `Expires: ${doc.subscription_expiry}`}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          doc.is_active ? 'bg-primary-light text-primary' : 'bg-error-container text-error'
                        }`}>
                          {doc.is_active ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'معطل' : 'Disabled')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-secondary">
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                        <div className={`flex gap-2 ${isArabic ? 'justify-start' : 'justify-end'}`}>
                          <button
                            onClick={() => openEditDoctor(doc)}
                            className="px-3 py-1.5 bg-primary-light hover:bg-primary/20 text-primary rounded font-bold text-xs shadow-sm transition-colors"
                          >
                            {isArabic ? 'عرض التفاصيل والإدارة' : 'View Details & Manage'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className={`min-w-full divide-y divide-border-subtle ${isArabic ? 'text-right' : 'text-left'}`}>
              <thead className="bg-bg-canvas">
                <tr>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'المنظمة' : 'Organization'}</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'التخصص' : 'Specialty'}</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'إجمالي الأطباء' : 'Total Doctors'}</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'خطة الاشتراك' : 'Subscription Plan'}</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'تاريخ الإنشاء' : 'Created At'}</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'الحالة' : 'Status'}</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">
                    {isArabic ? 'الإجراء' : 'Action'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border-subtle text-xs">
                {filteredOrgs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-secondary text-sm">
                      {isArabic ? 'لم يتم العثور على منظمات مطابقة' : 'No matching organizations found'}
                    </td>
                  </tr>
                ) : (
                  filteredOrgs.map((org) => {
                    const assignedCount = doctors.filter(d => d.department_id === org.id).length;
                    return (
                      <tr key={org.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-0.5 text-start">
                            <div className="font-bold text-on-surface text-xs leading-snug">{org.name}</div>
                            <div className="text-xs text-secondary leading-snug">{org.email}</div>
                            <div className="text-xs text-secondary leading-snug">{org.phone}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-secondary font-semibold">
                          {getSpecialtyLabel(org.specialty, isArabic)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-secondary font-bold">
                          {assignedCount} {isArabic ? 'أطباء' : 'doctors'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-0.5 text-start">
                            <div className="font-bold text-primary text-xs leading-snug">{getPlanLabel(org.subscription_plan) || 'N/A'}</div>
                            {org.subscription_expiry && (
                              <div className="text-xs text-secondary leading-snug">
                                {isArabic ? `تنتهي: ${org.subscription_expiry}` : `Expires: ${org.subscription_expiry}`}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-secondary">
                          {new Date(org.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            org.is_active ? 'bg-primary-light text-primary' : 'bg-error-container text-error'
                          }`}>
                            {org.is_active ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'موقوف' : 'Suspended')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                          <div className={`flex gap-2 ${isArabic ? 'justify-start' : 'justify-end'}`}>
                            <button
                              onClick={() => openEditOrg(org)}
                              className="px-3 py-1.5 bg-primary-light hover:bg-primary/20 text-primary rounded font-bold text-xs shadow-sm transition-colors"
                            >
                              {isArabic ? 'عرض التفاصيل والإدارة' : 'View Details & Manage'}
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
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl border border-border-subtle shadow-lg max-w-md w-full overflow-hidden animate-fade-in">
              <div className={`px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas ${isArabic ? 'flex-row-reverse' : ''}`}>
                <h3 className="font-headline-md text-base text-primary font-bold">
                  {isArabic ? 'إضافة قسم طبي جديد' : 'Add Clinical Department'}
                </h3>
                <button 
                  onClick={() => setShowOrgModal(false)}
                  className="p-1 hover:bg-surface-container rounded-full text-secondary"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              
              <form onSubmit={handleAddOrgSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    {isArabic ? 'اسم المنظمة/العيادة *' : 'Organization Name *'}
                  </label>
                  <input
                    type="text" required value={orgName} onChange={(e) => setOrgName(e.target.value)}
                    placeholder={isArabic ? 'مثال: مركز النخبة للقلب' : 'e.g. Elite Cardiology Center'}
                    className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    {isArabic ? 'البريد الإلكتروني للاتصال *' : 'Contact Email *'}
                  </label>
                  <input
                    type="email" required value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)}
                    placeholder="e.g. contact@cairomed.com"
                    className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    {isArabic ? 'رقم الهاتف للاتصال *' : 'Contact Phone *'}
                  </label>
                  <input
                    type="text" required value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)}
                    placeholder="0501234567"
                    className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    {isArabic ? 'كلمة المرور *' : 'Password *'}
                  </label>
                  <input
                    type="password" required value={orgPassword} onChange={(e) => setOrgPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    {isArabic ? 'التخصص الطبي' : 'Medical Specialty'}
                  </label>
                  <select
                    value={orgSpecialty} onChange={(e) => setOrgSpecialty(e.target.value)}
                    className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                  >
                    {SPECIALTIES.map(spec => (
                      <option key={spec.val} value={spec.val}>{isArabic ? spec.ar : spec.val}</option>
                    ))}
                  </select>
                </div>

                <div className={`flex gap-3 mt-6 pt-4 border-t border-border-subtle ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <button
                    type="button" onClick={() => setShowOrgModal(false)}
                    className="flex-1 bg-white border border-border-subtle text-secondary font-button py-2 rounded-lg text-xs hover:bg-surface-container-low transition-colors font-semibold"
                  >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-button py-2 rounded-lg text-xs transition-colors shadow-sm font-semibold"
                  >
                    {isArabic ? 'حفظ القسم' : 'Save Department'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Doctor Modal */}
        {showDocModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl border border-border-subtle shadow-lg max-w-md w-full overflow-hidden animate-fade-in">
              <div className={`px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas ${isArabic ? 'flex-row-reverse' : ''}`}>
                <h3 className="font-headline-md text-base text-primary font-bold">
                  {isArabic ? 'إضافة طبيب سريري جديد' : 'Add Clinical Doctor'}
                </h3>
                <button 
                  onClick={() => setShowDocModal(false)}
                  className="p-1 hover:bg-surface-container rounded-full text-secondary"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              
              <form onSubmit={handleAddDocSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {error && (
                  <div className="bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    {isArabic ? 'اسم الطبيب *' : 'Doctor Name *'}
                  </label>
                  <input
                    type="text" required value={docName} onChange={(e) => setDocName(e.target.value)}
                    placeholder={isArabic ? 'د. أحمد حسن' : 'Dr. Ahmed Hassan'}
                    className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    {isArabic ? 'البريد الإلكتروني للاتصال *' : 'Contact Email *'}
                  </label>
                  <input
                    type="email" required value={docEmail} onChange={(e) => setDocEmail(e.target.value)}
                    placeholder="doctor@example.com"
                    className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    {isArabic ? 'رقم الهاتف للاتصال *' : 'Contact Phone *'}
                  </label>
                  <input
                    type="text" required value={docPhone} onChange={(e) => setDocPhone(e.target.value)}
                    placeholder="0501234567"
                    className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    {isArabic ? 'كلمة المرور *' : 'Password *'}
                  </label>
                  <input
                    type="password" required value={docPassword} onChange={(e) => setDocPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    {isArabic ? 'التخصص الطبي' : 'Medical Specialty'}
                  </label>
                  <select
                    value={docSpecialty} onChange={(e) => setDocSpecialty(e.target.value)}
                    className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                  >
                    {SPECIALTIES.map(spec => (
                      <option key={spec.val} value={spec.val}>{isArabic ? spec.ar : spec.val}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    {isArabic ? 'تعيين قسم طبي' : 'Assign Clinical Department'}
                  </label>
                  <select
                    value={docDept} onChange={(e) => setDocDept(e.target.value)}
                    className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                  >
                    <option value="">{isArabic ? 'بلا قسم (طبيب مستقل)' : 'None (Independent Doctor)'}</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>

                <div className={`flex gap-3 mt-6 pt-4 border-t border-border-subtle ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <button
                    type="button" onClick={() => setShowDocModal(false)}
                    className="flex-1 bg-white border border-border-subtle text-secondary font-button py-2 rounded-lg text-xs hover:bg-surface-container-low transition-colors font-semibold"
                  >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-button py-2 rounded-lg text-xs transition-colors shadow-sm font-semibold"
                  >
                    {isArabic ? 'حفظ الطبيب' : 'Save Doctor'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Details & Edit Organization Modal */}
        {editingOrg && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl border border-border-subtle shadow-lg max-w-md w-full overflow-hidden animate-fade-in">
              <div className={`px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas ${isArabic ? 'flex-row-reverse' : ''}`}>
                <h3 className="font-headline-md text-base text-primary font-bold">
                  {isEditMode
                    ? (isArabic ? 'تعديل المنظمة' : 'Edit Organization')
                    : (isArabic ? 'تفاصيل المنظمة' : 'Organization Details')}
                </h3>
                <button 
                  onClick={() => setEditingOrg(null)}
                  className="p-1 hover:bg-surface-container rounded-full text-secondary"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              
              {isEditMode ? (
                <form onSubmit={handleEditOrgSubmit} className="p-6 space-y-4 text-start">
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      {isArabic ? 'اسم المنظمة/العيادة *' : 'Organization Name *'}
                    </label>
                    <input
                      type="text" required value={editOrgName} onChange={(e) => setEditOrgName(e.target.value)}
                      className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      {isArabic ? 'البريد الإلكتروني للاتصال *' : 'Contact Email *'}
                    </label>
                    <input
                      type="email" required value={editOrgEmail} onChange={(e) => setEditOrgEmail(e.target.value)}
                      className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      {isArabic ? 'رقم الهاتف للاتصال *' : 'Contact Phone *'}
                    </label>
                    <input
                      type="text" required value={editOrgPhone} onChange={(e) => setEditOrgPhone(e.target.value)}
                      className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">{isArabic ? 'التخصص' : 'Specialty'}</label>
                      <select
                        value={editOrgSpecialty} onChange={(e) => setEditOrgSpecialty(e.target.value)}
                        className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                      >
                        {SPECIALTIES.map(spec => (
                          <option key={spec.val} value={spec.val}>{isArabic ? spec.ar : spec.val}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">{isArabic ? 'خطة الاشتراك' : 'Subscription Plan'}</label>
                      <select
                        value={editOrgPlan} onChange={(e) => setEditOrgPlan(e.target.value)}
                        className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                      >
                        <option value="Basic Access">{isArabic ? 'الوصول الأساسي' : 'Basic Access'}</option>
                        <option value="Trial Access">{isArabic ? 'الوصول التجريبي' : 'Trial Access'}</option>
                        <option value="Clinical Pro">{isArabic ? 'السريري المتقدم' : 'Clinical Pro'}</option>
                        <option value="Pro AI Suite">{isArabic ? 'باقة ذكاء اصطناعي برو' : 'Pro AI Suite'}</option>
                        <option value="Enterprise AI">{isArabic ? 'الذكاء الاصطناعي للمؤسسات' : 'Enterprise AI'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">{isArabic ? 'انتهاء الاشتراك' : 'Subscription Expiry'}</label>
                      <input
                        type="date" lang="en-US" required value={editOrgExpiry} onChange={(e) => setEditOrgExpiry(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">{isArabic ? 'الحالة' : 'Status'}</label>
                      <select
                        value={editOrgStatus} onChange={(e) => setEditOrgStatus(e.target.value)}
                        className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                      >
                        <option value="active">{isArabic ? 'نشط' : 'Active'}</option>
                        <option value="suspended">{isArabic ? 'موقوف' : 'Suspended'}</option>
                      </select>
                    </div>
                  </div>

                  <div className={`flex gap-3 mt-6 pt-4 border-t border-border-subtle ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <button
                      type="button" onClick={() => setIsEditMode(false)}
                      className="flex-1 bg-white border border-border-subtle text-secondary font-button py-2 rounded-lg text-xs hover:bg-surface-container-low transition-colors font-semibold"
                    >
                      {isArabic ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-button py-2 rounded-lg text-xs transition-colors shadow-sm font-semibold"
                    >
                      {isArabic ? 'حفظ التغييرات' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-6 space-y-6 text-xs text-secondary">
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                    <div>
                      <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'اسم المنظمة' : 'Organization Name'}</span>
                      <span className="text-sm font-bold text-on-surface">{editingOrg.name}</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'التخصص' : 'Specialty'}</span>
                      <span className="text-sm font-bold text-primary">{getSpecialtyLabel(editingOrg.specialty, isArabic)}</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'البريد الإلكتروني للاتصال' : 'Contact Email'}</span>
                      <span className="text-sm font-semibold text-on-surface">{editingOrg.email}</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'رقم الهاتف للاتصال' : 'Contact Phone'}</span>
                      <span className="text-sm font-semibold text-on-surface">{editingOrg.phone}</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'خطة الاشتراك' : 'Subscription Plan'}</span>
                      <span className="text-sm font-semibold text-primary">{getPlanLabel(editingOrg.subscription_plan)}</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'تاريخ الانتهاء' : 'Expiry Date'}</span>
                      <span className="text-sm font-semibold text-on-surface">{editingOrg.subscription_expiry}</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'الحالة' : 'Status'}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        editingOrg.is_active ? 'bg-primary-light text-primary' : 'bg-error-container text-error'
                      }`}>
                        {editingOrg.is_active ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'موقوف' : 'Suspended')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-6 border-t border-border-subtle mt-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditMode(true)}
                        className="flex-1 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-lg font-bold transition-colors shadow-sm text-center"
                      >
                        {isArabic ? 'تعديل الملف الشخصي' : 'Edit Profile'}
                      </button>
                      <button
                        onClick={async () => {
                          const res = await toggleOrgStatus(editingOrg.id);
                          if (res) {
                            setEditingOrg(prev => ({ ...prev, is_active: res.is_active }));
                          }
                        }}
                        className={`flex-1 py-2 rounded-lg font-bold transition-colors ${
                          editingOrg.is_active
                            ? 'bg-status-warning/10 hover:bg-status-warning/20 text-status-warning'
                            : 'bg-primary-light text-primary hover:bg-primary/20'
                        }`}
                      >
                        {editingOrg.is_active
                          ? (isArabic ? 'إيقاف المنظمة' : 'Suspend Org')
                          : (isArabic ? 'تفعيل المنظمة' : 'Activate Org')}
                      </button>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteOrg(editingOrg.id, editingOrg.name)}
                      className="w-full py-2 bg-error-container text-error hover:bg-error/10 rounded-lg font-bold transition-colors text-center"
                    >
                      {isArabic ? 'حذف المنظمة' : 'Delete Organization'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Details & Edit Doctor Modal */}
        {editingDoctor && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl border border-border-subtle shadow-lg max-w-md w-full overflow-hidden animate-fade-in">
              <div className={`px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas ${isArabic ? 'flex-row-reverse' : ''}`}>
                <h3 className="font-headline-md text-base text-primary font-bold">
                  {isEditMode
                    ? (isArabic ? 'تعديل ملف الطبيب' : 'Edit Doctor Profile')
                    : (isArabic ? 'تفاصيل ملف الطبيب' : 'Doctor Profile Details')}
                </h3>
                <button 
                  onClick={() => setEditingDoctor(null)}
                  className="p-1 hover:bg-surface-container rounded-full text-secondary"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              
              {isEditMode ? (
                <form onSubmit={handleEditDoctorSubmit} className="p-6 space-y-4 text-start">
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      {isArabic ? 'اسم الطبيب *' : 'Doctor Name *'}
                    </label>
                    <input
                      type="text" required value={editDocName} onChange={(e) => setEditDocName(e.target.value)}
                      className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      {isArabic ? 'البريد الإلكتروني للعيادة *' : 'Clinic Email *'}
                    </label>
                    <input
                      type="email" required value={editDocEmail} onChange={(e) => setEditDocEmail(e.target.value)}
                      className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      {isArabic ? 'رقم الهاتف للاتصال *' : 'Contact Phone *'}
                    </label>
                    <input
                      type="text" required value={editDocPhone} onChange={(e) => setEditDocPhone(e.target.value)}
                      className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">{isArabic ? 'القسم' : 'Department'}</label>
                      <input
                        type="text" value={editDocDept} onChange={(e) => setEditDocDept(e.target.value)}
                        className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">{isArabic ? 'خطة الاشتراك' : 'Subscription Plan'}</label>
                      <select
                        value={editDocPlan} onChange={(e) => setEditDocPlan(e.target.value)}
                        className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                      >
                        <option value="Basic Access">{isArabic ? 'الوصول الأساسي' : 'Basic Access'}</option>
                        <option value="Trial Access">{isArabic ? 'الوصول التجريبي' : 'Trial Access'}</option>
                        <option value="Clinical Pro">{isArabic ? 'السريري المتقدم' : 'Clinical Pro'}</option>
                        <option value="Pro AI Suite">{isArabic ? 'باقة ذكاء اصطناعي برو' : 'Pro AI Suite'}</option>
                        <option value="Enterprise AI">{isArabic ? 'الذكاء الاصطناعي للمؤسسات' : 'Enterprise AI'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">{isArabic ? 'انتهاء الاشتراك' : 'Subscription Expiry'}</label>
                      <input
                        type="date" lang="en-US" required value={editDocExpiry} onChange={(e) => setEditDocExpiry(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">{isArabic ? 'الحالة' : 'Status'}</label>
                      <select
                        value={editDocStatus} onChange={(e) => setEditDocStatus(e.target.value)}
                        className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                      >
                        <option value="approved">{isArabic ? 'نشط' : 'Active'}</option>
                        <option value="disabled">{isArabic ? 'موقوف' : 'Disabled'}</option>
                      </select>
                    </div>
                  </div>

                  <div className={`flex gap-3 mt-6 pt-4 border-t border-border-subtle ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <button
                      type="button" onClick={() => setIsEditMode(false)}
                      className="flex-1 bg-white border border-border-subtle text-secondary font-button py-2 rounded-lg text-xs hover:bg-surface-container-low transition-colors font-semibold"
                    >
                      {isArabic ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-button py-2 rounded-lg text-xs transition-colors shadow-sm font-semibold"
                    >
                      {isArabic ? 'حفظ التغييرات' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-6 space-y-6 text-xs text-secondary">
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                    <div>
                      <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'اسم الطبيب' : 'Doctor Name'}</span>
                      <span className="text-sm font-bold text-on-surface">{editingDoctor.name}</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'القسم' : 'Department'}</span>
                      <span className="text-sm font-bold text-primary">{editingDoctor.department || (isArabic ? 'مستقل' : 'Independent')}</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'البريد الإلكتروني للعيادة' : 'Clinic Email'}</span>
                      <span className="text-sm font-semibold text-on-surface">{editingDoctor.email}</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'رقم الهاتف للاتصال' : 'Contact Phone'}</span>
                      <span className="text-sm font-semibold text-on-surface">{editingDoctor.phone}</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'خطة الاشتراك' : 'Subscription Plan'}</span>
                      <span className="text-sm font-semibold text-primary">{getPlanLabel(editingDoctor.subscription_plan) || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'تاريخ الانتهاء' : 'Expiry Date'}</span>
                      <span className="text-sm font-semibold text-on-surface">{editingDoctor.subscription_expiry || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'الحالة' : 'Status'}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        editingDoctor.is_active ? 'bg-primary-light text-primary' : 'bg-error-container text-error'
                      }`}>
                        {editingDoctor.is_active ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'معطل' : 'Disabled')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-6 border-t border-border-subtle mt-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditMode(true)}
                        className="flex-1 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-lg font-bold transition-colors shadow-sm text-center"
                      >
                        {isArabic ? 'تعديل الملف الشخصي' : 'Edit Profile'}
                      </button>
                      <button
                        onClick={async () => {
                          const res = await toggleDoctorStatus(editingDoctor.id);
                          if (res) {
                            setEditingDoctor(prev => ({ ...prev, is_active: res.is_active }));
                          }
                        }}
                        className={`flex-1 py-2 rounded-lg font-bold transition-colors ${
                          editingDoctor.is_active
                            ? 'bg-status-warning/10 hover:bg-status-warning/20 text-status-warning'
                            : 'bg-primary-light text-primary hover:bg-primary/20'
                        }`}
                      >
                        {editingDoctor.is_active
                          ? (isArabic ? 'تعطيل حساب الطبيب' : 'Disable Doctor')
                          : (isArabic ? 'تفعيل حساب الطبيب' : 'Enable Doctor')}
                      </button>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteDoctor(editingDoctor.id, editingDoctor.name)}
                      className="w-full py-2 bg-error-container text-error hover:bg-error/10 rounded-lg font-bold transition-colors text-center"
                    >
                      {isArabic ? 'حذف حساب الطبيب نهائياً' : 'Delete Doctor Account'}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setConfirmModal(null)}>
          <div
            className="bg-white rounded-2xl border border-border-subtle shadow-2xl max-w-sm w-full overflow-hidden animate-fade-in text-center"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center mx-auto mb-4">
                <span className={`material-symbols-outlined text-3xl ${confirmModal.iconColor}`}>{confirmModal.icon}</span>
              </div>
              <h3 className="font-bold text-base text-on-surface mb-2">{confirmModal.title}</h3>
              <p className="text-xs text-secondary leading-relaxed">{confirmModal.description}</p>
            </div>

            {/* Divider */}
            <div className="h-px bg-border-subtle mx-6" />

            {/* Actions */}
            <div className="px-6 py-4 flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-border-subtle text-secondary font-semibold text-sm hover:bg-surface-container transition-colors"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm ${confirmModal.confirmClass}`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filter Popover Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setShowFilterModal(false)}>
          <div className="bg-white rounded-2xl border border-border-subtle shadow-2xl max-w-md w-full overflow-hidden animate-fade-in text-start" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas ${isArabic ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <span className="material-symbols-outlined text-primary text-[22px]">tune</span>
                <h3 className="font-bold text-base text-on-surface">
                  {isArabic ? 'تصفية وترتيب قائمة الأطباء' : 'Filter & Sort Doctors'}
                </h3>
              </div>
              <button
                onClick={() => setShowFilterModal(false)}
                className="p-1.5 hover:bg-surface-container rounded-full text-secondary transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-start">
              {/* 1. Department Filter */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  {isArabic ? 'القسم / التبعية' : 'Department / Affiliation'}
                </label>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className={`w-full bg-white border border-border-subtle rounded-xl text-xs py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary text-on-surface font-semibold ${isArabic ? 'text-right' : 'text-left'}`}
                >
                  <option value="all">{isArabic ? 'جميع الأقسام والأطباء المستقلين' : 'All Departments & Independent'}</option>
                  <option value="independent">{isArabic ? 'أطباء مستقلين فقط' : 'Independent Doctors Only'}</option>
                  {(organizations || []).map(org => (
                    <option key={org.id} value={org.name}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Account Status */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  {isArabic ? 'حالة الحساب' : 'Account Status'}
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`w-full bg-white border border-border-subtle rounded-xl text-xs py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary text-on-surface font-semibold ${isArabic ? 'text-right' : 'text-left'}`}
                >
                  <option value="all">{isArabic ? 'جميع الحالات' : 'All Statuses'}</option>
                  <option value="active">{isArabic ? 'حساب نشط فقط (Active)' : 'Active Only'}</option>
                  <option value="disabled">{isArabic ? 'حساب موقوف / معطل (Disabled)' : 'Suspended / Disabled Only'}</option>
                </select>
              </div>

              {/* 3. Subscription Expiry Sorting */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  {isArabic ? 'ترتيب حسب تاريخ انتهاء الاشتراك' : 'Sort by Subscription Expiry'}
                </label>
                <select
                  value={expirySort}
                  onChange={(e) => setExpirySort(e.target.value)}
                  className={`w-full bg-white border border-border-subtle rounded-xl text-xs py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary text-on-surface font-semibold ${isArabic ? 'text-right' : 'text-left'}`}
                >
                  <option value="default">{isArabic ? 'بدون ترتيب (الافتراضي)' : 'Default'}</option>
                  <option value="nearest">{isArabic ? 'الأقرب للانتهاء أولاً' : 'Nearest Expiry First'}</option>
                  <option value="furthest">{isArabic ? 'الأبعد للانتهاء أولاً' : 'Furthest Expiry First'}</option>
                </select>
              </div>

              {/* 4. Plan Filter */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  {isArabic ? 'باقة الاشتراك' : 'Subscription Plan'}
                </label>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className={`w-full bg-white border border-border-subtle rounded-xl text-xs py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary text-on-surface font-semibold ${isArabic ? 'text-right' : 'text-left'}`}
                >
                  <option value="all">{isArabic ? 'جميع الباقات' : 'All Plans'}</option>
                  <option value="starter">{isArabic ? 'Starter' : 'Starter'}</option>
                  <option value="pro">{isArabic ? 'Pro' : 'Pro'}</option>
                  <option value="business">{isArabic ? 'Business' : 'Business'}</option>
                  <option value="enterprise">{isArabic ? 'Enterprise' : 'Enterprise'}</option>
                  <option value="none">{isArabic ? 'بدون اشتراك (N/A)' : 'No Subscription (N/A)'}</option>
                </select>
              </div>

              {/* 5. Medical Specialty Filter */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  {isArabic ? 'التخصص السريري' : 'Medical Specialty'}
                </label>
                <select
                  value={specialtyFilter}
                  onChange={(e) => setSpecialtyFilter(e.target.value)}
                  className={`w-full bg-white border border-border-subtle rounded-xl text-xs py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary text-on-surface font-semibold ${isArabic ? 'text-right' : 'text-left'}`}
                >
                  <option value="all">{isArabic ? 'جميع التخصصات' : 'All Specialties'}</option>
                  {SPECIALTIES.map(spec => (
                    <option key={spec.val} value={spec.val}>
                      {isArabic ? `${spec.ar} (${spec.val})` : spec.val}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`px-6 py-4 border-t border-border-subtle bg-bg-canvas flex gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                onClick={() => resetFilters()}
                className="flex-1 bg-white border border-border-subtle text-secondary py-2 rounded-xl text-xs hover:bg-surface-container-low transition-colors font-semibold cursor-pointer"
              >
                {isArabic ? 'إعادة ضبط' : 'Reset All'}
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="flex-1 bg-primary hover:bg-primary-hover text-on-primary py-2 rounded-xl text-xs transition-colors shadow-sm font-semibold cursor-pointer"
              >
                {isArabic ? 'تطبيق الفلتر' : 'Apply Filters'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
