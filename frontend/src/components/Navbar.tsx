import React, { useState, useEffect } from 'react';
import {
  Activity, ShieldCheck, User as UserIcon, LogOut, Stethoscope, ChevronDown,
  Heart, FileText, MessageSquareHeart, Settings, AlertCircle, Monitor, Radio,
  Zap, Bell, Sun, Moon, Calendar, Watch, BookOpen, BarChart3, Clock, Shield,
  ArrowLeft, Menu, X, LayoutGrid, Users, Sparkles, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Notification } from '../types';

// Demo login removed — users must sign in normally

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onBack, canGoBack }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showModulesMenu, setShowModulesMenu] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const [list, countData] = await Promise.all([
        api.getNotifications(),
        api.getUnreadNotificationCount(),
      ]);
      setNotifications(list.slice(0, 8));
      setUnreadCount(countData.unread_count);
    } catch {
      // Silently handle if unauthenticated
    }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 15000);
    return () => clearInterval(timer);
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const handleMarkOneRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const navigateTo = (tab: string) => {
    setShowModulesMenu(false);
    setShowMobileDrawer(false);
    setShowNotifications(false);
    setActiveTab(tab);
  };

  const clinicalModules = [
    {
      category: 'Cardiology & AI Diagnostics',
      items: [
        { id: 'ecg-predict', label: 'AI ECG Prediction', icon: Zap, color: 'text-cyan-400', desc: 'Predict ARR, AFF, CHF, NSR with 96.7% accuracy' },
        { id: 'monitoring', label: 'Smartwatch & Live Vitals', icon: Heart, color: 'text-rose-400', desc: 'Real-time BPM telemetry, zones & stress' },
        { id: 'bedside', label: 'ICU Bedside Telemetry Monitor', icon: Monitor, color: 'text-emerald-400', desc: 'AAMI EC11 calibrated continuous hospital waveforms' },
        { id: '3d-hub', label: '3D Cardiovascular Kinematics Lab', icon: Activity, color: 'text-teal-400', desc: 'Interactive 3D myocardial motion & chambers' },
        { id: 'analytics', label: 'Cardiovascular Analytics Hub', icon: BarChart3, color: 'text-indigo-400', desc: 'Longitudinal risk scoring, pulse kinematics, trends' },
      ]
    },
    {
      category: 'Care & Telehealth',
      items: [
        { id: 'appointments', label: 'Cardiologist Telehealth', icon: Calendar, color: 'text-blue-400', desc: 'Schedule video, chat, or in-person visits' },
        { id: 'prescriptions', label: 'Prescriptions & Medical Orders', icon: FileText, color: 'text-amber-400', desc: 'Digital prescriptions & PDF downloads' },
        { id: 'comms', label: 'Consultations & Messaging', icon: MessageSquareHeart, color: 'text-indigo-400', desc: 'Direct physician messaging & consultation review' },
        { id: 'chat', label: 'AI Health Assistant & Triage', icon: Sparkles, color: 'text-purple-400', desc: '24/7 AI cardiovascular advice & guidance' },
      ]
    },
    {
      category: 'Clinical Records & Compliance',
      items: [
        { id: 'assessment-upload', label: 'Upload Medical Report / Assessment', icon: ShieldCheck, color: 'text-emerald-400', desc: 'Submit ECG reports or files to complete onboarding' },
        { id: 'reports', label: 'Clinical Diagnostic Reports Archive', icon: FileText, color: 'text-teal-400', desc: 'Physician-reviewed reports & PDF export' },
        { id: 'timeline', label: 'Longitudinal Health Timeline', icon: Clock, color: 'text-amber-400', desc: 'Historical cardiac milestones & events log' },
        { id: 'devices', label: 'Medical Devices & Telemetry', icon: Watch, color: 'text-sky-400', desc: 'Bluetooth ECG patches, holters & wearables' },
        { id: 'education', label: 'Cardiology Education Center', icon: BookOpen, color: 'text-emerald-400', desc: 'Arrhythmia guides, lifestyle & safety' },
        { id: 'privacy', label: 'Settings & Privacy Compliance', icon: Settings, color: 'text-slate-400', desc: 'DPDPA / HIPAA compliance & audit trail' },
      ]
    }
  ];

  return (
    <header className="bg-[#0b1329]/95 dark:bg-[#070d1e]/95 backdrop-blur-md border-b border-slate-800/80 text-white sticky top-0 z-40 shadow-xl transition-colors w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">

          {/* Left: Back button & Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {canGoBack && onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-teal-500/20 text-slate-200 hover:text-teal-300 border border-slate-700/80 hover:border-teal-500/40 text-xs font-bold transition shadow-sm group active:scale-95 shrink-0"
                title="Go back to previous screen (Esc)"
              >
                <ArrowLeft className="w-4 h-4 text-teal-400 transition-transform group-hover:-translate-x-1" />
                <span className="hidden sm:inline">Back</span>
                <span className="hidden lg:inline-block text-[10px] px-1 py-0.2 rounded bg-slate-900/80 text-slate-400 font-mono">Esc</span>
              </button>
            )}

            {/* Logo & Clinical System Title */}
            <div
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer shrink-0"
              onClick={() => navigateTo(user?.role === 'admin' ? 'admin' : user?.role === 'doctor' ? 'doctor' : 'dashboard')}
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-teal-500 via-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-500/30 shrink-0">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-pulse" />
              </div>
              <div className="shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-teal-100 to-cyan-300 bg-clip-text text-transparent">
                    CardioPulse AI
                  </span>
                  <span className="text-[9px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider hidden 2xl:inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping"></span>
                    ICU CDSS v1.0
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 hidden lg:block font-mono">
                  CLINICAL CDSS &amp; TELEMETRY
                </p>
              </div>
            </div>
          </div>

          {/* Center Navigation Links: Clean Primary Tabs + All Features Dropdown */}
          {user && (
            <nav className="hidden lg:flex items-center gap-1 text-xs shrink min-w-0">
              {/* ADMIN ROLE PRIMARY TABS */}
              {user.role === 'admin' && (
                <>
                  <button
                    onClick={() => navigateTo('admin')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition truncate ${activeTab === 'admin'
                        ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Admin</span>
                  </button>
                  <button
                    onClick={() => navigateTo('doctor')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition truncate ${activeTab === 'doctor'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Doctor Portal</span>
                  </button>
                  <button
                    onClick={() => navigateTo('appointments')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition truncate ${activeTab === 'appointments'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Appointments</span>
                  </button>
                  <button
                    onClick={() => navigateTo('prescriptions')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition truncate ${activeTab === 'prescriptions'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Prescriptions</span>
                  </button>
                </>
              )}

              {/* DOCTOR ROLE PRIMARY TABS */}
              {user.role === 'doctor' && (
                <>
                  <button
                    onClick={() => navigateTo('doctor')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition truncate ${activeTab === 'doctor'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Cockpit</span>
                  </button>
                  <button
                    onClick={() => navigateTo('appointments')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition truncate ${activeTab === 'appointments'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Appointments</span>
                  </button>
                  <button
                    onClick={() => navigateTo('prescriptions')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition truncate ${activeTab === 'prescriptions'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Prescriptions</span>
                  </button>
                  <button
                    onClick={() => navigateTo('patient-management')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition truncate ${activeTab === 'patient-management'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Patients</span>
                  </button>
                </>
              )}

              {/* PATIENT ROLE PRIMARY TABS */}
              {user.role === 'patient' && (
                <>
                  <button
                    onClick={() => navigateTo('dashboard')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition truncate ${activeTab === 'dashboard'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Activity className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Dashboard</span>
                  </button>
                  <button
                    onClick={() => navigateTo('appointments')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition truncate ${activeTab === 'appointments'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Appointments</span>
                  </button>
                  <button
                    onClick={() => navigateTo('prescriptions')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition truncate ${activeTab === 'prescriptions'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Prescriptions</span>
                  </button>
                  <button
                    onClick={() => navigateTo('ecg-predict')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition truncate ${activeTab === 'ecg-predict'
                        ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>AI ECG Model</span>
                  </button>
                </>
              )}

              {/* UNIVERSAL CLINICAL MODULES MEGA DROPDOWN (ALL FEATURES IN ONE PLACE) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowModulesMenu(!showModulesMenu)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition border shrink-0 ${showModulesMenu
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                      : 'bg-slate-800/80 text-teal-300 border-slate-700 hover:bg-slate-700/80 hover:text-white'
                    }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>Clinical Suite</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showModulesMenu ? 'rotate-180' : ''}`} />
                </button>

                {showModulesMenu && (
                  <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-[720px] bg-[#090f20] border border-slate-700/90 rounded-2xl shadow-2xl p-5 z-50 animate-in fade-in zoom-in-95 backdrop-blur-2xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                      <div>
                        <h4 className="font-bold text-white text-sm flex items-center gap-2">
                          <LayoutGrid className="w-4 h-4 text-teal-400" />
                          CardioPulse Clinical Suite &amp; Tools
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Direct access to all specialized diagnostic modules, telemetry, and healthcare workflows
                        </p>
                      </div>
                      <button
                        onClick={() => setShowModulesMenu(false)}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-5">
                      {clinicalModules.map((col, idx) => (
                        <div key={idx} className="space-y-2">
                          <h5 className="text-[10px] font-bold uppercase tracking-wider font-mono text-teal-300 border-b border-slate-800/80 pb-1.5">
                            {col.category}
                          </h5>
                          <div className="space-y-1">
                            {col.items.map((item) => {
                              const Icon = item.icon;
                              const isActive = activeTab === item.id;
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => navigateTo(item.id)}
                                  className={`w-full text-left p-2 rounded-xl transition flex items-start gap-2.5 group ${isActive
                                      ? 'bg-teal-500/20 border border-teal-500/40 text-white'
                                      : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                                    }`}
                                >
                                  <div className={`p-1.5 rounded-lg bg-slate-900 border border-slate-800 group-hover:border-teal-500/40 shrink-0 ${item.color}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-semibold leading-tight group-hover:text-teal-300 transition">
                                      {item.label}
                                    </div>
                                    <div className="text-[10px] text-slate-400 leading-snug line-clamp-2 mt-0.5">
                                      {item.desc}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </nav>
          )}

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

            {/* Smart Notification Center Bell Drawer */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700 relative shrink-0"
                  title="Clinical Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold font-mono text-white flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0a0f1d] border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 text-xs animate-in zoom-in-95">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-teal-400" />
                        Clinical Notifications
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[10px] text-teal-400 hover:underline font-mono"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <div className="text-center py-6 text-slate-500">
                          No notifications recorded
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleMarkOneRead(n.id)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition ${n.is_read
                                ? 'bg-slate-900/40 border-slate-800/60 text-slate-400'
                                : 'bg-slate-800/90 border-slate-700 text-white font-medium'
                              }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                              <span
                                className={`uppercase font-bold ${n.priority === 'critical'
                                    ? 'text-red-400'
                                    : n.priority === 'high'
                                      ? 'text-amber-400'
                                      : 'text-teal-400'
                                  }`}
                              >
                                {n.category.replace('_', ' ')}
                              </span>
                              <span className="text-slate-500">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="text-xs font-semibold leading-tight">{n.title}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{n.message}</div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-800 text-center">
                      <button
                        onClick={() => {
                          setShowNotifications(false);
                          navigateTo('notifications');
                        }}
                        className="text-[11px] text-teal-400 hover:text-teal-300 font-semibold"
                      >
                        Open Notification Center →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Clinical Midnight Dark Mode Indicator */}
            <div
              className="p-2 rounded-xl bg-slate-800/80 text-teal-400 border border-slate-700/80 flex items-center justify-center select-none shadow-sm shrink-0"
              title="Clinical Midnight Dark Mode Active"
            >
              <Moon className="w-4 h-4 text-teal-400" />
            </div>

            {/* User Session Info or Login/Register */}
            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="text-right hidden sm:block max-w-[130px] truncate">
                  <div className="text-xs font-semibold text-white leading-tight truncate">{user.full_name}</div>
                  <div className="text-[10px] text-teal-400 uppercase font-mono tracking-wider">{user.role}</div>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/80 hover:text-rose-400 text-slate-400 transition border border-slate-700 shrink-0"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => navigateTo('login')}
                  className="text-xs font-semibold text-slate-200 hover:text-white px-3 py-1.5 rounded-lg transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigateTo('register')}
                  className="text-xs font-bold bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white px-3 py-1.5 rounded-lg shadow-md transition"
                >
                  Register
                </button>
              </div>
            )}

            {/* Mobile / Responsive Hamburger Button for All Clinical Modules */}
            {user && (
              <button
                type="button"
                onClick={() => setShowMobileDrawer(!showMobileDrawer)}
                className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-teal-400 border border-slate-700 lg:hidden flex items-center justify-center transition shrink-0"
                title="All Clinical Features"
              >
                {showMobileDrawer ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            )}

          </div>

        </div>
      </div>

      {/* Mobile / Tablet Full Navigation Slide Drawer */}
      {showMobileDrawer && user && (
        <div className="lg:hidden border-t border-slate-800 bg-[#070d1e]/98 backdrop-blur-2xl p-5 shadow-2xl animate-in slide-in-from-top-2 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-teal-400" />
              <span className="font-bold text-sm text-white">All CardioPulse Features</span>
            </div>
            <button
              onClick={() => setShowMobileDrawer(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-5">
            {clinicalModules.map((col, idx) => (
              <div key={idx} className="space-y-2">
                <h5 className="text-[10px] font-bold uppercase tracking-wider font-mono text-teal-300 border-b border-slate-800 pb-1">
                  {col.category}
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {col.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigateTo(item.id)}
                        className={`text-left p-3 rounded-xl border transition flex items-center justify-between group ${isActive
                            ? 'bg-teal-500/20 border-teal-500/50 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 ${item.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold">{item.label}</div>
                            <div className="text-[10px] text-slate-400">{item.desc}</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
