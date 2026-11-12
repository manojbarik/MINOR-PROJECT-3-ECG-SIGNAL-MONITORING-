import React, { useState, useEffect } from 'react';
import { FileText, Download, Plus, Trash2, Calendar, Pill, Heart, CheckCircle, AlertCircle, User, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Prescription } from '../types';

interface PrescriptionPageProps {
  onNavigate?: (tab: string) => void;
}

export const PrescriptionPage: React.FC<PrescriptionPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';
  
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Prescription Form State (for Doctors)
  const [formData, setFormData] = useState({
    patient_id: 1,
    appointment_id: undefined as number | undefined,
    patient_condition: 'Sinus Arrhythmia with Mild Hypertension',
    clinical_assessment: 'Patient displays intermittent palpitations and elevated systolic blood pressure. Resting ECG indicates non-sustained arrhythmia without ischemic changes.',
    lifestyle_recommendations: 'Limit daily sodium intake to < 2,000 mg. Practice guided diaphragmatic breathing for 10 minutes nightly.',
    diet_recommendations: 'Adopt DASH diet rich in potassium and magnesium. Reduce caffeine to 1 cup daily.',
    exercise_recommendations: 'Low-impact cardiovascular walking 30 minutes, 5 days per week. Avoid high-intensity isometric lifting.',
    followup_date: 'In 3 Weeks (Dec 2, 2026)',
    doctor_notes: 'Recheck resting blood pressure weekly using authenticated Omron device. Re-evaluate if palpitations persist.',
    medicines: [
      { name: 'Metoprolol Succinate ER', dosage: '25 mg', frequency: 'Once Daily (Morning)', duration: '30 Days' },
      { name: 'Lisinopril', dosage: '10 mg', frequency: 'Once Daily', duration: '30 Days' }
    ]
  });

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      if (isDoctor) {
        const data = await api.getDoctorPrescriptions();
        setPrescriptions(data);
      } else {
        const data = await api.getMyPrescriptions();
        setPrescriptions(data);
      }
    } catch (e: any) {
      console.error('Error fetching prescriptions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [isDoctor]);

  const handleAddMedicineRow = () => {
    setFormData(prev => ({
      ...prev,
      medicines: [...prev.medicines, { name: '', dosage: '', frequency: '', duration: '' }]
    }));
  };

  const handleRemoveMedicineRow = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index)
    }));
  };

  const handleMedicineChange = (index: number, field: string, value: string) => {
    const updated = [...formData.medicines];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, medicines: updated }));
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await api.createPrescription(formData);
      setSuccessMessage('Prescription issued and cryptographically compiled to PDF successfully!');
      setShowCreateModal(false);
      fetchPrescriptions();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to issue prescription.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-navy-900 via-slate-900 to-navy-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono font-bold mb-2">
            <Pill className="w-3.5 h-3.5 text-teal-400" />
            CLINICAL PRESCRIPTIONS & PHARMACOTHERAPY
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {isDoctor ? 'Physician Prescription Management' : 'My Clinical Prescriptions'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            {isDoctor
              ? 'Issue official digital prescriptions with dosages, pharmacological schedules, and lifestyle regimens.'
              : 'View verified prescriptions issued by your attending cardiologists with PDF download capabilities.'}
          </p>
        </div>

        {isDoctor && (
          <button
            onClick={() => {
              setShowCreateModal(true);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 px-5 rounded-2xl text-xs shadow-lg transition flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Issue New Prescription</span>
          </button>
        )}
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-3 text-xs">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-center gap-3 text-xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Prescriptions List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs font-mono">
          Loading clinical prescription records...
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="text-center py-16 glass-panel bg-slate-900/80 rounded-2xl border border-slate-700/80 p-8 text-slate-400 text-xs font-mono">
          No prescriptions found in your clinical dossier.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prescriptions.map((rx) => (
            <div
              key={rx.id}
              className="glass-panel bg-slate-900/90 rounded-2xl border border-slate-700/80 p-6 shadow-xl space-y-4 text-white"
            >
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                    <h3 className="font-bold text-sm text-white">
                      {isDoctor ? `Patient #${rx.patient_id}` : `Prescription from ${rx.doctor_name || 'Dr. Cardiologist'}`}
                    </h3>
                  </div>
                  <p className="text-[11px] text-teal-400 font-medium mt-0.5">
                    Condition: {rx.patient_condition}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(rx.created_at).toLocaleDateString([], { dateStyle: 'medium' })}
                </span>
              </div>

              {/* Assessment */}
              <div className="text-xs text-slate-300">
                <p className="text-[11px] font-bold text-slate-400 mb-0.5 font-mono uppercase">Clinical Assessment:</p>
                <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                  {rx.clinical_assessment}
                </p>
              </div>

              {/* Medicines Table */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 mb-1.5 flex items-center gap-1 font-mono uppercase">
                  <Pill className="w-3.5 h-3.5 text-teal-400" />
                  <span>Prescribed Medications:</span>
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left border border-slate-800 rounded-xl overflow-hidden font-mono">
                    <thead className="bg-slate-950 text-slate-400">
                      <tr>
                        <th className="p-2">Medicine</th>
                        <th className="p-2">Dosage</th>
                        <th className="p-2">Frequency</th>
                        <th className="p-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                      {(rx.medicines || []).map((m: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="p-2 font-bold text-teal-300">{m.name}</td>
                          <td className="p-2 text-slate-300">{m.dosage}</td>
                          <td className="p-2 text-slate-300">{m.frequency}</td>
                          <td className="p-2 text-slate-300">{m.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lifestyle / Guidance */}
              {(rx.lifestyle_recommendations || rx.diet_recommendations || rx.exercise_recommendations) && (
                <div className="text-[11px] space-y-1 text-slate-300 bg-teal-950/40 p-2.5 rounded-xl border border-teal-500/30">
                  {rx.lifestyle_recommendations && <p><strong className="text-teal-300">Lifestyle:</strong> {rx.lifestyle_recommendations}</p>}
                  {rx.diet_recommendations && <p><strong className="text-teal-300">Diet:</strong> {rx.diet_recommendations}</p>}
                  {rx.exercise_recommendations && <p><strong className="text-teal-300">Exercise:</strong> {rx.exercise_recommendations}</p>}
                </div>
              )}

              {rx.followup_date && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-teal-400" />
                  <span><strong>Follow-up:</strong> {rx.followup_date}</span>
                </p>
              )}

              {/* PDF Download Button */}
              <div className="pt-2 flex justify-end">
                <a
                  href={api.getPrescriptionPdfUrl(rx.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 shadow-md transition"
                >
                  <Download className="w-3.5 h-3.5 text-teal-400" />
                  <span>Download Signed PDF</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE PRESCRIPTION MODAL (DOCTOR) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel bg-slate-900/95 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-700/80 my-8 space-y-4 text-white">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Issue New Digital Prescription</h3>
                <p className="text-xs text-teal-400 font-mono">CardioPulse Clinical Pharmacotherapy Module</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePrescription} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Patient ID *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.patient_id}
                    onChange={(e) => setFormData({ ...formData, patient_id: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Follow-up Date</label>
                  <input
                    type="text"
                    value={formData.followup_date}
                    onChange={(e) => setFormData({ ...formData, followup_date: e.target.value })}
                    placeholder="e.g. 2 Weeks (Dec 15, 2026)"
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Patient Clinical Condition *</label>
                <input
                  type="text"
                  required
                  value={formData.patient_condition}
                  onChange={(e) => setFormData({ ...formData, patient_condition: e.target.value })}
                  placeholder="e.g. Atrial Fibrillation with Rapid Ventricular Response"
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Clinical Diagnostic Assessment *</label>
                <textarea
                  required
                  rows={2}
                  value={formData.clinical_assessment}
                  onChange={(e) => setFormData({ ...formData, clinical_assessment: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
              </div>

              {/* Medicines Form Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">Prescribed Medicines</label>
                  <button
                    type="button"
                    onClick={handleAddMedicineRow}
                    className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 text-[11px] font-mono"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Drug
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.medicines.map((m, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                      <input
                        type="text"
                        placeholder="Drug Name (e.g. Metoprolol)"
                        value={m.name}
                        onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                        className="col-span-4 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500"
                      />
                      <input
                        type="text"
                        placeholder="Dose (25mg)"
                        value={m.dosage}
                        onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                        className="col-span-2 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500"
                      />
                      <input
                        type="text"
                        placeholder="Frequency (Once daily)"
                        value={m.frequency}
                        onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                        className="col-span-3 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500"
                      />
                      <input
                        type="text"
                        placeholder="Duration (30d)"
                        value={m.duration}
                        onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                        className="col-span-2 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicineRow(idx)}
                        className="col-span-1 text-slate-500 hover:text-red-400 flex justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lifestyle / Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Lifestyle & Diet</label>
                  <textarea
                    rows={2}
                    value={formData.lifestyle_recommendations}
                    onChange={(e) => setFormData({ ...formData, lifestyle_recommendations: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Doctor's Clinical Notes</label>
                  <textarea
                    rows={2}
                    value={formData.doctor_notes}
                    onChange={(e) => setFormData({ ...formData, doctor_notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black rounded-xl shadow-md transition uppercase tracking-wider text-xs"
                >
                  Issue & Generate Signed PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

