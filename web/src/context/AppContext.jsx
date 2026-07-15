import React, { createContext, useState, useContext, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [visits, setVisits] = useState([]);

  // Load user from local storage on mount
  useEffect(() => {
    const userJson = localStorage.getItem("currentUser");
    if (userJson) {
      try {
        setCurrentUser(JSON.parse(userJson));
      } catch (e) {
        console.error("Failed to parse user from local storage", e);
      }
    }
  }, []);

  // Generic API fetch helper
  const apiFetch = async (url, options = {}) => {
    const token = localStorage.getItem("accessToken");
    const headers = {
      ...options.headers,
    };
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`/api/v1${url}`, {
      ...options,
      headers
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      let errorMessage = 'An error occurred';
      if (Array.isArray(err.detail)) {
        errorMessage = err.detail.map(e => `${e.loc ? e.loc[e.loc.length - 1] : ''}: ${e.msg}`).join(', ');
      } else if (err.detail) {
        errorMessage = err.detail;
      }
      throw new Error(errorMessage);
    }
    // Return null if 204 No Content
    if (response.status === 204) return null;
    return response.json();
  };

  // Fetch data based on logged in user
  useEffect(() => {
    if (currentUser) {
      const loadData = async () => {
        try {
          if (currentUser.role === 'org' || currentUser.role === 'department') {
            const docs = await apiFetch(`/departments/${currentUser.id}/doctors`);
            setDoctors(docs || []);
          } else if (currentUser.role === 'admin') {
            const stats = await apiFetch(`/admins/dashboard/stats`);
            const orgs = (stats.departments_breakdown || []).map(item => ({
              id: item.department.id,
              name: item.department.name,
              email: item.department.email,
              phone: item.department.phone || '01012345678',
              specialty: item.department.specialty || 'General Medicine',
              subscription_plan: item.department.subscription_plan || 'Pro AI Suite',
              subscription_expiry: item.department.subscription_expiry || '2026-12-31',
              status: item.department.status || 'active',
              created_at: item.department.created_at
            }));
            setOrganizations(orgs);

            const docs = await apiFetch(`/admins/doctors`);
            setDoctors(docs || []);
          } else if (currentUser.role === 'doctor') {
            const appts = await apiFetch(`/appointments/my?doctor_id=${currentUser.id}`);
            setAppointments(appts || []);
            // Patients usually come from appointments in this system or a separate endpoint
            const pts = await apiFetch(`/patients/`);
            setPatients(pts || []);
          }
        } catch (err) {
          console.error("Failed to load initial data", err);
        }
      };
      loadData();
    }
  }, [currentUser]);

  // Actions
  const login = async (email, password, role) => {
    try {
      const backendRole = role === 'org' ? 'department' : role;
      const res = await apiFetch(`/auth/login?role=${backendRole}`, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (res.user && res.user.role === 'department') {
        res.user.role = 'org';
      }
      localStorage.setItem("accessToken", res.access_token);
      localStorage.setItem("currentUser", JSON.stringify(res.user));
      setCurrentUser(res.user);
      return true;
    } catch (err) {
      throw new Error(err.message || "البريد الإلكتروني أو كلمة المرور غير صحيحة");
    }
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
  };

  const registerDoctor = async (name, email, phone, password, specialization = 'General', departmentId = null, status = 'approved', certificateFile = null) => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('password', password);
    formData.append('specialization', specialization);
    if (departmentId) {
      formData.append('department_id', departmentId);
    } else if (currentUser?.role === 'department') {
      formData.append('department_id', currentUser.id);
    }
    if (status) {
      formData.append('status', status);
    }
    if (certificateFile) {
      formData.append('certificate_file', certificateFile);
    }

    const newDoc = await apiFetch(`/doctors/register`, {
      method: 'POST',
      body: formData
    });
    setDoctors(prev => [newDoc, ...prev]);
    return newDoc;
  };

  const registerOrg = async (name, email, phone, specialty, password) => {
    const newOrg = await apiFetch(`/departments/`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password: password || "defaultpassword123"
      })
    });
    const mappedOrg = {
      id: newOrg.id,
      name: newOrg.name,
      email: newOrg.email,
      phone: phone || '01012345678',
      specialty: specialty || 'General Medicine',
      subscription_plan: 'Pro AI Suite',
      subscription_expiry: '2026-12-31',
      status: 'active',
      created_at: newOrg.created_at
    };
    setOrganizations(prev => [mappedOrg, ...prev]);
    return mappedOrg;
  };

  const addPatient = async (patientData) => {
    const newPatient = await apiFetch(`/patients/`, {
      method: 'POST',
      body: JSON.stringify(patientData)
    });
    setPatients(prev => [newPatient, ...prev]);
    return newPatient;
  };

  const addAppointment = async (apptData) => {
    const newAppt = await apiFetch(`/appointments/`, {
      method: 'POST',
      body: JSON.stringify(apptData)
    });
    setAppointments(prev => [newAppt, ...prev]);
    return newAppt;
  };

  const updateAppointmentStatus = async (id, newStatus) => {
    const updated = await apiFetch(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    setAppointments(prev =>
      prev.map(a => a.id === id ? updated : a)
    );
  };

  const addVisit = async (visitData) => {
    const newVisit = await apiFetch(`/visits/`, {
      method: 'POST',
      body: JSON.stringify(visitData)
    });
    setVisits(prev => [newVisit, ...prev]);
    return newVisit;
  };

  // Remaining mock toggle functions (if backend doesn't support them yet)
  const toggleDoctorStatus = (id) => {
    setDoctors(prev => prev.map(d => {
      if (d.id === id) {
        return { ...d, status: d.status === 'approved' ? 'disabled' : 'approved' };
      }
      return d;
    }));
  };

  const toggleOrgStatus = (id) => {
    setOrganizations(prev => prev.map(o => {
      if (o.id === id) {
        return { ...o, status: o.status === 'active' ? 'suspended' : 'active' };
      }
      return o;
    }));
  };

  const renewSubscription = (subId) => {
    console.log("Mock renew sub:", subId);
  };

  const addOrgDoctor = async (name, email, phone, orgId, specialty) => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('password', "defaultpassword123");
    formData.append('specialization', specialty || "General");
    formData.append('department_id', orgId);
    formData.append('status', 'pending');

    const newDoc = await apiFetch(`/doctors/register`, {
      method: 'POST',
      body: formData
    });
    setDoctors(prev => [newDoc, ...prev]);
    return newDoc;
  };

  const updateDoctor = (id, updatedFields) => {
    setDoctors(prev => prev.map(d => d.id === id ? { ...d, ...updatedFields } : d));
  };

  const updateOrg = (id, updatedFields) => {
    setOrganizations(prev => prev.map(o => o.id === id ? { ...o, ...updatedFields } : o));
  };

  const activateSubscription = async (doctorId, plan, expiryDate) => {
    const updated = await apiFetch(`/doctors/${doctorId}/activate-subscription`, {
      method: 'PATCH',
      body: JSON.stringify({ subscription_plan: plan, subscription_expiry: expiryDate })
    });
    setDoctors(prev => prev.map(d => d.id === doctorId ? { ...d, ...updated } : d));
    return updated;
  };

  const deleteDoctor = (id) => {
    setDoctors(prev => prev.filter(d => d.id !== id));
  };

  const deleteOrg = (id) => {
    setOrganizations(prev => prev.filter(o => o.id !== id));
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      patients,
      doctors,
      organizations,
      subscriptions,
      appointments,
      visits,
      login,
      logout,
      registerDoctor,
      registerOrg,
      toggleDoctorStatus,
      toggleOrgStatus,
      renewSubscription,
      addOrgDoctor,
      addPatient,
      addAppointment,
      updateAppointmentStatus,
      addVisit,
      updateDoctor,
      updateOrg,
      deleteDoctor,
      deleteOrg,
      activateSubscription
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
