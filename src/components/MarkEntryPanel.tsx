import React, { useState, useMemo, useEffect } from 'react';
import {
  StudentMarkRecord,
  AssessmentMeta,
  AttendanceStatus,
} from '../types';
import {
  calculateGradeAndResult,
  computeMetrics,
  initialSampleStudents,
} from '../utils/gradeCalculator';
import {
  getStoredBatches,
  convertToMarkRecords,
  findBatchByDeptAndSem,
  YearBatchConfig,
  DEPARTMENTS,
} from '../utils/studentBatches';
import { addSubmittedMarksheet, getStoredSubmittedSheets, SubmittedSheetRecord, findDuplicateSubmittedSheet } from '../utils/submittedSheets';
import { saveMarksheetToFirestore, subscribeToLiveBatches, subscribeToLiveMarksheets } from '../services/firestoreService';
import DownloadPrintModal from './DownloadPrintModal';
import {
  GraduationCap,
  Building2,
  Send,
  Download,
  Lock,
  Unlock,
  Trash2,
  Users,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  QrCode,
  Sparkles,
  Database,
} from 'lucide-react';

interface MarkEntryPanelProps {
  key?: React.Key;
  initialBatchId?: string;
  initialSemester?: string;
  initialDepartment?: string;
  isLockedToBatch?: boolean;
  onNotifyAdminSubmission?: (meta: AssessmentMeta, students: StudentMarkRecord[]) => void;
}

export default function MarkEntryPanel({
  initialBatchId,
  initialSemester,
  initialDepartment,
  isLockedToBatch = false,
  onNotifyAdminSubmission,
}: MarkEntryPanelProps) {
  // Helper to locate target batch based on ID, department + semester, or fallback
  const findTargetBatch = (): YearBatchConfig | undefined => {
    const batches = getStoredBatches();
    if (initialBatchId) {
      const match = batches.find((b) => b.id === initialBatchId);
      if (match) return match;
    }
    if (initialDepartment && initialSemester) {
      const match = findBatchByDeptAndSem(initialDepartment, initialSemester);
      if (match) return match;
    }
    if (initialDepartment) {
      const match = batches.find(
        (b) => b.department.trim().toLowerCase() === initialDepartment.trim().toLowerCase()
      );
      if (match) return match;
    }
    return batches[0];
  };

  // Assessment Metadata state matching UI1.png
  const [meta, setMeta] = useState<AssessmentMeta>(() => {
    const matched = findTargetBatch();

    if (matched) {
      return {
        yearCategory: matched.yearCategory,
        department: initialDepartment || matched.department,
        semester: initialSemester || matched.semester,
        examType: 'CAT-1',
        academicYear: matched.academicYear,
        facultyInCharge: '',
        evaluatorName: '',
        assessmentDate: '10/09/2026',
        subjectCode: matched.defaultSubjectCode || '',
        subjectName: matched.defaultSubjectName || '',
        maxMarks: 50,
        passMark: 25,
        isUnlocked: true,
        status: 'Draft (Editable)',
        hodName: '',
        principalSignature: '',
        examCellCoordinator: '',
        principalName: '',
      };
    }

    return {
      yearCategory: '1ST_YEAR',
      department: initialDepartment || 'AI&DS - Artificial Intelligence & Data Science',
      semester: initialSemester || 'Semester 1',
      examType: 'CAT-1',
      academicYear: '2024-2028',
      facultyInCharge: '',
      evaluatorName: '',
      assessmentDate: '10/09/2026',
      subjectCode: '',
      subjectName: '',
      maxMarks: 50,
      passMark: 25,
      isUnlocked: true,
      status: 'Draft (Editable)',
      hodName: '',
      principalSignature: '',
      examCellCoordinator: '',
      principalName: '',
    };
  });

  // Active loaded batch
  const [activeBatchName, setActiveBatchName] = useState<string>(() => {
    const matched = findTargetBatch();
    return matched ? matched.yearLabel : '1st Yr / 1st Sem Students';
  });

  // Track if marks were scaled from 50 (or another max < 100) to 100
  const [isConvertedFrom50, setIsConvertedFrom50] = useState<boolean>(false);
  const [originalMaxMark, setOriginalMaxMark] = useState<number>(50);
  const [originalPassMark, setOriginalPassMark] = useState<number>(25);

  // All submitted marksheets (synced from localStorage and live Firestore) to avoid duplicates
  const [submittedSheets, setSubmittedSheets] = useState<SubmittedSheetRecord[]>(() => getStoredSubmittedSheets());

  // Subscribe to live Firestore submitted marksheets updates
  useEffect(() => {
    const unsubscribe = subscribeToLiveMarksheets((cloudSheets) => {
      setSubmittedSheets(cloudSheets);
    });
    return () => unsubscribe();
  }, []);

  // Required header fields that must be entered before marks can be submitted
  const REQUIRED_HEADER_FIELDS = [
    { key: 'department', label: 'Department' },
    { key: 'semester', label: 'Semester' },
    { key: 'examType', label: 'Exam Type' },
    { key: 'academicYear', label: 'Academic Year' },
    { key: 'facultyInCharge', label: 'Faculty In-Charge' },
    { key: 'evaluatorName', label: 'Evaluator Name' },
    { key: 'assessmentDate', label: 'Assessment Date' },
    { key: 'subjectCode', label: 'Subject Code' },
    { key: 'subjectName', label: 'Subject Name' },
  ] as const;

  // Validation: Missing required header fields
  const missingHeaderFields = useMemo(() => {
    return REQUIRED_HEADER_FIELDS.filter((field) => {
      const val = meta[field.key as keyof AssessmentMeta];
      return typeof val !== 'string' || val.trim() === '';
    });
  }, [
    meta.department,
    meta.semester,
    meta.examType,
    meta.academicYear,
    meta.facultyInCharge,
    meta.evaluatorName,
    meta.assessmentDate,
    meta.subjectCode,
    meta.subjectName,
  ]);

  const isHeaderComplete = missingHeaderFields.length === 0;

  // Duplicate Check: Check if subject code, subject name, and exam type already submitted
  const duplicateSubmittedSheet = useMemo(() => {
    // If sheet is unlocked by Admin specifically for editing, allow faculty to proceed
    if (meta.isUnlocked && meta.status === 'Unlocked for Editing') {
      return null;
    }

    const code = (meta.subjectCode || '').trim().toUpperCase();
    const name = (meta.subjectName || '').trim().toUpperCase();
    const exam = (meta.examType || '').trim().toUpperCase();

    if (!code || !name || !exam) return null;

    const normalizeExam = (e: string) =>
      e.toUpperCase().replace(/\s+/g, '').replace(/^M-/, 'MODEL-');

    return submittedSheets.find((s) => {
      const sCode = (s.meta.subjectCode || '').trim().toUpperCase();
      const sName = (s.meta.subjectName || '').trim().toUpperCase();
      const sExam = (s.meta.examType || '').trim().toUpperCase();

      const isCodeMatch = sCode === code;
      const isNameMatch = sName === name;
      const isExamMatch = normalizeExam(sExam) === normalizeExam(exam);

      // Department and semester check if applicable
      const sDept = (s.meta.department || '').trim().toLowerCase();
      const curDept = (meta.department || '').trim().toLowerCase();
      const isDeptMatch = !curDept || !sDept || sDept === curDept;

      const sSem = (s.meta.semester || '').trim().toLowerCase();
      const curSem = (meta.semester || '').trim().toLowerCase();
      const isSemMatch = !curSem || !sSem || sSem === curSem;

      return isCodeMatch && isNameMatch && isExamMatch && isDeptMatch && isSemMatch;
    }) || null;
  }, [
    meta.subjectCode,
    meta.subjectName,
    meta.examType,
    meta.department,
    meta.semester,
    meta.isUnlocked,
    meta.status,
    submittedSheets,
  ]);

  // Is marksheet locked due to duplicate submission or submitted status
  const isDuplicateLocked = Boolean(duplicateSubmittedSheet);
  const isEntryDisabled = isDuplicateLocked || meta.status === 'Submitted (Locked)';

  // Students list state initialized with registered batch students
  const [students, setStudents] = useState<StudentMarkRecord[]>(() => {
    const matched = findTargetBatch();
    if (matched && matched.students.length > 0) {
      return convertToMarkRecords(matched.students, 50);
    }
    return [];
  });

  // Reload students specifically for the assigned batch in locked mode
  const reloadAssignedRoster = () => {
    const matched = findTargetBatch();
    if (matched) {
      setActiveBatchName(matched.yearLabel);
      setStudents(convertToMarkRecords(matched.students, meta.maxMarks));
      showToast(`Reloaded ${matched.students.length} students from ${matched.yearLabel}`);
    }
  };

  // Helper to load students for a semester from central batches (used only in unlocked mode)
  const loadRosterForSemester = (
    semester: string,
    currentCategory = meta.yearCategory,
    currentDept = meta.department
  ) => {
    if (isLockedToBatch) {
      reloadAssignedRoster();
      return;
    }
    const batches = getStoredBatches();
    let matched: YearBatchConfig | undefined = findBatchByDeptAndSem(currentDept, semester);

    if (!matched) {
      if (semester === 'Semester 1' || semester === 'Semester 2') {
        matched = batches.find((b) => b.semester === semester && b.department === currentDept) ||
                  batches.find((b) => b.id === 'year1_sem1');
      } else if (semester === 'Semester 3' || semester === 'Semester 4') {
        matched = batches.find((b) => b.semester === semester && b.department === currentDept) ||
                  batches.find((b) => b.id === 'cse_year2_sem3') ||
                  batches.find((b) => b.id === 'year2_sem3');
      } else if (semester === 'Semester 5' || semester === 'Semester 6') {
        matched = batches.find((b) => b.semester === semester && b.department === currentDept) ||
                  batches.find((b) => b.id === 'cse_year3_sem5') ||
                  batches.find((b) => b.id === 'year3_sem5');
      } else if (semester === 'Semester 7' || semester === 'Semester 8') {
        matched = batches.find((b) => b.semester === semester && b.department === currentDept) ||
                  batches.find((b) => b.id === 'cse_year4_sem7') ||
                  batches.find((b) => b.id === 'year4_sem7');
      }
    }

    if (matched) {
      setActiveBatchName(matched.yearLabel);
      setStudents(convertToMarkRecords(matched.students, meta.maxMarks));
      setMeta((prev) => ({
        ...prev,
        department: matched!.department,
        academicYear: matched!.academicYear,
        subjectCode: matched!.defaultSubjectCode || prev.subjectCode,
        subjectName: matched!.defaultSubjectName || prev.subjectName,
      }));
      showToast(`Loaded ${matched.students.length} students from ${matched.yearLabel}`);
    }
  };

  // If initialBatchId, initialSemester, or initialDepartment changes dynamically (e.g. from Admin QR click)
  useEffect(() => {
    const matched = findTargetBatch();
    if (matched) {
      setActiveBatchName(matched.yearLabel);
      setMeta((prev) => ({
        ...prev,
        yearCategory: matched.yearCategory,
        department: initialDepartment || matched.department,
        semester: initialSemester || matched.semester,
        academicYear: matched.academicYear,
        subjectCode: matched.defaultSubjectCode || prev.subjectCode,
        subjectName: matched.defaultSubjectName || prev.subjectName,
      }));
      setStudents(convertToMarkRecords(matched.students, meta.maxMarks));
    }
  }, [initialBatchId, initialSemester, initialDepartment]);

  // Real-time synchronization with Firestore student batches
  useEffect(() => {
    const unsubscribe = subscribeToLiveBatches((batches) => {
      let matched: YearBatchConfig | undefined;
      if (initialBatchId) {
        matched = batches.find((b) => b.id === initialBatchId);
      }
      if (!matched) {
        matched = findBatchByDeptAndSem(meta.department, meta.semester);
      }
      if (matched && matched.students) {
        setStudents((current) => {
          // If roster is empty or marks haven't been entered, update to live cloud roster
          const hasEnteredMarks = current.some((s) => (s.marksObtained !== '' || s.attendance === 'ABSENT'));
          if (!hasEnteredMarks && current.length !== matched!.students.length) {
            return convertToMarkRecords(matched!.students, meta.maxMarks);
          }
          return current;
        });
      }
    });

    return () => unsubscribe();
  }, [meta.department, meta.semester, meta.maxMarks, initialBatchId]);

  // Modals state
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Compute live performance metrics
  const metrics = useMemo(() => {
    return computeMetrics(students, meta.passMark);
  }, [students, meta.passMark]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Switch Year Category (1st Year vs Higher Semester)
  const handleYearCategoryChange = (category: '1ST_YEAR' | 'HIGHER_SEM') => {
    if (isLockedToBatch) {
      showToast('Year category is locked to your scanned QR batch.');
      return;
    }
    if (category === '1ST_YEAR') {
      setMeta((prev) => ({
        ...prev,
        yearCategory: '1ST_YEAR',
        semester: 'Semester 1',
        subjectCode: '',
        subjectName: '',
      }));
      loadRosterForSemester('Semester 1', '1ST_YEAR', meta.department);
    } else {
      setMeta((prev) => ({
        ...prev,
        yearCategory: 'HIGHER_SEM',
        semester: 'Semester 3',
        subjectCode: '',
        subjectName: '',
      }));
      loadRosterForSemester('Semester 3', 'HIGHER_SEM', meta.department);
    }
  };

  // Handle Semester Change
  const handleSemesterChange = (newSem: string) => {
    if (isLockedToBatch) {
      showToast('Semester is locked to your scanned QR batch.');
      return;
    }
    setMeta((prev) => ({ ...prev, semester: newSem }));
    loadRosterForSemester(newSem);
  };

  // Handle changes to Max Marks
  const handleMaxMarksChange = (newMax: number) => {
    const safeMax = Math.max(1, Math.min(100, isNaN(newMax) ? 50 : newMax));
    // If current passMark is greater than safeMax, clamp it
    const adjustedPass = meta.passMark > safeMax ? Math.floor(safeMax / 2) : meta.passMark;

    setMeta((prev) => ({
      ...prev,
      maxMarks: safeMax,
      passMark: adjustedPass,
    }));

    setStudents((prev) =>
      prev.map((s) => {
        const marks = typeof s.marksObtained === 'number' ? Math.min(safeMax, s.marksObtained) : s.marksObtained;
        const { grade, result } = calculateGradeAndResult(s.attendance, marks, safeMax, adjustedPass);
        return {
          ...s,
          maxMarks: safeMax,
          marksObtained: marks,
          grade,
          result,
        };
      })
    );
  };

  // Handle changes to Pass Mark
  const handlePassMarkChange = (newPass: number) => {
    const safePass = Math.max(1, Math.min(meta.maxMarks, isNaN(newPass) ? 25 : newPass));
    setMeta((prev) => ({
      ...prev,
      passMark: safePass,
    }));

    setStudents((prev) =>
      prev.map((s) => {
        const { grade, result } = calculateGradeAndResult(s.attendance, s.marksObtained, meta.maxMarks, safePass);
        return {
          ...s,
          grade,
          result,
        };
      })
    );
  };

  // Convert marks to 100 scale (e.g. 50 -> 100 or other max < 100)
  const convertMarksTo100 = (customStudents?: StudentMarkRecord[], customMax?: number, customPass?: number) => {
    const currentStudents = customStudents || students;
    const currentMax = customMax ?? meta.maxMarks;
    const currentPass = customPass ?? meta.passMark;

    if (currentMax >= 100) return;

    const scaleFactor = 100 / currentMax;
    const targetPass = Math.min(100, Math.round(currentPass * scaleFactor));

    const scaledStudents = currentStudents.map((s) => {
      if (s.attendance === 'ABSENT' || s.marksObtained === '') {
        const { grade, result } = calculateGradeAndResult(s.attendance, s.marksObtained, 100, targetPass);
        return { ...s, maxMarks: 100, grade, result };
      }
      const scaledMark = Math.min(100, Math.round(Number(s.marksObtained) * scaleFactor));
      const { grade, result } = calculateGradeAndResult('PRESENT', scaledMark, 100, targetPass);
      return {
        ...s,
        maxMarks: 100,
        marksObtained: scaledMark,
        grade,
        result,
      };
    });

    setStudents(scaledStudents);
    setMeta((prev) => ({
      ...prev,
      maxMarks: 100,
      passMark: targetPass,
    }));
    setIsConvertedFrom50(true);
    setOriginalMaxMark(currentMax);
    setOriginalPassMark(currentPass);
    showToast(`✨ Automatically converted from ${currentMax} to 100 marks (Pass mark: ${targetPass}).`);
  };

  // Revert back from 100
  const revertMarksFrom100 = () => {
    if (!isConvertedFrom50 || !originalMaxMark) return;
    const scaleDownFactor = originalMaxMark / 100;
    const revertedPass = originalPassMark || Math.round(50 * scaleDownFactor);

    const revertedStudents = students.map((s) => {
      if (s.attendance === 'ABSENT' || s.marksObtained === '') {
        const { grade, result } = calculateGradeAndResult(s.attendance, s.marksObtained, originalMaxMark, revertedPass);
        return { ...s, maxMarks: originalMaxMark, grade, result };
      }
      const revertedMark = Math.min(originalMaxMark, Math.round(Number(s.marksObtained) * scaleDownFactor));
      const { grade, result } = calculateGradeAndResult('PRESENT', revertedMark, originalMaxMark, revertedPass);
      return {
        ...s,
        maxMarks: originalMaxMark,
        marksObtained: revertedMark,
        grade,
        result,
      };
    });

    setStudents(revertedStudents);
    setMeta((prev) => ({
      ...prev,
      maxMarks: originalMaxMark,
      passMark: revertedPass,
    }));
    setIsConvertedFrom50(false);
    showToast(`Reverted back to out of ${originalMaxMark} marks.`);
  };

  // Check if all students have marks entered and auto-convert if max < 100
  const checkAndAutoConvertIfAllEntered = (currentStudentsList: StudentMarkRecord[]) => {
    if (meta.maxMarks >= 100) return;
    if (currentStudentsList.length === 0) return;

    const allEntered = currentStudentsList.every(
      (s) =>
        s.attendance === 'ABSENT' ||
        (typeof s.marksObtained === 'number' && !isNaN(s.marksObtained))
    );

    if (allEntered) {
      convertMarksTo100(currentStudentsList, meta.maxMarks, meta.passMark);
    }
  };

  // Handle when mark input loses focus (blur) or Enter pressed
  const handleStudentMarkBlur = () => {
    checkAndAutoConvertIfAllEntered(students);
  };

  // Inline update student mark
  const handleMarkChange = (id: string, value: string) => {
    if (isEntryDisabled) {
      if (isDuplicateLocked) {
        showToast('⚠️ Already entered the marks for this subject! Marksheet is locked.');
      }
      return;
    }
    setStudents((prev) => {
      const nextStudents = prev.map((s) => {
        if (s.id !== id) return s;

        if (value === '') {
          const { grade, result } = calculateGradeAndResult(s.attendance, '', meta.maxMarks, meta.passMark);
          return { ...s, marksObtained: '', grade, result };
        }

        const num = Math.min(meta.maxMarks, Math.max(0, Number(value)));
        const { grade, result } = calculateGradeAndResult(s.attendance, num, meta.maxMarks, meta.passMark);
        return {
          ...s,
          marksObtained: num,
          grade,
          result,
        };
      });

      return nextStudents;
    });
  };

  // Toggle student attendance
  const handleAttendanceChange = (id: string, attendance: AttendanceStatus) => {
    if (isEntryDisabled) {
      if (isDuplicateLocked) {
        showToast('⚠️ Already entered the marks for this subject! Marksheet is locked.');
      }
      return;
    }
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const marks = attendance === 'ABSENT' ? '' : typeof s.marksObtained === 'number' ? s.marksObtained : 0;
        const { grade, result } = calculateGradeAndResult(attendance, marks, meta.maxMarks, meta.passMark);
        return {
          ...s,
          attendance,
          marksObtained: marks,
          grade,
          result,
        };
      })
    );
  };

  // Delete student row
  const handleDeleteStudent = (id: string) => {
    if (isEntryDisabled) {
      return;
    }
    setStudents((prev) => prev.filter((s) => s.id !== id));
    showToast('Student record removed');
  };

  // Clear all entered marks and details in current form
  const handleClearForm = () => {
    setMeta((prev) => ({
      ...prev,
      subjectCode: '',
      subjectName: '',
      facultyInCharge: '',
      evaluatorName: '',
      examCellCoordinator: '',
      status: 'Draft (Editable)',
      isUnlocked: true,
    }));
    setStudents((prev) =>
      prev.map((s) => {
        const { grade, result } = calculateGradeAndResult('PRESENT', '', meta.maxMarks, meta.passMark);
        return {
          ...s,
          attendance: 'PRESENT',
          marksObtained: '',
          grade,
          result,
        };
      })
    );
    showToast('Cleared subject, faculty, and marks in form.');
  };

  // Submit Marks to Admin
  const handleSubmitMarks = () => {
    // 1. Avoid duplicates verification
    if (isDuplicateLocked) {
      alert(
        `Already entered the marks for this subject!\n\nSubject Code: ${meta.subjectCode}\nSubject Name: ${meta.subjectName}\nExam Type: ${meta.examType}\n\nMarks for this subject have already been submitted. Duplicate marksheets cannot be submitted.`
      );
      showToast('⚠️ Already entered the marks for this subject!');
      return;
    }

    // 2. Mandatory header details verification
    if (!isHeaderComplete) {
      const missingList = missingHeaderFields.map((f) => f.label).join(', ');
      alert(
        `Cannot submit marks! Please complete all above details first:\n\n• ${missingHeaderFields.map((f) => f.label).join('\n• ')}`
      );
      showToast(`⚠️ Please enter details above first: ${missingList}`);
      return;
    }

    if (students.length === 0) {
      alert('Please add at least one student before submitting to Admin.');
      return;
    }

    const hasEmptyMarks = students.some(
      (s) => s.attendance === 'PRESENT' && s.marksObtained === ''
    );
    if (hasEmptyMarks) {
      if (!confirm('Some present students do not have marks entered yet. Do you want to submit anyway?')) {
        return;
      }
    }

    // Auto-convert to 100 if entered out of 50 or other max < 100
    let submissionStudents = students;
    let submissionMeta = { ...meta };
    if (meta.maxMarks < 100) {
      const scaleFactor = 100 / meta.maxMarks;
      const targetPass = Math.min(100, Math.round(meta.passMark * scaleFactor));
      submissionStudents = students.map((s) => {
        if (s.attendance === 'ABSENT' || s.marksObtained === '') {
          const { grade, result } = calculateGradeAndResult(s.attendance, s.marksObtained, 100, targetPass);
          return { ...s, maxMarks: 100, grade, result };
        }
        const scaledMark = Math.min(100, Math.round(Number(s.marksObtained) * scaleFactor));
        const { grade, result } = calculateGradeAndResult('PRESENT', scaledMark, 100, targetPass);
        return {
          ...s,
          maxMarks: 100,
          marksObtained: scaledMark,
          grade,
          result,
        };
      });
      submissionMeta = {
        ...submissionMeta,
        maxMarks: 100,
        passMark: targetPass,
      };
      setStudents(submissionStudents);
      setIsConvertedFrom50(true);
    }

    const updatedMeta: AssessmentMeta = {
      ...submissionMeta,
      status: 'Submitted (Locked)',
      isUnlocked: false,
    };

    // Save to persistent submitted marksheets storage for Admin
    const record = addSubmittedMarksheet(updatedMeta, submissionStudents);

    // Push to live Firestore database
    saveMarksheetToFirestore(record).catch((err) => {
      console.warn('Firestore live database sync notice:', err);
    });

    // Notify live Express backend server
    fetch('/api/marksheets/log-submission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subjectCode: updatedMeta.subjectCode,
        semester: updatedMeta.semester,
        department: updatedMeta.department,
        studentCount: students.length,
        submittedBy: updatedMeta.facultyInCharge,
      }),
    }).catch((err) => {
      console.warn('Backend logging notice:', err);
    });

    setMeta(updatedMeta);
    if (onNotifyAdminSubmission) {
      onNotifyAdminSubmission(updatedMeta, students);
    }
    showToast('Marksheet submitted to Live Firestore & Admin! PDF & XLS Download Unlocked.');
  };

  // Open download options modal (PDF & XLS) - only allowed once submitted
  const handleDownloadOptionClick = () => {
    if (meta.status !== 'Submitted (Locked)') {
      showToast('⚠️ Please click "Submit Marks" first. Downloads (PDF & XLS) are enabled only after official submission.');
      return;
    }
    setIsDownloadModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f284e] text-white px-4 py-3 rounded-xl shadow-xl border border-blue-400/40 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}


      {/* ========================================================================= */}
      {/* SECTION 1: INTERNAL ASSESSMENT MARK ENTRY (UI1.png)                       */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-xs border border-slate-200/90">
        {/* Top Header Row with Panel Badge and Year Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-blue-50 text-blue-800 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
                Panel 1
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Internal Assessment Mark Entry
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Enter student assessment marks, compute grades and live pass percentages, and submit to Admin.
            </p>
          </div>

          {/* Year Category Segmented Buttons - Locked in QR Mode */}
          {isLockedToBatch ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 text-xs sm:text-sm font-bold shadow-xs">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {meta.yearCategory === '1ST_YEAR'
                  ? '1. 1st Year (Sem 1 & 2)'
                  : '2. Higher Semester (Sem 3 - 8)'}
              </span>
              <span className="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-black border border-amber-200">
                QR Locked
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 self-start lg:self-center">
              <button
                type="button"
                id="btn-first-year"
                onClick={() => handleYearCategoryChange('1ST_YEAR')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  meta.yearCategory === '1ST_YEAR'
                    ? 'bg-[#0f284e] text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>1. 1st Year (Sem 1 &amp; 2)</span>
              </button>

              <button
                type="button"
                id="btn-higher-sem"
                onClick={() => handleYearCategoryChange('HIGHER_SEM')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  meta.yearCategory === 'HIGHER_SEM'
                    ? 'bg-[#0f284e] text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>2. Higher Semester (Sem 3 - 8)</span>
              </button>
            </div>
          )}
        </div>

        {/* Active Batch Info Banner */}
        <div className="mt-4 p-3 bg-blue-50/80 rounded-xl border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="p-1 bg-blue-900 text-white rounded-md">
              <QrCode className="w-3.5 h-3.5" />
            </span>
            <span className="font-semibold text-slate-600">Active Roster:</span>
            <span className="font-extrabold text-blue-950">{activeBatchName}</span>
            <span className="text-slate-400">•</span>
            <span className="font-bold text-slate-700">{meta.semester}</span>
            <span className="text-slate-400">•</span>
            <span className="bg-blue-200/80 text-blue-900 font-bold px-2 py-0.5 rounded text-[11px]">
              {students.length} Students Enrolled
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (isLockedToBatch) {
                  reloadAssignedRoster();
                } else {
                  loadRosterForSemester(meta.semester);
                }
              }}
              className="text-[11px] font-bold text-blue-800 hover:text-blue-950 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reload from Admin Roster</span>
            </button>
          </div>
        </div>

        {/* Form Controls Grid */}
        <div className="mt-4 space-y-4">
          {/* Row 1: Department, Semester, Exam Type, Academic Year */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Department */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  DEPARTMENT <span className="text-red-500">*</span>
                </label>
                {isLockedToBatch && (
                  <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-amber-700" />
                    <span>LOCKED TO BATCH</span>
                  </span>
                )}
              </div>
              <select
                id="select-department"
                value={meta.department}
                disabled={isLockedToBatch}
                onChange={(e) => {
                  if (isLockedToBatch) return;
                  const newDept = e.target.value;
                  setMeta((prev) => ({ ...prev, department: newDept }));
                  loadRosterForSemester(meta.semester, meta.yearCategory, newDept);
                }}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold ${
                  isLockedToBatch
                    ? 'bg-slate-100 border-slate-300 text-slate-800 cursor-not-allowed select-none opacity-95'
                    : 'bg-slate-50/70 border-slate-300 text-slate-800 focus:ring-2 focus:ring-blue-800 focus:outline-hidden cursor-pointer'
                }`}
              >
                {isLockedToBatch ? (
                  <option value={meta.department}>{meta.department}</option>
                ) : (
                  DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Semester with UNLOCKED or LOCKED badge */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  SEMESTER <span className="text-red-500">*</span>
                </label>
                {isLockedToBatch ? (
                  <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 uppercase">
                    <Lock className="w-2.5 h-2.5 text-amber-700" />
                    <span>LOCKED (QR ASSIGNED)</span>
                  </span>
                ) : (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-extrabold px-2 py-0.2 rounded uppercase">
                    UNLOCKED
                  </span>
                )}
              </div>
              <select
                id="select-semester"
                value={meta.semester}
                disabled={isLockedToBatch}
                onChange={(e) => {
                  if (isLockedToBatch) return;
                  handleSemesterChange(e.target.value);
                }}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold ${
                  isLockedToBatch
                    ? 'bg-slate-100 border-slate-300 text-slate-800 cursor-not-allowed select-none opacity-95'
                    : 'bg-slate-50/70 border-blue-600 text-slate-900 focus:ring-2 focus:ring-blue-800 focus:outline-hidden cursor-pointer'
                }`}
              >
                {isLockedToBatch ? (
                  <option value={meta.semester}>{meta.semester}</option>
                ) : meta.yearCategory === '1ST_YEAR' ? (
                  <>
                    <option value="Semester 1">Semester 1</option>
                    <option value="Semester 2">Semester 2</option>
                  </>
                ) : (
                  <>
                    <option value="Semester 3">Semester 3</option>
                    <option value="Semester 4">Semester 4</option>
                    <option value="Semester 5">Semester 5</option>
                    <option value="Semester 6">Semester 6</option>
                    <option value="Semester 7">Semester 7</option>
                    <option value="Semester 8">Semester 8</option>
                  </>
                )}
              </select>
            </div>

            {/* Exam Type */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                EXAM TYPE <span className="text-red-500">*</span>
              </label>
              <select
                id="select-exam-type"
                value={meta.examType}
                onChange={(e) => setMeta({ ...meta, examType: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-800 focus:outline-hidden cursor-pointer"
              >
                <option value="CAT-1">CAT-1</option>
                <option value="CAT-2">CAT-2</option>
                <option value="CAT-3">CAT-3</option>
                <option value="Model-1">Model-1</option>
                <option value="Model-2">Model-2</option>
                <option value="Model-3">Model-3</option>
                <option value="Laboratory">Laboratory</option>
              </select>
            </div>

            {/* Academic Year */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  ACADEMIC YEAR <span className="text-red-500">*</span>
                </label>
              </div>
              <input
                id="input-academic-year"
                type="text"
                value={meta.academicYear}
                onChange={(e) => setMeta({ ...meta, academicYear: e.target.value })}
                placeholder="e.g. 2024-2028 or 2025-2026"
                className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold text-slate-800 bg-slate-50/70 border-slate-300 focus:ring-2 focus:ring-blue-800 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Row 2: Faculty, Evaluator, Date, Subject Code, Subject Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  FACULTY IN-CHARGE <span className="text-red-500">*</span>
                </label>
                {!meta.facultyInCharge?.trim() && (
                  <span className="text-[10px] text-amber-600 font-bold">Required</span>
                )}
              </div>
              <input
                id="input-faculty"
                type="text"
                placeholder="Enter Faculty Name *"
                value={meta.facultyInCharge}
                onChange={(e) => setMeta({ ...meta, facultyInCharge: e.target.value })}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-800 focus:outline-hidden transition-colors ${
                  !meta.facultyInCharge?.trim()
                    ? 'bg-amber-50/40 border-amber-300 placeholder:text-amber-500'
                    : 'bg-slate-50/70 border-slate-300'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  EVALUATOR NAME <span className="text-red-500">*</span>
                </label>
                {!meta.evaluatorName?.trim() && (
                  <span className="text-[10px] text-amber-600 font-bold">Required</span>
                )}
              </div>
              <input
                id="input-evaluator"
                type="text"
                placeholder="Enter Evaluator Name *"
                value={meta.evaluatorName || ''}
                onChange={(e) => setMeta({ ...meta, evaluatorName: e.target.value })}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-800 focus:outline-hidden transition-colors ${
                  !meta.evaluatorName?.trim()
                    ? 'bg-amber-50/40 border-amber-300 placeholder:text-amber-500'
                    : 'bg-slate-50/70 border-slate-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                ASSESSMENT DATE <span className="text-red-500">*</span>
              </label>
              <input
                id="input-assessment-date"
                type="text"
                value={meta.assessmentDate}
                onChange={(e) => setMeta({ ...meta, assessmentDate: e.target.value })}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-800 focus:outline-hidden ${
                  !meta.assessmentDate?.trim()
                    ? 'bg-amber-50/40 border-amber-300'
                    : 'bg-slate-50/70 border-slate-300'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  SUBJECT CODE <span className="text-red-500">*</span>
                </label>
                {!meta.subjectCode?.trim() && (
                  <span className="text-[10px] text-amber-600 font-bold">Required</span>
                )}
              </div>
              <input
                id="input-subject-code"
                type="text"
                placeholder="e.g. CS3351 *"
                value={meta.subjectCode}
                onChange={(e) => setMeta({ ...meta, subjectCode: e.target.value })}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-800 focus:outline-hidden font-mono uppercase ${
                  !meta.subjectCode?.trim()
                    ? 'bg-amber-50/40 border-amber-300 placeholder:text-amber-500'
                    : 'bg-slate-50/70 border-slate-300'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  SUBJECT NAME <span className="text-red-500">*</span>
                </label>
                {!meta.subjectName?.trim() && (
                  <span className="text-[10px] text-amber-600 font-bold">Required</span>
                )}
              </div>
              <input
                id="input-subject-name"
                type="text"
                placeholder="e.g. DIGITAL PRINCIPLES *"
                value={meta.subjectName}
                onChange={(e) => setMeta({ ...meta, subjectName: e.target.value })}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-800 focus:outline-hidden uppercase ${
                  !meta.subjectName?.trim()
                    ? 'bg-amber-50/40 border-amber-300 placeholder:text-amber-500'
                    : 'bg-slate-50/70 border-slate-300'
                }`}
              />
            </div>
          </div>

          {/* Row 2b: EXAM CELL COORDINATOR & PRINCIPAL NAME (Configured for bottom signatures only) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  EXAM CELL COORDINATOR NAME
                </label>
                <span className="text-[10px] text-slate-400 font-medium">(Shown in bottom signature only)</span>
              </div>
              <input
                id="input-exam-cell-coordinator"
                type="text"
                placeholder="Enter Coordinator Name"
                value={meta.examCellCoordinator || ''}
                onChange={(e) => setMeta({ ...meta, examCellCoordinator: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-800 focus:outline-hidden"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  PRINCIPAL NAME
                </label>
                <span className="text-[10px] text-slate-400 font-medium">(Shown in bottom signature only)</span>
              </div>
              <input
                id="input-principal-name"
                type="text"
                placeholder="Enter Principal Name"
                value={meta.principalName || ''}
                onChange={(e) =>
                  setMeta({
                    ...meta,
                    principalName: e.target.value,
                    principalSignature: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-800 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Row 3: MAX MARKS & PASS MARK (EDITABLE) */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2.5">
                <label htmlFor="input-max-marks" className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  MAX MARKS:
                </label>
                <input
                  id="input-max-marks"
                  type="number"
                  min={1}
                  max={100}
                  value={meta.maxMarks}
                  onChange={(e) => handleMaxMarksChange(Number(e.target.value))}
                  className="w-20 px-3 py-1.5 bg-blue-50/90 border border-blue-500 focus:ring-2 focus:ring-blue-700 focus:outline-hidden rounded-lg text-sm font-extrabold text-blue-900 text-center shadow-xs"
                />
              </div>

              <div className="flex items-center gap-2.5">
                <label htmlFor="input-pass-mark" className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  PASS MARK (MIN):
                </label>
                <input
                  id="input-pass-mark"
                  type="number"
                  min={1}
                  max={meta.maxMarks}
                  value={meta.passMark}
                  onChange={(e) => handlePassMarkChange(Number(e.target.value))}
                  className="w-20 px-3 py-1.5 bg-blue-50/90 border border-blue-500 focus:ring-2 focus:ring-blue-700 focus:outline-hidden rounded-lg text-sm font-extrabold text-blue-900 text-center shadow-xs"
                />
              </div>

              {meta.maxMarks < 100 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => convertMarksTo100()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                    title="Scale all marks to 100"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Convert to 100</span>
                  </button>
                  <span className="text-[11px] text-slate-500 italic">
                    (Auto-converts to 100 when all student marks are entered)
                  </span>
                </div>
              )}

              {isConvertedFrom50 && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Converted to 100 (Original: {originalMaxMark})</span>
                  </span>
                  <button
                    type="button"
                    onClick={revertMarksFrom100}
                    className="text-xs font-bold text-slate-600 hover:text-red-600 underline cursor-pointer"
                  >
                    Revert to {originalMaxMark}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DUPLICATE WARNING & HEADER COMPLETION STATUS BANNERS                       */}
      {/* ========================================================================= */}
      {duplicateSubmittedSheet && (
        <div
          id="duplicate-marksheet-alert"
          className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-200"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 mt-0.5 text-amber-700">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm sm:text-base font-black text-amber-950 uppercase tracking-wide">
                  Already entered the marks for this subject!
                </h4>
                <span className="text-[10px] bg-amber-200 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full font-extrabold uppercase">
                  Duplicate Entry Blocked
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-amber-900 mt-1">
                Marks for Subject Code: <span className="font-extrabold text-slate-900 bg-amber-200/70 px-1.5 py-0.5 rounded font-mono">{meta.subjectCode}</span> • Subject Name: <span className="font-extrabold text-slate-900 uppercase">{meta.subjectName}</span> • Exam Type: <span className="font-extrabold text-slate-900">{meta.examType}</span> have already been submitted.
              </p>
              <p className="text-[11px] sm:text-xs text-amber-800 mt-1">
                Submitted on <strong>{duplicateSubmittedSheet.submittedAt}</strong> by <strong>{duplicateSubmittedSheet.meta.facultyInCharge || 'Faculty In-Charge'}</strong>. Mark inputs are locked to avoid duplicate submissions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
            <button
              type="button"
              id="btn-view-submitted-roster"
              onClick={() => {
                setStudents(duplicateSubmittedSheet.students);
                showToast('Loaded submitted student marks in read-only mode.');
              }}
              className="px-3.5 py-2 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-xs rounded-xl transition border border-amber-300 cursor-pointer shadow-2xs"
            >
              View Submitted Marks
            </button>
            <button
              type="button"
              id="btn-download-submitted-copy"
              onClick={() => {
                setStudents(duplicateSubmittedSheet.students);
                setMeta(duplicateSubmittedSheet.meta);
                setIsDownloadModalOpen(true);
              }}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sheet</span>
            </button>
          </div>
        </div>
      )}

      {/* Missing Header Details Warning Banner (Only shown when required fields are missing) */}
      {!isHeaderComplete && (
        <div
          id="header-details-status-bar"
          className="rounded-2xl p-4 border bg-amber-50/80 border-amber-300 text-amber-950 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-700">
              <Lock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-amber-950">
                <strong className="font-extrabold uppercase">Complete Details Above First:</strong> You cannot submit marks until all details above are entered. Missing:{' '}
                <span className="text-red-700 font-extrabold underline">
                  {missingHeaderFields.map((f) => f.label).join(', ')}
                </span>
              </p>
            </div>
          </div>
          <div className="shrink-0 font-bold text-[11px] flex items-center gap-2">
            <span className="bg-amber-200 text-amber-900 border border-amber-300 px-3 py-1 rounded-full font-extrabold">
              {REQUIRED_HEADER_FIELDS.length - missingHeaderFields.length} of {REQUIRED_HEADER_FIELDS.length} Details Entered
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: EVALUATION SUMMARY & PERFORMANCE METRICS (UI1 & UI2)           */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/90 space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
              EVALUATION SUMMARY &amp; PERFORMANCE METRICS
            </h3>
            <p className="text-[11px] text-slate-500">
              Live statistics dynamically calculated from registered students
            </p>
          </div>
          <div className="text-xs font-bold text-slate-700">
            Total Enrolled: <span className="text-slate-900 font-extrabold">{metrics.totalEnrolled}</span>
          </div>
        </div>

        {/* 4 Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Present */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
            <div className="text-[11px] font-medium text-slate-600">No of student Present:</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {metrics.presentCount}
            </div>
          </div>

          {/* Absent */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
            <div className="text-[11px] font-medium text-slate-600">No of student Absent:</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {metrics.absentCount}
            </div>
          </div>

          {/* Pass */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
            <div className="text-[11px] font-medium text-slate-600">No of student Pass:</div>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {metrics.passCount}
            </div>
          </div>

          {/* Fail */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
            <div className="text-[11px] font-medium text-slate-600">No of student Fail:</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {metrics.failCount}
            </div>
          </div>
        </div>

        {/* Pass Percentage Banner matching UI1 and UI2 */}
        <div className="w-full py-3.5 px-4 bg-blue-50/70 border border-blue-200 rounded-xl text-center">
          <span className="text-base sm:text-lg font-black text-blue-900">
            Pass percentage: {metrics.passPercentage.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: MARKSHEET TABLE & SIGNATURES (UI2.png)                         */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/90 space-y-4">
        {/* Table Action Bar matching UI2.png */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-700 inline-block" />
            <span className="font-bold text-slate-900 text-sm sm:text-base">
              Marksheet Table: {students.length} Students
            </span>
            <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2.5 py-0.5 rounded-full border border-slate-200">
              {meta.status}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-submit-marks"
              onClick={handleSubmitMarks}
              disabled={!isHeaderComplete || isDuplicateLocked}
              title={
                isDuplicateLocked
                  ? `Already entered the marks for this subject (${meta.subjectCode} - ${meta.subjectName}, ${meta.examType})`
                  : !isHeaderComplete
                  ? `Cannot submit: Complete details above first (${missingHeaderFields.map((f) => f.label).join(', ')})`
                  : 'Submit official Marksheet to Admin'
              }
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold shadow-xs transition ${
                isDuplicateLocked
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-not-allowed opacity-90'
                  : !isHeaderComplete
                  ? 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed opacity-75'
                  : 'bg-[#0f284e] hover:bg-blue-900 text-white cursor-pointer'
              }`}
            >
              {isDuplicateLocked ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  <span>Already Entered (Locked)</span>
                </>
              ) : !isHeaderComplete ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Submit Marks ({missingHeaderFields.length} Details Needed)</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Marks</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="btn-clear-form"
              onClick={handleClearForm}
              title="Clear subject, staff names, and entered marks in this form"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Clear Form</span>
            </button>

            <button
              type="button"
              id="btn-download-option"
              onClick={handleDownloadOptionClick}
              disabled={meta.status !== 'Submitted (Locked)' && !duplicateSubmittedSheet}
              title={
                meta.status === 'Submitted (Locked)' || duplicateSubmittedSheet
                  ? 'Download official Marksheet (PDF & XLS)'
                  : 'Download disabled. Please click "Submit Marks" to enable downloads.'
              }
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                meta.status === 'Submitted (Locked)' || duplicateSubmittedSheet
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-500 shadow-xs cursor-pointer'
                  : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD OPTION (PDF &amp; XLS)</span>
              {meta.status === 'Submitted (Locked)' || duplicateSubmittedSheet ? (
                <Unlock className="w-3.5 h-3.5 text-emerald-900" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Marksheet Container with Dark Navy Header Banner */}
        <div className="rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
          {/* Dark Navy Table Header Bar matching UI2.png */}
          <div className="bg-[#071a33] text-white px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="text-xs sm:text-sm tracking-wide">
              <span className="text-amber-400 font-extrabold uppercase">
                {meta.yearCategory === '1ST_YEAR'
                  ? 'FIRST YEAR (SCIENCE & HUMANITIES)'
                  : meta.department}
              </span>{' '}
              <span className="text-slate-200 font-semibold uppercase">
                • {meta.semester} INTERNAL ASSESSMENT MARKSHEET
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs font-semibold">
              <span className="text-slate-300 hidden sm:inline">
                {meta.subjectCode} - {meta.subjectName}
              </span>
              <span className="bg-amber-900/90 text-amber-300 border border-amber-600/50 px-2 py-0.5 rounded text-[11px] font-bold">
                Max Marks: {meta.maxMarks}
              </span>
              <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-600/50 px-2 py-0.5 rounded text-[11px] font-bold">
                Pass Mark: {meta.passMark}
              </span>
            </div>
          </div>

          {/* Table Element */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0c2445] text-white font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 text-center border-r border-blue-900/40 w-10">#</th>
                  <th className="py-2.5 px-3 border-r border-blue-900/40">REGISTER NO</th>
                  <th className="py-2.5 px-3 border-r border-blue-900/40">STUDENT NAME</th>
                  <th className="py-2.5 px-3 text-center border-r border-blue-900/40">ATTENDANCE</th>
                  <th className="py-2.5 px-3 text-center border-r border-blue-900/40">MAX ({meta.maxMarks})</th>
                  <th className="py-2.5 px-3 text-center border-r border-blue-900/40 w-24">OBT</th>
                  <th className="py-2.5 px-3 text-center border-r border-blue-900/40">GRADE</th>
                  <th className="py-2.5 px-3 text-center border-r border-blue-900/40">RESULT</th>
                  <th className="py-2.5 px-3 text-center w-16">ACTION</th>
                </tr>
              </thead>

              {/* Empty State */}
              {students.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={9} className="py-12 px-4 text-center bg-white text-slate-400 text-xs font-medium">
                      No student records in this marksheet.
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody className="divide-y divide-slate-200 bg-white">
                  {students.map((student, index) => {
                    const isAbsent = student.attendance === 'ABSENT';
                    return (
                      <tr
                        key={student.id}
                        className={`hover:bg-slate-50/90 transition-colors ${
                          isAbsent ? 'bg-amber-50/30' : index % 2 === 1 ? 'bg-slate-50/40' : ''
                        }`}
                      >
                        {/* Index */}
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 text-slate-500 font-medium">
                          {index + 1}
                        </td>

                        {/* Register No */}
                        <td className="py-2.5 px-3 border-r border-slate-200 font-mono font-medium text-slate-900">
                          {student.regNo}
                        </td>

                        {/* Student Name */}
                        <td className="py-2.5 px-3 border-r border-slate-200 font-semibold text-slate-800 uppercase">
                          {student.name}
                        </td>

                        {/* Attendance Toggle */}
                        <td className="py-2 px-3 text-center border-r border-slate-200">
                          <select
                            value={student.attendance}
                            disabled={isEntryDisabled}
                            onChange={(e) =>
                              handleAttendanceChange(
                                student.id,
                                e.target.value as AttendanceStatus
                              )
                            }
                            className={`text-xs font-bold px-2 py-1 rounded-md border focus:outline-hidden ${
                              isEntryDisabled
                                ? 'cursor-not-allowed opacity-80'
                                : 'cursor-pointer'
                            } ${
                              isAbsent
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            <option value="PRESENT">PRESENT</option>
                            <option value="ABSENT">ABSENT</option>
                          </select>
                        </td>

                        {/* Max Marks */}
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 font-medium text-slate-600">
                          {meta.maxMarks}
                        </td>

                        {/* Marks Obtained Input */}
                        <td className="py-2 px-3 text-center border-r border-slate-200">
                          {isAbsent ? (
                            <span className="font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 text-xs inline-block w-16">
                              AB
                            </span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={meta.maxMarks}
                              disabled={isEntryDisabled}
                              value={student.marksObtained}
                              onChange={(e) => handleMarkChange(student.id, e.target.value)}
                              onBlur={handleStudentMarkBlur}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleStudentMarkBlur();
                                }
                              }}
                              placeholder="0"
                              className={`w-16 px-2 py-1 text-center font-bold rounded-md text-xs border ${
                                isEntryDisabled
                                  ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed select-none'
                                  : 'text-slate-900 bg-white border-slate-300 focus:ring-2 focus:ring-blue-800 focus:outline-hidden'
                              }`}
                            />
                          )}
                        </td>

                        {/* Grade Badge */}
                        <td className="py-2.5 px-3 text-center border-r border-slate-200">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-black text-xs ${
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
                                : 'bg-rose-100 text-rose-900 border border-rose-200' // 'U'
                            }`}
                          >
                            {student.grade}
                          </span>
                        </td>

                        {/* Result Badge */}
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 font-bold">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                              student.result === 'PASS'
                                ? 'bg-emerald-100 text-emerald-800'
                                : student.result === 'FAIL'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {student.result}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            disabled={isEntryDisabled}
                            onClick={() => handleDeleteStudent(student.id)}
                            title={isEntryDisabled ? 'Marksheet is locked' : 'Delete Student'}
                            className={`p-1 rounded transition ${
                              isEntryDisabled
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-400 hover:text-red-600 cursor-pointer'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>
          </div>
        </div>

        {/* Helper count when list has students */}
        {students.length > 0 && (
          <div className="flex items-center justify-between text-xs pt-1 px-1 text-slate-500">
            <div>
              Showing {students.length} students enrolled in {meta.subjectCode}
            </div>
          </div>
        )}

        {/* Official 3-Column Signatures Section: 1. Evaluator Name & Sign, 2. Exam Cell Coordinator, 3. Principal Sign */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 pb-4 text-center text-xs">
          <div>
            <div className="w-48 h-0.5 bg-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-800">Evaluator Name & Signature</p>
            <p className="text-slate-500 font-medium">({meta.evaluatorName || 'Evaluator Signature'})</p>
          </div>

          <div>
            <div className="w-48 h-0.5 bg-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-800">Exam Cell Coordinator</p>
            <p className="text-slate-500 font-medium">
              {meta.examCellCoordinator ? `(${meta.examCellCoordinator})` : '(Central Exam Cell)'}
            </p>
          </div>

          <div>
            <div className="w-48 h-0.5 bg-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-800">Principal Signature</p>
            <p className="text-slate-500 font-medium">
              {meta.principalName
                ? `(${meta.principalName})`
                : meta.principalSignature
                ? `(${meta.principalSignature})`
                : '(Principal)'}
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DownloadPrintModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        meta={meta}
        students={students}
        metrics={metrics}
        userRole="STAFF"
      />
    </div>
  );
}
