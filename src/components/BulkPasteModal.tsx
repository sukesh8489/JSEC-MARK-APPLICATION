import { useState } from 'react';
import { StudentMarkRecord } from '../types';
import { calculateGradeAndResult } from '../utils/gradeCalculator';
import { X, ClipboardList, Info } from 'lucide-react';

interface BulkPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (students: StudentMarkRecord[]) => void;
  maxMarks: number;
  passMark: number;
}

export default function BulkPasteModal({
  isOpen,
  onClose,
  onImport,
  maxMarks,
  passMark,
}: BulkPasteModalProps) {
  const sampleTemplate = `110823104001, AADHITHYA K, 46
110823104002, ABINAYA S, 41
110823104003, BALAJI R, 34
110823104004, DHARANIDHARAN M, AB
110823104005, GOKUL PRASANTH V, 21
110823104006, HARISH BABU S, 38
110823104007, KAVITHA P, 48
110823104008, MUKESH KUMAR K, 29`;

  const [pasteData, setPasteData] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handlePasteSample = () => {
    setPasteData(sampleTemplate);
    setError('');
  };

  const handleProcessImport = () => {
    if (!pasteData.trim()) {
      setError('Please paste student records or click "Insert Sample Template"');
      return;
    }

    const lines = pasteData
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsedStudents: StudentMarkRecord[] = [];

    lines.forEach((line, index) => {
      // Split by comma or tab or multi-space
      let parts = line.includes('\t')
        ? line.split('\t')
        : line.includes(',')
        ? line.split(',')
        : line.split(/\s{2,}/);

      parts = parts.map((p) => p.trim());

      let regNo = parts[0] || `110823104${String(index + 1).padStart(3, '0')}`;
      let name = parts[1] || `STUDENT ${index + 1}`;
      let markStr = parts[2] || '';

      const isAbsent = markStr.toUpperCase() === 'AB' || markStr.toUpperCase() === 'ABSENT';
      const markNum = isAbsent || markStr === '' ? '' : Number(markStr);

      const attendance = isAbsent ? 'ABSENT' : 'PRESENT';
      const { grade, result } = calculateGradeAndResult(
        attendance,
        markNum,
        maxMarks,
        passMark
      );

      parsedStudents.push({
        id: `${Date.now()}-${index}`,
        regNo,
        name: name.toUpperCase(),
        attendance,
        maxMarks,
        marksObtained: isAbsent ? '' : markNum,
        grade,
        result,
      });
    });

    if (parsedStudents.length === 0) {
      setError('Could not parse any valid student records.');
      return;
    }

    onImport(parsedStudents);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-[#0f284e] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base">Bulk Paste Student Class List</h3>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 p-3 rounded-lg text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Supported formats (One student per line):</p>
              <p className="text-slate-600 font-mono mt-0.5">
                RegisterNo, Student Name, Marks (or AB)
              </p>
              <p className="text-slate-500 mt-1">
                You can copy directly from Excel rows or paste CSV data.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Paste Class Data Below:
              </label>
              <button
                type="button"
                onClick={handlePasteSample}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer"
              >
                Insert Sample Template
              </button>
            </div>
            <textarea
              rows={8}
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              placeholder={`110823104001, AADHITHYA K, 46\n110823104002, ABINAYA S, 41\n110823104003, BALAJI R, 34\n110823104004, DHARANIDHARAN M, AB`}
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-800"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProcessImport}
              className="px-5 py-2 bg-[#0f284e] hover:bg-blue-900 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
            >
              Parse &amp; Add Students
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
