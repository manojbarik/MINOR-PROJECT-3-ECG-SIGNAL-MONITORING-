import React, { useState } from 'react';
import { Activity, Lock, Mail, ArrowRight, ArrowLeft, ShieldCheck, Stethoscope, AlertTriangle, Clock, User, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onNavigate: (tab: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('patient@cardiopulse.health');
  const [password, setPassword] = useState('PatientPass123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      if (email === 'manojbarik84998@gmail.com' || email.includes('admin')) {
        onNavigate('admin');
      } else if (email.startsWith('doc') || email.includes('doctor')) {
        onNavigate('doctor');
      } else {
        onNavigate('dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSelect = async (demoEmail: string, demoRole: string, customPwd?: string) => {
    setLoading(true);
    setError(null);
    try {
      await login(demoEmail, customPwd || (demoRole === 'doctor' ? 'DoctorPass123!' : (demoRole === 'admin' ? 'Manoj@123' : 'PatientPass123!')));
      if (demoRole === 'admin') {
        onNavigate('admin');
      } else if (demoRole === 'doctor') {
        onNavigate('doctor');
      } else {
        onNavigate('dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isPendingApproval = error && (
    error.toLowerCase().includes('pending') ||
    error.toLowerCase().includes('approval') ||
    error.toLowerCase().includes('approved')
  );

  return (
    <div className="relative max-w-md mx-auto my-12 px-4">
      {/* Background ambient lighting */}
      <div className="absolute -top-16 -left-16 w-64 h-64 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative glass-panel bg-slate-900/90 rounded-3xl border border-slate-700/80 shadow-2xl shadow-black/80 overflow-hidden backdrop-blur-2xl">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2 border-b border-slate-800/60 bg-slate-950/40">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-300 transition font-mono group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1 text-teal-400" />
            <span>← Back to Home</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('register')}
            className="text-xs text-teal-400 hover:text-teal-300 font-mono transition"
          >
            Create Account →
          </button>
        </div>

        {/* Card Header */}
        <div className="p-8 pb-6 text-center border-b border-slate-800/80 bg-gradient-to-b from-slate-800/40 to-transparent">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500/20 via-cyan-500/15 to-emerald-500/20 border border-teal-500/40 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-teal-500/15 text-teal-400">
            <Activity className="w-7 h-7 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Sign In to CardioPulse</h2>
          <p className="text-xs font-mono text-teal-400 mt-1 uppercase tracking-wider">Multi-Role Clinical Decision Support Portal</p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-7 space-y-4">
          {error && (
            <div className={`p-4 rounded-2xl text-xs flex items-start gap-3 ${
              isPendingApproval
                ? 'bg-amber-950/60 border border-amber-500/40 text-amber-200'
                : 'bg-red-950/60 border border-red-500/40 text-red-200'
            }`}>
              {isPendingApproval ? (
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div>
                {isPendingApproval && <strong className="block font-bold mb-0.5 text-amber-300">Physician Approval Pending:</strong>}
                <span className="leading-relaxed">{error}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-teal-400 transition absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition shadow-inner"
                placeholder="name@cardiopulse.health"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">
              Password
            </label>
            <div className="relative group">
              <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-teal-400 transition absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition shadow-inner font-mono"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-teal-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 animate-spin" /> Authenticating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Sign In to Portal <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>

          <div className="text-center text-xs text-slate-400 pt-5 border-t border-slate-800/80">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="text-teal-400 hover:text-teal-300 font-bold underline transition ml-1"
            >
              Create Account (Doctor or Patient)
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
