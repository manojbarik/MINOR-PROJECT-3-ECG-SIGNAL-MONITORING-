import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ECGPrediction, ECGClassCode } from '../types';
import {
  History,
  Search,
  Filter,
  Download,
  FileText,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface Props {
  onNavigate?: (tab: string) => void;
  onSelectPatientForECG?: (patientId: number) => void;
}

export const PredictionHistoryPage: React.FC<Props> = ({ onNavigate, onSelectPatientForECG }) => {
  const [predictions, setPredictions] = useState<ECGPrediction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [selectedPrediction, setSelectedPrediction] = useState<ECGPrediction | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      setIsLoading(true);
      const data = await api.getECGPredictions();
      setPredictions(data);
    } catch (err: any) {
      console.error('Failed to load predictions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadReport = async (pred: ECGPrediction) => {
    try {
      setDownloadingId(pred.id);
      setNotification(`Compiling formal PDF report for prediction #${pred.id}...`);
      const rep = await api.generateReportFromPrediction(pred.id);
      const pdfUrl = api.getReportPdfUrl(rep.id);
      window.open(pdfUrl, '_blank');
      setNotification(`Report generated: Ref ${rep.report_reference_code}`);
    } catch (err: any) {
      setNotification(`Failed to generate report: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredPredictions = predictions.filter((p) => {
    const matchesSearch =
      (p.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.patient_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.condition_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.predicted_class.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterClass === 'ALL' || p.predicted_class === filterClass;

    return matchesSearch && matchesFilter;
  });

  const getConditionStyle = (code: string) => {
    switch (code) {
      case 'NSR':
        return {
          badge: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
          dot: 'bg-emerald-400',
          label: 'Normal Sinus Rhythm',
        };
      case 'ARR':
        return {
          badge: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
          dot: 'bg-amber-400',
          label: 'Arrhythmia',
        };
      case 'AFF':
        return {
          badge: 'bg-purple-500/15 border-purple-500/40 text-purple-300',
          dot: 'bg-purple-400',
          label: 'Atrial Fibrillation',
        };
      case 'CHF':
        return {
          badge: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
          dot: 'bg-rose-400',
          label: 'Congestive Heart Failure',
        };
      default:
        return {
          badge: 'bg-blue-500/15 border-blue-500/40 text-blue-300',
          dot: 'bg-blue-400',
          label: code,
        };
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700/80 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono font-bold mb-2">
            <History className="w-3.5 h-3.5" />
            LONGITUDINAL PREDICTION AUDIT LEDGER
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            ECG Prediction History
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Immutable database records of all 54-feature machine learning inferences, class probability distributions, and formal clinical PDF reports.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={loadPredictions}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {onNavigate && (
            <button
              onClick={() => onNavigate('predict')}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-teal-500/20 flex items-center gap-2 transition active:scale-95"
            >
              <Activity className="w-4 h-4" />
              <span>New ECG Prediction</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-200 text-xs flex items-center justify-between shadow-lg">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient name, code, condition..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[10px] font-mono uppercase text-slate-400 mr-1">Filter Class:</span>
          {['ALL', 'NSR', 'ARR', 'AFF', 'CHF'].map((cls) => (
            <button
              key={cls}
              onClick={() => setFilterClass(cls)}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition ${
                filterClass === cls
                  ? 'bg-teal-500 text-slate-900 shadow-md shadow-teal-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Predictions Table */}
      {isLoading ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-slate-700/80 text-xs text-slate-400">
          Loading prediction history...
        </div>
      ) : filteredPredictions.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-slate-700/80 space-y-3">
          <History className="w-10 h-10 text-slate-500 mx-auto" />
          <p className="text-sm font-bold text-white">No Predictions Found</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || filterClass !== 'ALL'
              ? 'No predictions match your search and filter criteria.'
              : 'Submit your first 54-feature ECG reading to view classification history.'}
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl border border-slate-700/80 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">ID</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Predicted Condition</th>
                  <th className="py-3.5 px-4 text-center">Confidence</th>
                  <th className="py-3.5 px-4">Class Probabilities</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPredictions.map((pred) => {
                  const style = getConditionStyle(pred.predicted_class);
                  return (
                    <tr key={pred.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                        #{pred.id}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{new Date(pred.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 pl-4.5">
                          {new Date(pred.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{pred.patient_name || 'Patient'}</div>
                        <div className="text-[10px] font-mono text-teal-400">{pred.patient_code || 'N/A'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-bold ${style.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                            {pred.predicted_class}
                          </span>
                          <span className="text-slate-300 font-semibold">{pred.condition_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold text-white text-xs">
                          {(pred.confidence_score * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          {Object.entries(pred.probabilities).map(([c, val]) => (
                            <span
                              key={c}
                              className={`px-1.5 py-0.5 rounded ${
                                c === pred.predicted_class
                                  ? 'bg-slate-700 font-bold text-teal-300'
                                  : 'text-slate-500'
                              }`}
                            >
                              {c}: {(val * 100).toFixed(0)}%
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedPrediction(pred)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => handleDownloadReport(pred)}
                            disabled={downloadingId === pred.id}
                            className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-semibold transition flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            <span>PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedPrediction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-teal-400 uppercase">ECG Inference Record #{selectedPrediction.id}</span>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  {selectedPrediction.condition_name} ({selectedPrediction.predicted_class})
                </h3>
              </div>
              <button onClick={() => setSelectedPrediction(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Patient</span>
                <p className="font-bold text-white text-sm">{selectedPrediction.patient_name || 'Anonymous'}</p>
                <p className="text-slate-400 font-mono">{selectedPrediction.patient_code}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Model Specification</span>
                <p className="font-bold text-teal-300 text-sm">{selectedPrediction.model_name}</p>
                <p className="text-slate-400 font-mono">Confidence: {(selectedPrediction.confidence_score * 100).toFixed(2)}%</p>
              </div>
            </div>

            {/* Probabilities */}
            <div>
              <span className="text-[11px] font-mono text-slate-400 block mb-2 uppercase">Multiclass Probabilities:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                {Object.entries(selectedPrediction.probabilities).map(([cls, val]) => (
                  <div key={cls} className={`p-2.5 rounded-xl border ${cls === selectedPrediction.predicted_class ? 'bg-teal-500/10 border-teal-500/40 text-teal-300' : 'bg-slate-800/40 border-slate-700 text-slate-400'}`}>
                    <div className="text-[10px] text-slate-400">{cls}</div>
                    <div className="text-base font-bold text-white">{(val * 100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Overview if attached */}
            {selectedPrediction.clinical_summary && (
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 text-xs space-y-2 text-slate-300">
                <strong className="text-teal-300 block">Pathophysiological Description:</strong>
                <p className="text-[11px] leading-relaxed">{selectedPrediction.clinical_summary.description}</p>
                <strong className="text-teal-300 block pt-1">Recommended Follow-up:</strong>
                <p className="text-[11px]">{selectedPrediction.clinical_summary.clinical_followup}</p>
              </div>
            )}

            {/* 54 Feature Values Preview Accordion */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-slate-400 block uppercase">Input Features (54 Numerical Metrics):</span>
              <div className="max-h-48 overflow-y-auto p-3 bg-slate-950 rounded-xl border border-slate-800 custom-scrollbar">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[10px] font-mono">
                  {Object.entries(selectedPrediction.feature_values || {}).map(([fKey, fVal]) => (
                    <div key={fKey} className="text-slate-400">
                      <span className="text-slate-600 block">{fKey}</span>
                      <span className="text-slate-200">{Number(fVal).toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedPrediction(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadReport(selectedPrediction)}
                className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold text-xs tracking-wide shadow-lg shadow-teal-500/20 transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Report</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

