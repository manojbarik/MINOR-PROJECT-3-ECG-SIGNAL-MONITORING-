import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, CheckCircle, Heart, AlertTriangle, X, Calendar, Activity, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface AssessmentUploadPageProps {
  onNavigate: (tab: string) => void;
}

export const AssessmentUploadPage: React.FC<AssessmentUploadPageProps> = ({ onNavigate }) => {
  const { user, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ message: string; assessment_unlocked: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    setProgress(20);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('upload_purpose', 'initial_assessment');
    if (notes) formData.append('notes', notes);

    try {
      const progressTimer = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 15 : prev));
      }, 200);

      const res = await api.uploadMedicalReport(formData);
      clearInterval(progressTimer);
      setProgress(100);
      setResult(res);

      // Refresh auth context so assessmentComplete is unlocked across the whole app
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Failed to upload report. Please check file format.');
    } finally {
      setUploading(false);
    }
  };

  if (result) {
    return (
      <div className="relative max-w-xl mx-auto my-12 px-4">
        <div className="absolute -top-16 -left-16 w-64 h-64 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative glass-panel bg-slate-900/90 rounded-3xl border border-teal-500/40 shadow-2xl p-8 text-center backdrop-blur-2xl">
          <div className="w-16 h-16 bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/20">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Heart Health Assessment Completed!</h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Your medical record has been securely encrypted and stored. Your patient profile is now 100% complete and fully verified.
          </p>

          <div className="bg-teal-950/60 border border-teal-500/40 rounded-2xl p-4 my-6 text-left text-xs text-teal-200 space-y-2">
            <div className="font-bold flex items-center gap-2 text-teal-300 font-mono uppercase tracking-wider text-[11px]">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              Doctor Consultation Access Unlocked
            </div>
            <p className="leading-relaxed text-slate-300">
              You can now browse verified cardiologists, select consultation slots, and book real-time video or chat appointments with full clinical history pre-loaded.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => onNavigate('appointments')}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black py-3 px-6 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-teal-500/25 transition flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Doctor Appointment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className="bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white font-bold py-3 px-6 rounded-xl text-xs border border-slate-700/80 transition"
            >
              Go to Patient Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative max-w-2xl mx-auto my-8 px-4">
      {/* Ambient background glows */}
      <div className="absolute -top-16 -left-16 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative glass-panel bg-slate-900/90 rounded-3xl border border-slate-700/80 shadow-2xl shadow-black/80 overflow-hidden backdrop-blur-2xl">
        
        {/* Banner Header */}
        <div className="p-6 sm:p-7 border-b border-slate-800/80 bg-gradient-to-b from-slate-800/40 to-transparent">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500/20 via-cyan-500/15 to-emerald-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-md shadow-teal-500/15">
              <Heart className="w-5 h-5 fill-teal-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Patient Heart Health Assessment</h2>
              <p className="text-xs font-mono text-teal-400 mt-0.5 uppercase tracking-wider">Step 2: Submit Medical / ECG Report to Finalize Registration</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-2 mt-6 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800/80">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'upload'
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-lg shadow-teal-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Document / ECG File Upload</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'manual'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Manual 54-Feature Inference</span>
            </button>
          </div>
        </div>

        {/* Disclaimer Notice */}
        <div className="p-6 pb-0">
          <div className="bg-amber-950/50 border border-amber-500/40 rounded-2xl p-4 text-xs text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-amber-300 font-bold block mb-0.5">Clinical Protocol:</strong> Upload your existing 12-lead ECG records, cardiologist summary PDFs, hospital discharge summaries, or heart data files. AI predictions are preliminary decision-support tools and do not substitute for a formal physical exam.
            </p>
          </div>
        </div>

        {error && (
          <div className="m-6 mb-0 bg-red-950/60 border border-red-500/40 text-red-200 text-xs p-4 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* File Upload Mode */}
        {activeTab === 'upload' && (
          <div className="p-6 sm:p-7 space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
                dragOver
                  ? 'border-teal-400 bg-teal-950/30'
                  : 'border-slate-700/80 hover:border-teal-400 hover:bg-slate-950/60 bg-slate-950/40'
              }`}
            >
              <Upload className={`w-12 h-12 mx-auto mb-3 ${dragOver ? 'text-teal-400' : 'text-slate-500'}`} />
              <p className="text-sm font-bold text-white">Drag & Drop ECG Report or Medical File</p>
              <p className="text-xs text-slate-400 mt-1">or click to browse your local device</p>
              <p className="text-[11px] text-teal-400 mt-2 font-mono">
                Supported formats: PDF, PNG, JPG, JPEG, CSV, JSON (up to 15MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.csv,.json,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between bg-slate-950/80 border border-teal-500/40 rounded-xl p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-500/30">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-slate-400 hover:text-red-400 p-1 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">
                Clinical Notes or Report Summary (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 12-lead ECG taken after routine checkup, felt brief palpitations..."
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition shadow-inner"
              />
            </div>

            {uploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-300 font-mono">
                  <span>Uploading & Analyzing Document...</span>
                  <span className="text-teal-400">{progress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-teal-500 to-cyan-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-teal-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {uploading ? 'Processing Medical Assessment...' : 'Submit Report & Complete Assessment'}
            </button>
          </div>
        )}

        {/* Manual Feature Entry Link */}
        {activeTab === 'manual' && (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
              <Activity className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">54-Feature Numerical ECG Model Predictor</h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              If you have raw digitized ECG numerical features (AAMI EC11 parameters), you can input the 54 features directly to test the trained Extra Trees model for ARR, AFF, CHF, or NSR.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('ecg-predict')}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black py-3 px-6 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 transition inline-flex items-center gap-2"
              >
                <span>Launch 54-Feature ECG Predictor</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

