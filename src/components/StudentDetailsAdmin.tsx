import React, { useState, useEffect, FormEvent, ChangeEvent, useMemo } from 'react';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import {
  YearBatchConfig,
  BatchStudent,
  DEPARTMENTS,
  DEFAULT_BATCHES,
  getStoredBatches,
  saveStoredBatches,
  getStoredDepartments,
  addNewDepartment,
  isBatchQrActive,
} from '../utils/studentBatches';
import {
  subscribeToLiveBatches,
  saveBatchToFirestore,
  updateBatchQrStatusInFirestore,
} from '../services/firestoreService';
import {
  Users,
  QrCode,
  Plus,
  FileSpreadsheet,
  ClipboardPaste,
  Pencil,
  Trash2,
  Search,
  ExternalLink,
  Copy,
  Check,
  Download,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  Info,
  X,
  RefreshCw,
  Upload,
  Layers,
  Building2,
  Calendar,
  BookOpen,
  Database,
  ChevronRight,
  ArrowUpDown,
  Cpu,
  ShieldCheck,
  Cog,
  FlaskConical,
  Dna,
  HeartPulse,
  Laptop,
  CheckCircle2,
  Lock,
  Radio,
  Zap,
  Globe,
  Compass,
  Terminal,
} from 'lucide-react';

interface StudentDetailsAdminProps {
  onOpenBatchMarkEntry: (batchId: string, semester: string, department?: string) => void;
}

// Helper functions to safely extract department code and full name
const getDeptCode = (dept: string) => dept.split(' - ')[0]?.trim() || dept;
const getDeptFullName = (dept: string) => dept.split(' - ')[1]?.trim() || dept;

// Department visual styling metadata
const DEPT_THEMES: Record<
  string,
  {
    icon: React.ElementType;
    iconBgLight: string;
    iconTextLight: string;
    borderActive: string;
    accentGradient: string;
    tagBg: string;
  }
> = {
  'AI&DS': {
    icon: Cpu,
    iconBgLight: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    iconTextLight: 'text-indigo-600',
    borderActive: 'border-indigo-400',
    accentGradient: 'from-indigo-500 to-purple-600',
    tagBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  'CSE': {
    icon: Laptop,
    iconBgLight: 'bg-blue-50 text-blue-700 border-blue-200',
    iconTextLight: 'text-blue-600',
    borderActive: 'border-blue-400',
    accentGradient: 'from-blue-500 to-cyan-600',
    tagBg: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  'CSE-CS': {
    icon: ShieldCheck,
    iconBgLight: 'bg-violet-50 text-violet-700 border-violet-200',
    iconTextLight: 'text-violet-600',
    borderActive: 'border-violet-400',
    accentGradient: 'from-violet-500 to-indigo-600',
    tagBg: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  'MECH': {
    icon: Cog,
    iconBgLight: 'bg-amber-50 text-amber-800 border-amber-200',
    iconTextLight: 'text-amber-600',
    borderActive: 'border-amber-400',
    accentGradient: 'from-amber-500 to-orange-600',
    tagBg: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  'PHARMA': {
    icon: FlaskConical,
    iconBgLight: 'bg-rose-50 text-rose-700 border-rose-200',
    iconTextLight: 'text-rose-600',
    borderActive: 'border-rose-400',
    accentGradient: 'from-rose-500 to-pink-600',
    tagBg: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  'BIO-TECH': {
    icon: Dna,
    iconBgLight: 'bg-teal-50 text-teal-700 border-teal-200',
    iconTextLight: 'text-teal-600',
    borderActive: 'border-teal-400',
    accentGradient: 'from-teal-500 to-emerald-600',
    tagBg: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  'BIO-MED': {
    icon: HeartPulse,
    iconBgLight: 'bg-red-50 text-red-700 border-red-200',
    iconTextLight: 'text-red-600',
    borderActive: 'border-red-400',
    accentGradient: 'from-red-500 to-rose-600',
    tagBg: 'bg-red-50 text-red-700 border-red-200',
  },
  'BME': {
    icon: HeartPulse,
    iconBgLight: 'bg-red-50 text-red-700 border-red-200',
    iconTextLight: 'text-red-600',
    borderActive: 'border-red-400',
    accentGradient: 'from-red-500 to-rose-600',
    tagBg: 'bg-red-50 text-red-700 border-red-200',
  },
  'ECE': {
    icon: Radio,
    iconBgLight: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    iconTextLight: 'text-cyan-600',
    borderActive: 'border-cyan-400',
    accentGradient: 'from-cyan-500 to-blue-600',
    tagBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  'EEE': {
    icon: Zap,
    iconBgLight: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    iconTextLight: 'text-yellow-600',
    borderActive: 'border-yellow-400',
    accentGradient: 'from-yellow-500 to-amber-600',
    tagBg: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  },
  'CIVIL': {
    icon: Compass,
    iconBgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconTextLight: 'text-emerald-600',
    borderActive: 'border-emerald-400',
    accentGradient: 'from-emerald-500 to-teal-600',
    tagBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  'IT': {
    icon: Globe,
    iconBgLight: 'bg-sky-50 text-sky-700 border-sky-200',
    iconTextLight: 'text-sky-600',
    borderActive: 'border-sky-400',
    accentGradient: 'from-sky-500 to-blue-600',
    tagBg: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  'CYBER': {
    icon: ShieldCheck,
    iconBgLight: 'bg-purple-50 text-purple-700 border-purple-200',
    iconTextLight: 'text-purple-600',
    borderActive: 'border-purple-400',
    accentGradient: 'from-purple-500 to-indigo-600',
    tagBg: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  'MBA': {
    icon: GraduationCap,
    iconBgLight: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    iconTextLight: 'text-indigo-600',
    borderActive: 'border-indigo-400',
    accentGradient: 'from-indigo-500 to-purple-600',
    tagBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  'MCA': {
    icon: Terminal,
    iconBgLight: 'bg-slate-100 text-slate-800 border-slate-300',
    iconTextLight: 'text-slate-700',
    borderActive: 'border-slate-400',
    accentGradient: 'from-slate-600 to-slate-800',
    tagBg: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export default function StudentDetailsAdmin({
  onOpenBatchMarkEntry,
}: StudentDetailsAdminProps) {
  const [batches, setBatches] = useState<YearBatchConfig[]>(getStoredBatches);
  const [departmentsList, setDepartmentsList] = useState<string[]>(getStoredDepartments);
  const [selectedDept, setSelectedDept] = useState<string>('AI&DS - Artificial Intelligence & Data Science');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('aids_year1_sem1');
  const [searchQuery, setSearchQuery] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isSingleAddOpen, setIsSingleAddOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<BatchStudent | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<BatchStudent | null>(null);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);

  // Add Department modal state
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptError, setNewDeptError] = useState<string | null>(null);
  const [isCreatingDept, setIsCreatingDept] = useState(false);

  // Single Add form state
  const [newRegNo, setNewRegNo] = useState('');
  const [newName, setNewName] = useState('');

  // Edit form state
  const [editRegNo, setEditRegNo] = useState('');
  const [editName, setEditName] = useState('');

  // Bulk modal state
  const [bulkMode, setBulkMode] = useState<'excel' | 'paste'>('excel');
  const [pasteText, setPasteText] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [bulkPreview, setBulkPreview] = useState<{ regNo: string; name: string }[]>([]);
  const [bulkFileName, setBulkFileName] = useState('');

  // Rename Year Batch modal state
  const [batchToRename, setBatchToRename] = useState<YearBatchConfig | null>(null);
  const [renameYearLabel, setRenameYearLabel] = useState('');
  const [renameAcademicYear, setRenameAcademicYear] = useState('');
  const [renameDepartment, setRenameDepartment] = useState('');
  const [renameSemester, setRenameSemester] = useState('');

  // Subscribe to live Firestore batches
  useEffect(() => {
    const unsub = subscribeToLiveBatches((liveBatches) => {
      if (liveBatches && liveBatches.length > 0) {
        setBatches(liveBatches);
      }
    });
    return () => unsub();
  }, []);

  // Filter batches for the currently selected department
  const deptBatches = useMemo(() => {
    return batches.filter(
      (b) => b.department.trim().toLowerCase() === selectedDept.trim().toLowerCase()
    );
  }, [batches, selectedDept]);

  // List of available departments including any dynamically created ones
  const availableDepartments = useMemo(() => {
    const set = new Set<string>(departmentsList);
    batches.forEach((b) => {
      if (b.department && b.department.trim()) {
        set.add(b.department.trim());
      }
    });
    return Array.from(set);
  }, [departmentsList, batches]);

  // Handlers for Add Department Modal
  const handleOpenAddDeptModal = () => {
    setNewDeptCode('');
    setNewDeptName('');
    setNewDeptError(null);
    setIsAddDeptModalOpen(true);
  };

  const handleCreateDepartment = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const code = newDeptCode.trim().toUpperCase();
    const name = newDeptName.trim();

    if (!code) {
      setNewDeptError('Please enter a department short code (e.g. ECE, CIVIL, EEE)');
      return;
    }
    if (!name) {
      setNewDeptError('Please enter the full department name (e.g. Electronics & Communication Engineering)');
      return;
    }

    const formatted = `${code} - ${name}`;
    const alreadyExists = availableDepartments.some(
      (d) =>
        d.toLowerCase() === formatted.toLowerCase() ||
        getDeptCode(d).toLowerCase() === code.toLowerCase()
    );

    if (alreadyExists) {
      setNewDeptError(`Department "${code}" or "${formatted}" already exists.`);
      return;
    }

    setIsCreatingDept(true);
    try {
      const { newDept, updatedDepts, newBatches } = addNewDepartment(code, name);
      setDepartmentsList(updatedDepts);

      // Save each generated academic year batch to Firestore
      for (const b of newBatches) {
        await saveBatchToFirestore(b).catch((err) => {
          console.warn('Notice: Firestore batch save:', err);
        });
      }

      const refreshed = getStoredBatches();
      setBatches(refreshed);
      setSelectedDept(newDept);
      if (newBatches.length > 0) {
        setSelectedBatchId(newBatches[0].id);
      }

      setIsAddDeptModalOpen(false);
      setNewDeptCode('');
      setNewDeptName('');
      setNewDeptError(null);
      showToast(`✅ New Department "${newDept}" created with 4 academic year batches!`);
    } catch (err) {
      console.error('Error creating department:', err);
      setNewDeptError('Failed to create department. Please try again.');
    } finally {
      setIsCreatingDept(false);
    }
  };

  // Active batch fallback
  const activeBatch: YearBatchConfig = useMemo(() => {
    const found = deptBatches.find((b) => b.id === selectedBatchId);
    if (found) return found;
    if (deptBatches.length > 0) return deptBatches[0];
    return batches[0] || DEFAULT_BATCHES[0];
  }, [deptBatches, selectedBatchId, batches]);

  // When selected department changes, ensure selectedBatchId switches to a valid batch in that dept
  const handleSelectDepartment = (dept: string) => {
    setSelectedDept(dept);
    const available = batches.filter(
      (b) => b.department.trim().toLowerCase() === dept.trim().toLowerCase()
    );
    if (available.length > 0) {
      // Prefer year 1 or year 2 if available
      setSelectedBatchId(available[0].id);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync with localStorage & Firestore
  const updateBatches = (newBatches: YearBatchConfig[], changedBatch?: YearBatchConfig) => {
    setBatches(newBatches);
    saveStoredBatches(newBatches);
    if (changedBatch) {
      saveBatchToFirestore(changedBatch).catch((err) => {
        console.warn('Live sync notice for batch:', err);
      });
    }
  };

  // Open batch rename dialog
  const handleOpenRenameBatch = (batch: YearBatchConfig) => {
    setBatchToRename(batch);
    setRenameYearLabel(batch.yearLabel);
    setRenameAcademicYear(batch.academicYear);
    setRenameDepartment(batch.department);
    setRenameSemester(batch.semester);
  };

  // Save renamed batch
  const handleSaveRenameBatch = (e: FormEvent) => {
    e.preventDefault();
    if (!batchToRename) return;
    if (!renameYearLabel.trim()) {
      showToast('Batch name / label cannot be empty');
      return;
    }

    let modifiedBatch: YearBatchConfig | undefined;
    const updated = batches.map((b) => {
      if (b.id !== batchToRename.id) return b;
      modifiedBatch = {
        ...b,
        yearLabel: renameYearLabel.trim(),
        academicYear: renameAcademicYear.trim() || b.academicYear,
        department: renameDepartment.trim() || b.department,
        semester: renameSemester.trim() || b.semester,
      };
      return modifiedBatch;
    });

    updateBatches(updated, modifiedBatch);
    showToast(`Year ${batchToRename.yearNumber} Batch updated to "${renameYearLabel.trim()}"`);
    setBatchToRename(null);
  };

  // Reset batch to original default values
  const handleResetBatchToDefault = () => {
    if (!batchToRename) return;
    const defaultBatch = DEFAULT_BATCHES.find((b) => b.id === batchToRename.id);
    if (defaultBatch) {
      setRenameYearLabel(defaultBatch.yearLabel);
      setRenameAcademicYear(defaultBatch.academicYear);
      setRenameDepartment(defaultBatch.department);
      setRenameSemester(defaultBatch.semester);
      showToast('Fields reset to default values');
    }
  };

  // Calculate direct mark entry URL for this batch
  const getBatchMarkEntryUrl = (batch: YearBatchConfig) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    return `${origin}${path}?role=staff&batch=${batch.id}&dept=${encodeURIComponent(
      batch.department
    )}&sem=${encodeURIComponent(batch.semester)}&qr=true&locked=true`;
  };

  // Generate QR Code whenever active batch changes
  useEffect(() => {
    if (!activeBatch) return;
    const url = getBatchMarkEntryUrl(activeBatch);
    QRCode.toDataURL(url, {
      width: 260,
      margin: 2,
      color: {
        dark: '#0f284e',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        setQrDataUrl(dataUrl);
      })
      .catch((err) => {
        console.error('Failed to generate QR code', err);
      });
  }, [activeBatch]);

  // Copy staff direct link
  const handleCopyLink = () => {
    if (!activeBatch) return;
    const url = getBatchMarkEntryUrl(activeBatch);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast('Direct Mark Entry Link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Download QR Code image
  const handleDownloadQr = () => {
    if (!qrDataUrl || !activeBatch) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `JSEC_${activeBatch.id}_QR.png`;
    a.click();
    showToast('QR Code image downloaded');
  };

  // Toggle Activate / Deactivate option for batch QR code
  const handleToggleQrStatus = async (batch: YearBatchConfig, activate: boolean) => {
    let modifiedBatch: YearBatchConfig | undefined;
    const updated = batches.map((b) => {
      if (b.id !== batch.id) return b;
      modifiedBatch = {
        ...b,
        isQrActive: activate,
        qrStatus: activate ? 'ACTIVE' : 'DEACTIVATED',
        qrActivatedAt: activate ? new Date().toISOString() : b.qrActivatedAt,
        qrDeactivatedAt: !activate ? new Date().toISOString() : b.qrDeactivatedAt,
      };
      return modifiedBatch;
    });

    updateBatches(updated, modifiedBatch);

    try {
      await updateBatchQrStatusInFirestore(batch.id, activate);
    } catch (err) {
      console.warn('Notice: Firestore live sync for QR status:', err);
    }

    showToast(
      activate
        ? `✅ QR Code for ${batch.yearLabel} is now ACTIVATED! Staff scan will open Mark Entry.`
        : `🛑 QR Code for ${batch.yearLabel} is now DEACTIVATED! Staff scan access is blocked.`
    );
  };

  // Master Toggle: Activate or Deactivate QR codes for ALL year batches
  const handleToggleAllBatchesQr = async (activate: boolean) => {
    const updated = batches.map((b) => ({
      ...b,
      isQrActive: activate,
      qrStatus: (activate ? 'ACTIVE' : 'DEACTIVATED') as 'ACTIVE' | 'DEACTIVATED',
      qrActivatedAt: activate ? new Date().toISOString() : b.qrActivatedAt,
      qrDeactivatedAt: !activate ? new Date().toISOString() : b.qrDeactivatedAt,
    }));

    updateBatches(updated);

    try {
      await Promise.allSettled(
        batches.map((b) => updateBatchQrStatusInFirestore(b.id, activate))
      );
    } catch (err) {
      console.warn('Notice: Firestore bulk QR update:', err);
    }

    showToast(
      activate
        ? `✅ All Year QR codes ACTIVATED! Staff scan can open Mark Entry across all batches.`
        : `🛑 All Year QR codes DEACTIVATED! Mark Entry scan access is now blocked across all batches.`
    );
  };

  // Open single add modal with auto-suggested Register Number
  const handleOpenSingleAdd = () => {
    if (!activeBatch) return;
    // Extract branch code prefix from department
    let branchCode = '104';
    if (activeBatch.department.includes('ECE')) branchCode = '106';
    else if (activeBatch.department.includes('MECH')) branchCode = '114';
    else if (activeBatch.department.includes('IT')) branchCode = '205';

    let yrDigits = '24';
    if (activeBatch.yearNumber === 2) yrDigits = '23';
    else if (activeBatch.yearNumber === 3) yrDigits = '22';
    else if (activeBatch.yearNumber === 4) yrDigits = '21';

    const nextNum = (activeBatch.students.length + 1).toString().padStart(3, '0');
    setNewRegNo(`1108${yrDigits}${branchCode}${nextNum}`);
    setNewName('');
    setIsSingleAddOpen(true);
  };

  // Save single student
  const handleSaveSingleStudent = (e: FormEvent) => {
    e.preventDefault();
    if (!activeBatch) return;
    if (!newRegNo.trim() || !newName.trim()) {
      showToast('Please provide both Register Number and Student Name');
      return;
    }

    const newStudent: BatchStudent = {
      id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      regNo: newRegNo.trim().toUpperCase(),
      name: newName.trim().toUpperCase(),
    };

    let modified: YearBatchConfig | undefined;
    const updated = batches.map((b) => {
      if (b.id !== activeBatch.id) return b;
      modified = {
        ...b,
        students: [...b.students, newStudent],
      };
      return modified;
    });

    updateBatches(updated, modified);
    setIsSingleAddOpen(false);
    showToast(`Student ${newStudent.name} added to ${activeBatch.yearLabel}`);
  };

  // Open edit / rename modal
  const handleOpenEdit = (student: BatchStudent) => {
    setStudentToEdit(student);
    setEditRegNo(student.regNo);
    setEditName(student.name);
  };

  // Save edited student
  const handleSaveEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!studentToEdit || !activeBatch) return;
    if (!editName.trim() || !editRegNo.trim()) {
      showToast('Please enter both Register Number and Name');
      return;
    }

    let modified: YearBatchConfig | undefined;
    const updated = batches.map((b) => {
      if (b.id !== activeBatch.id) return b;
      modified = {
        ...b,
        students: b.students.map((s) =>
          s.id === studentToEdit.id
            ? { ...s, regNo: editRegNo.trim().toUpperCase(), name: editName.trim().toUpperCase() }
            : s
        ),
      };
      return modified;
    });

    updateBatches(updated, modified);
    setStudentToEdit(null);
    showToast('Student details updated successfully');
  };

  // Confirm delete single student
  const handleDelete = (student: BatchStudent) => {
    setStudentToDelete(student);
  };

  const confirmDelete = () => {
    if (!studentToDelete || !activeBatch) return;
    let modified: YearBatchConfig | undefined;
    const updated = batches.map((b) => {
      if (b.id !== activeBatch.id) return b;
      modified = {
        ...b,
        students: b.students.filter((s) => s.id !== studentToDelete.id),
      };
      return modified;
    });
    updateBatches(updated, modified);
    showToast(`Removed ${studentToDelete.name} from ${activeBatch.yearLabel}`);
    setStudentToDelete(null);
  };

  // Confirm delete all students in active batch
  const handleConfirmDeleteAll = () => {
    if (!activeBatch) return;
    const count = activeBatch.students.length;
    let modified: YearBatchConfig | undefined;
    const updated = batches.map((b) => {
      if (b.id !== activeBatch.id) return b;
      modified = {
        ...b,
        students: [],
      };
      return modified;
    });
    updateBatches(updated, modified);
    showToast(`All ${count} students removed from ${activeBatch.yearLabel}`);
    setIsDeleteAllOpen(false);
  };

  // Parse Copy-Paste text
  const handlePasteChange = (text: string) => {
    setPasteText(text);
    const lines = text.split('\n');
    const parsed: { regNo: string; name: string }[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t').map((p) => p.trim());
      } else if (line.includes(',')) {
        parts = line.split(',').map((p) => p.trim());
      } else {
        const spaceIdx = line.search(/\s+/);
        if (spaceIdx > 0) {
          parts = [line.substring(0, spaceIdx).trim(), line.substring(spaceIdx).trim()];
        }
      }

      if (parts.length >= 2) {
        const reg = parts[0].replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const name = parts.slice(1).join(' ').trim().toUpperCase();
        if (reg && name) {
          parsed.push({ regNo: reg, name });
        }
      }
    }

    setBulkPreview(parsed);
  };

  // Parse Excel file
  const handleExcelUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

        const parsed: { regNo: string; name: string }[] = [];

        let headerRowIndex = -1;
        let regColIndex = -1;
        let nameColIndex = -1;

        for (let i = 0; i < Math.min(json.length, 10); i++) {
          const row = json[i];
          if (!Array.isArray(row)) continue;
          for (let j = 0; j < row.length; j++) {
            const cell = String(row[j] || '').toLowerCase();
            if (cell.includes('reg') || cell.includes('register') || cell.includes('roll')) {
              regColIndex = j;
              headerRowIndex = i;
            }
            if (cell.includes('name') || cell.includes('student')) {
              nameColIndex = j;
              headerRowIndex = i;
            }
          }
          if (regColIndex !== -1 && nameColIndex !== -1) break;
        }

        const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;
        const rCol = regColIndex !== -1 ? regColIndex : 0;
        const nCol = nameColIndex !== -1 ? nameColIndex : 1;

        for (let i = startRow; i < json.length; i++) {
          const row = json[i];
          if (!Array.isArray(row)) continue;
          const regRaw = String(row[rCol] || '').trim();
          const nameRaw = String(row[nCol] || '').trim();
          const reg = regRaw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
          const name = nameRaw.toUpperCase();

          if (reg && name && reg.length >= 6) {
            parsed.push({ regNo: reg, name });
          }
        }

        setBulkPreview(parsed);
        if (parsed.length === 0) {
          showToast('No student rows found. Please check Excel columns (Reg No, Name)');
        } else {
          showToast(`Extracted ${parsed.length} students from ${file.name}`);
        }
      } catch (err) {
        console.error('Error parsing excel', err);
        showToast('Failed to read Excel file. Please use .xlsx or .csv');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Confirm Bulk Import
  const handleConfirmBulkImport = () => {
    if (bulkPreview.length === 0 || !activeBatch) return;

    const newStudentRecords: BatchStudent[] = bulkPreview.map((item, idx) => ({
      id: `s-bulk-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
      regNo: item.regNo,
      name: item.name,
    }));

    let modified: YearBatchConfig | undefined;
    const updated = batches.map((b) => {
      if (b.id !== activeBatch.id) return b;
      const combined =
        importMode === 'replace'
          ? newStudentRecords
          : [...b.students, ...newStudentRecords];
      modified = {
        ...b,
        students: combined,
      };
      return modified;
    });

    updateBatches(updated, modified);
    setIsBulkModalOpen(false);
    setBulkPreview([]);
    setPasteText('');
    setBulkFileName('');
    showToast(
      `Successfully ${importMode === 'replace' ? 'replaced with' : 'added'} ${newStudentRecords.length} students in ${activeBatch.yearLabel}`
    );
  };

  // Export current roster to Excel (.xlsx)
  const handleExportExcel = () => {
    if (!activeBatch || activeBatch.students.length === 0) {
      showToast('No students to export in this batch');
      return;
    }

    const rows = activeBatch.students.map((s, idx) => ({
      'S.No': idx + 1,
      'Register Number': s.regNo,
      'Student Name': s.name,
      'Department': activeBatch.department,
      'Academic Year': activeBatch.academicYear,
      'Semester': activeBatch.semester,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    const safeFilename = `${getDeptCode(activeBatch.department)}_${activeBatch.semester.replace(/\s+/g, '_')}_Roster.xlsx`;
    XLSX.writeFile(workbook, safeFilename);
    showToast(`Exported ${activeBatch.students.length} students to ${safeFilename}`);
  };

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!activeBatch) return [];
    return activeBatch.students.filter(
      (s) =>
        s.regNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeBatch, searchQuery]);

  // Total enrolled across the whole college
  const totalCollegeEnrolled = useMemo(() => {
    return batches.reduce((acc, b) => acc + b.students.length, 0);
  }, [batches]);

  // Total enrolled in the currently selected department
  const totalDeptEnrolled = useMemo(() => {
    return deptBatches.reduce((acc, b) => acc + b.students.length, 0);
  }, [deptBatches]);

  // Count of active batches across all years / batches
  const allBatchesCount = batches.length;
  const activeBatchesCount = useMemo(() => {
    return batches.filter((b) => isBatchQrActive(b)).length;
  }, [batches]);
  const isAllBatchesActive = allBatchesCount > 0 && activeBatchesCount === allBatchesCount;
  const isAllBatchesDeactivated = allBatchesCount > 0 && activeBatchesCount === 0;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#0f284e] text-white px-5 py-3 rounded-xl shadow-xl border border-blue-400 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-3">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MASTER QR CODE CONTROL: ACTIVATE / DEACTIVATE FOR ALL YEAR QR CODES      */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-2xs shrink-0 ${
              isAllBatchesActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isAllBatchesDeactivated
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-blue-50 text-blue-900 border border-blue-200'
            }`}
          >
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-slate-900 tracking-wide uppercase">
                ALL YEAR QR CODE ACCESS CONTROL
              </span>
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                  isAllBatchesActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isAllBatchesDeactivated
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isAllBatchesActive
                      ? 'bg-emerald-500 animate-pulse'
                      : isAllBatchesDeactivated
                      ? 'bg-rose-500'
                      : 'bg-amber-500'
                  }`}
                />
                <span>
                  {isAllBatchesActive
                    ? 'All Year QR: ACTIVE'
                    : isAllBatchesDeactivated
                    ? 'All Year QR: DEACTIVATED'
                    : `${activeBatchesCount}/${allBatchesCount} Batches Active`}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* The requested option: QR: ACTIVATE, DEACTIVATE for all yr qr */}
        <div className="flex items-center gap-2 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/90 shadow-2xs self-start md:self-center">
          <span className="text-xs font-black text-slate-700 px-2 tracking-wide">
            QR:
          </span>
          <div className="flex items-center gap-1" role="group" aria-label="QR Activate Deactivate for all year qr">
            <button
              type="button"
              id="btn-qr-activate-all-yr"
              onClick={() => handleToggleAllBatchesQr(true)}
              className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                isAllBatchesActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/70 border border-slate-200'
              }`}
              title="Activate all year QR codes: staff scan will open mark enter page"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isAllBatchesActive ? 'bg-white animate-pulse' : 'bg-emerald-500'
                }`}
              />
              <span>ACTIVATE</span>
            </button>

            <button
              type="button"
              id="btn-qr-deactivate-all-yr"
              onClick={() => handleToggleAllBatchesQr(false)}
              className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                isAllBatchesDeactivated
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:text-rose-700 hover:bg-rose-50/70 border border-slate-200'
              }`}
              title="Deactivate all year QR codes: staff scan will NOT open mark enter page"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isAllBatchesDeactivated ? 'bg-white' : 'bg-rose-500'
                }`}
              />
              <span>DEACTIVATE</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: DEPARTMENT OPTIONS                                                */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-[#0f284e] text-white flex items-center justify-center text-xs font-black shadow-xs">
              1
            </span>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight">
                Select Department Options
              </h3>
              <button
                type="button"
                id="btn-add-dept-icon"
                onClick={handleOpenAddDeptModal}
                className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-[#0f284e] text-[#0f284e] hover:text-white border border-blue-200 transition-all flex items-center justify-center cursor-pointer shadow-2xs group"
                title="Add New Department"
                aria-label="Add New Department"
              >
                <Plus className="w-4 h-4 transition-transform group-hover:scale-125" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span className="font-black text-blue-950">{getDeptCode(selectedDept)}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">{totalDeptEnrolled} Enrolled</span>
            </span>
          </div>
        </div>

        {/* Department Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-3.5">
          {availableDepartments.map((dept, idx) => {
            const isSelected = selectedDept === dept;
            const deptCode = getDeptCode(dept);
            const deptFullName = getDeptFullName(dept);
            const enrolledInDept = batches
              .filter((b) => b.department.trim().toLowerCase() === dept.trim().toLowerCase())
              .reduce((acc, b) => acc + b.students.length, 0);

            const theme = DEPT_THEMES[deptCode] || {
              icon: Building2,
              iconBgLight: 'bg-slate-100 text-slate-700 border-slate-200',
              iconTextLight: 'text-slate-700',
              borderActive: 'border-blue-400',
              accentGradient: 'from-blue-600 to-indigo-600',
              tagBg: 'bg-blue-50 text-blue-700 border-blue-200',
            };
            const DeptIcon = theme.icon;

            return (
              <button
                key={dept}
                type="button"
                id={`btn-dept-${deptCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => handleSelectDepartment(dept)}
                className={`group relative p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[185px] overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#0e2548] via-[#0a1e3b] to-[#07162b] text-white border-[#0e2548] shadow-lg ring-2 ring-blue-500/30 -translate-y-1'
                    : 'bg-white hover:bg-slate-50/90 text-slate-800 border-slate-200/90 hover:border-blue-300 shadow-2xs hover:shadow-xs hover:-translate-y-0.5'
                }`}
              >
                {/* Subtle top accent gradient line */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${theme.accentGradient} ${
                    isSelected ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
                  }`}
                />

                {/* Top Section */}
                <div className="pt-1">
                  {/* Row: Index + Icon + Enrolled Count */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-black tracking-tight ${
                          isSelected ? 'text-blue-300' : 'text-slate-400'
                        }`}
                      >
                        {idx + 1}.
                      </span>
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-white/10 text-amber-300 border-white/20 shadow-2xs'
                            : `${theme.iconBgLight}`
                        }`}
                      >
                        <DeptIcon className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                        isSelected
                          ? 'bg-blue-950/80 text-blue-200 border-blue-400/40'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Users className="w-3 h-3 opacity-70" />
                      <span>{enrolledInDept} Std</span>
                    </span>
                  </div>

                  {/* Department Acronym */}
                  <div className="mt-3">
                    <h4
                      className={`text-lg font-black tracking-tight leading-none ${
                        isSelected ? 'text-white' : 'text-slate-900 group-hover:text-blue-900'
                      }`}
                    >
                      {deptCode}
                    </h4>
                  </div>

                  {/* Department Full Name */}
                  <p
                    className={`text-xs mt-1.5 leading-snug line-clamp-2 min-h-[34px] font-medium ${
                      isSelected ? 'text-slate-200' : 'text-slate-600'
                    }`}
                  >
                    {deptFullName}
                  </p>
                </div>

                {/* Bottom Row: 4 Years (Sem 1 - 8) + Active / Select Status */}
                <div
                  className={`mt-3 pt-2.5 border-t text-[11px] flex items-center justify-between font-semibold ${
                    isSelected ? 'border-white/10' : 'border-slate-100'
                  }`}
                >
                  <span className={isSelected ? 'text-blue-200/80 font-medium' : 'text-slate-400'}>
                    4 Years (Sem 1 - 8)
                  </span>

                  {isSelected ? (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Active</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all">
                      Select →
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 2: YEAR / SEMESTER OPTIONS FOR SELECTED DEPARTMENT                  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-[#0f284e] text-white flex items-center justify-center text-xs font-black shadow-xs">
              2
            </span>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight">
                Select Year &amp; Semester Option ({getDeptCode(selectedDept)})
              </h3>
              <p className="text-xs text-slate-500">
                Click any Year or Semester card to inspect its student roster &amp; generate its Mark Entry QR Code
              </p>
            </div>
          </div>

          <div className="text-xs font-semibold text-slate-700 bg-blue-50/80 border border-blue-200/80 px-3.5 py-1.5 rounded-xl flex items-center gap-2 self-start sm:self-center shadow-2xs">
            <span className="text-slate-500">Active Selection:</span>
            <span className="font-black text-blue-950">{activeBatch.yearLabel}</span>
          </div>
        </div>

        {/* Year & Semester Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {deptBatches.map((batch) => {
            const isSelected = batch.id === activeBatch.id;
            return (
              <div
                key={batch.id}
                id={`tab-batch-${batch.id}`}
                onClick={() => setSelectedBatchId(batch.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedBatchId(batch.id);
                  }
                }}
                className={`group text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[185px] ${
                  isSelected
                    ? 'bg-gradient-to-br from-[#0c2242] via-[#091b35] to-[#061426] text-white border-[#0c2242] shadow-lg ring-2 ring-blue-500/30 -translate-y-1'
                    : 'bg-white hover:bg-slate-50/90 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs hover:-translate-y-0.5'
                }`}
              >
                {/* Card Top: Year Badge + Student Count */}
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`text-xs font-black uppercase px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-2xs'
                          : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Year {batch.yearNumber}</span>
                    </span>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-blue-950/80 text-blue-200 border-blue-400/40'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 opacity-70" />
                      <span>{batch.students.length} Students</span>
                    </span>
                  </div>

                  {/* Batch Year Label */}
                  <div
                    className={`font-black text-base sm:text-lg mt-3.5 leading-tight tracking-tight ${
                      isSelected ? 'text-white' : 'text-slate-900 group-hover:text-blue-900'
                    }`}
                  >
                    {batch.yearLabel}
                  </div>

                  {/* Semester & Academic Period */}
                  <div className="flex items-center justify-between gap-1 mt-1.5 flex-wrap">
                    <div
                      className={`text-xs flex items-center gap-1.5 font-medium ${
                        isSelected ? 'text-blue-200/90' : 'text-slate-500'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 opacity-70 shrink-0" />
                      <span className="truncate">
                        {batch.semester} • {batch.academicYear}
                      </span>
                    </div>

                    {isBatchQrActive(batch) ? (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0 ${
                          isSelected
                            ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                        title="QR Code is Active - scan will open Mark Entry"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>QR Active</span>
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0 ${
                          isSelected
                            ? 'bg-rose-500/30 text-rose-200 border border-rose-400/40'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                        title="QR Code is Deactivated - scan access is blocked"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        <span>QR Inactive</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Selection Status + Edit Name Button */}
                <div
                  className={`flex items-center justify-between mt-4 pt-3 border-t text-xs ${
                    isSelected ? 'border-white/10' : 'border-slate-100'
                  }`}
                >
                  {isSelected ? (
                    <span className="font-extrabold text-amber-300 flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>● Currently Selected</span>
                    </span>
                  ) : (
                    <span className="font-bold text-slate-500 group-hover:text-blue-700 transition-colors flex items-center gap-1 text-xs">
                      <span>Click to Select</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenRenameBatch(batch);
                    }}
                    className={`font-bold px-2.5 py-1 rounded-lg border text-[11px] inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white/10 hover:bg-white/20 text-amber-300 border-white/15'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:text-blue-900 hover:border-slate-300'
                    }`}
                  >
                    <span>Edit Name</span>
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 3: MAIN ACTIVE BATCH WORKSPACE                                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Staff Direct Mark Entry QR Code */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-lg transition-colors ${
                    isBatchQrActive(activeBatch)
                      ? 'bg-blue-50 text-blue-900'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Staff Mark Entry QR Code
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                    For {activeBatch.yearLabel}
                  </p>
                </div>
              </div>

              {/* Activate / Deactivate Option Toggle */}
              <div
                className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/90 shadow-2xs self-start sm:self-center"
                role="group"
                aria-label="QR Code Access Option"
              >
                <button
                  type="button"
                  id={`btn-qr-activate-${activeBatch.id}`}
                  onClick={() => handleToggleQrStatus(activeBatch, true)}
                  className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    isBatchQrActive(activeBatch)
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-white/80'
                  }`}
                  title="Activate QR: Scan opens Mark Entry page"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isBatchQrActive(activeBatch) ? 'bg-white animate-pulse' : 'bg-emerald-500'
                    }`}
                  />
                  <span>Activate</span>
                </button>

                <button
                  type="button"
                  id={`btn-qr-deactivate-${activeBatch.id}`}
                  onClick={() => handleToggleQrStatus(activeBatch, false)}
                  className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    !isBatchQrActive(activeBatch)
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-rose-700 hover:bg-white/80'
                  }`}
                  title="Deactivate QR: Scan will NOT open Mark Entry page"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      !isBatchQrActive(activeBatch) ? 'bg-white' : 'bg-rose-400'
                    }`}
                  />
                  <span>Deactivate</span>
                </button>
              </div>
            </div>

            {/* QR Code Display Canvas */}
            <div
              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all relative overflow-hidden ${
                isBatchQrActive(activeBatch)
                  ? 'bg-slate-50 border-slate-200/80'
                  : 'bg-rose-50/50 border-rose-200'
              }`}
            >
              <div className="relative">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Staff Mark Entry QR for ${activeBatch.yearLabel}`}
                    className={`w-52 h-52 rounded-lg shadow-2xs border bg-white p-2 transition-all ${
                      isBatchQrActive(activeBatch)
                        ? 'border-slate-200'
                        : 'border-rose-300 opacity-25 grayscale'
                    }`}
                  />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center bg-white rounded-lg text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                )}

                {/* Overlay when QR is Deactivated */}
                {!isBatchQrActive(activeBatch) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-950/80 rounded-lg text-white p-3 text-center backdrop-blur-2xs animate-in fade-in">
                    <div className="w-10 h-10 rounded-full bg-rose-600 flex items-center justify-center mb-1.5 shadow-md">
                      <Lock className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-black tracking-wider uppercase text-rose-200">
                      QR Deactivated
                    </span>
                    <span className="text-[10px] text-white/90 mt-1 leading-tight max-w-[170px]">
                      Access blocked. Mark enter page will <strong>not open</strong> on scan.
                    </span>
                    <button
                      type="button"
                      id="btn-quick-activate-overlay"
                      onClick={() => handleToggleQrStatus(activeBatch, true)}
                      className="mt-2.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold rounded-lg shadow-xs cursor-pointer transition flex items-center gap-1"
                    >
                      <span>Click to Activate</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Status explanation */}
              <div className="mt-3 text-center">
                {isBatchQrActive(activeBatch) ? (
                  <>
                    <div className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>Status: ACTIVE • Scan to Enter Marks</span>
                    </div>
                    <div className="text-[11px] text-slate-500 max-w-[230px] mt-0.5 leading-snug">
                      Staff scan this code with any smartphone camera to launch the Mark Entry portal for{' '}
                      <span className="font-bold text-slate-800">{activeBatch.semester}</span> ({getDeptCode(activeBatch.department)}) with all {activeBatch.students.length} students loaded.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs font-bold text-rose-700 flex items-center justify-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Status: DEACTIVATED • Access Closed</span>
                    </div>
                    <div className="text-[11px] text-rose-600 max-w-[240px] mt-0.5 leading-snug">
                      Scanning this QR will <strong>NOT open</strong> the mark entry page. Select <strong>Activate</strong> above to enable staff mark entry.
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick Action Buttons for QR */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                id="btn-open-mark-entry-batch"
                onClick={() => onOpenBatchMarkEntry(activeBatch.id, activeBatch.semester, activeBatch.department)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer ${
                  isBatchQrActive(activeBatch)
                    ? 'bg-[#0f284e] hover:bg-blue-900 text-white'
                    : 'bg-slate-700 hover:bg-slate-800 text-slate-100'
                }`}
              >
                <ExternalLink className="w-4 h-4" />
                <span>
                  {isBatchQrActive(activeBatch)
                    ? 'Open Mark Entry for this Batch'
                    : 'Preview Mark Entry (QR Deactivated)'}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="btn-copy-batch-link"
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-download-batch-qr"
                  onClick={handleDownloadQr}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download QR</span>
                </button>
              </div>
            </div>

            {/* Batch Meta Notes */}
            <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100 text-[11px] text-slate-700 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Department:</span>
                <span className="font-bold text-slate-800">{getDeptCode(activeBatch.department)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Academic Year:</span>
                <span className="font-bold text-slate-800">{activeBatch.academicYear}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Semester:</span>
                <span className="font-bold text-slate-800">{activeBatch.semester}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Student Table & Management Actions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-slate-900 text-base">
                    {activeBatch.yearLabel}
                  </h4>
                  <span className="text-xs bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded-full">
                    {activeBatch.students.length} Enrolled
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Department: <strong className="text-slate-700">{getDeptCode(activeBatch.department)}</strong> • {activeBatch.semester}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="btn-add-single-student"
                  onClick={handleOpenSingleAdd}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f284e] hover:bg-blue-900 text-white rounded-lg text-xs font-bold shadow-2xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Student</span>
                </button>

                <button
                  type="button"
                  id="btn-bulk-import-students"
                  onClick={() => {
                    setBulkPreview([]);
                    setPasteText('');
                    setBulkFileName('');
                    setIsBulkModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Bulk Entry (Excel / Paste)</span>
                </button>


                <button
                  type="button"
                  id="btn-delete-all-students"
                  disabled={activeBatch.students.length === 0}
                  onClick={() => setIsDeleteAllOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed text-red-700 border border-red-200 rounded-lg text-xs font-bold shadow-2xs transition cursor-pointer"
                  title="Delete all students in this batch"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>Delete All</span>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                id="search-students-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeBatch.students.length} students by Register Number or Name...`}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-800"
              />
            </div>

            {/* Students Table */}
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0b1e36] text-white font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3.5 w-44">REGISTER NUMBER</th>
                    <th className="py-2.5 px-3.5">STUDENT NAME</th>
                    <th className="py-2.5 px-3 text-center w-28">SEMESTER</th>
                    <th className="py-2.5 px-3 text-center w-28">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                        <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <div>No students found in this roster.</div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Click "+ Add Student" or "Bulk Entry" above to populate this batch.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, idx) => (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono font-bold text-blue-900">
                          {student.regNo}
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-slate-800 uppercase">
                          {student.name}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {activeBatch.semester}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Rename / Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(student)}
                              title="Rename / Edit Student"
                              className="p-1.5 text-blue-800 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Option */}
                            <button
                              type="button"
                              onClick={() => handleDelete(student)}
                              title="Delete Student Record"
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer summary */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
              <div>
                Showing {filteredStudents.length} of {activeBatch.students.length} registered students in {activeBatch.yearLabel}
              </div>
              <div className="text-[11px] text-slate-400">
                Regulation 2021 • Anna University
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD SINGLE STUDENT                                               */}
      {/* ========================================================================= */}
      {isSingleAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-900 rounded-lg">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">
                    Add Single Student
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    To {activeBatch.yearLabel} ({getDeptCode(activeBatch.department)})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSingleAddOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSingleStudent} className="space-y-4 pt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  REGISTER NUMBER
                </label>
                <input
                  type="text"
                  required
                  value={newRegNo}
                  onChange={(e) => setNewRegNo(e.target.value)}
                  placeholder="e.g. 110823104011"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  STUDENT NAME
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. PRAVEEN S"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSingleAddOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0f284e] hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT / RENAME STUDENT                                            */}
      {/* ========================================================================= */}
      {studentToEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-900 rounded-lg">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">
                    Rename / Edit Student
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Update student credentials
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStudentToEdit(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 pt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  REGISTER NUMBER
                </label>
                <input
                  type="text"
                  required
                  value={editRegNo}
                  onChange={(e) => setEditRegNo(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  STUDENT NAME
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-800"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const toDel = studentToEdit;
                    setStudentToEdit(null);
                    if (toDel) handleDelete(toDel);
                  }}
                  className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Student</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStudentToEdit(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0f284e] hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONFIRM DELETE STUDENT                                           */}
      {/* ========================================================================= */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-red-200 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-center text-base">
              Delete Student?
            </h4>
            <p className="text-xs text-slate-600 text-center mt-2 leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-slate-900">{studentToDelete.name}</span> ({studentToDelete.regNo}) from <span className="font-bold text-slate-900">{activeBatch.yearLabel}</span>?
            </p>

            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: BULK ENTRY (EXCEL UPLOAD & COPY-PASTE)                           */}
      {/* ========================================================================= */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base">
                    Bulk Student Entry for {activeBatch.yearLabel}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Import multiple students via Excel file (.xlsx) or copy-paste text
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-2 pt-4">
              <button
                type="button"
                onClick={() => setBulkMode('excel')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                  bulkMode === 'excel'
                    ? 'bg-[#0f284e] text-white border-[#0f284e]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Option A: Upload Excel (.xlsx, .csv)</span>
              </button>

              <button
                type="button"
                onClick={() => setBulkMode('paste')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                  bulkMode === 'paste'
                    ? 'bg-[#0f284e] text-white border-[#0f284e]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Option B: Copy-Paste using Reg.No, Name</span>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 py-4 space-y-4">
              {bulkMode === 'excel' ? (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center transition bg-slate-50/50">
                    <FileSpreadsheet className="w-10 h-10 mx-auto text-emerald-600 mb-2" />
                    <label className="block text-xs font-bold text-slate-800 mb-1 cursor-pointer">
                      <span className="text-blue-900 underline">Click to choose Excel / CSV file</span>
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleExcelUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Supports .xlsx, .xls, and .csv files with columns: <strong>Register Number</strong> and <strong>Student Name</strong>
                    </p>
                    {bulkFileName && (
                      <div className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 py-1 px-3 rounded-md inline-block">
                        Loaded: {bulkFileName}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Paste Student Rows (Reg.No and Name)
                  </label>
                  <textarea
                    rows={6}
                    value={pasteText}
                    onChange={(e) => handlePasteChange(e.target.value)}
                    placeholder={`110823104001\tAJITH KUMAR M\n110823104002\tANANYA R\n110823104003, BHARATHWAJ T`}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-800"
                  />
                  <p className="text-[11px] text-slate-500">
                    Format: One student per line. Separated by Tab (from Excel) or comma.
                  </p>
                </div>
              )}

              {/* Parsed Preview Table */}
              {bulkPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      Preview: {bulkPreview.length} Detected Students
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      Ready to import
                    </span>
                  </div>

                  <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-3 w-10">#</th>
                          <th className="py-2 px-3 w-40">REG NO</th>
                          <th className="py-2 px-3">STUDENT NAME</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {bulkPreview.slice(0, 100).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 text-slate-400 text-[11px]">{idx + 1}</td>
                            <td className="py-1.5 px-3 font-mono font-bold text-blue-900">{row.regNo}</td>
                            <td className="py-1.5 px-3 font-medium uppercase">{row.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Options (Append vs Replace) */}
              <div className="flex items-center gap-4 pt-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="text-blue-900 focus:ring-blue-800"
                  />
                  <span>Append to existing roster</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-blue-900 focus:ring-blue-800"
                  />
                  <span>Replace existing roster</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={bulkPreview.length === 0}
                onClick={handleConfirmBulkImport}
                className="px-5 py-2.5 bg-[#0f284e] hover:bg-blue-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Import {bulkPreview.length} Students
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: EDIT YEAR BATCH NAME & DETAILS                                   */}
      {/* ========================================================================= */}
      {batchToRename && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                  <Pencil className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base">
                    Edit Year {batchToRename.yearNumber} Batch Name
                  </h4>
                  <p className="text-xs text-slate-500">
                    Update batch display title, academic year, department &amp; semester
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBatchToRename(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRenameBatch} className="space-y-4">
              {/* Batch Label / Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Batch Name / Year Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-rename-batch-label"
                  value={renameYearLabel}
                  onChange={(e) => setRenameYearLabel(e.target.value)}
                  placeholder="e.g. 2nd Year / 3rd Sem Students"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-800"
                />
              </div>

              {/* Grid: Academic Year & Semester */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Academic Year Batch
                  </label>
                  <input
                    type="text"
                    id="input-rename-academic-year"
                    value={renameAcademicYear}
                    onChange={(e) => setRenameAcademicYear(e.target.value)}
                    placeholder="e.g. 2023-2027"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Semester
                  </label>
                  <select
                    id="select-rename-semester"
                    value={renameSemester}
                    onChange={(e) => setRenameSemester(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-800"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={`Semester ${s}`}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Department
                </label>
                <select
                  id="select-rename-department"
                  value={renameDepartment}
                  onChange={(e) => setRenameDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-800"
                >
                  {availableDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset to initial default button */}
              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResetBatchToDefault}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset to default values</span>
                </button>

                <div className="text-[11px] text-slate-400">
                  {batchToRename.students.length} Registered Students
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBatchToRename(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-confirm-save-rename-batch"
                  className="px-5 py-2 bg-[#0f284e] hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW DEPARTMENT                                                 */}
      {/* ========================================================================= */}
      {isAddDeptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-[#0f284e] text-white rounded-xl shadow-xs">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base">
                    Add New Department
                  </h4>
                  <p className="text-xs text-slate-500">
                    Create a new academic branch and generate its 4 year batches
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddDeptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-4">
              {/* Department Short Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Department Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-new-dept-code"
                  value={newDeptCode}
                  onChange={(e) => {
                    setNewDeptCode(e.target.value.toUpperCase());
                    setNewDeptError(null);
                  }}
                  placeholder="e.g. ECE, CIVIL, EEE, IT"
                  maxLength={12}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-800 uppercase"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Short acronym used for department tabs and batch identification
                </span>
              </div>

              {/* Department Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Full Department Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-new-dept-name"
                  value={newDeptName}
                  onChange={(e) => {
                    setNewDeptName(e.target.value);
                    setNewDeptError(null);
                  }}
                  placeholder="e.g. Electronics & Communication Engineering"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-800"
                />
              </div>

              {/* Preview Box */}
              {newDeptCode.trim() && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-900">
                      Live Preview
                    </span>
                    <span className="text-[10px] text-blue-700 font-bold">
                      4 Year Batches will be generated
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#0f284e] text-white text-xs font-black rounded-md">
                      {newDeptCode.trim().toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {newDeptName.trim() || 'Department Name'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Will auto-create batches for 1st Year (Sem 1), 2nd Year (Sem 3), 3rd Year (Sem 5), and 4th Year (Sem 7) with QR scan access enabled.
                  </p>
                </div>
              )}

              {/* Error Message */}
              {newDeptError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{newDeptError}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddDeptModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-create-dept"
                  disabled={isCreatingDept || !newDeptCode.trim() || !newDeptName.trim()}
                  className="px-5 py-2.5 bg-[#0f284e] hover:bg-blue-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  {isCreatingDept ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Batches...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Create Department</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CONFIRM DELETE ALL STUDENTS                                      */}
      {/* ========================================================================= */}
      {isDeleteAllOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-red-200 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-center text-base">
              Delete All Students?
            </h4>
            <p className="text-xs text-slate-600 text-center mt-2 leading-relaxed">
              Are you sure you want to remove all <span className="font-bold text-red-600">{activeBatch.students.length} students</span> from <span className="font-bold text-slate-900">{activeBatch.yearLabel}</span>? This action cannot be undone.
            </p>

            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setIsDeleteAllOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-all-students"
                onClick={handleConfirmDeleteAll}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
