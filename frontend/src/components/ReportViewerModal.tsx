import React from 'react';
import { X, Download, Printer, ShieldAlert, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { HealthReport } from '../types';
import { api } from '../services/api';

interface ReportViewerModalProps {
  report: HealthReport;
  onClose: () => void;
}

export const ReportViewerModal: React.FC<ReportViewerModalProps> = ({ report, onClose }) => {
  const data = report.report_data || {};
  const alertLvl = report.risk_level;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    window.open(api.getPdfDownloadUrl(report.id), '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div className="glass-panel bg-slate-900/95 rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-700/80 overflow-hidden max-h-[92vh] flex flex-col text-slate-100">
        
        {/* Modal Header */}
        <div className="bg-slate-950/90 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">{report.title}</h3>
              <p className="text-xs text-slate-400 font-mono">Reference: {report.report_reference_code} • {report.generated_at}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 text-xs font-bold px-3.5 py-1.5 rounded-xl shadow transition"
              title="Download formal PDF report"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline uppercase tracking-wider">Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-700 transition"
              title="Print medical report"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-200 text-xs sm:text-sm print:p-0">
          
          {/* Triage Banner */}
          <div className={`p-4 rounded-xl flex items-center justify-between ${
            alertLvl === 'RED' ? 'bg-red-950/60 border border-red-500/40 text-red-200' :
            alertLvl === 'ORANGE' ? 'bg-orange-950/60 border border-orange-500/40 text-orange-200' :
            alertLvl === 'YELLOW' ? 'bg-amber-950/60 border border-amber-500/40 text-amber-200' :
            'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
          }`}>
            <div className="flex items-center gap-3">
              {alertLvl === 'RED' ? <ShieldAlert className="w-6 h-6 text-red-400" /> : <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
              <div>
                <span className="font-extrabold uppercase tracking-wider text-xs block font-mono">
                  SAFETY TRIAGE: {alertLvl}
                </span>
                <span className="text-sm font-semibold">{data.section_3_current_heart_rate?.status_label || 'Evaluated'}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black">{data.section_3_current_heart_rate?.bpm} <span className="text-xs font-normal">BPM</span></span>
              <div className="text-[11px] opacity-75 font-mono">Ref: {data.section_3_current_heart_rate?.expected_min_bpm}–{data.section_3_current_heart_rate?.expected_max_bpm} BPM</div>
            </div>
          </div>

          {/* Patient Details & Measurement 2-Col Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <h4 className="font-bold text-xs uppercase tracking-wider text-teal-400 mb-2 font-mono">1. Patient Information</h4>
              <div className="space-y-1 text-xs">
                <div><span className="text-slate-400">Name:</span> <strong className="text-white">{data.section_1_patient_details?.full_name}</strong></div>
                <div><span className="text-slate-400">Patient ID:</span> <strong className="text-teal-300 font-mono">{data.section_1_patient_details?.patient_id_code}</strong></div>
                <div><span className="text-slate-400">Age / Sex:</span> <strong className="text-slate-200">{data.section_1_patient_details?.age} yrs / {data.section_1_patient_details?.sex}</strong></div>
                <div><span className="text-slate-400">Emergency Contact:</span> <strong className="text-slate-200">{data.section_1_patient_details?.emergency_contact}</strong></div>
              </div>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <h4 className="font-bold text-xs uppercase tracking-wider text-teal-400 mb-2 font-mono">2. Measurement Context</h4>
              <div className="space-y-1 text-xs">
                <div><span className="text-slate-400">Time:</span> <strong className="text-white font-mono">{data.section_2_measurement_details?.measurement_time}</strong></div>
                <div><span className="text-slate-400">Activity State:</span> <strong className="text-slate-200 capitalize">{data.section_2_measurement_details?.resting_status}</strong></div>
                <div><span className="text-slate-400">Method:</span> <strong className="text-slate-200">{data.section_2_measurement_details?.measurement_method}</strong></div>
                <div><span className="text-slate-400">Source:</span> <strong className="text-slate-200">{data.section_2_measurement_details?.device_name}</strong></div>
              </div>
            </div>
          </div>

          {/* AI Clinical Observations */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-teal-400 mb-1 font-mono">7. AI-Assisted Clinical Observations</h4>
            <p className="text-slate-300 leading-relaxed bg-teal-950/40 p-3 rounded-xl border border-teal-500/30 text-xs">
              {data.section_7_ai_assisted_observations?.contextual_interpretation}
            </p>
          </div>

          {/* Recommendations */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2 font-mono">9. Recommended Clinical & Wellness Next Steps</h4>
            <div className="space-y-1.5 text-xs">
              {data.section_9_recommended_next_steps?.map((r: any, idx: number) => (
                <div key={idx} className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2">
                  <span className="font-bold text-teal-400 capitalize font-mono">[{r.category.replace('_', ' ')}]:</span>
                  <span className="text-slate-200">{r.recommendation_text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Limitations and Disclaimer */}
          <div className="bg-slate-950/80 p-3 rounded-xl text-[11px] text-slate-400 space-y-1 border border-slate-800">
            <div><strong className="text-slate-300">Clinical Scope & Limitations:</strong> {data.section_11_limitations_of_analysis}</div>
            <div className="italic text-slate-500">{data.section_12_disclaimer}</div>
          </div>

          {/* Clinician Review Sign-off Block */}
          <div className="border border-slate-700/60 rounded-xl p-4 bg-slate-800/50 flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Attending Physician Sign-off</span>
              <div className="text-xs text-slate-300 mt-1">
                {report.is_clinician_approved ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" /> Clinician Reviewed & Approved
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium">Pending Clinician Review (Decision-Support Mode)</span>
                )}
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-500 font-mono">
              CardioPulse CDS Engine v1.0
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
