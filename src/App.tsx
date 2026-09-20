import { useState, useEffect } from 'react';
import { UserRole, AssessmentMeta, StudentMarkRecord } from './types';
import Header from './components/Header';
import LoginPanel from './components/LoginPanel';
import MarkEntryPanel from './components/MarkEntryPanel';
import AdminPanel from './components/AdminPanel';
import { LiveSyncProvider } from './context/LiveSyncContext';

export default function App() {
  // Current active view / role
  // null = Login screen
  // 'MARK_ENTER' = Staff Mark Entry
  // 'ADMIN' = Admin Portal
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);

  // Selected batch & semester & department (e.g. from QR scan or Admin open)
  const [activeBatchId, setActiveBatchId] = useState<string | undefined>(undefined);
  const [activeSemester, setActiveSemester] = useState<string | undefined>(undefined);
  const [activeDepartment, setActiveDepartment] = useState<string | undefined>(undefined);
  const [isLockedToBatch, setIsLockedToBatch] = useState<boolean>(false);

  // Keep track of latest submitted sheet so Admin can inspect it live
  const [latestSubmission, setLatestSubmission] = useState<{
    meta: AssessmentMeta;
    students: StudentMarkRecord[];
  } | null>(null);

  // Handle URL parameters for QR scan deep linking (e.g. ?role=staff&batch=aids_year1_sem1&dept=...&sem=Semester%201&qr=true)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get('role');
      const batchParam = params.get('batch');
      const semParam = params.get('sem');
      const deptParam = params.get('dept');
      const qrParam = params.get('qr');
      const lockedParam = params.get('locked');

      const isQr = qrParam === 'true' || lockedParam === 'true' || Boolean(batchParam);

      if (batchParam) {
        setActiveBatchId(batchParam);
      }
      if (semParam) {
        setActiveSemester(semParam);
      }
      if (deptParam) {
        setActiveDepartment(deptParam);
      }
      if (isQr) {
        setIsLockedToBatch(true);
      }

      if (roleParam === 'staff' || roleParam === 'MARK_ENTER' || isQr) {
        setCurrentUserRole('MARK_ENTER');
      } else if (roleParam === 'admin' || roleParam === 'ADMIN') {
        setCurrentUserRole('ADMIN');
      }
    } catch (e) {
      console.error('Error parsing URL query parameters', e);
    }
  }, []);

  const handleLogin = (role: UserRole) => {
    setCurrentUserRole(role);
    setIsLockedToBatch(false);
  };

  const handleLogout = () => {
    setCurrentUserRole(null);
    setActiveBatchId(undefined);
    setActiveSemester(undefined);
    setActiveDepartment(undefined);
    setIsLockedToBatch(false);
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const handleOpenMarkEntryFromAdmin = (batchId?: string, semester?: string, department?: string) => {
    if (batchId) setActiveBatchId(batchId);
    if (semester) setActiveSemester(semester);
    if (department) setActiveDepartment(department);
    setIsLockedToBatch(true);
    setCurrentUserRole('MARK_ENTER');
  };

  const handleNotifyAdminSubmission = (
    meta: AssessmentMeta,
    students: StudentMarkRecord[]
  ) => {
    setLatestSubmission({ meta, students });
  };

  return (
    <LiveSyncProvider>
      <div className="min-h-screen bg-[#f1f5f9] flex flex-col font-sans text-slate-900 selection:bg-blue-200">
        {/* Top Navigation Bar with College Header */}
        <Header
          currentUserRole={currentUserRole}
          onLogout={handleLogout}
        />

        {/* Main View Body */}
        <main className="flex-1">
          {!currentUserRole && (
            <LoginPanel onLogin={handleLogin} />
          )}

          {currentUserRole === 'MARK_ENTER' && (
            <MarkEntryPanel
              key={`${activeBatchId || 'default'}-${activeSemester || 'default'}-${activeDepartment || 'default'}-${isLockedToBatch ? 'locked' : 'open'}`}
              initialBatchId={activeBatchId}
              initialSemester={activeSemester}
              initialDepartment={activeDepartment}
              isLockedToBatch={isLockedToBatch}
              onNotifyAdminSubmission={handleNotifyAdminSubmission}
            />
          )}

          {currentUserRole === 'ADMIN' && (
            <AdminPanel
              onOpenMarkEntry={handleOpenMarkEntryFromAdmin}
              latestSubmittedSheet={latestSubmission}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-4 px-4 text-center">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              &copy; {new Date().getFullYear()} Jaya Sakthi Engineering College. Anna University Affiliated.
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-3">
              <span>Central Exam Cell ERP v2.6</span>
              <span>•</span>
              <span>AICTE Approved</span>
              <span>•</span>
              <span>Thiruninravur, Chennai</span>
            </div>
          </div>
        </footer>
      </div>
    </LiveSyncProvider>
  );
}

