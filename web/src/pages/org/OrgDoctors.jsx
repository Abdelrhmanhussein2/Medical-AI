import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';

export default function OrgDoctors() {
  const { currentUser, doctors, addOrgDoctor, toggleDoctorStatus, updateDoctor, deleteDoctor } = useApp();
  const { isArabic } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
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

  // Delete confirmation modal
  const [docToDelete, setDocToDelete] = useState(null);

  // All doctors in state are already scoped to this department
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

    if (!name || !email || !phone || !password) {
      setError(isArabic ? 'يرجى ملء جميع الحقول' : 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError(isArabic ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    try {
      await addOrgDoctor(name, email, phone, currentUser.id, currentUser.specialty, password);
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setShowAddModal(false);
    } catch (err) {
      setError(err.message || (isArabic ? 'فشل تعيين الطبيب' : 'Failed to assign doctor'));
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
    setDocToDelete(id);
  };

  const confirmDeleteDoctor = () => {
    if (docToDelete) {
      deleteDoctor(docToDelete);
      setDocToDelete(null);
      setSelectedDoctor(null);
    }
  };

  const getSpecialtyLabel = (spec) => {
    if (!isArabic) return spec;
    const map = {
      Cardiology: 'أمراض القلب',
      Neurology: 'الأعصاب',
      Pediatrics: 'طب الأطفال',
      Oncology: 'الأورام',
      'General Practice': 'الطب العام',
    };
    return map[spec] || spec;
  };

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
    <div className={`space-y-stack-lg font-body-md animate-fade-in ${isArabic ? 'text-right' : 'text-left'}`}>
      {/* Header */}
      <header className="flex justify-between items-center border-b border-border-subtle pb-4">
        <div>
          <h1 className="font-display-lg text-headline-lg text-on-surface font-bold">
            {isArabic ? 'قائمة الأطباء النشطين' : 'Active Doctors Roster'}
          </h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary hover:bg-primary-hover text-on-primary font-button text-xs py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm font-semibold cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          {isArabic ? 'تعيين طبيب' : 'Assign Doctor'}
        </button>
      </header>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-border-subtle py-4 px-6 rounded-xl shadow-sm flex items-center gap-4">
          <span className="material-symbols-outlined text-primary bg-primary-light p-2.5 rounded-xl text-xl">group</span>
          <div>
            <span className="text-xs text-secondary font-semibold block">{isArabic ? 'إجمالي الأطباء المعينين' : 'Total Assigned Doctors'}</span>
            <span className="text-lg font-bold text-on-surface">
              {totalAssigned} {isArabic ? 'أطباء' : 'doctors'}
            </span>
          </div>
        </div>
        
        <div className="bg-white border border-border-subtle py-4 px-6 rounded-xl shadow-sm flex items-center gap-4">
          <span className="material-symbols-outlined text-primary bg-primary-light p-2.5 rounded-xl text-xl">monitoring</span>
          <div>
            <span className="text-xs text-secondary font-semibold block">{isArabic ? 'متوسط استشارات الـ AI' : 'Avg AI Consults'}</span>
            <span className="text-lg font-bold text-on-surface">
              {avgConsults} {isArabic ? 'استشارة / شهرياً' : 'consults / mo'}
            </span>
          </div>
        </div>
      </div>

      {/* Doctors Table Card with integrated toolbar */}
      <div className="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
          <h3 className="font-bold text-sm text-on-surface">
            {isArabic ? 'قائمة الأطباء' : 'Doctors List'}
          </h3>
          <div className="relative w-full sm:w-72">
            <span className={`material-symbols-outlined absolute ${isArabic ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-secondary text-lg`}>search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isArabic ? 'البحث عن طبيب بالاسم أو البريد...' : 'Find doctor by name or email...'}
              className={`w-full ${isArabic ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'} py-2 bg-bg-canvas border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary`}
            />
          </div>
        </div>
        <table className={`min-w-full divide-y divide-border-subtle ${isArabic ? 'text-right' : 'text-left'}`}>
          <thead className="bg-bg-canvas">
            <tr>
              <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'الطبيب' : 'Doctor'}</th>
              <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'التخصص' : 'Specialization'}</th>
              <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'استشارات AI' : 'AI Consults'}</th>
              <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'التقارير' : 'Reports'}</th>
              <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'الاشتراك' : 'Subscription'}</th>
              <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'آخر نشاط' : 'Last Activity'}</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">{isArabic ? 'إجراءات' : 'Actions'}</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-border-subtle text-xs">
            {filteredDocs.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-secondary text-sm">
                  {isArabic ? 'لا يوجد أطباء معينين لهذا القسم' : 'No doctors assigned to this department'}
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`flex items-center gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold font-display-md">
                        {doc.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-bold text-on-surface text-xs">{doc.name}</div>
                        <div className="text-[10px] text-secondary">{doc.email}</div>
                        <div className="text-[10px] text-secondary">{doc.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-secondary font-semibold">
                    {getSpecialtyLabel(doc.specialization || doc.department)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-secondary font-bold text-sm">
                    {doc.ai_consults}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-secondary font-semibold">
                    {doc.reports} {isArabic ? 'تقارير' : 'reports'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      doc.is_active !== false
                        ? 'bg-primary-light text-primary' 
                        : 'bg-error-container text-error'
                    }`}>
                      {doc.is_active !== false ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'معطل' : 'Disabled')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-secondary">
                    {doc.last_login}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                    <div className={`flex ${isArabic ? 'justify-start' : 'justify-end'}`}>
                      <button
                        onClick={() => openDoctorDetails(doc)}
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
      </div>

      {/* Assign Doctor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-border-subtle shadow-lg max-w-md w-full overflow-hidden animate-fade-in">
            <div className={`px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas ${isArabic ? 'flex-row-reverse' : ''}`}>
              <h3 className="font-headline-md text-base text-primary font-bold">
                {isArabic ? 'تعيين طبيب ممارس' : 'Assign Existing Doctor'}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-surface-container rounded-full text-secondary"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddDoctorSubmit} className="p-6 space-y-4 text-start">
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
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder={isArabic ? 'د. أحمد حسن' : 'e.g. Dr. Ahmed Hassan'}
                  className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  {isArabic ? 'البريد الإلكتروني للعيادة *' : 'Clinic Email *'}
                </label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@example.com"
                  className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  {isArabic ? 'رقم الهاتف للاتصال *' : 'Contact Phone *'}
                </label>
                <input
                  type="text" required value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 01012345678"
                  className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  {isArabic ? 'تخصص القسم' : 'Department Specialty'}
                </label>
                <input
                  type="text" disabled value={getSpecialtyLabel(currentUser.specialty)}
                  className={`w-full px-3 py-2 bg-surface-container-low border border-border-subtle rounded-lg text-sm text-secondary cursor-not-allowed font-semibold ${isArabic ? 'text-right' : 'text-left'}`}
                />
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-3">
                <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">lock</span>
                  {isArabic ? 'بيانات دخول الطبيب — سيدخل بها على النظام' : 'Doctor Login Credentials — share with the doctor'}
                </p>
                <div>
                  <label className="block text-[10px] font-semibold text-secondary mb-1">
                    {isArabic ? 'البريد الإلكتروني' : 'Email (Login ID)'}
                  </label>
                  <input
                    type="text" disabled value={email || '—'}
                    className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-xs text-secondary font-semibold cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-secondary mb-1">
                    {isArabic ? 'كلمة المرور المؤقتة *' : 'Temporary Password *'}
                  </label>
                  <input
                    type="text" required value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder={isArabic ? 'مثال: clinic2025' : 'e.g. clinic2025'}
                    className="w-full px-3 py-2 bg-white border border-primary/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className={`flex gap-3 mt-6 pt-4 border-t border-border-subtle ${isArabic ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-white border border-border-subtle text-secondary font-button py-2 rounded-lg text-xs hover:bg-surface-container-low transition-colors font-semibold"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-button py-2 rounded-lg text-xs transition-colors shadow-sm font-semibold"
                >
                  {isArabic ? 'تعيين الطبيب' : 'Assign Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details & Edit Doctor Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-border-subtle shadow-lg max-w-md w-full overflow-hidden animate-fade-in">
            <div className={`px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas ${isArabic ? 'flex-row-reverse' : ''}`}>
              <h3 className="font-headline-md text-base text-primary font-bold">
                {isEditMode
                  ? (isArabic ? 'تعديل ملف الطبيب' : 'Edit Doctor Profile')
                  : (isArabic ? 'تفاصيل ملف الطبيب' : 'Doctor Profile Details')}
              </h3>
              <button 
                onClick={() => setSelectedDoctor(null)}
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
                      type="text" disabled value={getSpecialtyLabel(currentUser.specialty)}
                      className={`w-full px-3 py-2 bg-surface-container-low border border-border-subtle rounded-lg text-sm text-secondary cursor-not-allowed font-semibold ${isArabic ? 'text-right' : 'text-left'}`}
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
                      type="date" required value={editDocExpiry} onChange={(e) => setEditDocExpiry(e.target.value)}
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
                      <option value="disabled">{isArabic ? 'معطل' : 'Disabled'}</option>
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
              <div className="p-6 space-y-6 text-xs text-secondary text-start">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4">
                  <div>
                    <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'اسم الطبيب' : 'Doctor Name'}</span>
                    <span className="text-sm font-bold text-on-surface">{selectedDoctor.name}</span>
                  </div>
                  <div>
                    <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'القسم' : 'Department'}</span>
                    <span className="text-sm font-bold text-primary">{getSpecialtyLabel(currentUser.specialty) || (isArabic ? 'عام' : 'General')}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'البريد الإلكتروني للعيادة' : 'Clinic Email'}</span>
                    <span className="text-sm font-semibold text-on-surface break-all">{selectedDoctor.email}</span>
                  </div>
                  <div>
                    <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'رقم الهاتف للاتصال' : 'Contact Phone'}</span>
                    <span className="text-sm font-semibold text-on-surface">{selectedDoctor.phone}</span>
                  </div>
                  <div>
                    <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'خطة الاشتراك' : 'Subscription Plan'}</span>
                    <span className="text-sm font-semibold text-primary">{getPlanLabel(selectedDoctor.subscription_plan) || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'تاريخ الانتهاء' : 'Expiry Date'}</span>
                    <span className="text-sm font-semibold text-on-surface">{selectedDoctor.subscription_expiry || 'N/A'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="block font-semibold text-on-surface-variant mb-0.5">{isArabic ? 'الحالة' : 'Status'}</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize mt-1 ${
                      selectedDoctor.is_active !== false ? 'bg-primary-light text-primary' : 'bg-error-container text-error'
                    }`}>
                      {selectedDoctor.is_active !== false ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'معطل' : 'Disabled')}
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
                      onClick={() => {
                        toggleDoctorStatus(selectedDoctor.id);
                        setSelectedDoctor(null);
                      }}
                      className={`flex-1 py-2 rounded-lg font-bold transition-colors ${
                        selectedDoctor.is_active !== false
                          ? 'bg-status-warning/10 hover:bg-status-warning/20 text-status-warning'
                          : 'bg-primary-light text-primary hover:bg-primary/20'
                      }`}
                    >
                      {selectedDoctor.is_active !== false
                        ? (isArabic ? 'تعطيل الطبيب' : 'Disable Doctor')
                        : (isArabic ? 'تفعيل الطبيب' : 'Enable Doctor')}
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteDoctor(selectedDoctor.id)}
                    className="w-full py-2 bg-error-container text-error hover:bg-error/10 rounded-lg font-bold transition-colors text-center"
                  >
                    {isArabic ? 'إزالة الطبيب من القسم' : 'Remove Doctor from Department'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {docToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle max-w-sm w-full p-6 text-center transform scale-100 animate-fade-in">
            <div className="w-16 h-16 bg-error-container/50 text-error rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[32px]">warning</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-2">
              {isArabic ? 'إزالة الطبيب؟' : 'Remove Doctor?'}
            </h3>
            <p className="text-sm text-on-surface-variant mb-6">
              {isArabic
                ? 'هل أنت متأكد من رغبتك في إزالة هذا الطبيب من القسم؟ لا يمكن التراجع عن هذا الإجراء وسيتم إلغاء صلاحية وصوله على الفور.'
                : 'Are you sure you want to remove this doctor from your department? This action cannot be undone and will revoke their access immediately.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDocToDelete(null)}
                className="flex-1 px-4 py-2 bg-surface-container-low text-secondary font-bold text-sm rounded-lg hover:bg-surface-container transition-colors"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={confirmDeleteDoctor}
                className="flex-1 px-4 py-2 bg-error text-white font-bold text-sm rounded-lg hover:bg-error-hover transition-colors shadow-sm"
              >
                {isArabic ? 'نعم، إزالة' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
