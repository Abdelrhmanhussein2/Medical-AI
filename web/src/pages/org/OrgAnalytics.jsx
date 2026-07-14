import React from 'react';
import { useApp } from '../../context/AppContext';

export default function OrgAnalytics() {
  const { currentUser } = useApp();

  return (
    <div class="space-y-stack-lg font-body-md animate-fade-in">
      {/* Header */}
      <header class="flex justify-between items-end border-b border-border-subtle pb-stack-md">
        <div>
          <div class="flex items-center gap-1.5 text-xs text-secondary font-semibold">
            <span>{currentUser.name}</span>
            <span class="material-symbols-outlined text-[10px]">chevron_right</span>
            <span>Analytics</span>
          </div>
          <h1 class="font-display-lg text-headline-lg text-on-surface font-bold mt-1">Clinical Analytics</h1>
          <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">
            Real-time metrics, AI transcription metrics, and doctor performance insights.
          </p>
        </div>
      </header>

      {/* 4 Stats Cards */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Total Consultations</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-on-surface font-display-lg">1,428</span>
            <span class="text-xs font-semibold text-primary flex items-center gap-0.5">
              <span class="material-symbols-outlined text-xs">trending_up</span>
              +12.4% vs last mo
            </span>
          </div>
        </div>

        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-tertiary-fixed-dim/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">AI Adoption Rate</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-on-surface font-display-lg">84%</span>
            <span class="text-xs font-semibold text-primary flex items-center gap-0.5">
              +4.2% across dept
            </span>
          </div>
        </div>

        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Avg Docs Time</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-on-surface font-display-lg">3.2m</span>
            <span class="text-xs font-semibold text-primary flex items-center gap-0.5">
              -1.5m saved per patient
            </span>
          </div>
        </div>

        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-tertiary-fixed-dim/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Active Pro Subs</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-on-surface font-display-lg">24/30</span>
            <span class="text-xs font-semibold text-secondary">
              80% penetration
            </span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Chart 1: Line Chart for AI Transcription Accuracy */}
        <div class="lg:col-span-8 bg-white border border-border-subtle rounded-xl shadow-sm p-6 space-y-6">
          <div class="flex justify-between items-center border-b border-border-subtle pb-3">
            <div>
              <h3 class="font-button text-sm text-on-surface font-bold">AI Transcription Accuracy vs Manual Fallback</h3>
              <p class="text-[10px] text-secondary mt-0.5">Tracking AI confidence scores against manual corrections over time</p>
            </div>
            
            <div class="flex gap-4 text-xs font-bold">
              <span class="flex items-center gap-1 text-primary">
                <span class="w-2.5 h-2.5 rounded-full bg-primary block"></span>
                AI Accuracy
              </span>
              <span class="flex items-center gap-1 text-secondary">
                <span class="w-2.5 h-2.5 rounded-full bg-outline-variant block"></span>
                Fallback Rate
              </span>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div class="relative h-60 w-full pt-4">
            {/* Grid Y labels */}
            <div class="absolute inset-0 flex flex-col justify-between pointer-events-none text-[9px] text-secondary text-right pr-2">
              <div class="w-full border-t border-border-subtle/50 pt-0.5">100%</div>
              <div class="w-full border-t border-border-subtle/50 pt-0.5">75%</div>
              <div class="w-full border-t border-border-subtle/50 pt-0.5">50%</div>
              <div class="w-full border-t border-border-subtle/50 pt-0.5">25%</div>
              <div class="w-full border-t border-border-subtle pt-0.5">0%</div>
            </div>

            {/* SVG Lines */}
            <svg class="w-full h-full pt-3" viewBox="0 0 500 200" fill="none">
              {/* AI Accuracy path */}
              <path 
                d="M10 160 L100 120 L200 90 L300 40 L400 35 L490 30" 
                stroke="#00837A" 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M10 160 L100 120 L200 90 L300 40 L400 35 L490 30 L490 200 L10 200 Z" 
                fill="url(#primary-gradient)" 
                opacity="0.1"
              />
              
              {/* Fallback rate path */}
              <path 
                d="M10 40 L100 70 L200 100 L300 150 L400 160 L490 170" 
                stroke="#707978" 
                strokeWidth="2" 
                strokeDasharray="4 4"
                strokeLinecap="round" 
                strokeLinejoin="round"
              />

              {/* Gradients */}
              <defs>
                <linearGradient id="primary-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00837A" />
                  <stop offset="100%" stopColor="#00837A" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* X Labels */}
            <div class="flex justify-between items-center text-[9px] text-secondary mt-2 px-1 font-semibold">
              <span>S1</span>
              <span>S5</span>
              <span>S10</span>
              <span>S15</span>
              <span>S20</span>
              <span>S25</span>
            </div>
          </div>
        </div>

        {/* Chart 2: Donut style Workload Distribution */}
        <div class="lg:col-span-4 bg-white border border-border-subtle rounded-xl shadow-sm p-6 space-y-6">
          <div class="border-b border-border-subtle pb-3">
            <h3 class="font-button text-sm text-on-surface font-bold">Workload Distribution</h3>
            <p class="text-[10px] text-secondary mt-0.5">Consultations conducted per clinician</p>
          </div>

          {/* Simple Visual Pie representation using SVG circle stroke */}
          <div class="flex flex-col items-center justify-center space-y-6">
            <div class="relative w-36 h-36 flex items-center justify-center">
              <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background circle */}
                <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#E8F5F4" strokeWidth="3" />
                
                {/* Segments: Sarah Jenkins (45% -> 45) */}
                <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#00837A" strokeWidth="3.2" strokeDasharray="45 55" strokeDashoffset="0" />
                
                {/* Segments: Michael Chen (30% -> 30) */}
                <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#00c8b4" strokeWidth="3.2" strokeDasharray="30 70" strokeDashoffset="-45" />

                {/* Segments: Emily Vance (15% -> 15) */}
                <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#707978" strokeWidth="3.2" strokeDasharray="15 85" strokeDashoffset="-75" />
              </svg>
              <div class="absolute flex flex-col items-center justify-center">
                <span class="text-sm font-bold text-on-surface">1.4k</span>
                <span class="text-[9px] text-secondary uppercase font-semibold">Total Cases</span>
              </div>
            </div>

            {/* Legend List */}
            <div class="w-full space-y-2 text-xs leading-relaxed">
              <div class="flex justify-between items-center">
                <span class="flex items-center gap-2 text-secondary">
                  <span class="w-2.5 h-2.5 rounded-full bg-primary block"></span>
                  Dr. Sarah Jenkins
                </span>
                <span class="font-bold text-on-surface">45% <span class="text-[10px] text-secondary font-normal">(642)</span></span>
              </div>
              <div class="flex justify-between items-center">
                <span class="flex items-center gap-2 text-secondary">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#00c8b4] block"></span>
                  Dr. Michael Chen
                </span>
                <span class="font-bold text-on-surface">30% <span class="text-[10px] text-secondary font-normal">(428)</span></span>
              </div>
              <div class="flex justify-between items-center">
                <span class="flex items-center gap-2 text-secondary">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#707978] block"></span>
                  Dr. Emily Vance
                </span>
                <span class="font-bold text-on-surface">15% <span class="text-[10px] text-secondary font-normal">(214)</span></span>
              </div>
              <div class="flex justify-between items-center">
                <span class="flex items-center gap-2 text-secondary">
                  <span class="w-2.5 h-2.5 rounded-full bg-surface-container-high block"></span>
                  Others
                </span>
                <span class="font-bold text-on-surface">10% <span class="text-[10px] text-secondary font-normal">(144)</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
