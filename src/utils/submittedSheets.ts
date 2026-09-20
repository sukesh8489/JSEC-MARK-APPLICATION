import * as XLSX from 'xlsx';
import { AssessmentMeta, StudentMarkRecord, EvaluationMetrics } from '../types';
import { computeMetrics, initialSampleStudents } from './gradeCalculator';
import { exportMarksheetToExcel } from './excelExport';

export { exportMarksheetToExcel };

export interface SubmittedSheetRecord {
  id: string;
  meta: AssessmentMeta;
  students: StudentMarkRecord[];
  submittedAt: string;
  status: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';
  yearNumber: 1 | 2 | 3 | 4;
  approvedAt?: string;
}

const STORAGE_KEY = 'jsec_submitted_marksheets_v5_clean';

// Helper to determine year number (1 to 4) from semester
export function getYearFromSemester(sem: string): 1 | 2 | 3 | 4 {
  if (sem.includes('1') || sem.includes('2')) return 1;
  if (sem.includes('3') || sem.includes('4')) return 2;
  if (sem.includes('5') || sem.includes('6')) return 3;
  return 4;
}

// Initial submitted sheets (empty by default for clean production deployment)
export const initialSubmittedSheets: SubmittedSheetRecord[] = [];

// Read sheets from localStorage
export function getStoredSubmittedSheets(): SubmittedSheetRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.error('Failed to parse submitted sheets from localStorage', e);
  }
  return [];
}

// Clear all submitted sheets from storage
export function clearAllStoredSubmittedSheets(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  } catch (e) {
    console.error('Failed to clear submitted sheets in localStorage', e);
  }
}

// Save or update sheets in localStorage
export function saveStoredSubmittedSheets(sheets: SubmittedSheetRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sheets));
  } catch (e) {
    console.error('Failed to save submitted sheets to localStorage', e);
  }
}

// Delete a submitted marksheet by ID
export function deleteSubmittedMarksheet(id: string): SubmittedSheetRecord[] {
  const current = getStoredSubmittedSheets();
  const updated = current.filter((s) => s.id !== id);
  saveStoredSubmittedSheets(updated);
  return updated;
}

// Delete all submitted marksheets by subject code
export function deleteMarksheetsBySubject(subjectCode: string): SubmittedSheetRecord[] {
  const current = getStoredSubmittedSheets();
  const target = subjectCode.trim().toUpperCase();
  const updated = current.filter((s) => s.meta.subjectCode.trim().toUpperCase() !== target);
  saveStoredSubmittedSheets(updated);
  return updated;
}

// Check if a marksheet matching subjectCode, subjectName, and examType has already been submitted
export function findDuplicateSubmittedSheet(
  target: { subjectCode?: string; subjectName?: string; examType?: string; department?: string; semester?: string },
  sheetsList?: SubmittedSheetRecord[]
): SubmittedSheetRecord | undefined {
  const sheets = sheetsList || getStoredSubmittedSheets();
  const code = (target.subjectCode || '').trim().toUpperCase();
  const name = (target.subjectName || '').trim().toUpperCase();
  const exam = (target.examType || '').trim().toUpperCase();

  if (!code || !name || !exam) return undefined;

  const normalizeExam = (e: string) =>
    e.toUpperCase().replace(/\s+/g, '').replace(/^M-/, 'MODEL-');

  return sheets.find((s) => {
    const sCode = (s.meta.subjectCode || '').trim().toUpperCase();
    const sName = (s.meta.subjectName || '').trim().toUpperCase();
    const sExam = (s.meta.examType || '').trim().toUpperCase();

    const codeMatch = sCode === code;
    const nameMatch = sName === name;
    const examMatch = normalizeExam(sExam) === normalizeExam(exam);

    const deptMatch =
      !target.department ||
      s.meta.department?.trim().toLowerCase() === target.department.trim().toLowerCase();
    const semMatch =
      !target.semester ||
      s.meta.semester?.trim().toLowerCase() === target.semester.trim().toLowerCase();

    return codeMatch && nameMatch && examMatch && deptMatch && semMatch;
  });
}

// Add a newly submitted marksheet
export function addSubmittedMarksheet(meta: AssessmentMeta, students: StudentMarkRecord[]): SubmittedSheetRecord {
  const currentSheets = getStoredSubmittedSheets();
  const yearNumber = getYearFromSemester(meta.semester);

  // Check if sheet for this subject, subject name, exam type, and semester already exists
  const existingIdx = currentSheets.findIndex(
    (s) =>
      s.meta.subjectCode.trim().toUpperCase() === meta.subjectCode.trim().toUpperCase() &&
      s.meta.subjectName?.trim().toUpperCase() === meta.subjectName?.trim().toUpperCase() &&
      (s.meta.examType || '').trim().toUpperCase() === (meta.examType || '').trim().toUpperCase() &&
      s.meta.semester === meta.semester &&
      s.meta.department === meta.department
  );

  const now = new Date();
  const dateStr = `${now.toLocaleDateString('en-IN')} ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;

  const existingSheet = existingIdx >= 0 ? currentSheets[existingIdx] : null;
  const isAlreadyApproved = existingSheet?.status === 'APPROVED';

  const newRecord: SubmittedSheetRecord = {
    id: existingSheet ? existingSheet.id : `sheet-${Date.now()}`,
    meta: {
      ...meta,
      status: 'Submitted (Locked)',
      isUnlocked: false,
    },
    students: [...students],
    submittedAt: dateStr,
    status: isAlreadyApproved ? 'APPROVED' : 'PENDING_VERIFICATION',
    yearNumber,
    ...(existingSheet?.approvedAt ? { approvedAt: existingSheet.approvedAt } : {}),
  };

  let updatedList: SubmittedSheetRecord[];
  if (existingIdx >= 0) {
    updatedList = [...currentSheets];
    updatedList[existingIdx] = newRecord;
  } else {
    updatedList = [newRecord, ...currentSheets];
  }

  saveStoredSubmittedSheets(updatedList);
  return newRecord;
}

// Export Marksheet to Excel (.xlsx) matching the PDF page view with college logo
export function exportMarksheetToXLS(
  meta: AssessmentMeta,
  students: StudentMarkRecord[],
  metrics: EvaluationMetrics
): void {
  exportMarksheetToExcel(meta, students, metrics).catch((err) => {
    console.error('Failed to export styled Excel file, falling back to basic XLSX:', err);
    try {
      const wb = XLSX.utils.book_new();
      const titleRows: any[][] = [
        ['JAYA SAKTHI ENGINEERING COLLEGE'],
        ['Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai'],
        ["St. Mary's Nagar, Thiruninravur, Chennai - 602024, Tamil Nadu"],
        [`CONTINUOUS ASSESSMENT MARKSHEET — ${meta.examType.toUpperCase()}`],
        [],
        ['Department:', meta.department, '', 'Academic Year:', meta.academicYear],
        ['Semester:', meta.semester, '', 'Assessment Type:', meta.examType],
        ['Subject Code:', meta.subjectCode, '', 'Subject Name:', meta.subjectName],
        ['Faculty In-Charge:', meta.facultyInCharge || 'N/A', '', 'Assessment Date:', meta.assessmentDate],
        ['Evaluator Name:', meta.evaluatorName || 'N/A', '', 'Assessment Type:', meta.examType],
        ['Max Marks:', meta.maxMarks, '', 'Pass Mark:', meta.passMark],
        [],
        ['EVALUATION SUMMARY & PERFORMANCE METRICS'],
        ['No of student Present:', metrics.presentCount, 'No of student Pass:', metrics.passCount],
        ['No of student Absent:', metrics.absentCount, 'no of student Fail:', metrics.failCount],
        [`Pass percentage: ${metrics.passPercentage.toFixed(2)}%`],
        [],
        ['STUDENT DETAILED MARKSHEET'],
        ['S.No', 'Register Number', 'Student Name', 'Attendance', 'Max Marks', 'Marks Obtained', 'Grade', 'Result'],
        ...students.map((s, idx) => [
          idx + 1,
          s.regNo,
          s.name,
          s.attendance,
          s.maxMarks,
          s.marksObtained === '' ? 'AB' : s.marksObtained,
          s.grade,
          s.result,
        ]),
        [],
        [],
        ['Evaluator Name & Signature', '', '', 'Exam Cell Coordinator', '', '', 'Principal Signature', ''],
        [
          meta.evaluatorName ? `(${meta.evaluatorName})` : '',
          '',
          '',
          meta.examCellCoordinator ? `(${meta.examCellCoordinator})` : '(Central Exam Cell)',
          '',
          '',
          meta.principalName
            ? `(${meta.principalName})`
            : meta.principalSignature
            ? `(${meta.principalSignature})`
            : '(Principal)',
          '',
        ],
      ];

      const ws = XLSX.utils.aoa_to_sheet(titleRows);
      ws['!cols'] = [
        { wch: 8 },
        { wch: 22 },
        { wch: 32 },
        { wch: 14 },
        { wch: 12 },
        { wch: 16 },
        { wch: 10 },
        { wch: 14 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Marksheet');
      const cleanSubject = meta.subjectCode.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanSem = meta.semester.replace(/\s+/g, '_');
      XLSX.writeFile(wb, `${cleanSubject}_${cleanSem}_Marksheet.xlsx`);
    } catch (fallbackErr) {
      console.error('Fallback XLSX export also failed:', fallbackErr);
    }
  });
}
