export type UserRole = 'MARK_ENTER' | 'ADMIN';

export type AttendanceStatus = 'PRESENT' | 'ABSENT';

export type GradeType = 'O' | 'A+' | 'A' | 'B+' | 'B' | 'C' | 'U' | 'RA' | 'AB';

export type ResultType = 'PASS' | 'FAIL' | 'ABSENT';

export interface StudentMarkRecord {
  id: string;
  regNo: string;
  name: string;
  attendance: AttendanceStatus;
  maxMarks: number;
  marksObtained: number | '';
  grade: GradeType;
  result: ResultType;
}

export interface AssessmentMeta {
  yearCategory: '1ST_YEAR' | 'HIGHER_SEM';
  department: string;
  semester: string;
  examType: string;
  academicYear: string;
  facultyInCharge: string;
  evaluatorName?: string;
  assessmentDate: string;
  subjectCode: string;
  subjectName: string;
  maxMarks: number;
  passMark: number;
  isUnlocked: boolean;
  status: 'Draft (Editable)' | 'Submitted (Locked)';
  hodName: string;
  principalSignature: string;
  examCellCoordinator?: string;
  principalName?: string;
}

export interface EvaluationMetrics {
  totalEnrolled: number;
  presentCount: number;
  absentCount: number;
  passCount: number;
  failCount: number;
  passPercentage: number;
}
