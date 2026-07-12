import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function Admin() {
  const { doctors, approveDoctor, rejectDoctor } = useApp();
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingDocId, setRejectingDocId] = useState(null);
  const [viewingCertificateDoc, setViewingCertificateDoc] = useState(null);

  const pendingDocs = doctors.filter(d => d.status === 'pending');
  const allDocs = doctors.filter(d => d.status !== 'pending');

  const handleApprove = (id) => {
    approveDoctor(id);
    if (viewingCertificateDoc && viewingCertificateDoc.id === id) {
      setViewingCertificateDoc(null);
    }
  };

  const handleRejectSubmit = (e) => {
    e.preventDefault();
    if (!rejectionReason) return;
    rejectDoctor(rejectingDocId, rejectionReason);
    setRejectionReason('');
    setRejectingDocId(null);
    setViewingCertificateDoc(null);
  };

  return (
    <div>
      {/* Header */}
      <header class="flex justify-between items-end mb-stack-lg border-b border-border-subtle pb-stack-md">
        <div>
          <h1 class="font-display-lg text-headline-lg text-on-surface font-bold">Admin Control Center</h1>
          <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">Review and approve new clinical registrations.</p>
        </div>
      </header>

      {/* Grid: Pending Review */}
      <div class="space-y-6 mb-12">
        <h3 class="font-headline-md text-base text-primary font-bold">
          Pending Applications ({pendingDocs.length})
        </h3>
        
        {pendingDocs.length === 0 ? (
          <div class="bg-white rounded-xl border border-border-subtle p-8 text-center text-secondary text-sm">
            لا توجد طلبات معلقة بانتظار المراجعة
          </div>
        ) : (
          <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            {pendingDocs.map((doc) => (
              <div key={doc.id} class="bg-white rounded-xl border border-border-subtle p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div class="flex justify-between items-start mb-4">
                    <div>
                      <h4 class="font-button text-sm text-on-surface font-bold">{doc.name}</h4>
                      <p class="text-xs text-secondary mt-0.5">{doc.email}</p>
                      <p class="text-xs text-secondary mt-0.5">{doc.phone}</p>
                    </div>
                    <span class="px-2 py-0.5 bg-status-warning/10 text-status-warning font-label-caps text-[10px] rounded-full font-bold">
                      Pending Review
                    </span>
                  </div>

                  <div class="my-4 p-3 bg-bg-canvas rounded-lg border border-border-subtle flex items-center gap-2">
                    <span class="material-symbols-outlined text-[18px] text-primary">
                      file_present
                    </span>
                    <button 
                      type="button"
                      onClick={() => setViewingCertificateDoc(doc)}
                      class="text-xs text-primary hover:underline font-semibold text-left"
                    >
                      View Medical Certificate / ID
                    </button>
                  </div>
                </div>

                <div class="flex gap-2 mt-4 pt-4 border-t border-border-subtle">
                  <button
                    onClick={() => handleApprove(doc.id)}
                    class="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-button py-2 rounded-lg text-xs transition-colors shadow-sm font-semibold"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setRejectingDocId(doc.id)}
                    class="flex-1 bg-white border border-border-subtle text-error font-button py-2 rounded-lg text-xs hover:bg-error-container/20 transition-colors font-semibold"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved/Rejected Doctors Directory */}
      <div class="space-y-6">
        <h3 class="font-headline-md text-base text-primary font-bold">
          Doctors Registry
        </h3>

        <div class="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
          <table class="min-w-full divide-y divide-border-subtle">
            <thead class="bg-bg-canvas">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Doctor</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Phone</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Created At</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-border-subtle">
              {allDocs.map((doc) => (
                <tr key={doc.id} class="hover:bg-surface-container-low transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-on-surface">{doc.name}</div>
                    <div class="text-xs text-secondary">{doc.email}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                    {doc.phone}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary text-xs">
                    {new Date(doc.created_at).toLocaleString()}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      doc.status === 'approved' 
                        ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant' 
                        : 'bg-error-container text-error'
                    }`}>
                      {doc.status}
                    </span>
                    {doc.status === 'rejected' && doc.rejection_reason && (
                      <div class="text-[10px] text-error mt-0.5 font-semibold">Reason: {doc.rejection_reason}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Certificate Viewer Modal */}
      {viewingCertificateDoc && (
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl border border-border-subtle shadow-lg max-w-lg w-full overflow-hidden">
            <div class="px-6 py-4 border-b border-border-subtle bg-bg-canvas flex justify-between items-center">
              <h4 class="font-headline-md text-base text-primary font-bold">Certification Document</h4>
              <button 
                onClick={() => setViewingCertificateDoc(null)}
                class="p-1 hover:bg-surface-container rounded-full text-secondary"
              >
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div class="p-6 space-y-6">
              <div class="p-6 bg-gradient-to-tr from-primary-light to-white border-2 border-primary/20 rounded-xl relative overflow-hidden shadow-sm">
                <div class="absolute -right-8 -bottom-8 w-24 h-24 bg-primary/5 rounded-full blur-xl"></div>
                <div class="flex justify-between items-start mb-6">
                  <div>
                    <h5 class="text-xs font-black text-primary font-label-caps tracking-wider">MINISTRY OF HEALTH LICENSE</h5>
                    <p class="text-[10px] text-secondary mt-0.5">Verification Ref: #MD-2026-9921</p>
                  </div>
                  <span class="material-symbols-outlined text-primary text-3xl">local_hospital</span>
                </div>
                
                <div class="space-y-4">
                  <div>
                    <span class="text-[10px] text-secondary block font-semibold uppercase">Practitioner Name</span>
                    <span class="text-sm font-bold text-on-surface">{viewingCertificateDoc.name}</span>
                  </div>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <span class="text-[10px] text-secondary block font-semibold uppercase">Contact Phone</span>
                      <span class="text-xs font-semibold text-on-surface">{viewingCertificateDoc.phone}</span>
                    </div>
                    <div>
                      <span class="text-[10px] text-secondary block font-semibold uppercase">Document Uploaded</span>
                      <span class="text-xs font-semibold text-primary truncate block">{viewingCertificateDoc.certificate_url.split('/').pop()}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="bg-surface-container-low border border-border-subtle p-3 rounded-lg flex items-start gap-2">
                <span class="material-symbols-outlined text-primary text-[18px]">verified</span>
                <p class="text-[11px] text-secondary leading-relaxed">
                  This document was securely submitted via the MedAI doctor registration form. Please review the details before approval.
                </p>
              </div>
            </div>

            <div class="px-6 py-4 bg-bg-canvas border-t border-border-subtle flex justify-end gap-2">
              <button
                onClick={() => setViewingCertificateDoc(null)}
                class="bg-white border border-border-subtle text-secondary font-button py-2 px-4 rounded-lg text-xs hover:bg-surface-container-low transition-colors font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => handleApprove(viewingCertificateDoc.id)}
                class="bg-primary hover:bg-primary-hover text-on-primary font-button py-2 px-4 rounded-lg text-xs transition-colors shadow-sm font-semibold"
              >
                Approve Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingDocId && (
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl border border-border-subtle shadow-lg max-w-sm w-full overflow-hidden">
            <div class="px-6 py-4 border-b border-border-subtle bg-bg-canvas flex justify-between items-center">
              <h4 class="font-headline-md text-sm text-error font-bold">Reject Application</h4>
              <button 
                onClick={() => setRejectingDocId(null)}
                class="p-1 hover:bg-surface-container rounded-full text-secondary"
              >
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleRejectSubmit} class="p-6 space-y-4">
              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Reason for Rejection *</label>
                <textarea
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="The medical certificate is expired or invalid..."
                  rows={3}
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div class="flex gap-3 pt-4 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setRejectingDocId(null)}
                  class="flex-1 bg-white border border-border-subtle text-secondary font-button py-2 rounded-lg text-xs hover:bg-surface-container-low transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="flex-1 bg-error hover:bg-error/90 text-white font-button py-2 rounded-lg text-xs transition-colors shadow-sm font-semibold"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
