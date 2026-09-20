import { UserRole } from '../types';
import CollegeLogo from './CollegeLogo';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  currentUserRole: UserRole | null;
  onLogout: () => void;
}

export default function Header({
  currentUserRole,
  onLogout,
}: HeaderProps) {
  return (
    <header className="bg-[#0b1e36] text-white border-b border-slate-800/80 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left Branding */}
        <div className="flex items-center gap-3.5">
          <CollegeLogo size={42} />
          <div className="leading-tight">
            <h1 className="text-base sm:text-lg font-black tracking-wide text-white uppercase font-sans">
              JAYA SAKTHI
            </h1>
            <p className="text-[10px] sm:text-xs tracking-wider text-slate-300 font-medium uppercase">
              ENGINEERING COLLEGE - ACADEMIC PORTAL
            </p>
          </div>
        </div>

        {/* Right Info & Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden lg:flex items-center text-xs tracking-wide text-slate-300 font-medium">
            Anna University Affiliated
          </div>

          {currentUserRole && (
            <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-700">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                currentUserRole === 'ADMIN'
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : 'bg-blue-800 text-blue-100 border border-blue-700'
              }`}>
                {currentUserRole === 'ADMIN' ? 'Admin' : 'Staff / Faculty'}
              </span>

              <button
                onClick={onLogout}
                title="Switch Role / Logout"
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Switch / Logout</span>
                <span className="sm:hidden">Exit</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

