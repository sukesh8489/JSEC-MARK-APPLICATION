import { StudentMarkRecord } from '../types';

export interface BatchStudent {
  id: string;
  regNo: string;
  name: string;
}

export interface YearBatchConfig {
  id: string;
  yearNumber: 1 | 2 | 3 | 4;
  yearLabel: string;
  semester: string;
  yearCategory: '1ST_YEAR' | 'HIGHER_SEM';
  academicYear: string;
  department: string;
  defaultSubjectCode?: string;
  defaultSubjectName?: string;
  allowDelete: boolean;
  isQrActive?: boolean; // true = Active (scan opens mark entry), false = Deactivated (scan blocked)
  qrStatus?: 'ACTIVE' | 'DEACTIVATED';
  qrActivatedAt?: string;
  qrDeactivatedAt?: string;
  students: BatchStudent[];
}

export const DEFAULT_DEPARTMENTS = [
  'AI&DS - Artificial Intelligence & Data Science',
  'CSE - Computer Science & Engineering',
  'CSE-CS - Computer Science & Engineering (Cyber Security)',
  'MECH - Mechanical Engineering',
  'PHARMA - Pharmaceutical Technology',
  'BIO-TECH - Biotechnology',
  'BIO-MED - Biomedical Engineering',
];

export const DEPARTMENTS = DEFAULT_DEPARTMENTS;

const DEPTS_STORAGE_KEY = 'jsec_custom_departments_v2';

export function getStoredDepartments(): string[] {
  if (typeof window === 'undefined') return [...DEFAULT_DEPARTMENTS];
  try {
    const raw = localStorage.getItem(DEPTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const unique = new Set<string>(DEFAULT_DEPARTMENTS);
        parsed.forEach((d) => {
          if (typeof d === 'string' && d.trim()) {
            unique.add(d.trim());
          }
        });
        return Array.from(unique);
      }
    }
  } catch (e) {
    console.warn('Error reading departments:', e);
  }
  return [...DEFAULT_DEPARTMENTS];
}

export function saveStoredDepartments(depts: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEPTS_STORAGE_KEY, JSON.stringify(depts));
  } catch (e) {
    console.warn('Error saving departments:', e);
  }
}

export function addNewDepartment(
  shortCode: string,
  fullName: string
): {
  newDept: string;
  updatedDepts: string[];
  newBatches: YearBatchConfig[];
} {
  const cleanCode = shortCode.trim().toUpperCase();
  const cleanName = fullName.trim();
  const formattedDept = `${cleanCode} - ${cleanName}`;

  const currentDepts = getStoredDepartments();
  let updatedDepts = currentDepts;
  if (!currentDepts.some((d) => d.toLowerCase() === formattedDept.toLowerCase())) {
    updatedDepts = [...currentDepts, formattedDept];
    saveStoredDepartments(updatedDepts);
  }

  // Generate 4 standard year batches for this new department
  const baseId = cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const newBatches: YearBatchConfig[] = [
    {
      id: `${baseId}_year1_sem1`,
      yearNumber: 1,
      yearLabel: '1st Year / 1st Sem Students',
      semester: 'Semester 1',
      yearCategory: '1ST_YEAR',
      academicYear: '2024-2028',
      department: formattedDept,
      allowDelete: false,
      isQrActive: true,
      qrStatus: 'ACTIVE',
      students: [],
    },
    {
      id: `${baseId}_year2_sem3`,
      yearNumber: 2,
      yearLabel: '2nd Year / 3rd Sem Students',
      semester: 'Semester 3',
      yearCategory: 'HIGHER_SEM',
      academicYear: '2023-2027',
      department: formattedDept,
      allowDelete: false,
      isQrActive: true,
      qrStatus: 'ACTIVE',
      students: [],
    },
    {
      id: `${baseId}_year3_sem5`,
      yearNumber: 3,
      yearLabel: '3rd Year / 5th Sem Students',
      semester: 'Semester 5',
      yearCategory: 'HIGHER_SEM',
      academicYear: '2022-2026',
      department: formattedDept,
      allowDelete: false,
      isQrActive: true,
      qrStatus: 'ACTIVE',
      students: [],
    },
    {
      id: `${baseId}_year4_sem7`,
      yearNumber: 4,
      yearLabel: '4th Year / 7th Sem Students',
      semester: 'Semester 7',
      yearCategory: 'HIGHER_SEM',
      academicYear: '2021-2025',
      department: formattedDept,
      allowDelete: true,
      isQrActive: true,
      qrStatus: 'ACTIVE',
      students: [],
    },
  ];

  // Append new batches to local storage if not already existing
  const currentBatches = getStoredBatches();
  const existingIds = new Set(currentBatches.map((b) => b.id));
  const batchesToAdd = newBatches.filter((b) => !existingIds.has(b.id));
  const allUpdated = [...currentBatches, ...batchesToAdd];
  saveStoredBatches(allUpdated);

  return {
    newDept: formattedDept,
    updatedDepts,
    newBatches: batchesToAdd,
  };
}

export const DEFAULT_BATCHES: YearBatchConfig[] = [
  // ==========================================
  // 1. AI&DS - Artificial Intelligence & Data Science
  // ==========================================
  {
    id: 'aids_year1_sem1',
    yearNumber: 1,
    yearLabel: '1st Year / 1st Sem Students',
    semester: 'Semester 1',
    yearCategory: '1ST_YEAR',
    academicYear: '2024-2028',
    department: 'AI&DS - Artificial Intelligence & Data Science',
    allowDelete: false,
    students: [],
  },
  {
    id: 'aids_year2_sem3',
    yearNumber: 2,
    yearLabel: '2nd Year / 3rd Sem Students',
    semester: 'Semester 3',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2023-2027',
    department: 'AI&DS - Artificial Intelligence & Data Science',
    allowDelete: false,
    students: [],
  },
  {
    id: 'aids_year3_sem5',
    yearNumber: 3,
    yearLabel: '3rd Year / 5th Sem Students',
    semester: 'Semester 5',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2022-2026',
    department: 'AI&DS - Artificial Intelligence & Data Science',
    allowDelete: false,
    students: [],
  },
  {
    id: 'aids_year4_sem7',
    yearNumber: 4,
    yearLabel: '4th Year / 7th Sem Students',
    semester: 'Semester 7',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2021-2025',
    department: 'AI&DS - Artificial Intelligence & Data Science',
    allowDelete: true,
    students: [],
  },

  // ==========================================
  // 2. CSE - Computer Science & Engineering
  // ==========================================
  {
    id: 'cse_year1_sem1',
    yearNumber: 1,
    yearLabel: '1st Year / 1st Sem Students',
    semester: 'Semester 1',
    yearCategory: '1ST_YEAR',
    academicYear: '2024-2028',
    department: 'CSE - Computer Science & Engineering',
    allowDelete: false,
    students: [],
  },
  {
    id: 'cse_year2_sem3',
    yearNumber: 2,
    yearLabel: '2nd Year / 3rd Sem Students',
    semester: 'Semester 3',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2023-2027',
    department: 'CSE - Computer Science & Engineering',
    allowDelete: false,
    students: [],
  },
  {
    id: 'cse_year3_sem5',
    yearNumber: 3,
    yearLabel: '3rd Year / 5th Sem Students',
    semester: 'Semester 5',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2022-2026',
    department: 'CSE - Computer Science & Engineering',
    allowDelete: false,
    students: [],
  },
  {
    id: 'cse_year4_sem7',
    yearNumber: 4,
    yearLabel: '4th Year / 7th Sem Students',
    semester: 'Semester 7',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2021-2025',
    department: 'CSE - Computer Science & Engineering',
    allowDelete: true,
    students: [],
  },

  // ==========================================
  // 3. CSE-CS - Computer Science & Engineering (Cyber Security)
  // ==========================================
  {
    id: 'cs_year1_sem1',
    yearNumber: 1,
    yearLabel: '1st Year / 1st Sem Students',
    semester: 'Semester 1',
    yearCategory: '1ST_YEAR',
    academicYear: '2024-2028',
    department: 'CSE-CS - Computer Science & Engineering (Cyber Security)',
    allowDelete: false,
    students: [],
  },
  {
    id: 'cs_year2_sem3',
    yearNumber: 2,
    yearLabel: '2nd Year / 3rd Sem Students',
    semester: 'Semester 3',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2023-2027',
    department: 'CSE-CS - Computer Science & Engineering (Cyber Security)',
    allowDelete: false,
    students: [],
  },
  {
    id: 'cs_year3_sem5',
    yearNumber: 3,
    yearLabel: '3rd Year / 5th Sem Students',
    semester: 'Semester 5',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2022-2026',
    department: 'CSE-CS - Computer Science & Engineering (Cyber Security)',
    allowDelete: false,
    students: [],
  },
  {
    id: 'cs_year4_sem7',
    yearNumber: 4,
    yearLabel: '4th Year / 7th Sem Students',
    semester: 'Semester 7',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2021-2025',
    department: 'CSE-CS - Computer Science & Engineering (Cyber Security)',
    allowDelete: true,
    students: [],
  },

  // ==========================================
  // 4. MECH - Mechanical Engineering
  // ==========================================
  {
    id: 'mech_year1_sem1',
    yearNumber: 1,
    yearLabel: '1st Year / 1st Sem Students',
    semester: 'Semester 1',
    yearCategory: '1ST_YEAR',
    academicYear: '2024-2028',
    department: 'MECH - Mechanical Engineering',
    allowDelete: false,
    students: [],
  },
  {
    id: 'mech_year2_sem3',
    yearNumber: 2,
    yearLabel: '2nd Year / 3rd Sem Students',
    semester: 'Semester 3',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2023-2027',
    department: 'MECH - Mechanical Engineering',
    allowDelete: false,
    students: [],
  },
  {
    id: 'mech_year3_sem5',
    yearNumber: 3,
    yearLabel: '3rd Year / 5th Sem Students',
    semester: 'Semester 5',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2022-2026',
    department: 'MECH - Mechanical Engineering',
    allowDelete: false,
    students: [],
  },
  {
    id: 'mech_year4_sem7',
    yearNumber: 4,
    yearLabel: '4th Year / 7th Sem Students',
    semester: 'Semester 7',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2021-2025',
    department: 'MECH - Mechanical Engineering',
    allowDelete: true,
    students: [],
  },

  // ==========================================
  // 5. PHARMA - Pharmaceutical Technology
  // ==========================================
  {
    id: 'pharma_year1_sem1',
    yearNumber: 1,
    yearLabel: '1st Year / 1st Sem Students',
    semester: 'Semester 1',
    yearCategory: '1ST_YEAR',
    academicYear: '2024-2028',
    department: 'PHARMA - Pharmaceutical Technology',
    allowDelete: false,
    students: [],
  },
  {
    id: 'pharma_year2_sem3',
    yearNumber: 2,
    yearLabel: '2nd Year / 3rd Sem Students',
    semester: 'Semester 3',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2023-2027',
    department: 'PHARMA - Pharmaceutical Technology',
    allowDelete: false,
    students: [],
  },
  {
    id: 'pharma_year3_sem5',
    yearNumber: 3,
    yearLabel: '3rd Year / 5th Sem Students',
    semester: 'Semester 5',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2022-2026',
    department: 'PHARMA - Pharmaceutical Technology',
    allowDelete: false,
    students: [],
  },
  {
    id: 'pharma_year4_sem7',
    yearNumber: 4,
    yearLabel: '4th Year / 7th Sem Students',
    semester: 'Semester 7',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2021-2025',
    department: 'PHARMA - Pharmaceutical Technology',
    allowDelete: true,
    students: [],
  },

  // ==========================================
  // 6. BIO-TECH - Biotechnology
  // ==========================================
  {
    id: 'biotech_year1_sem1',
    yearNumber: 1,
    yearLabel: '1st Year / 1st Sem Students',
    semester: 'Semester 1',
    yearCategory: '1ST_YEAR',
    academicYear: '2024-2028',
    department: 'BIO-TECH - Biotechnology',
    allowDelete: false,
    students: [],
  },
  {
    id: 'biotech_year2_sem3',
    yearNumber: 2,
    yearLabel: '2nd Year / 3rd Sem Students',
    semester: 'Semester 3',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2023-2027',
    department: 'BIO-TECH - Biotechnology',
    allowDelete: false,
    students: [],
  },
  {
    id: 'biotech_year3_sem5',
    yearNumber: 3,
    yearLabel: '3rd Year / 5th Sem Students',
    semester: 'Semester 5',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2022-2026',
    department: 'BIO-TECH - Biotechnology',
    allowDelete: false,
    students: [],
  },
  {
    id: 'biotech_year4_sem7',
    yearNumber: 4,
    yearLabel: '4th Year / 7th Sem Students',
    semester: 'Semester 7',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2021-2025',
    department: 'BIO-TECH - Biotechnology',
    allowDelete: true,
    students: [],
  },

  // ==========================================
  // 7. BIO-MED - Biomedical Engineering
  // ==========================================
  {
    id: 'biomed_year1_sem1',
    yearNumber: 1,
    yearLabel: '1st Year / 1st Sem Students',
    semester: 'Semester 1',
    yearCategory: '1ST_YEAR',
    academicYear: '2024-2028',
    department: 'BIO-MED - Biomedical Engineering',
    allowDelete: false,
    students: [],
  },
  {
    id: 'biomed_year2_sem3',
    yearNumber: 2,
    yearLabel: '2nd Year / 3rd Sem Students',
    semester: 'Semester 3',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2023-2027',
    department: 'BIO-MED - Biomedical Engineering',
    allowDelete: false,
    students: [],
  },
  {
    id: 'biomed_year3_sem5',
    yearNumber: 3,
    yearLabel: '3rd Year / 5th Sem Students',
    semester: 'Semester 5',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2022-2026',
    department: 'BIO-MED - Biomedical Engineering',
    allowDelete: false,
    students: [],
  },
  {
    id: 'biomed_year4_sem7',
    yearNumber: 4,
    yearLabel: '4th Year / 7th Sem Students',
    semester: 'Semester 7',
    yearCategory: 'HIGHER_SEM',
    academicYear: '2021-2025',
    department: 'BIO-MED - Biomedical Engineering',
    allowDelete: true,
    students: [],
  },
];

const STORAGE_KEY = 'jsec_student_batches_v7_clean';

export function getStoredBatches(): YearBatchConfig[] {
  if (typeof window === 'undefined') return DEFAULT_BATCHES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validDeptList = getStoredDepartments();
        const validDeptNames = new Set(validDeptList.map((d) => d.trim().toLowerCase()));

        // Also if any parsed batch has a department, ensure it's in stored departments
        let deptsUpdated = false;
        parsed.forEach((b) => {
          if (b.department && typeof b.department === 'string' && !validDeptNames.has(b.department.trim().toLowerCase())) {
            validDeptList.push(b.department.trim());
            validDeptNames.add(b.department.trim().toLowerCase());
            deptsUpdated = true;
          }
        });
        if (deptsUpdated) {
          saveStoredDepartments(validDeptList);
        }

        const sanitized = parsed
          .filter((b) => b.department && (validDeptNames.has(b.department.trim().toLowerCase()) || b.department.trim().length > 0))
          .map((b) => {
            const copy = { ...b };
            delete copy.defaultSubjectCode;
            delete copy.defaultSubjectName;
            if (copy.isQrActive === undefined) {
              copy.isQrActive = true;
              copy.qrStatus = 'ACTIVE';
            }
            return copy;
          });
        const existingIds = new Set(sanitized.map((b) => b.id));
        const missing = DEFAULT_BATCHES.filter((b) => !existingIds.has(b.id));
        const merged = [...sanitized, ...missing];
        saveStoredBatches(merged);
        return merged;
      }
    }
  } catch (e) {
    console.error('Error reading student batches from localStorage', e);
  }
  saveStoredBatches(DEFAULT_BATCHES);
  return DEFAULT_BATCHES;
}

export function clearAllStudentsFromBatches(): YearBatchConfig[] {
  const current = getStoredBatches();
  const cleared = current.map((b) => ({
    ...b,
    students: [],
  }));
  saveStoredBatches(cleared);
  return cleared;
}

export function saveStoredBatches(batches: YearBatchConfig[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
  } catch (e) {
    console.error('Error saving student batches to localStorage', e);
  }
}

export function getBatchesForDepartment(dept: string): YearBatchConfig[] {
  const all = getStoredBatches();
  return all.filter((b) => b.department.trim().toLowerCase() === dept.trim().toLowerCase());
}

export function findBatchByDeptAndSem(dept: string, semester: string): YearBatchConfig | undefined {
  const all = getStoredBatches();
  const d = dept.trim().toLowerCase();
  const s = semester.trim().toLowerCase();
  let match = all.find((b) => b.department.trim().toLowerCase() === d && b.semester.trim().toLowerCase() === s);
  if (match) return match;
  match = all.find((b) => b.department.trim().toLowerCase() === d);
  return match || all[0];
}

export function convertToMarkRecords(
  students: BatchStudent[],
  maxMarks = 50
): StudentMarkRecord[] {
  return students.map((s, idx) => ({
    id: s.id || `rec-${idx + 1}-${Date.now()}`,
    regNo: s.regNo,
    name: s.name,
    attendance: 'PRESENT',
    maxMarks,
    marksObtained: '',
    grade: 'RA',
    result: 'FAIL',
  }));
}

export function isBatchQrActive(batch?: YearBatchConfig | null): boolean {
  if (!batch) return true;
  return batch.isQrActive !== false && batch.qrStatus !== 'DEACTIVATED';
}

export function toggleBatchQrStatus(batchId: string, activate: boolean): YearBatchConfig[] {
  const current = getStoredBatches();
  const updated = current.map((b) => {
    if (b.id !== batchId) return b;
    return {
      ...b,
      isQrActive: activate,
      qrStatus: activate ? ('ACTIVE' as const) : ('DEACTIVATED' as const),
      qrActivatedAt: activate ? new Date().toISOString() : b.qrActivatedAt,
      qrDeactivatedAt: !activate ? new Date().toISOString() : b.qrDeactivatedAt,
    };
  });
  saveStoredBatches(updated);
  return updated;
}
