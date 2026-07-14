import React, { createContext, useState, useContext } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Current user (null by default so landing page is shown first)
  const [currentUser, setCurrentUser] = useState(null);

  // Mock Admin accounts
  const [admins, setAdmins] = useState([
    { id: "497e7f05-e931-4eb1-b51b-a29bc9b8583d", name: "Super Admin", email: "admin@medical-ai.com" }
  ]);

  // Mock Patients list
  const [patients, setPatients] = useState([
    {
      id: "afe06dbf-28f1-43aa-9e1b-d096dd713a84",
      name: "Eleanor Sullivan",
      phone: "01012345678",
      email: "eleanor@example.com",
      national_id: "29901012345678",
      date_of_birth: "1999-05-14",
      gender: "female"
    },
    {
      id: "bfe06dbf-28f1-43aa-9e1b-d096dd713a85",
      name: "Marcus Johnson",
      phone: "01123456789",
      email: "marcus@example.com",
      national_id: "29501012345678",
      date_of_birth: "1995-10-23",
      gender: "male"
    },
    {
      id: "cfe06dbf-28f1-43aa-9e1b-d096dd713a86",
      name: "Alice Patel",
      phone: "01234567890",
      email: "alice@example.com",
      national_id: "29001012345678",
      date_of_birth: "1990-12-05",
      gender: "female"
    }
  ]);

  // Mock Doctors list (including pending for admin approvals)
  const [doctors, setDoctors] = useState([
    {
      id: "afe06dbf-28f1-43aa-9e1b-d096dd713a84",
      name: "Dr. Ahmed Hassan",
      email: "doctor@example.com",
      phone: "01012345678",
      status: "approved",
      certificate_url: "/uploads/certificates/doctor_example_com.txt",
      created_at: "2026-07-11T15:43:17.545Z"
    },
    {
      id: "a3a2a1a0-b0c0-d0e0-f0a0-b0c0d0e0f0a0",
      name: "Dr. Julian Vance",
      email: "doctor2@example.com",
      phone: "01087654321",
      status: "approved",
      certificate_url: "/uploads/certificates/doctor2_example_com.txt",
      created_at: "2026-07-10T12:00:00.000Z"
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
    // Basic mock login
    if (role === 'admin') {
      const admin = admins.find(a => a.email === email);
      if (admin) {
        setCurrentUser({ ...admin, role: 'admin' });
        return true;
      }
    } else {
      const doc = doctors.find(d => d.email === email);
      if (doc) {
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
    // Register pending doctor
    const newDoc = {
      id: crypto.randomUUID(),
      name,
      email,
      phone,
      status: "approved",
      certificate_url: certificateFile ? URL.createObjectURL(certificateFile) : "/uploads/certificates/placeholder.txt",
      created_at: new Date().toISOString()
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
    // Check conflicts (same doctor, date, time)
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



  return (
    <AppContext.Provider value={{
      currentUser,
      patients,
      doctors,
      appointments,
      visits,
      login,
      logout,
      registerDoctor,
      addPatient,
      addAppointment,
      updateAppointmentStatus,
      addVisit
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
