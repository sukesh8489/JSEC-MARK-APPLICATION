import { useState, FormEvent } from 'react';
import { StudentMarkRecord } from '../types';
import { calculateGradeAndResult } from '../utils/gradeCalculator';
import { X, UserPlus } from 'lucide-react';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (student: StudentMarkRecord) => void;
  maxMarks: number;
  passMark: number;
  nextRegNoSuffix: number;
}

export default function AddStudentModal({
  isOpen,
  onClose,
  onAdd,
  maxMarks,
  passMark,
  nextRegNoSuffix,
}: AddStudentModalProps) {
  const defaultRegNo = `110823104${String(nextRegNoSuffix).padStart(3, '0')}`;
  const [regNo, setRegNo] = useState(defaultRegNo);
  const [name, setName] = useState('');
  const [attendance, setAttendance] = useState<'PRESENT' | 'ABSENT'>('PRESENT');
  const [marksObtained, setMarksObtained] = useState<string>('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!regNo.trim()) {
      setError('Register number is required');
      return;
    }
    if (!name.trim()) {
      setError('Student name is required');
      return;
    }

    const marksNum = marksObtained === '' ? '' : Number(marksObtained);
    if (attendance === 'PRESENT' && marksNum !== '') {
      if (isNaN(Number(marksNum)) || Number(marksNum) < 0 || Number(marksNum) > maxMarks) {
        setError(`Marks must be between 0 and ${maxMarks}`);
        return;
      }
    }

    const { grade, result } = calculateGradeAndResult(attendance, marksNum, maxMarks, passMark);

    const newStudent: StudentMarkRecord = {
      id: Date.now().toString(),
      regNo: regNo.trim(),
      name: name.trim().toUpperCase(),
      attendance,
      maxMarks,
      marksObtained: attendance === 'ABSENT' ? '' : marksNum,
      grade,
      result,
    };

    onAdd(newStudent);
    setName('');
    setMarksObtained('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="bg-[#0f284e] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base">Add Student to Marksheet</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Register Number (12 Digits)
            </label>
            <input
              type="text"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value)}
              placeholder="e.g. 110823104009"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Student Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PRAVEEN KUMAR S"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Attendance
              </label>
              <select
                value={attendance}
                onChange={(e) => setAttendance(e.target.value as 'PRESENT' | 'ABSENT')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-800"
              >
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Obtained (Max {maxMarks})
              </label>
              <input
                type="number"
                min={0}
                max={maxMarks}
                disabled={attendance === 'ABSENT'}
                value={marksObtained}
                onChange={(e) => setMarksObtained(e.target.value)}
                placeholder={attendance === 'ABSENT' ? 'AB' : 'e.g. 42'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm disabled:bg-slate-200 disabled:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-800"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0f284e] hover:bg-blue-900 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
            >
              + Add to Marksheet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
