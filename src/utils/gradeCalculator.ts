import { StudentMarkRecord, AttendanceStatus, GradeType, ResultType, EvaluationMetrics } from '../types';

export function calculateGradeAndResult(
  attendance: AttendanceStatus,
  marksObtained: number | '',
  maxMarks: number,
  passMark: number
): { grade: GradeType; result: ResultType } {
  if (attendance === 'ABSENT') {
    return {
      grade: 'AB',
      result: 'ABSENT',
    };
  }

  if (marksObtained === '' || isNaN(Number(marksObtained))) {
    return {
      grade: 'U',
      result: 'FAIL',
    };
  }

  const mark = Math.max(0, Math.min(Number(marksObtained), maxMarks));

  // Percentage mapping:
  // O  = 91 - 100
  // A+ = 81 - 90
  // A  = 71 - 80
  // B+ = 61 - 70
  // B  = 56 - 60
  // C  = 50 - 55
  // U  = < 50
  const percentage = maxMarks > 0 ? (mark / maxMarks) * 100 : 0;

  if (mark < passMark || percentage < 50) {
    return {
      grade: 'U',
      result: 'FAIL',
    };
  }

  let grade: GradeType = 'C';
  if (percentage >= 91) {
    grade = 'O';
  } else if (percentage >= 81) {
    grade = 'A+';
  } else if (percentage >= 71) {
    grade = 'A';
  } else if (percentage >= 61) {
    grade = 'B+';
  } else if (percentage >= 56) {
    grade = 'B';
  } else if (percentage >= 50) {
    grade = 'C';
  } else {
    grade = 'U';
  }

  return {
    grade,
    result: 'PASS',
  };
}

export function computeMetrics(students: StudentMarkRecord[], passMark: number): EvaluationMetrics {
  const totalEnrolled = students.length;
  let presentCount = 0;
  let absentCount = 0;
  let passCount = 0;
  let failCount = 0;

  for (const s of students) {
    if (s.attendance === 'ABSENT') {
      absentCount++;
      failCount++; // Counted as not passed or fail in assessment summary
    } else {
      presentCount++;
      const mark = typeof s.marksObtained === 'number' ? s.marksObtained : 0;
      if (mark >= passMark) {
        passCount++;
      } else {
        failCount++;
      }
    }
  }

  // Live pass percentage calculated on registered students or appeared students
  // Standard university metric: (Passed / Appeared) * 100 or (Passed / Enrolled) * 100
  // In UI2.png it shows "Pass percentage: 0.00%" when 0 students.
  const passPercentage = totalEnrolled > 0
    ? (passCount / totalEnrolled) * 100
    : 0;

  return {
    totalEnrolled,
    presentCount,
    absentCount,
    passCount,
    failCount,
    passPercentage,
  };
}

export const initialSampleStudents: StudentMarkRecord[] = [];
