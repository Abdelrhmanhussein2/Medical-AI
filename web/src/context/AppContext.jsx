import React, { createContext, useState, useContext } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Current user (null by default so landing page is shown first)
  const [currentUser, setCurrentUser] = useState(null);

  // Mock Admin accounts
  const [admins] = useState([
    { id: "497e7f05-e931-4eb1-b51b-a29bc9b8583d", name: "Super Admin", email: "admin@medical-ai.com" }
  ]);

  // Mock Patients list
  const [patients, setPatients] = useState([
    {
      id: "afe06dbf-28f1-43aa-9e1b-d096dd713a84",
      name: "Eleanor Sullivan",
      phone: "01012345678",
      email: "eleanor@example.com",
      date_of_birth: "1999-05-14",
      gender: "female"
    },
    {
      id: "bfe06dbf-28f1-43aa-9e1b-d096dd713a85",
      name: "Marcus Johnson",
      phone: "01123456789",
      email: "marcus@example.com",
      date_of_birth: "1995-10-23",
      gender: "male"
    },
    {
      id: "cfe06dbf-28f1-43aa-9e1b-d096dd713a86",
      name: "Alice Patel",
      phone: "01234567890",
      email: "alice@example.com",
      date_of_birth: "1990-12-05",
      gender: "female"
    }
  ]);

  // Mock Organizations list
  const [organizations, setOrganizations] = useState([
    {
      id: "org-1",
      name: "Cardiology Specialists Group",
      email: "org@cardiology.com",
      phone: "01035377752",
      specialty: "Cardiology",
      status: "active",
      subscription_plan: "Pro AI Suite",
      subscription_expiry: "2026-12-31",
      created_at: "2026-05-01T08:00:00Z"
    },
    {
      id: "org-2",
      name: "Cairo Neurology Center",
      email: "org@neurology.com",
      phone: "01123456789",
      specialty: "Neurology",
      status: "active",
      subscription_plan: "Enterprise AI",
      subscription_expiry: "2026-10-15",
      created_at: "2026-06-12T10:30:00Z"
    },
    {
      id: "org-3",
      name: "Pediatrics Clinic North",
      email: "org@pediatrics.com",
      phone: "01234567890",
      specialty: "Pediatrics",
      status: "suspended",
      subscription_plan: "Basic Access",
      subscription_expiry: "2026-08-01",
      created_at: "2026-04-20T09:00:00Z"
    }
  ]);

  // Mock Doctors list with org assignments and stats
  const [doctors, setDoctors] = useState([
    {
      id: "afe06dbf-28f1-43aa-9e1b-d096dd713a84",
      name: "Dr. Ahmed Hassan",
      email: "doctor@example.com",
      phone: "01012345678",
      status: "approved",
      certificate_url: "/uploads/certificates/doctor_example_com.txt",
      created_at: "2026-07-11T15:43:17.545Z",
      department: "Cardiology",
      subscription_plan: "Pro AI Suite",
      subscription_expiry: "2026-12-31",
      ai_consults: 214,
      reports: 86,
      last_login: "Today, 08:42 AM",
      org_id: "org-1"
    },
    {
      id: "a3a2a1a0-b0c0-d0e0-f0a0-b0c0d0e0f0a0",
      name: "Dr. Julian Vance",
      email: "doctor2@example.com",
      phone: "01087654321",
      status: "approved",
      certificate_url: "/uploads/certificates/doctor2_example_com.txt",
      created_at: "2026-07-10T12:00:00.000Z",
      department: "Cardiology",
      subscription_plan: "Pro AI Suite",
      subscription_expiry: "2026-08-10",
      ai_consults: 156,
      reports: 42,
      last_login: "Yesterday, 02:20 PM",
      org_id: "org-1"
    },
    {
      id: "doc-3",
      name: "Dr. Emily Rostova",
      email: "emily@example.com",
      phone: "01234567890",
      status: "disabled",
      certificate_url: "/uploads/certificates/emily.txt",
      created_at: "2026-07-08T09:00:00.000Z",
      department: "Cardiology",
      subscription_plan: "Standard Tier",
      subscription_expiry: "2026-07-12",
      ai_consults: 80,
      reports: 12,
      last_login: "3 days ago",
      org_id: "org-1"
    }
  ]);

  // Mock Subscriptions
  const [subscriptions, setSubscriptions] = useState([
    {
      id: "sub-1",
      entity_id: "org-1",
      entity_name: "Cardiology Specialists Group",
      entity_type: "org",
      plan_name: "Pro AI Suite",
      status: "active",
      start_date: "2026-05-01",
      expiry_date: "2026-12-31",
      days_remaining: 170,
      payment_status: "paid",
      monthly_cost: 1200
    },
    {
      id: "sub-2",
      entity_id: "org-2",
      entity_name: "Cairo Neurology Center",
      entity_type: "org",
      plan_name: "Enterprise AI",
      status: "active",
      start_date: "2026-06-12",
      expiry_date: "2026-10-15",
      days_remaining: 93,
      payment_status: "paid",
      monthly_cost: 2500
    },
    {
      id: "sub-3",
      entity_id: "org-3",
      entity_name: "Pediatrics Clinic North",
      entity_type: "org",
      plan_name: "Basic Access",
      status: "expired",
      start_date: "2026-04-20",
      expiry_date: "2026-08-01",
      days_remaining: 0,
      payment_status: "overdue",
      monthly_cost: 300
    },
    {
      id: "sub-4",
      entity_id: "afe06dbf-28f1-43aa-9e1b-d096dd713a84",
      entity_name: "Dr. Ahmed Hassan",
      entity_type: "doctor",
      plan_name: "Clinical Pro",
      status: "active",
      start_date: "2026-07-11",
      expiry_date: "2026-10-11",
      days_remaining: 88,
      payment_status: "paid",
      monthly_cost: 150
    },
    {
      id: "sub-5",
      entity_id: "a3a2a1a0-b0c0-d0e0-f0a0-b0c0d0e0f0a0",
      entity_name: "Dr. Julian Vance",
      entity_type: "doctor",
      plan_name: "Pro AI Suite",
      status: "expiring",
      start_date: "2026-07-10",
      expiry_date: "2026-08-10",
      days_remaining: 14,
      payment_status: "pending",
      monthly_cost: 1200
    }
  ]);

  // Mock Appointments list
  const [appointments, setAppointments] = useState([
    {
      id: "11111111-2222-3333-4444-555555555555",
      doctor_id: "a3a2a1a0-b0c0-d0e0-f0a0-b0c0d0e0f0a0",
      patient_id: "afe06dbf-28f1-43aa-9e1b-d096dd713a84",
      appointment_date: "2026-07-15",
      appointment_time: "10:30:00",
      duration_minutes: 30,
      status: "scheduled", // scheduled, confirmed, completed, cancelled, no_show
      description: "Follow-up",
      patient_phone: "01012345678"
    },
    {
      id: "22222222-2222-3333-4444-555555555555",
      doctor_id: "a3a2a1a0-b0c0-d0e0-f0a0-b0c0d0e0f0a0",
      patient_id: "bfe06dbf-28f1-43aa-9e1b-d096dd713a85",
      appointment_date: "2026-07-15",
      appointment_time: "11:15:00",
      duration_minutes: 30,
      status: "scheduled",
      description: "Initial Consult",
      patient_phone: "01123456789"
    },
    {
      id: "33333333-2222-3333-4444-555555555555",
      doctor_id: "a3a2a1a0-b0c0-d0e0-f0a0-b0c0d0e0f0a0",
      patient_id: "cfe06dbf-28f1-43aa-9e1b-d096dd713a86",
      appointment_date: "2026-07-15",
      appointment_time: "13:00:00",
      duration_minutes: 30,
      status: "confirmed",
      description: "Post-Op Review",
      patient_phone: "01234567890",
      is_high_priority: true
    }
  ]);

  // Mock Visit summaries
  const [visits, setVisits] = useState([
    {
      id: "1319cb7f-3da9-4815-adcb-8aee5e6fdbb0",
      patient_id: "afe06dbf-28f1-43aa-9e1b-d096dd713a84",
      doctor_id: "a3a2a1a0-b0c0-d0e0-f0a0-b0c0d0e0f0a0",
      appointment_id: "11111111-2222-3333-4444-555555555555",
      visit_date: "2026-07-11",
      description: "Patient complains of constant headache for 3 days",
      diagnosis: "Tension Headache",
      notes: "Prescribed painkillers, suggested absolute rest for 2 days.",
      created_at: "2026-07-11T16:00:00.000Z",
      updated_at: "2026-07-11T16:00:00.000Z"
    }
  ]);

  // Actions
  const login = (email, password, role) => {
    if (role === 'admin') {
      const admin = admins.find(a => a.email === email);
      if (admin) {
        setCurrentUser({ ...admin, role: 'admin' });
        return true;
      }
    } else if (role === 'org') {
      const org = organizations.find(o => o.email === email);
      if (org) {
        if (org.status === 'suspended') {
          throw new Error("هذا حساب الإدارة معلق حالياً من قِبل المسؤول");
        }
        setCurrentUser({ ...org, role: 'org' });
        return true;
      }
    } else {
      const doc = doctors.find(d => d.email === email);
      if (doc) {
        if (doc.status === 'disabled') {
          throw new Error("هذا الحساب معطل حالياً من قبل الإدارة");
        }
        setCurrentUser({ ...doc, role: 'doctor' });
        return true;
      }
    }
    throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const registerDoctor = (name, email, phone, password, certificateFile) => {
    const newDoc = {
      id: crypto.randomUUID(),
      name,
      email,
      phone,
      status: "approved", // Doctors auto-approve now based on new admin instructions
      certificate_url: certificateFile ? URL.createObjectURL(certificateFile) : "/uploads/certificates/placeholder.txt",
      created_at: new Date().toISOString(),
      department: "General",
      subscription_plan: "Trial Access",
      subscription_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ai_consults: 0,
      reports: 0,
      last_login: "Never",
      org_id: null
    };
    setDoctors(prev => [...prev, newDoc]);
    return newDoc;
  };

  const registerOrg = (name, email, phone, specialty) => {
    const newOrg = {
      id: crypto.randomUUID(),
      name,
      email,
      phone,
      specialty,
      status: "active",
      subscription_plan: "Trial Access",
      subscription_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };
    setOrganizations(prev => [...prev, newOrg]);

    const newSub = {
      id: crypto.randomUUID(),
      entity_id: newOrg.id,
      entity_name: newOrg.name,
      entity_type: "org",
      plan_name: "Trial Access",
      status: "active",
      start_date: newOrg.created_at.split('T')[0],
      expiry_date: newOrg.subscription_expiry,
      days_remaining: 30,
      payment_status: "paid",
      monthly_cost: 0
    };
    setSubscriptions(prev => [...prev, newSub]);
    return newOrg;
  };

  const toggleDoctorStatus = (id) => {
    setDoctors(prev => prev.map(d => {
      if (d.id === id) {
        const newStatus = d.status === 'approved' ? 'disabled' : 'approved';
        return { ...d, status: newStatus };
      }
      return d;
    }));
  };

  const toggleOrgStatus = (id) => {
    setOrganizations(prev => prev.map(o => {
      if (o.id === id) {
        const newStatus = o.status === 'active' ? 'suspended' : 'active';
        return { ...o, status: newStatus };
      }
      return o;
    }));
  };

  const renewSubscription = (subId) => {
    setSubscriptions(prev => prev.map(s => {
      if (s.id === subId) {
        const oldExpiry = new Date(s.expiry_date);
        const newExpiry = new Date(oldExpiry.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        return {
          ...s,
          status: 'active',
          expiry_date: newExpiry,
          days_remaining: s.days_remaining + 30,
          payment_status: 'paid'
        };
      }
      return s;
    }));
  };

  const addOrgDoctor = (name, email, phone, orgId, specialty) => {
    const newDoc = {
      id: crypto.randomUUID(),
      name,
      email,
      phone,
      status: "approved",
      certificate_url: "/uploads/certificates/org_assigned.txt",
      created_at: new Date().toISOString(),
      department: specialty,
      subscription_plan: "Pro AI Suite",
      subscription_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ai_consults: 0,
      reports: 0,
      last_login: "Never",
      org_id: orgId
    };
    setDoctors(prev => [...prev, newDoc]);
    return newDoc;
  };

  const addPatient = (patientData) => {
    const newPatient = {
      id: crypto.randomUUID(),
      ...patientData
    };
    setPatients(prev => [...prev, newPatient]);
    return newPatient;
  };

  const addAppointment = (apptData) => {
    const conflict = appointments.find(
      a => a.doctor_id === apptData.doctor_id &&
           a.appointment_date === apptData.appointment_date &&
           a.appointment_time === apptData.appointment_time
    );

    if (conflict) {
      throw new Error("هذا الوقت محجوز بالفعل لدى الطبيب");
    }

    const newAppt = {
      id: crypto.randomUUID(),
      ...apptData,
      status: "scheduled"
    };
    setAppointments(prev => [...prev, newAppt]);
    return newAppt;
  };

  const updateAppointmentStatus = (id, newStatus) => {
    setAppointments(prev =>
      prev.map(a => a.id === id ? { ...a, status: newStatus } : a)
    );
  };

  const addVisit = (visitData) => {
    const newVisit = {
      id: crypto.randomUUID(),
      visit_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...visitData
    };
    setVisits(prev => [...prev, newVisit]);
    return newVisit;
  };

  const updateDoctor = (id, updatedFields) => {
    setDoctors(prev => prev.map(d => d.id === id ? { ...d, ...updatedFields } : d));
  };

  const updateOrg = (id, updatedFields) => {
    setOrganizations(prev => prev.map(o => o.id === id ? { ...o, ...updatedFields } : o));
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
      deleteOrg
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);

