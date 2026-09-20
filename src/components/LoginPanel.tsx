import { useState, FormEvent } from 'react';
import { UserRole } from '../types';
import CollegeLogo from './CollegeLogo';
import { ShieldCheck, User, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface LoginPanelProps {
  onLogin: (role: UserRole) => void;
}

export default function LoginPanel({ onLogin }: LoginPanelProps) {
  // Available tabs: STAFF (Mark Enter), admin (Admin)
  const [selectedRole, setSelectedRole] = useState<UserRole>('MARK_ENTER');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage('');
    setUserId('');
    setPassword('');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanId = userId.trim();
    if (!cleanId) {
      setErrorMessage(`Please enter your ${selectedRole === 'MARK_ENTER' ? 'Staff ID' : 'Admin ID'}.`);
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (selectedRole === 'MARK_ENTER') {
      if (cleanId.toLowerCase() === '1120_jsec' && password === 'jsec@1120') {
        setErrorMessage('');
        onLogin('MARK_ENTER');
      } else {
        setErrorMessage('Invalid Staff ID or Password.');
      }
      return;
    }

    if (selectedRole === 'ADMIN') {
      if (cleanId.toUpperCase() === 'JAYA SAKTHI' && password === 'jsec@_123') {
        setErrorMessage('');
        onLogin('ADMIN');
      } else {
        setErrorMessage('Invalid Admin ID or Password.');
      }
      return;
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center py-10 px-4 sm:px-6 bg-[#f1f5f9]">
      {/* College Institutional Title */}
      <div className="text-center max-w-2xl mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0d2342] tracking-tight">
          Jaya Sakthi Engineering College
        </h2>
        <p className="text-xs sm:text-sm text-slate-700 font-medium mt-1">
          Approved by AICTE, New Delhi &amp; Affiliated to Anna University, Chennai
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Thiruninravur, Chennai • Empowering Future Engineers
        </p>
      </div>

      {/* Main Login Card Container */}
      <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Top Role Selector Tabs */}
        <div className="bg-slate-100/90 p-2 border-b border-slate-200 flex items-center justify-between gap-2">
          {/* Staff Tab */}
          <button
            type="button"
            id="tab-staff"
            onClick={() => handleRoleChange('MARK_ENTER')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              selectedRole === 'MARK_ENTER'
                ? 'bg-[#f59e0b] text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <User className="w-4 h-4" />
            <span>STAFF</span>
          </button>

          {/* Admin Tab */}
          <button
            type="button"
            id="tab-admin"
            onClick={() => handleRoleChange('ADMIN')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              selectedRole === 'ADMIN'
                ? 'bg-[#f59e0b] text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>admin</span>
          </button>
        </div>

        {/* Card Header Banner (Deep Navy) */}
        <div className="bg-[#0f284e] text-center pt-7 pb-6 px-6 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute inset-0 bg-radial from-blue-600/10 via-transparent to-transparent pointer-events-none" />

          {/* Center College Seal Logo */}
          <div className="mx-auto mb-3 flex justify-center">
            <div className="p-1 rounded-full bg-slate-900/40 border border-amber-400/40 shadow-xl transform hover:scale-105 transition">
              <CollegeLogo size={68} />
            </div>
          </div>

          <div className="text-[11px] font-bold tracking-widest text-[#f59e0b] uppercase font-sans mb-1">
            JAYA SAKTHI ENGINEERING COLLEGE
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide">
            {selectedRole === 'ADMIN' ? 'Admin Portal' : 'Staff Mark Entry Portal'}
          </h3>
          <p className="text-xs text-blue-200/80 mt-1 font-medium">
            {selectedRole === 'MARK_ENTER'
              ? 'Internal Assessment & Continuous Evaluation'
              : 'Verification, Approvals & Result Generation'}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
              {errorMessage}
            </div>
          )}

          {/* User ID Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {selectedRole === 'ADMIN' ? 'ADMIN ID' : 'STAFF ID'}
            </label>
            <div className="relative rounded-xl shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#f59e0b]">
                {selectedRole === 'ADMIN' ? (
                  <ShieldCheck className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <input
                id="user-id-input"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder={
                  selectedRole === 'ADMIN'
                    ? 'Enter Admin ID'
                    : 'Enter Staff ID'
                }
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-800 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              PASSWORD
            </label>
            <div className="relative rounded-xl shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-800 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit CTA Button */}
          <div className="pt-2">
            <button
              id="login-submit-button"
              type="submit"
              className="w-full py-3.5 px-4 bg-[#f59e0b] hover:bg-[#d97706] active:bg-[#b45309] text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 transition transform active:scale-[0.99] cursor-pointer"
            >
              <span>
                {selectedRole === 'ADMIN' ? 'LOGIN AS ADMIN' : 'LOGIN AS STAFF'}
              </span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
