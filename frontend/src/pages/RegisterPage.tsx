import React, { useState } from 'react';
import { UserPlus, ArrowLeft, ArrowRight, ShieldCheck, Check, Stethoscope, User, Clock, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { registerDoctor, registerPatient } from '../services/api';

interface RegisterPageProps {
  onNavigate: (tab: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'patient' | 'doctor'>('patient');
  const [doctorSubmitted, setDoctorSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Doctor Form State
  const [doctorData, setDoctorData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    specialization: 'Cardiology',
    qualification: '',
    experience_years: 5,
    hospital_name: '',
    consultation_fee: 100,
    availability_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    availability_hours: '09:00 AM - 05:00 PM'
  });

  // Patient Form State
  const [patientData, setPatientData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    age: 35,
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    address: '',
    has_heart_disease: false,
    high_blood_pressure: false,
    diabetes: false,
    previous_cardiac_event: false,
    medical_notes: ''
  });

  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await registerDoctor({
        full_name: doctorData.full_name,
        email: doctorData.email,
        phone_number: doctorData.phone_number,
        password: doctorData.password,
        specialization: doctorData.specialization,
        qualification: doctorData.qualification,
        experience_years: Number(doctorData.experience_years),
        hospital_name: doctorData.hospital_name,
        consultation_fee: Number(doctorData.consultation_fee),
        availability: {
          days: doctorData.availability_days,
          hours: doctorData.availability_hours
        }
      });
      setDoctorSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Doctor registration failed. Please verify fields.');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await registerPatient({
        full_name: patientData.full_name,
        email: patientData.email,
        phone_number: patientData.phone_number,
        password: patientData.password,
        age: Number(patientData.age),
        gender: patientData.gender,
        address: patientData.address,
        medical_history: {
          has_heart_disease: patientData.has_heart_disease,
          high_blood_pressure: patientData.high_blood_pressure,
          diabetes: patientData.diabetes,
          previous_cardiac_event: patientData.previous_cardiac_event,
          notes: patientData.medical_notes
        }
      });

      // Auto login patient so they can submit their assessment immediately
      await login(patientData.email, patientData.password);
      // Navigate to required assessment upload step
      onNavigate('assessment-upload');
    } catch (err: any) {
      setError(err.message || 'Patient registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  if (doctorSubmitted) {
    return (
      <div className="relative max-w-xl mx-auto my-12 px-4">
        <div className="absolute -top-16 -left-16 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative glass-panel bg-slate-900/90 rounded-3xl border border-cyan-500/40 shadow-2xl p-8 text-center backdrop-blur-2xl">
          <div className="w-16 h-16 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/20">
            <CheckCircle className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Doctor Registration Submitted</h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Thank you, Dr. <span className="text-cyan-300 font-bold">{doctorData.full_name}</span>! Your credentials have been registered into the institutional verification registry.
          </p>

          <div className="bg-amber-950/60 border border-amber-500/40 rounded-2xl p-4 my-6 text-left text-xs text-amber-200 space-y-2">
            <div className="font-bold flex items-center gap-2 text-amber-300 font-mono uppercase tracking-wider text-[11px]">
              <Clock className="w-4 h-4 text-amber-400" />
              Administrative Verification Status: PENDING APPROVAL
            </div>
            <p className="leading-relaxed text-slate-300">
              Under medical governance compliance protocols, newly registered physician accounts must be reviewed and approved by the Super Administrator (<span className="text-amber-300 font-mono">manojbarik84998@gmail.com</span>) before clinical portal access is granted.
            </p>
            <p className="text-[11px] text-slate-400 font-mono pt-1 border-t border-amber-500/20">
              Registered Physician Email: <strong className="text-white">{doctorData.email}</strong>
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => onNavigate('login')}
              className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-black py-3 px-8 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 transition"
            >
              Return to Sign In Portal
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
        
        {/* Header */}
        <div className="p-6 sm:p-7 border-b border-slate-800/80 bg-gradient-to-b from-slate-800/40 to-transparent">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500/20 via-cyan-500/15 to-emerald-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-md shadow-teal-500/15">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Create Healthcare Account</h2>
                <p className="text-xs font-mono text-teal-400 mt-0.5 uppercase tracking-wider">CardioPulse AI Clinical & Patient Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('landing')}
                className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60"
                title="Return to Home Page"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-400" /> Back to Home
              </button>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="text-xs font-mono text-teal-300 hover:text-white flex items-center gap-1.5 transition px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-teal-400" /> Back to Sign In
              </button>
            </div>
          </div>

          {/* Role Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 mt-6 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800/80">
            <button
              type="button"
              onClick={() => { setSelectedRole('patient'); setError(null); }}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                selectedRole === 'patient'
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-lg shadow-teal-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Patient Registration</span>
            </button>
            <button
              type="button"
              onClick={() => { setSelectedRole('doctor'); setError(null); }}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                selectedRole === 'doctor'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Doctor / Clinician</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="m-6 mb-0 bg-red-950/60 border border-red-500/40 text-red-200 text-xs p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Patient Registration Form */}
        {selectedRole === 'patient' && (
          <form onSubmit={handlePatientSubmit} className="p-6 sm:p-7 space-y-4">
            <div className="bg-teal-950/50 border border-teal-500/40 rounded-2xl p-4 text-xs text-teal-200 leading-relaxed flex items-start gap-3">
              <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-teal-300 font-bold block mb-0.5">Required Clinical Onboarding:</strong>
                After creating your patient account, you will be guided to upload your medical report or ECG file to complete your baseline heart health assessment before doctor consultation slots unlock.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={patientData.full_name}
                  onChange={(e) => setPatientData({ ...patientData, full_name: e.target.value })}
                  placeholder="e.g. Johnathan Miller"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Email Address *</label>
                <input
                  type="email"
                  required
                  value={patientData.email}
                  onChange={(e) => setPatientData({ ...patientData, email: e.target.value })}
                  placeholder="johnathan@example.com"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={patientData.phone_number}
                  onChange={(e) => setPatientData({ ...patientData, phone_number: e.target.value })}
                  placeholder="+1 (555) 019-2834"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Password (min 8 chars) *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={patientData.password}
                  onChange={(e) => setPatientData({ ...patientData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition shadow-inner font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Age *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={120}
                  value={patientData.age}
                  onChange={(e) => setPatientData({ ...patientData, age: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition shadow-inner font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Gender *</label>
                <select
                  value={patientData.gender}
                  onChange={(e) => setPatientData({ ...patientData, gender: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-white focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition"
                >
                  <option value="Male" className="bg-slate-900 text-white">Male</option>
                  <option value="Female" className="bg-slate-900 text-white">Female</option>
                  <option value="Other" className="bg-slate-900 text-white">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Residential Address *</label>
              <input
                type="text"
                required
                value={patientData.address}
                onChange={(e) => setPatientData({ ...patientData, address: e.target.value })}
                placeholder="42 Heartwood Blvd, Suite 2B, Boston MA"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition shadow-inner"
              />
            </div>

            {/* Medical History Section */}
            <div className="pt-2">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-2">Pre-existing Medical History</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <label className="flex items-center gap-2.5 p-3 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition select-none">
                  <input
                    type="checkbox"
                    checked={patientData.has_heart_disease}
                    onChange={(e) => setPatientData({ ...patientData, has_heart_disease: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-500/30 w-4 h-4"
                  />
                  <span className="text-slate-200 font-medium">Heart Disease</span>
                </label>
                <label className="flex items-center gap-2.5 p-3 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition select-none">
                  <input
                    type="checkbox"
                    checked={patientData.high_blood_pressure}
                    onChange={(e) => setPatientData({ ...patientData, high_blood_pressure: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-500/30 w-4 h-4"
                  />
                  <span className="text-slate-200 font-medium">High BP</span>
                </label>
                <label className="flex items-center gap-2.5 p-3 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition select-none">
                  <input
                    type="checkbox"
                    checked={patientData.diabetes}
                    onChange={(e) => setPatientData({ ...patientData, diabetes: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-500/30 w-4 h-4"
                  />
                  <span className="text-slate-200 font-medium">Diabetes</span>
                </label>
                <label className="flex items-center gap-2.5 p-3 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition select-none">
                  <input
                    type="checkbox"
                    checked={patientData.previous_cardiac_event}
                    onChange={(e) => setPatientData({ ...patientData, previous_cardiac_event: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-500/30 w-4 h-4"
                  />
                  <span className="text-slate-200 font-medium">Prior Cardiac</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Additional Medical Notes / Allergies (Optional)</label>
              <textarea
                rows={2}
                value={patientData.medical_notes}
                onChange={(e) => setPatientData({ ...patientData, medical_notes: e.target.value })}
                placeholder="List any drug allergies, prior surgeries, or current medications..."
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-teal-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? 'Creating Patient Account...' : (
                <>
                  <span>Register & Proceed to Health Assessment</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Doctor Registration Form */}
        {selectedRole === 'doctor' && (
          <form onSubmit={handleDoctorSubmit} className="p-6 sm:p-7 space-y-4">
            <div className="bg-cyan-950/50 border border-cyan-500/40 rounded-2xl p-4 text-xs text-cyan-200 leading-relaxed flex items-start gap-3">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-cyan-300 font-bold block mb-0.5">Cardiologist Credential Verification:</strong>
                Attending physician profiles are reviewed by the hospital administration. Once approved by the Super Admin, your clinical login credentials become fully active.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Doctor Full Name (with Title) *</label>
                <input
                  type="text"
                  required
                  value={doctorData.full_name}
                  onChange={(e) => setDoctorData({ ...doctorData, full_name: e.target.value })}
                  placeholder="Dr. Sarah Chen, MD"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Official Clinical Email *</label>
                <input
                  type="email"
                  required
                  value={doctorData.email}
                  onChange={(e) => setDoctorData({ ...doctorData, email: e.target.value })}
                  placeholder="dr.sarah@cardiopulse.health"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Contact Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={doctorData.phone_number}
                  onChange={(e) => setDoctorData({ ...doctorData, phone_number: e.target.value })}
                  placeholder="+1 (555) 302-8812"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Password (min 8 chars) *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={doctorData.password}
                  onChange={(e) => setDoctorData({ ...doctorData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition shadow-inner font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Clinical Specialization *</label>
                <input
                  type="text"
                  required
                  value={doctorData.specialization}
                  onChange={(e) => setDoctorData({ ...doctorData, specialization: e.target.value })}
                  placeholder="Interventional Cardiology / Electrophysiology"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Medical Qualification *</label>
                <input
                  type="text"
                  required
                  value={doctorData.qualification}
                  onChange={(e) => setDoctorData({ ...doctorData, qualification: e.target.value })}
                  placeholder="MD, FACC, Fellowship in Electrophysiology"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Years of Clinical Experience *</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={60}
                  value={doctorData.experience_years}
                  onChange={(e) => setDoctorData({ ...doctorData, experience_years: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition shadow-inner font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Consultation Fee ($ USD)</label>
                <input
                  type="number"
                  min={0}
                  value={doctorData.consultation_fee}
                  onChange={(e) => setDoctorData({ ...doctorData, consultation_fee: Number(e.target.value) })}
                  placeholder="100"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition shadow-inner font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Hospital / Clinic Affiliation *</label>
              <input
                type="text"
                required
                value={doctorData.hospital_name}
                onChange={(e) => setDoctorData({ ...doctorData, hospital_name: e.target.value })}
                placeholder="Metropolitan Heart & Vascular Institute"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition shadow-inner"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">Consultation Timings / Availability</label>
              <input
                type="text"
                value={doctorData.availability_hours}
                onChange={(e) => setDoctorData({ ...doctorData, availability_hours: e.target.value })}
                placeholder="Mon-Fri: 09:00 AM - 05:00 PM"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition shadow-inner font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? 'Submitting Application...' : 'Submit Doctor Registration for Approval'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
