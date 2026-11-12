import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Video, MessageSquare, Phone, Search, Filter, CheckCircle, XCircle, AlertCircle, User, Stethoscope, ChevronRight, DollarSign, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Doctor, Appointment } from '../types';

interface AppointmentBookingPageProps {
  onNavigate?: (tab: string) => void;
}

export const AppointmentBookingPage: React.FC<AppointmentBookingPageProps> = ({ onNavigate }) => {
  const { user, assessmentComplete } = useAuth();
  const [activeTab, setActiveTab] = useState<'browse' | 'my-appointments'>('browse');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  
  // Booking modal/state
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentType, setAppointmentType] = useState<'video' | 'chat' | 'phone'>('video');
  const [reason, setReason] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const fetchApprovedDoctors = async () => {
    setLoading(true);
    try {
      const data = await api.getApprovedDoctors(selectedSpecialty || undefined, searchQuery || undefined);
      setDoctors(data);
    } catch (e: any) {
      console.error('Error fetching doctors:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAppointments = async () => {
    try {
      const data = await api.getMyAppointments();
      setMyAppointments(data);
    } catch (e: any) {
      console.error('Error fetching my appointments:', e);
    }
  };

  useEffect(() => {
    fetchApprovedDoctors();
  }, [selectedSpecialty]);

  useEffect(() => {
    if (activeTab === 'my-appointments') {
      fetchMyAppointments();
    }
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApprovedDoctors();
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    setBookingError(null);
    setBookingSuccess(null);

    if (user?.role === 'patient' && !assessmentComplete) {
      setBookingError('You must complete your initial heart health assessment before booking an appointment.');
      return;
    }

    try {
      const res = await api.requestAppointment({
        doctor_id: selectedDoctor.id,
        appointment_date: appointmentDate,
        appointment_type: appointmentType,
        reason: reason || 'Cardiovascular consultation'
      });
      setBookingSuccess('Appointment request submitted successfully! Awaiting doctor confirmation.');
      setSelectedDoctor(null);
      setAppointmentDate('');
      setReason('');
      fetchMyAppointments();
    } catch (err: any) {
      setBookingError(err.message || 'Failed to schedule appointment. Slot may already be occupied.');
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.cancelAppointment(id);
      fetchMyAppointments();
    } catch (e: any) {
      alert(e.message || 'Failed to cancel appointment');
    }
  };

  const specialties = Array.from(new Set(doctors.map(d => d.specialty).filter(Boolean)));

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'scheduled':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Approved</span>;
      case 'pending':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Pending Review</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">Rejected</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">Completed</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-navy-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono font-bold mb-2">
            <Calendar className="w-3.5 h-3.5 text-teal-400" />
            TELEMEDICINE & CLINICAL SCHEDULING
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Cardiologist Appointments & Telehealth
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Book certified clinical consultations with verified cardiologists. Select video consultations, real-time chat reviews, or direct clinical office visits.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700 shrink-0">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'browse' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Find Cardiologist
          </button>
          <button
            onClick={() => setActiveTab('my-appointments')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'my-appointments' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            My Appointments
          </button>
        </div>
      </div>

      {bookingSuccess && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 p-4 rounded-2xl flex items-center gap-3 text-xs">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{bookingSuccess}</span>
        </div>
      )}

      {bookingError && (
        <div className="bg-red-950/60 border border-red-500/40 text-red-200 p-4 rounded-2xl flex items-center gap-3 text-xs">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{bookingError}</span>
        </div>
      )}

      {/* Assessment Gate Warning */}
      {user?.role === 'patient' && !assessmentComplete && (
        <div className="bg-amber-950/60 border border-amber-500/40 rounded-2xl p-4 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <strong className="text-amber-300">Heart Health Assessment Required:</strong> Please complete your medical report upload to unlock appointment booking.
            </div>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('assessment-upload')}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shrink-0 transition"
            >
              Upload Assessment Report
            </button>
          )}
        </div>
      )}

      {/* TAB 1: BROWSE DOCTORS */}
      {activeTab === 'browse' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="glass-panel bg-slate-900/90 rounded-2xl border border-slate-700/80 p-4 shadow-xl flex flex-col sm:flex-row gap-3 items-center justify-between">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cardiologists by name, hospital, or sub-specialty..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
              />
            </form>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-white focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
              >
                <option value="" className="bg-slate-900 text-white">All Specializations</option>
                {specialties.map(s => (
                  <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Doctor Cards Grid */}
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-xs font-mono">
              Loading verified cardiologists roster...
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-16 glass-panel bg-slate-900/80 rounded-2xl border border-slate-700/80 p-8 text-slate-400 text-xs">
              No approved cardiologists matched your search criteria. Try clearing filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map(doc => (
                <div
                  key={doc.id}
                  className="glass-panel bg-slate-900/80 hover:bg-slate-900 border border-slate-700/80 hover:border-teal-500/50 p-5 rounded-2xl shadow-xl transition flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold text-base shadow-sm">
                          {doc.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') || 'DR'}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white group-hover:text-teal-300 transition">{doc.full_name}</h3>
                          <p className="text-xs text-teal-400 font-medium">{doc.specialty || 'Cardiologist'}</p>
                          <p className="text-[11px] text-slate-400">{doc.hospital_name || 'CardioPulse Clinic'}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        Verified
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 space-y-1.5 py-2.5 border-t border-slate-800">
                      {doc.qualification && (
                        <p className="text-[11px] truncate">
                          <strong className="text-slate-400">Credential:</strong> {doc.qualification}
                        </p>
                      )}
                      {doc.experience_years !== undefined && (
                        <p className="text-[11px]">
                          <strong className="text-slate-400">Experience:</strong> {doc.experience_years} years in clinical cardiology
                        </p>
                      )}
                      {doc.availability && typeof doc.availability === 'object' && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-teal-400" />
                          <span>Hours: {(doc.availability as any).hours || '09:00 AM - 05:00 PM'}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">Consult Fee</span>
                      <span className="text-sm font-bold text-white font-mono">
                        ${doc.consultation_fee || 100} <span className="text-[10px] font-normal text-slate-400">/ session</span>
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedDoctor(doc);
                        setBookingError(null);
                        setBookingSuccess(null);
                      }}
                      className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black py-2 px-4 rounded-xl text-xs shadow-md shadow-teal-500/20 transition flex items-center gap-1.5 uppercase tracking-wider"
                    >
                      <span>Book Slot</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY APPOINTMENTS */}
      {activeTab === 'my-appointments' && (
        <div className="space-y-4">
          {myAppointments.length === 0 ? (
            <div className="text-center py-16 glass-panel bg-slate-900/80 rounded-2xl border border-slate-700/80 p-8 text-slate-400 text-xs">
              You do not have any scheduled appointments yet. Find a doctor above to book your first clinical session.
            </div>
          ) : (
            <div className="glass-panel bg-slate-900/90 rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 font-bold text-xs text-slate-200 font-mono">
                Scheduled Consultations ({myAppointments.length})
              </div>
              <div className="divide-y divide-slate-800 text-xs">
                {myAppointments.map(a => (
                  <div key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          {a.doctor_name ? `Dr. ${a.doctor_name}` : `Doctor #${a.doctor_id}`}
                        </span>
                        {getStatusBadge(a.status)}
                      </div>
                      <p className="text-slate-400 text-[11px] flex items-center gap-1.5 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-teal-400" />
                        <span>{new Date(a.appointment_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        <span>•</span>
                        <span className="capitalize">{a.appointment_type} Consultation</span>
                      </p>
                      {a.reason && (
                        <p className="text-slate-300 text-[11px]">
                          <strong className="text-slate-400">Reason:</strong> {a.reason}
                        </p>
                      )}
                      {a.clinical_notes && (
                        <p className="text-teal-300 text-[11px] bg-teal-950/60 border border-teal-500/30 p-2.5 rounded-xl">
                          <strong className="text-teal-400">Doctor Notes:</strong> {a.clinical_notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {a.appointment_type === 'video' && a.status.toLowerCase() === 'approved' && onNavigate && (
                        <button
                          onClick={() => onNavigate('comms')}
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-bold py-1.5 px-3.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Video</span>
                        </button>
                      )}
                      {['pending', 'approved', 'scheduled'].includes(a.status.toLowerCase()) && (
                        <button
                          onClick={() => handleCancel(a.id)}
                          className="border border-red-500/40 text-red-400 hover:bg-red-500/10 py-1.5 px-3 rounded-xl text-xs font-semibold transition"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOOKING MODAL */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900/95 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-700/80 space-y-4 text-white">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Book Appointment with {selectedDoctor.full_name}
                </h3>
                <p className="text-xs text-teal-400 font-mono">{selectedDoctor.specialty} • ${selectedDoctor.consultation_fee || 100}</p>
              </div>
              <button
                onClick={() => setSelectedDoctor(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBookSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">
                  Appointment Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">
                  Consultation Mode *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAppointmentType('video')}
                    className={`py-2.5 px-3 rounded-xl border text-center font-bold flex flex-col items-center gap-1.5 transition ${
                      appointmentType === 'video'
                        ? 'border-teal-500 bg-teal-500/20 text-teal-300'
                        : 'border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-white bg-slate-950/60'
                    }`}
                  >
                    <Video className="w-4 h-4 text-teal-400" />
                    <span>Video Call</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppointmentType('chat')}
                    className={`py-2.5 px-3 rounded-xl border text-center font-bold flex flex-col items-center gap-1.5 transition ${
                      appointmentType === 'chat'
                        ? 'border-teal-500 bg-teal-500/20 text-teal-300'
                        : 'border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-white bg-slate-950/60'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-teal-400" />
                    <span>Real-time Chat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppointmentType('phone')}
                    className={`py-2.5 px-3 rounded-xl border text-center font-bold flex flex-col items-center gap-1.5 transition ${
                      appointmentType === 'phone'
                        ? 'border-teal-500 bg-teal-500/20 text-teal-300'
                        : 'border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-white bg-slate-950/60'
                    }`}
                  >
                    <Phone className="w-4 h-4 text-teal-400" />
                    <span>Phone Consult</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">
                  Reason for Consultation *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe your current symptoms, recent ECG findings, or reason for follow-up..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedDoctor(null)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black rounded-xl shadow-md transition uppercase tracking-wider text-xs"
                >
                  Confirm Appointment Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

