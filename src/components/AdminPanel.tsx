import React, { useState, useEffect, useMemo } from 'react';
import { AssessmentMeta, StudentMarkRecord } from '../types';
import { computeMetrics } from '../utils/gradeCalculator';
import {
  SubmittedSheetRecord,
  getStoredSubmittedSheets,
  saveStoredSubmittedSheets,
  exportMarksheetToXLS,
  getYearFromSemester,
} from '../utils/submittedSheets';
import { exportMarksheetToPDF } from '../utils/pdfExport';
import { DEPARTMENTS, getStoredDepartments } from '../utils/studentBatches';
import {
  subscribeToLiveMarksheets,
  updateMarksheetLockInFirestore,
  updateMarksheetApprovalInFirestore,
  deleteMarksheetFromFirestore,
  deleteAllMarksheetsFromFirestore,
} from '../services/firestoreService';
import DownloadPrintModal from './DownloadPrintModal';
import StudentDetailsAdmin from './StudentDetailsAdmin';
import CollegeLogo from './CollegeLogo';
import {
  Building2,
  ShieldCheck,
  CheckCircle,
  Clock,
  Unlock,
  Lock,
  Eye,
  FileSpreadsheet,
  Search,
  Users,
  GraduationCap,
  Printer,
  Download,
  Filter,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  ArrowRight,
  FileText,
  Trash2,
  X,
} from 'lucide-react';

interface AdminPanelProps {
  onOpenMarkEntry: (batchId?: string, semester?: string, department?: string) => void;
  latestSubmittedSheet?: { meta: AssessmentMeta; students: StudentMarkRecord[] } | null;
}

export default function AdminPanel({
  onOpenMarkEntry,
  latestSubmittedSheet,
}: AdminPanelProps) {
  // Navigation between Submitted Marksheets and Student Details (defaults to Student Details & QR)
  const [adminSection, setAdminSection] = useState<'STUDENTS' | 'MARKSHEETS'>('STUDENTS');

  // Stored sheets in central storage
  const [sheets, setSheets] = useState<SubmittedSheetRecord[]>(() => getStoredSubmittedSheets());

  // Filter states: Department, Year & Semester, Subject, Exam Type (empty by default - no auto-loading!)
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedSem, setSelectedSem] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedExamType, setSelectedExamType] = useState<string>('');

  const EXAM_TYPE_OPTIONS = ['CAT-1', 'CAT-2', 'CAT-3', 'Model-1', 'Model-2', 'Model-3', 'Laboratory'];

  const matchesExamType = (sheetExamType: string, filterExamType: string): boolean => {
    if (!filterExamType) return true;
    const s = (sheetExamType || '').trim().toUpperCase();
    const f = filterExamType.trim().toUpperCase();
    if (s === f) return true;
    if (s.startsWith(f)) return true;
    if (
      (f === 'MODEL-1' || f === 'M-1') &&
      (s.includes('MODEL-1') || s.includes('MODEL 1') || s.includes('M-1') || s === 'MODEL EXAMINATION')
    ) return true;
    if (
      (f === 'MODEL-2' || f === 'M-2') &&
      (s.includes('MODEL-2') || s.includes('MODEL 2') || s.includes('M-2') || s.includes('MODEL EXAMINATION 2'))
    ) return true;
    if (
      (f === 'MODEL-3' || f === 'M-3') &&
      (s.includes('MODEL-3') || s.includes('MODEL 3') || s.includes('M-3') || s.includes('MODEL EXAMINATION 3'))
    ) return true;
    if (
      (f === 'LABORATORY' || f === 'LAB') &&
      (s.includes('LABORATORY') || s.includes('LAB'))
    ) return true;
    return s.includes(f);
  };

  // Modal view / print state
  const [selectedSheetForModal, setSelectedSheetForModal] = useState<SubmittedSheetRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [sheetToDelete, setSheetToDelete] = useState<SubmittedSheetRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isDeletingAllSheets, setIsDeletingAllSheets] = useState<boolean>(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState<boolean>(false);
  const [registrySearch, setRegistrySearch] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Real-time listener to Firestore cloud database
  useEffect(() => {
    const unsubscribe = subscribeToLiveMarksheets((cloudSheets) => {
      setSheets(cloudSheets);
    });
    return () => unsubscribe();
  }, []);

  // Sync if latestSubmittedSheet arrives from prop
  useEffect(() => {
    if (latestSubmittedSheet) {
      setSelectedDept(latestSubmittedSheet.meta.department);
      setSelectedSem(latestSubmittedSheet.meta.semester);
      setSelectedSubject(latestSubmittedSheet.meta.subjectCode);
      if (latestSubmittedSheet.meta.examType) {
        const et = latestSubmittedSheet.meta.examType.toUpperCase();
        if (et.includes('CAT-1')) setSelectedExamType('CAT-1');
        else if (et.includes('CAT-2')) setSelectedExamType('CAT-2');
        else if (et.includes('CAT-3')) setSelectedExamType('CAT-3');
        else if (et.includes('MODEL-1') || et.includes('M-1') || et.includes('MODEL 1') || et === 'MODEL EXAMINATION') setSelectedExamType('Model-1');
        else if (et.includes('MODEL-2') || et.includes('M-2') || et.includes('MODEL 2')) setSelectedExamType('Model-2');
        else if (et.includes('MODEL-3') || et.includes('M-3') || et.includes('MODEL 3')) setSelectedExamType('Model-3');
        else if (et.includes('LABORATORY') || et.includes('LAB')) setSelectedExamType('Laboratory');
        else setSelectedExamType(latestSubmittedSheet.meta.examType);
      }
    }
  }, [latestSubmittedSheet]);

  // Available departments matching the updated institutional list
  const departmentOptions = useMemo(() => getStoredDepartments(), [sheets]);

  // Dynamic Year & Semester options according to selected Department
  const availableSemestersForDept = useMemo(() => {
    if (!selectedDept) return [];
    return [
      { label: '1st Year • Semester 1', semester: 'Semester 1' },
      { label: '1st Year • Semester 2', semester: 'Semester 2' },
      { label: '2nd Year • Semester 3', semester: 'Semester 3' },
      { label: '2nd Year • Semester 4', semester: 'Semester 4' },
      { label: '3rd Year • Semester 5', semester: 'Semester 5' },
      { label: '3rd Year • Semester 6', semester: 'Semester 6' },
      { label: '4th Year • Semester 7', semester: 'Semester 7' },
      { label: '4th Year • Semester 8', semester: 'Semester 8' },
    ];
  }, [selectedDept]);

  // Dynamically compute subjects based ONLY on submitted marksheets for the selected department and semester
  const availableSubjects = useMemo(() => {
    if (!selectedDept || !selectedSem) return [];
    const list: { code: string; name: string }[] = [];
    const seen = new Set<string>();

    sheets.forEach((s) => {
      const deptMatches =
        s.meta.department.trim().toLowerCase() === selectedDept.trim().toLowerCase();
      const semMatches =
        s.meta.semester.trim().toLowerCase() === selectedSem.trim().toLowerCase();

      if (deptMatches && semMatches && s.meta.subjectCode?.trim()) {
        const code = s.meta.subjectCode.trim().toUpperCase();
        if (!seen.has(code)) {
          seen.add(code);
          list.push({
            code: s.meta.subjectCode.trim(),
            name: s.meta.subjectName?.trim() || s.meta.subjectCode.trim(),
          });
        }
      }
    });

    return list;
  }, [sheets, selectedDept, selectedSem]);

  // Reset selected subject when changing dept/sem or if no submitted subjects exist
  useEffect(() => {
    if (selectedSubject && availableSubjects.length > 0) {
      const exists = availableSubjects.some(
        (sub) => sub.code.toUpperCase() === selectedSubject.toUpperCase()
      );
      if (!exists) {
        setSelectedSubject('');
      }
    } else if (availableSubjects.length === 0) {
      setSelectedSubject('');
    }
  }, [availableSubjects, selectedSubject]);

  // Is selection complete (Dept, Sem, Subject all chosen)
  const isSelectionComplete = Boolean(selectedDept && selectedSem && selectedSubject);

  // Determine currently active sheet
  const activeSheet = useMemo(() => {
    if (!isSelectionComplete) return null;
    return (
      sheets.find(
        (s) =>
          s.meta.department === selectedDept &&
          s.meta.semester === selectedSem &&
          (s.meta.subjectCode.trim().toUpperCase() === selectedSubject.trim().toUpperCase() ||
            s.meta.subjectName.trim().toLowerCase() === selectedSubject.trim().toLowerCase()) &&
          (!selectedExamType || matchesExamType(s.meta.examType, selectedExamType))
      ) || null
    );
  }, [sheets, isSelectionComplete, selectedDept, selectedSem, selectedSubject, selectedExamType]);

  // Active sheet metrics
  const activeMetrics = useMemo(() => {
    if (!activeSheet) return null;
    return computeMetrics(activeSheet.students, activeSheet.meta.passMark);
  }, [activeSheet]);

  // Toggle unlock in local and live Firestore
  const toggleUnlockStatus = async (id: string) => {
    const target = sheets.find((s) => s.id === id);
    if (!target) return;
    const nextUnlocked = !target.meta.isUnlocked;

    const updated = sheets.map((s) => {
      if (s.id !== id) return s;
      return {
        ...s,
        meta: {
          ...s.meta,
          isUnlocked: nextUnlocked,
          status: nextUnlocked ? ('Draft (Editable)' as const) : ('Submitted (Locked)' as const),
        },
      };
    });
    setSheets(updated);
    saveStoredSubmittedSheets(updated);

    try {
      await updateMarksheetLockInFirestore(id, nextUnlocked);
      showToast(nextUnlocked ? 'Portal unlocked in live cloud database' : 'Portal locked in live cloud database');
    } catch (err) {
      console.warn('Live Firestore update notice:', err);
      showToast('Portal Lock status updated locally');
    }
  };

  // Approve sheet - permanently approved in live database & local storage
  const approveSheet = async (id: string) => {
    if (approvingId) return;
    setApprovingId(id);

    const now = new Date();
    const approvedAtStr = `${now.toLocaleDateString('en-IN')} ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;

    // 1. Immediately update local state & local storage
    const updated = sheets.map((s) => {
      if (s.id !== id) return s;
      return {
        ...s,
        status: 'APPROVED' as const,
        approvedAt: approvedAtStr,
        meta: {
          ...s.meta,
          status: 'Submitted (Locked)' as const,
          isUnlocked: false,
        },
      };
    });
    setSheets(updated);
    saveStoredSubmittedSheets(updated);

    // 2. Persist to live Firestore database so it is permanently approved across all sessions
    try {
      await updateMarksheetApprovalInFirestore(id);
      showToast('Marksheet officially verified and approved by Central Exam Cell');
    } catch (err) {
      console.warn('Live Firestore approval sync notice:', err);
      showToast('Marksheet marked as Approved');
    } finally {
      setApprovingId(null);
    }
  };

  // Direct XLS Download for Admin
  const handleAdminDownloadXLS = (sheet: SubmittedSheetRecord) => {
    const metrics = computeMetrics(sheet.students, sheet.meta.passMark);
    exportMarksheetToXLS(sheet.meta, sheet.students, metrics);
    showToast(`Downloaded ${sheet.meta.subjectCode} Marksheet as Excel (.xlsx)`);
  };

  // Direct PDF Download for Admin
  const handleAdminDownloadPDF = async (sheet: SubmittedSheetRecord) => {
    try {
      const metrics = computeMetrics(sheet.students, sheet.meta.passMark);
      const filename = await exportMarksheetToPDF(sheet.meta, sheet.students, metrics);
      showToast(`Downloaded ${sheet.meta.subjectCode} Marksheet as PDF (${filename})`);
    } catch (err) {
      console.error('Direct PDF export failed, opening preview modal:', err);
      setSelectedSheetForModal(sheet);
    }
  };

  // Open delete confirmation modal (in-app modal - safe in sandboxed iframes)
  const handleDeleteSheet = (sheet: SubmittedSheetRecord) => {
    setSheetToDelete(sheet);
  };

  // Perform verified deletion from state, storage, and live Firestore
  const executeDeleteSheet = async () => {
    if (!sheetToDelete) return;
    const targetSheet = sheetToDelete;
    setIsDeleting(true);

    try {
      // 1. Immediately update UI state and local persistence
      const updated = sheets.filter((s) => s.id !== targetSheet.id);
      setSheets(updated);
      saveStoredSubmittedSheets(updated);

      // If the currently selected active sheet was deleted, reset subject selection
      if (
        selectedSubject.trim().toUpperCase() === targetSheet.meta.subjectCode.trim().toUpperCase() &&
        selectedDept === targetSheet.meta.department &&
        selectedSem === targetSheet.meta.semester
      ) {
        setSelectedSubject('');
      }

      setSheetToDelete(null);

      // 2. Delete from live Firestore database
      await deleteMarksheetFromFirestore(targetSheet.id);
      showToast(`Deleted marksheet for ${targetSheet.meta.subjectCode} (${targetSheet.meta.examType || 'Assessment'})`);
    } catch (err) {
      console.warn('Live Firestore delete notice:', err);
      showToast(`Deleted marksheet for ${targetSheet.meta.subjectCode}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Perform deletion of all submitted marksheets from state, local cache, and live Firestore
  const executeDeleteAllMarksheets = async () => {
    setIsDeletingAllSheets(true);
    try {
      // 1. Clear marksheets in UI state & local persistence
      setSheets([]);
      saveStoredSubmittedSheets([]);
      setSelectedSubject('');

      // 2. Delete all marksheet documents from live Firestore
      await deleteAllMarksheetsFromFirestore();

      setShowDeleteAllModal(false);
      showToast('All submitted marksheets have been permanently deleted.');
    } catch (err) {
      console.error('Error deleting all marksheets:', err);
      showToast('Completed marksheets deletion.');
      setShowDeleteAllModal(false);
    } finally {
      setIsDeletingAllSheets(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f284e] text-white px-4 py-3 rounded-xl shadow-xl border border-blue-400/40 flex items-center gap-2 animate-in fade-in text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Primary Section Switcher Tabs */}
      <div className="flex items-center bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <button
          type="button"
          id="btn-admin-tab-marksheets"
          onClick={() => setAdminSection('MARKSHEETS')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            adminSection === 'MARKSHEETS'
              ? 'bg-[#0f284e] text-white shadow-md ring-2 ring-blue-900/20'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>View Submitted Marksheets</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              adminSection === 'MARKSHEETS'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {sheets.length} Sheets
          </span>
        </button>

        <button
          type="button"
          id="btn-admin-tab-students"
          onClick={() => setAdminSection('STUDENTS')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            adminSection === 'STUDENTS'
              ? 'bg-[#0f284e] text-white shadow-md ring-2 ring-blue-900/20'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Add Student Details &amp; Batch QR</span>
          <span className="text-[10px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full font-bold">
            All Depts &amp; Years
          </span>
        </button>
      </div>

      {/* Render selected section */}
      {adminSection === 'STUDENTS' ? (
        /* Multi-Department & Year/Semester Student Batch Management with QR */
        <StudentDetailsAdmin
          onOpenBatchMarkEntry={(batchId, semester, department) => onOpenMarkEntry(batchId, semester, department)}
        />
      ) : (
        /* Marksheets View with Dept, Year, Sem, Subject Filters & Download Options */
        <div className="space-y-6">
          {/* Top KPI Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500">Submitted Marksheets</div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{sheets.length}</div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500">Approved Marksheets</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
                {sheets.filter((s) => s.status === 'APPROVED').length}
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500">Pending Review</div>
              <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
                {sheets.filter((s) => s.status === 'PENDING_VERIFICATION').length}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* INTERACTIVE SELECTOR: DEPT, YEAR/SEMESTER, SUBJECT (STEP BY STEP)         */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-900" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Select Department, Year/Semester, Subject &amp; Exam Type
                  </h3>
                  <p className="text-xs text-slate-500">
                    Filter by department, year/semester, subject and exam type to view marksheets and download PDF &amp; XLS.
                  </p>
                </div>
              </div>

              {(selectedDept || selectedSem || selectedSubject || selectedExamType) && (
                <button
                  type="button"
                  id="btn-admin-reset-selection"
                  onClick={() => {
                    setSelectedDept('');
                    setSelectedSem('');
                    setSelectedSubject('');
                    setSelectedExamType('');
                  }}
                  className="text-xs text-rose-600 font-bold hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-center"
                >
                  Reset Selection
                </button>
              )}
            </div>

            {/* 4-Step Selection Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Department */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  1. SELECT DEPARTMENT
                </label>
                <select
                  id="admin-select-dept"
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    setSelectedSem('');
                    setSelectedSubject('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="">-- Choose Department --</option>
                  {departmentOptions.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Year & Semester */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  2. SELECT YEAR / SEMESTER
                </label>
                <select
                  id="admin-select-sem"
                  disabled={!selectedDept}
                  value={selectedSem}
                  onChange={(e) => {
                    setSelectedSem(e.target.value);
                    setSelectedSubject('');
                  }}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-800 focus:outline-hidden ${
                    !selectedDept
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-50 border-slate-300 text-slate-900 cursor-pointer'
                  }`}
                >
                  <option value="">
                    {!selectedDept ? '-- Select Department first --' : '-- Choose Year / Semester --'}
                  </option>
                  {availableSemestersForDept.map((item) => (
                    <option key={item.semester} value={item.semester}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Subject */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    3. SELECT SUBJECT
                  </label>
                  {selectedDept && selectedSem && (
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${
                        availableSubjects.length > 0
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {availableSubjects.length > 0
                        ? `${availableSubjects.length} Submitted`
                        : '0 Submitted'}
                    </span>
                  )}
                </div>
                <select
                  id="admin-select-subject"
                  disabled={!selectedDept || !selectedSem || availableSubjects.length === 0}
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-800 focus:outline-hidden ${
                    !selectedDept || !selectedSem || availableSubjects.length === 0
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-50 border-blue-600 text-slate-900 ring-1 ring-blue-500/30 cursor-pointer'
                  }`}
                >
                  <option value="">
                    {!selectedDept || !selectedSem
                      ? '-- Select Dept & Semester first --'
                      : availableSubjects.length === 0
                      ? '-- No submitted subjects yet --'
                      : `-- Choose Submitted Subject (${availableSubjects.length}) --`}
                  </option>
                  {availableSubjects.map((sub) => (
                    <option key={sub.code} value={sub.code}>
                      {sub.code} - {sub.name}
                    </option>
                  ))}
                </select>
                {selectedDept && selectedSem && availableSubjects.length === 0 && (
                  <p className="text-[11px] text-amber-700 mt-1.5 font-medium">
                    No submitted marksheet found for this semester. Only submitted subjects appear here.
                  </p>
                )}
              </div>

              {/* 4. Exam Type */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  4. SELECT EXAM TYPE
                </label>
                <select
                  id="admin-select-exam-type"
                  value={selectedExamType}
                  onChange={(e) => setSelectedExamType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="">-- Choose Exam Type --</option>
                  {EXAM_TYPE_OPTIONS.map((exam) => (
                    <option key={exam} value={exam}>
                      {exam}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* DISPLAY SELECTED MARKSHEET (ONLY AFTER ALL 3 DROPDOWNS ARE CHOSEN)        */}
          {/* ========================================================================= */}
          {isSelectionComplete && activeSheet && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-5">
              {/* Marksheet Title & Top Controls Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-[#0f284e] text-white text-xs font-mono font-bold px-2.5 py-1 rounded-md">
                      {activeSheet.meta.subjectCode}
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900">
                      {activeSheet.meta.subjectName}
                    </h3>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        activeSheet.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {activeSheet.status === 'APPROVED' ? 'Approved by Exam Cell' : 'Pending Verification'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-2">
                    <span className="font-bold text-slate-800">{activeSheet.meta.department}</span>
                    <span>•</span>
                    <span className="font-semibold text-blue-900">{activeSheet.meta.semester}</span>
                    <span>•</span>
                    <span className="font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300/80">
                      {activeSheet.meta.examType}
                    </span>
                    <span>•</span>
                    <span>{activeSheet.meta.academicYear}</span>
                    <span>•</span>
                    <span>Faculty: <strong className="text-slate-800">{activeSheet.meta.facultyInCharge || 'Faculty In-Charge'}</strong></span>
                    {activeSheet.meta.evaluatorName && (
                      <>
                        <span>•</span>
                        <span>Evaluator: <strong className="text-slate-800">{activeSheet.meta.evaluatorName}</strong></span>
                      </>
                    )}
                    <span>•</span>
                    <span>Submitted: {activeSheet.submittedAt}</span>
                  </div>
                </div>

                {/* ADMIN DOWNLOAD OPTIONS (PDF & XLS) */}
                <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
                  {/* Download PDF button */}
                  <button
                    type="button"
                    id="btn-admin-download-pdf"
                    onClick={() => handleAdminDownloadPDF(activeSheet)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer border border-amber-600"
                    title="Download Marksheet as Official PDF Document"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download as PDF</span>
                  </button>

                  {/* Download XLS button */}
                  <button
                    type="button"
                    id="btn-admin-download-xls"
                    onClick={() => handleAdminDownloadXLS(activeSheet)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer border border-emerald-800"
                    title="Download Marksheet as Excel Spreadsheet (.xlsx)"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                    <span>Download as XLS (.xlsx)</span>
                  </button>

                  {/* Preview / Print Modal */}
                  <button
                    type="button"
                    id="btn-admin-preview-modal"
                    onClick={() => setSelectedSheetForModal(activeSheet)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer border border-slate-300"
                    title="Open Marksheet Print & Preview Dialog"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Print / Preview</span>
                  </button>

                  {/* Approve button: Once approved, show permanent Approved status badge and NEVER show Approve option again */}
                  {activeSheet.status === 'APPROVED' ? (
                    <div
                      id="badge-admin-approved-status"
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shadow-2xs select-none"
                      title="This marksheet has been officially verified and approved by the Central Exam Cell"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Approved by Exam Cell</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      id="btn-admin-approve-active"
                      onClick={() => approveSheet(activeSheet.id)}
                      disabled={approvingId === activeSheet.id}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                      title="Verify and Approve this marksheet"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>{approvingId === activeSheet.id ? 'Approving...' : 'Approve'}</span>
                    </button>
                  )}

                  {/* Lock / Unlock Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleUnlockStatus(activeSheet.id)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      activeSheet.meta.isUnlocked
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {activeSheet.meta.isUnlocked ? (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Portal Unlocked</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Portal Locked</span>
                      </>
                    )}
                  </button>

                  {/* Delete Marksheet for Admin */}
                  <button
                    type="button"
                    id="btn-admin-delete-active-sheet"
                    onClick={() => handleDeleteSheet(activeSheet)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition cursor-pointer border border-rose-200"
                    title="Delete this marksheet from system"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete Marksheet</span>
                  </button>
                </div>
              </div>

              {/* Student Marksheet Table */}
              <div className="rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                <div className="bg-[#071a33] text-white px-4 py-3 flex items-center justify-between">
                  <div className="text-xs font-bold tracking-wide uppercase">
                    <span>{activeSheet.meta.subjectCode} - {activeSheet.meta.subjectName}</span>
                    <span className="text-amber-400 ml-2 font-mono">({activeSheet.students.length} Students)</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Max: {activeSheet.meta.maxMarks} | Pass: {activeSheet.meta.passMark}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px]">
                        <th className="py-2.5 px-3 text-center w-12">#</th>
                        <th className="py-2.5 px-3">REGISTER NUMBER</th>
                        <th className="py-2.5 px-3">STUDENT NAME</th>
                        <th className="py-2.5 px-3 text-center">ATTENDANCE</th>
                        <th className="py-2.5 px-3 text-center">MAX MARKS</th>
                        <th className="py-2.5 px-3 text-center">MARKS OBTAINED</th>
                        <th className="py-2.5 px-3 text-center">GRADE</th>
                        <th className="py-2.5 px-3 text-center">RESULT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {activeSheet.students.map((student, idx) => (
                        <tr key={student.id} className="hover:bg-blue-50/40 transition">
                          <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">{student.regNo}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">{student.name}</td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                student.attendance === 'PRESENT'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {student.attendance}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-semibold text-slate-600">
                            {student.maxMarks}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">
                            {student.marksObtained === '' ? (
                              <span className="text-red-600 font-bold">AB</span>
                            ) : (
                              student.marksObtained
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                student.grade === 'O'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                  : student.grade === 'A+'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                  : student.grade === 'A'
                                  ? 'bg-teal-100 text-teal-900 border border-teal-200'
                                  : student.grade === 'B+'
                                  ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                  : student.grade === 'B'
                                  ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                  : student.grade === 'C'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : student.grade === 'AB'
                                  ? 'bg-slate-200 text-slate-700 border border-slate-300'
                                  : 'bg-rose-100 text-rose-900 border border-rose-200'
                              }`}
                            >
                              {student.grade}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider ${
                                student.result === 'PASS'
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-rose-500 text-white'
                              }`}
                            >
                              {student.result}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Evaluation Summary & Performance Metrics Card (Below Students Table - Exact match to image) */}
              {activeMetrics && (
                <div className="border border-slate-300 rounded-xl p-5 bg-white shadow-2xs">
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide pb-2.5 border-b border-slate-200">
                    EVALUATION SUMMARY &amp; PERFORMANCE METRICS
                  </h4>

                  <div className="grid grid-cols-2 gap-x-12 gap-y-3 py-4 text-xs font-bold text-slate-800 max-w-2xl">
                    {/* Row 1 */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">No of student Present:</span>
                      <span className="text-emerald-600 font-black text-sm">{activeMetrics.presentCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">No of student Pass:</span>
                      <span className="text-emerald-600 font-black text-sm">{activeMetrics.passCount}</span>
                    </div>

                    {/* Row 2 */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">No of student Absent:</span>
                      <span className="text-slate-900 font-black text-sm">{activeMetrics.absentCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">no of student Fail:</span>
                      <span className="text-slate-900 font-black text-sm">{activeMetrics.failCount}</span>
                    </div>
                  </div>

                  {/* Pass Percentage Pill Banner */}
                  <div className="bg-[#eef2ff] border border-blue-100 rounded-xl py-2.5 text-center text-xs sm:text-sm font-bold text-blue-700">
                    Pass percentage: {activeMetrics.passPercentage.toFixed(2)}%
                  </div>
                </div>
              )}

              {/* Signatures Row (1. Evaluator Name & Sign, 2. Exam Cell Coordinator, 3. Principal Sign) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 text-center text-xs">
                <div>
                  <div className="w-40 h-0.5 bg-slate-300 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-700">Evaluator Signature</p>
                  <p className="text-[11px] text-slate-500 font-medium">({activeSheet.meta.evaluatorName || 'Evaluator Signature'})</p>
                </div>
                <div>
                  <div className="w-40 h-0.5 bg-slate-300 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-700">Exam Cell Coordinator</p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {activeSheet.meta.examCellCoordinator
                      ? `(${activeSheet.meta.examCellCoordinator})`
                      : '(Central Exam Cell)'}
                  </p>
                </div>
                <div>
                  <div className="w-40 h-0.5 bg-slate-300 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-700">Principal Signature</p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {activeSheet.meta.principalName
                      ? `(${activeSheet.meta.principalName})`
                      : activeSheet.meta.principalSignature
                      ? `(${activeSheet.meta.principalSignature})`
                      : '(Principal)'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SELECTION COMPLETE BUT NO MARKSHEET SUBMITTED YET FOR THIS SUBJECT        */}
          {/* ========================================================================= */}
          {isSelectionComplete && !activeSheet && (
            <div className="bg-white rounded-2xl p-10 border border-slate-200/90 text-center space-y-4 shadow-2xs">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <Clock className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="text-base font-extrabold text-slate-900">
                  No Marksheet Submitted Yet
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  The faculty in-charge has not yet submitted marks for <strong className="text-slate-900">{selectedSubject}</strong> in <strong className="text-slate-900">{selectedDept}</strong> ({selectedSem}).
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUBMITTED MARKSHEETS REGISTRY OVERVIEW (WHEN NOT VIEWING SINGLE SHEET)    */}
          {/* ========================================================================= */}
          {!activeSheet && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                      Submitted Marksheets Registry ({sheets.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Quickly view, download PDF/XLS, or delete any marksheet across all departments
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    id="btn-admin-delete-all-marksheets"
                    onClick={() => setShowDeleteAllModal(true)}
                    disabled={sheets.length === 0}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold transition shadow-2xs ${
                      sheets.length === 0
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 cursor-pointer'
                    }`}
                    title={
                      sheets.length === 0
                        ? 'No submitted marksheets to delete'
                        : `Delete all ${sheets.length} submitted marksheets from the database`
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete All Marksheets</span>
                  </button>

                  {sheets.length > 0 && (
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        id="input-search-submitted-registry"
                        placeholder="Search subject, faculty, evaluator..."
                        value={registrySearch}
                        onChange={(e) => setRegistrySearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-900 focus:outline-hidden"
                      />
                    </div>
                  )}
                </div>
              </div>

              {sheets.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No marksheets have been submitted yet across departments.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px]">
                        <th className="py-2.5 px-3">Subject</th>
                        <th className="py-2.5 px-3">Dept &amp; Sem</th>
                        <th className="py-2.5 px-3">Exam Type</th>
                        <th className="py-2.5 px-3">Evaluator / Faculty</th>
                        <th className="py-2.5 px-3 text-center">Students</th>
                        <th className="py-2.5 px-3">Submitted At</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sheets
                        .filter((s) => {
                          if (!registrySearch.trim()) return true;
                          const q = registrySearch.trim().toLowerCase();
                          return (
                            s.meta.subjectCode.toLowerCase().includes(q) ||
                            s.meta.subjectName.toLowerCase().includes(q) ||
                            s.meta.department.toLowerCase().includes(q) ||
                            s.meta.semester.toLowerCase().includes(q) ||
                            (s.meta.examType || '').toLowerCase().includes(q) ||
                            (s.meta.facultyInCharge || '').toLowerCase().includes(q) ||
                            (s.meta.evaluatorName || '').toLowerCase().includes(q)
                          );
                        })
                        .map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-blue-950 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[11px]">
                                {s.meta.subjectCode}
                              </span>
                              <div className="font-bold text-slate-900 mt-0.5 max-w-[200px] truncate">
                                {s.meta.subjectName}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-800">{s.meta.department}</div>
                              <div className="text-[11px] text-blue-900 font-semibold">{s.meta.semester}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[11px] font-bold">
                                {s.meta.examType}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-800">
                                {s.meta.evaluatorName || <span className="text-slate-400 italic">Evaluator Pending</span>}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Faculty: {s.meta.facultyInCharge || 'Faculty'}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                              {s.students.length}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                              {s.submittedAt}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  s.status === 'APPROVED'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                              >
                                {s.status === 'APPROVED' ? 'Approved' : 'Pending'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  id={`btn-view-sheet-${s.id}`}
                                  onClick={() => {
                                    setSelectedDept(s.meta.department);
                                    setSelectedSem(s.meta.semester);
                                    setSelectedSubject(s.meta.subjectCode);
                                    setSelectedExamType(s.meta.examType);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="px-2.5 py-1 bg-[#0f284e] hover:bg-blue-900 text-white rounded-lg text-[11px] font-bold transition cursor-pointer shadow-2xs"
                                  title="View full marksheet with all student rows"
                                >
                                  View
                                </button>
                                <button
                                  type="button"
                                  id={`btn-pdf-sheet-${s.id}`}
                                  onClick={() => handleAdminDownloadPDF(s)}
                                  className="p-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition cursor-pointer"
                                  title="Download PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  id={`btn-xls-sheet-${s.id}`}
                                  onClick={() => handleAdminDownloadXLS(s)}
                                  className="p-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                                  title="Download Excel (.xlsx)"
                                >
                                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                                </button>
                                <button
                                  type="button"
                                  id={`btn-delete-sheet-${s.id}`}
                                  onClick={() => handleDeleteSheet(s)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition cursor-pointer border border-rose-200"
                                  title="Delete this marksheet"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Admin Printable PDF Preview / Print Modal */}
      {selectedSheetForModal && (
        <DownloadPrintModal
          isOpen={!!selectedSheetForModal}
          onClose={() => setSelectedSheetForModal(null)}
          meta={selectedSheetForModal.meta}
          students={selectedSheetForModal.students}
          metrics={computeMetrics(selectedSheetForModal.students, selectedSheetForModal.meta.passMark)}
          userRole="ADMIN"
        />
      )}

      {/* Delete Marksheet In-App Confirmation Modal (Safe in Sandboxed iFrames) */}
      {sheetToDelete && (
        <div
          id="modal-delete-marksheet-confirmation"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Delete Marksheet?
                  </h3>
                  <p className="text-xs text-rose-600 font-semibold">
                    Permanent action • Cannot be undone
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-delete-modal"
                onClick={() => setSheetToDelete(null)}
                disabled={isDeleting}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Marksheet Details Summary Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                  {sheetToDelete.meta.subjectCode}
                </span>
                <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                  {sheetToDelete.meta.examType}
                </span>
              </div>
              <div className="font-extrabold text-slate-900 text-sm">
                {sheetToDelete.meta.subjectName}
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px] pt-1">
                <div>
                  <span className="text-slate-400 block">Department:</span>
                  <strong className="text-slate-800">{sheetToDelete.meta.department}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Semester:</span>
                  <strong className="text-slate-800">{sheetToDelete.meta.semester}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Evaluator:</span>
                  <strong className="text-slate-800">{sheetToDelete.meta.evaluatorName || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Faculty:</span>
                  <strong className="text-slate-800">{sheetToDelete.meta.facultyInCharge || 'Faculty'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Student Records:</span>
                  <strong className="text-slate-800">{sheetToDelete.students.length} students</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Submitted At:</span>
                  <strong className="text-slate-800">{sheetToDelete.submittedAt}</strong>
                </div>
              </div>
            </div>

            {/* Explanatory text */}
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove this marksheet? It will be deleted from the live central cloud database and the admin portal. Faculty will be able to re-enter and submit marks if needed.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="btn-cancel-delete-sheet"
                onClick={() => setSheetToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-sheet"
                onClick={executeDeleteSheet}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Marksheet'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Modal for Delete All Marksheets */}
      {showDeleteAllModal && (
        <div
          id="modal-delete-all-marksheets-confirmation"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Delete All Marksheets?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permanently delete all submitted marksheets and marks records.
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2 text-xs text-slate-700">
              <p className="font-semibold text-rose-900">
                You are about to delete all {sheets.length} submitted marksheet{sheets.length === 1 ? '' : 's'}.
              </p>
              <p className="leading-relaxed text-slate-600">
                This action will delete all submitted assessment mark records from both the live cloud database and the exam cell portal. Faculty members will be able to enter and submit fresh marks for these subjects.
              </p>
              <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 font-medium">
                Note: Student details, batch rosters, and department configurations will remain intact and will NOT be deleted.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="btn-cancel-delete-all-marksheets"
                onClick={() => setShowDeleteAllModal(false)}
                disabled={isDeletingAllSheets}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-all-marksheets"
                onClick={executeDeleteAllMarksheets}
                disabled={isDeletingAllSheets || sheets.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingAllSheets ? 'Deleting Marksheets...' : 'Yes, Delete All Marksheets'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
