import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PatientListItem, PatientProfile, MedicalHistory } from '../types';
import {
  Users,
  UserPlus,
  Search,
  Activity,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Heart,
  Calendar,
  Phone,
  Shield,
  FileText,
  Clock,
  X,
  Stethoscope
} from 'lucide-react';

interface Props {
  onNavigate?: (tab: string) => void;
  onSelectPatientForECG?: (patientId: number) => void;
}

export const PatientManagementPage: React.FC<Props> = ({ onNavigate, onSelectPatientForECG }) => {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingPatientId, setEditingPatientId] = useState<number | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    age: '',
    sex: 'Male',
    phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    smoking_habit: 'non-smoker',
    alcohol_consumption: 'none',
    physical_activity_level: 'moderate',
    has_heart_disease: false,
    high_blood_pressure: false,
    diabetes: false,
    medical_notes: ''
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadPatients();
  }, [searchQuery]);

  const loadPatients = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAllPatients(searchQuery.trim() || undefined);
      setPatients(data);
    } catch (err: any) {
      setNotification({ type: 'error', message: `Failed to load patients: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      age: '',
      sex: 'Male',
      phone: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      smoking_habit: 'non-smoker',
      alcohol_consumption: 'none',
      physical_activity_level: 'moderate',
      has_heart_disease: false,
      high_blood_pressure: false,
      diabetes: false,
      medical_notes: ''
    });
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setNotification({ type: 'error', message: 'Patient full name is required.' });
      return;
    }

    try {
      await api.createPatient({
        full_name: formData.full_name,
        email: formData.email.trim() || undefined,
        age: formData.age ? Number(formData.age) : undefined,
        sex: formData.sex,
        phone: formData.phone.trim() || undefined,
        emergency_contact_name: formData.emergency_contact_name.trim() || undefined,
        emergency_contact_phone: formData.emergency_contact_phone.trim() || undefined,
        smoking_habit: formData.smoking_habit,
        alcohol_consumption: formData.alcohol_consumption,
        physical_activity_level: formData.physical_activity_level,
        has_heart_disease: formData.has_heart_disease,
        high_blood_pressure: formData.high_blood_pressure,
        diabetes: formData.diabetes,
        medical_notes: formData.medical_notes.trim() || undefined
      });

      setNotification({ type: 'success', message: `Patient profile for '${formData.full_name}' created successfully.` });
      setShowAddModal(false);
      resetForm();
      loadPatients();
    } catch (err: any) {
      setNotification({ type: 'error', message: `Failed to create patient: ${err.message}` });
    }
  };

  const openEditModal = async (patientId: number) => {
    try {
      const p = await api.getPatientById(patientId);
      setEditingPatientId(patientId);
      setFormData({
        full_name: p.full_name || '',
        email: p.email || '',
        age: p.age ? String(p.age) : '',
        sex: p.sex || 'Male',
        phone: p.phone || '',
        emergency_contact_name: p.emergency_contact_name || '',
        emergency_contact_phone: p.emergency_contact_phone || '',
        smoking_habit: p.smoking_habit || 'non-smoker',
        alcohol_consumption: p.alcohol_consumption || 'none',
        physical_activity_level: p.physical_activity_level || 'moderate',
        has_heart_disease: p.medical_history?.has_heart_disease || false,
        high_blood_pressure: p.medical_history?.high_blood_pressure || false,
        diabetes: p.medical_history?.diabetes || false,
        medical_notes: p.medical_history?.notes || ''
      });
      setShowEditModal(true);
    } catch (err: any) {
      setNotification({ type: 'error', message: `Failed to fetch patient details: ${err.message}` });
    }
  };

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatientId) return;

    try {
      await api.updatePatient(editingPatientId, {
        full_name: formData.full_name,
        age: formData.age ? Number(formData.age) : undefined,
        sex: formData.sex,
        phone: formData.phone.trim() || undefined,
        emergency_contact_name: formData.emergency_contact_name.trim() || undefined,
        emergency_contact_phone: formData.emergency_contact_phone.trim() || undefined,
        smoking_habit: formData.smoking_habit,
        alcohol_consumption: formData.alcohol_consumption,
        physical_activity_level: formData.physical_activity_level
      });

      setNotification({ type: 'success', message: 'Patient profile updated successfully.' });
      setShowEditModal(false);
      setEditingPatientId(null);
      resetForm();
      loadPatients();
    } catch (err: any) {
      setNotification({ type: 'error', message: `Failed to update patient: ${err.message}` });
    }
  };

  const handleDeletePatient = async (patientId: number, code: string) => {
    if (!window.confirm(`Are you sure you want to remove patient ${code}? All historical records will be deleted.`)) {
      return;
    }

    try {
      await api.deletePatient(patientId);
      setNotification({ type: 'success', message: `Patient ${code} removed.` });
      loadPatients();
    } catch (err: any) {
      setNotification({ type: 'error', message: `Failed to delete patient: ${err.message}` });
    }
  };

  const getConditionColor = (code?: string | null) => {
    switch (code) {
      case 'NSR':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'ARR':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'AFF':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'CHF':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700/80 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono font-bold mb-2">
            <Users className="w-3.5 h-3.5" />
            PATIENT REGISTRY & CLINICAL DOSSIERS
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Patient Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Register, search, and manage clinical patient demographics, cardiac histories, and direct access to 54-feature ECG machine learning predictions.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-teal-500/20 flex items-center gap-2 transition active:scale-95 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-lg ${
          notification.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Search & Statistics Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, code (PAT-...), or email..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
          />
        </div>

        <div className="text-xs font-mono text-slate-400 flex items-center gap-4">
          <span>Total Records: <strong className="text-white">{patients.length}</strong></span>
        </div>
      </div>

      {/* Patient Table / Grid */}
      {isLoading ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-slate-700/80 text-xs text-slate-400">
          Loading patient dossiers...
        </div>
      ) : patients.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-slate-700/80 space-y-3">
          <Users className="w-10 h-10 text-slate-500 mx-auto" />
          <p className="text-sm font-bold text-white">No Patient Records Found</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery ? 'No patients matching your search query.' : 'Register your first patient using the button above.'}
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl border border-slate-700/80 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Patient Code</th>
                  <th className="py-3.5 px-4">Full Name</th>
                  <th className="py-3.5 px-4">Age / Sex</th>
                  <th className="py-3.5 px-4">Phone / Contact</th>
                  <th className="py-3.5 px-4 text-center">ECG Predictions</th>
                  <th className="py-3.5 px-4 text-center">Latest Result</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-400">
                      {p.patient_id_code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{p.full_name}</div>
                      <div className="text-[11px] text-slate-400">{p.email || 'No email attached'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {p.age ? `${p.age} yrs` : 'N/A'} • {p.sex || 'Unknown'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">
                      {p.phone || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono font-bold text-[11px]">
                        {p.prediction_count}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {p.latest_prediction_class ? (
                        <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold ${getConditionColor(p.latest_prediction_class)}`}>
                          {p.latest_prediction_class}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">No Tests Yet</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Run ECG Prediction Button */}
                        <button
                          onClick={() => {
                            if (onSelectPatientForECG) {
                              onSelectPatientForECG(p.id);
                            } else if (onNavigate) {
                              onNavigate('predict');
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-semibold transition flex items-center gap-1"
                          title="Run 54-Feature ECG Prediction"
                        >
                          <Activity className="w-3 h-3" />
                          <span>Predict</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(p.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="Edit Patient Profile"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeletePatient(p.id, p.patient_id_code)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition"
                          title="Delete Patient"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-teal-400" />
                Register New Clinical Patient
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="e.g. Johnathan Miller"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="patient@cardiopulse.health"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">Age (Years)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={formData.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    placeholder="45"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">Sex</label>
                  <select
                    value={formData.sex}
                    onChange={(e) => handleInputChange('sex', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1 555-0199"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Clinical History Checkboxes */}
              <div className="pt-2 border-t border-slate-800">
                <label className="text-[11px] font-mono text-slate-400 block mb-2 uppercase">Cardiac History Flags</label>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.has_heart_disease}
                      onChange={(e) => handleInputChange('has_heart_disease', e.target.checked)}
                      className="rounded border-slate-600 text-teal-500 focus:ring-0"
                    />
                    <span className="text-[11px] text-slate-300">Heart Disease</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.high_blood_pressure}
                      onChange={(e) => handleInputChange('high_blood_pressure', e.target.checked)}
                      className="rounded border-slate-600 text-teal-500 focus:ring-0"
                    />
                    <span className="text-[11px] text-slate-300">Hypertension</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.diabetes}
                      onChange={(e) => handleInputChange('diabetes', e.target.checked)}
                      className="rounded border-slate-600 text-teal-500 focus:ring-0"
                    />
                    <span className="text-[11px] text-slate-300">Diabetes</span>
                  </label>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                    placeholder="e.g. Sarah Miller"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                    placeholder="+1 555-0988"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold text-xs tracking-wide shadow-lg shadow-teal-500/20 transition"
                >
                  Save Patient Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit className="w-4 h-4 text-teal-400" />
                Update Patient Profile
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePatient} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 block">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">Age</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">Sex</label>
                  <select
                    value={formData.sex}
                    onChange={(e) => handleInputChange('sex', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold text-xs tracking-wide shadow-lg shadow-teal-500/20 transition"
                >
                  Update Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

