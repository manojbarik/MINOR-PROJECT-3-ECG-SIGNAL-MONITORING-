import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PatientDashboard } from './pages/PatientDashboard';
import { HeartRateMonitoringPage } from './pages/HeartRateMonitoringPage';
import { AIAnalysisPage } from './pages/AIAnalysisPage';
import { ReportsPage } from './pages/ReportsPage';
import { ChatAssistantPage } from './pages/ChatAssistantPage';
import { DoctorDashboardPage } from './pages/DoctorDashboardPage';
import { SettingsPrivacyPage } from './pages/SettingsPrivacyPage';
import { Cardiovascular3DHubPage } from './pages/Cardiovascular3DHubPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { CommunicationPage } from './pages/CommunicationPage';
import { EducationCenterPage } from './pages/EducationCenterPage';
import { DeviceManagementPage } from './pages/DeviceManagementPage';
import { CardiovascularAnalyticsPage } from './pages/CardiovascularAnalyticsPage';
import { HealthTimelinePage } from './pages/HealthTimelinePage';
import { BedsideTelemetryMonitor } from './components/BedsideTelemetryMonitor';
import { ECGPredictionPage } from './pages/ECGPredictionPage';
import { PredictionHistoryPage } from './pages/PredictionHistoryPage';
import { PatientManagementPage } from './pages/PatientManagementPage';
import { AssessmentUploadPage } from './pages/AssessmentUploadPage';
import { AppointmentBookingPage } from './pages/AppointmentBookingPage';
import { PrescriptionPage } from './pages/PrescriptionPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ShieldCheck, HeartPulse, Stethoscope, AlertTriangle, Monitor, Radio, ArrowLeft, Home, ChevronRight, ArrowRight } from 'lucide-react';

const TAB_LABELS: Record<string, string> = {
  landing: 'Home & Overview',
  login: 'Sign In',
  register: 'Registration',
  dashboard: 'Patient Dashboard',
  doctor: 'Doctor Clinical Portal',
  admin: 'Super Admin Console',
  bedside: 'ICU Bedside Telemetry',
  monitoring: 'Heart Rate Monitoring',
  analysis: 'AI Clinical Analysis',
  'ecg-predict': 'AI Heart Disease Prediction',
  'prediction-history': 'Prediction History',
  'patient-management': 'Patient Directory',
  'assessment-upload': 'Medical Report Upload',
  appointments: 'Appointments & Consultations',
  prescriptions: 'Prescription Management',
  notifications: 'Clinical Notifications',
  '3d-hub': '3D Cardiovascular Lab',
  analytics: 'Cardiovascular Analytics',
  timeline: 'Health Timeline',
  comms: 'Clinical Messaging & Video',
  education: 'Patient Education Center',
  devices: 'Device Management',
  reports: 'Clinical Reports Archive',
  chat: 'AI Health Assistant',
  privacy: 'Settings & Privacy Compliance',
};

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [history, setHistory] = useState<string[]>([]);

  // Default home view based on auth & role
  const homeTab = !isAuthenticated
    ? 'landing'
    : user?.role === 'admin'
    ? 'admin'
    : user?.role === 'doctor'
    ? 'doctor'
    : 'dashboard';

  // Can the user go back?
  const canGoBack = activeTab !== homeTab || history.length > 0;

  // Navigate with history tracking
  const handleNavigate = (newTab: string) => {
    if (newTab === activeTab) return;
    setHistory((prev) => [...prev, activeTab]);
    setActiveTab(newTab);
    try {
      window.history.pushState({ tab: newTab }, '', `#${newTab}`);
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step back to previous tab
  const handleGoBack = () => {
    if (history.length > 0) {
      const prevTab = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setActiveTab(prevTab);
      try {
        window.history.pushState({ tab: prevTab }, '', `#${prevTab}`);
      } catch {
        // ignore
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setActiveTab(homeTab);
      try {
        window.history.pushState({ tab: homeTab }, '', `#${homeTab}`);
      } catch {
        // ignore
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Keyboard shortcut listener (Escape or Alt+ArrowLeft)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.key === 'Escape' || (e.altKey && e.key === 'ArrowLeft')) {
        if (canGoBack) {
          handleGoBack();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canGoBack, history, activeTab, homeTab]);

  // Sync with browser's native Back/Forward buttons
  React.useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
      } else if (window.location.hash) {
        const hashTab = window.location.hash.replace('#', '');
        if (TAB_LABELS[hashTab]) {
          setActiveTab(hashTab);
        }
      } else {
        setActiveTab(homeTab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [homeTab]);

  // If user signs in, switch default tab based on role
  React.useEffect(() => {
    if (isAuthenticated && activeTab === 'landing') {
      if (user?.role === 'admin') {
        setActiveTab('admin');
      } else if (user?.role === 'doctor') {
        setActiveTab('doctor');
      } else {
        setActiveTab('dashboard');
      }
    }
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center text-white space-y-4">
        <div className="relative">
          <HeartPulse className="w-12 h-12 text-teal-400 animate-pulse-heart" />
          <span className="absolute -inset-2 rounded-full border border-teal-500/30 animate-ping"></span>
        </div>
        <div className="text-center">
          <p className="text-base font-bold tracking-wider text-slate-100 font-mono">
            CARDIOPULSE AI TELEMETRY ENGINE
          </p>
          <p className="text-xs text-teal-400 font-mono mt-1">
            INITIALIZING 1000Hz CLINICAL CDSS PIPELINE...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col telemetry-bg-cockpit font-sans text-slate-100 selection:bg-teal-500 selection:text-white w-full max-w-full overflow-x-hidden">

      {/* Top Clinical Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={handleNavigate} onBack={handleGoBack} canGoBack={canGoBack} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">

        {/* Universal Back Navigation & Breadcrumb Header (Visible on every subpage) */}
        {canGoBack && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 shadow-xl text-xs animate-in fade-in duration-200 w-full overflow-hidden">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleGoBack}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-500/20 via-cyan-500/15 to-transparent hover:from-teal-500/30 hover:via-cyan-500/25 text-teal-300 hover:text-white border border-teal-500/40 text-xs font-bold tracking-wide transition shadow-sm group active:scale-95"
                title="Go back to previous screen (Esc)"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>← Back</span>
                <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">Esc</span>
              </button>

              <div className="h-4 w-px bg-slate-700/80 hidden sm:block" />

              {/* Breadcrumb Path */}
              <nav className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]" aria-label="Breadcrumb">
                <button
                  type="button"
                  onClick={() => handleNavigate(homeTab)}
                  className="hover:text-teal-300 transition flex items-center gap-1 font-semibold"
                >
                  <Home className="w-3.5 h-3.5 text-teal-400" />
                  <span className="hidden sm:inline">{TAB_LABELS[homeTab] || 'Home'}</span>
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-white font-bold truncate max-w-[200px] sm:max-w-xs">
                  {TAB_LABELS[activeTab] || activeTab}
                </span>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleNavigate(homeTab)}
                className="text-[11px] font-mono text-slate-400 hover:text-teal-300 transition flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700"
              >
                <span>Return to Main View</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab Routing */}
        {activeTab === 'landing' && <LandingPage onNavigate={handleNavigate} />}
        {activeTab === 'login' && <LoginPage onNavigate={handleNavigate} />}
        {activeTab === 'register' && <RegisterPage onNavigate={handleNavigate} />}

        {activeTab === 'dashboard' && <PatientDashboard onNavigate={handleNavigate} />}

        {/* Dedicated ICU Bedside Telemetry Suite */}
        {activeTab === 'bedside' && (
          <div className="space-y-6 pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-2xl">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  LIVE HOSPITAL TELEMETRY FEED • CONTINUOUS LEAD II MONITORING
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Bedside Patient Monitor & Multi-Channel Cockpit
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                  Simulating calibrated Lead II ECG (25 mm/s, 10 mm/mV), continuous SpO2 photoplethysmogram,
                  impedance pneumogram (respiration), and non-invasive arterial pulse kinematics.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleNavigate('monitoring')}
                  className="bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 px-4 py-2 rounded-xl text-xs font-semibold transition"
                >
                  Record Vitals Reading
                </button>
                <button
                  onClick={() => handleNavigate('3d-hub')}
                  className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg shadow-teal-500/20 transition"
                >
                  3D Cardio Lab
                </button>
              </div>
            </div>

            {/* Live Interactive Telemetry Monitor */}
            <BedsideTelemetryMonitor
              initialBpm={74}
              patientName={user?.full_name || 'Johnathan Miller'}
              bedId="ICU-BAY 04"
              height={440}
            />

            {/* Clinical Reference Footnote */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-700/60 text-xs text-slate-400 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-200">
                  Clinical Protocol: Real-Time Telemetry & Safety Triage
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Real-time bedside telemetry displays simulated clinical waveforms matching standard hospital monitor specifications (AAMI EC11).
                  In standard clinical practice, life-threatening arrhythmias (e.g. Ventricular Tachycardia, Asystole) trigger immediate audio-visual alarms
                  and dispatch clinical code teams. For real patients experiencing acute chest discomfort or syncope, immediately dial local emergency services (112 / 911).
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'monitoring' && <HeartRateMonitoringPage onNavigate={handleNavigate} />}
        {activeTab === 'analysis' && <AIAnalysisPage onNavigate={handleNavigate} />}
        {activeTab === 'ecg-predict' && <ECGPredictionPage onNavigate={handleNavigate} />}
        {activeTab === 'prediction-history' && <PredictionHistoryPage onNavigate={handleNavigate} />}
        {activeTab === 'patient-management' && <PatientManagementPage onNavigate={handleNavigate} />}
        {activeTab === 'assessment-upload' && <AssessmentUploadPage onNavigate={handleNavigate} />}
        {activeTab === 'appointments' && <AppointmentBookingPage onNavigate={handleNavigate} />}
        {activeTab === 'prescriptions' && <PrescriptionPage onNavigate={handleNavigate} />}
        {activeTab === 'notifications' && <NotificationsPage onNavigate={handleNavigate} />}
        {activeTab === '3d-hub' && <Cardiovascular3DHubPage onNavigate={handleNavigate} />}
        {activeTab === 'analytics' && <CardiovascularAnalyticsPage onNavigate={handleNavigate} />}
        {activeTab === 'timeline' && <HealthTimelinePage onNavigate={handleNavigate} />}
        {activeTab === 'comms' && <CommunicationPage />}
        {activeTab === 'education' && <EducationCenterPage />}
        {activeTab === 'devices' && <DeviceManagementPage />}
        {activeTab === 'admin' && <AdminDashboardPage />}
        {activeTab === 'reports' && <ReportsPage />}
        {activeTab === 'chat' && <ChatAssistantPage />}
        {activeTab === 'doctor' && <DoctorDashboardPage onNavigate={handleNavigate} />}
        {activeTab === 'privacy' && <SettingsPrivacyPage />}

      </main>

      {/* Floating Action Back Button (Always accessible on all pages even when scrolled down) */}
      {canGoBack && (
        <div className="fixed bottom-6 left-6 z-50 animate-in fade-in slide-in-from-bottom-2">
          <button
            type="button"
            onClick={handleGoBack}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900/95 hover:bg-slate-800 text-teal-300 hover:text-white border border-teal-500/60 shadow-2xl backdrop-blur-2xl text-xs font-black tracking-wider uppercase transition-all duration-200 transform active:scale-90 hover:scale-105 group hover:border-teal-400"
            title="Go Back to Previous Screen (Shortcut: Esc)"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back</span>
          </button>
        </div>
      )}

      {/* Clinical Disclaimer & Healthcare Footer */}
      <footer className="bg-[#050b18]/90 text-slate-400 text-xs py-8 border-t border-slate-800/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-sm">CardioPulse AI</span>
              <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full uppercase font-mono">
                CLINICAL CDSS PLATFORM v1.0 • TELEMETRY ENGINE
              </span>
            </div>
            <div className="text-[11px] text-slate-300">
              Emergency Protocol: If experiencing severe chest pain, shortness of breath, or syncope, immediately dial <strong className="text-white underline">112 / 911</strong>.
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed text-center sm:text-left">
            <strong>MANDATORY REGULATORY DISCLAIMER:</strong> CardioPulse is an AI-assisted clinical decision-support and educational tool designed
            to assist patients and healthcare professionals. It does not provide medical diagnoses, replace clinical judgement, or prescribe treatments.
            A single pulse reading cannot substitute for a diagnostic 12-lead Electrocardiogram (ECG). Always seek the advice of a qualified physician with any questions
            regarding a medical condition.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 pt-2 font-mono gap-2">
            <span>© 2026 CardioPulse Health Systems Inc. • All rights reserved</span>
            <div className="flex items-center gap-4">
              <span>HIPAA Compliant</span>
              <span>•</span>
              <span>GDPR Health Data</span>
              <span>•</span>
              <span>DPDPA (India)</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
