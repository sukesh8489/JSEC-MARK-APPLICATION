import { useState } from 'react';
import { StudentMarkRecord, AssessmentMeta, EvaluationMetrics } from '../types';
import CollegeLogo from './CollegeLogo';
import { NAAC_LOGO_BASE64 } from '../assets/naacLogoBase64';
import { X, Printer, FileSpreadsheet, Download, CheckCircle2, FileText } from 'lucide-react';
import { exportMarksheetToXLS, exportMarksheetToWord } from '../utils/submittedSheets';
import { exportMarksheetToPDF } from '../utils/pdfExport';

interface DownloadPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  meta: AssessmentMeta;
  students: StudentMarkRecord[];
  metrics: EvaluationMetrics;
  userRole?: 'STAFF' | 'ADMIN';
}

export default function DownloadPrintModal({
  isOpen,
  onClose,
  meta,
  students,
  metrics,
  userRole = 'STAFF',
}: DownloadPrintModalProps) {
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  if (!isOpen) return null;

  const handleDownloadPDF = async () => {
    try {
      setIsDownloadingPdf(true);
      const filename = await exportMarksheetToPDF(meta, students, metrics);
      setDownloadNotice(`Downloaded: ${filename}`);
      setTimeout(() => setDownloadNotice(null), 4000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setDownloadNotice('Unable to generate PDF directly. Trying print preview...');
      try {
        window.print();
      } catch {
        // Ignored
      }
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    // Attempt window.print() but also trigger PDF download as a foolproof fallback in iframes
    try {
      window.print();
    } catch (e) {
      console.warn('window.print() blocked by iframe security sandbox, downloading PDF instead:', e);
      handleDownloadPDF();
    }
  };

  const handleExportXLS = () => {
    exportMarksheetToXLS(meta, students, metrics);
    setDownloadNotice('Downloaded marksheet Excel (.xlsx) file');
    setTimeout(() => setDownloadNotice(null), 4000);
  };

  const handleExportWord = async () => {
    try {
      await exportMarksheetToWord(meta, students, metrics);
      setDownloadNotice('Downloaded marksheet Word (.docx) document');
      setTimeout(() => setDownloadNotice(null), 4000);
    } catch (err) {
      console.error('Word export error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Top Controls Bar */}
        <div className="bg-[#0f284e] px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-white shrink-0 print:hidden">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Download className="w-4 h-4 text-amber-400" />
            <span>Marksheet Export &amp; Download Center</span>
            <span className="text-[11px] font-semibold bg-blue-800/80 text-blue-200 px-2 py-0.5 rounded ml-2">
              {userRole === 'ADMIN' ? 'Admin Access (PDF & XLS)' : 'Staff Access (PDF & XLS)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Download as XLS */}
            <button
              type="button"
              id="btn-modal-export-xls"
              onClick={handleExportXLS}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
              title="Download formatted Excel (.xlsx) file"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span>Download XLS (.xlsx)</span>
            </button>

            {/* Download as Word */}
            <button
              type="button"
              id="btn-modal-export-word"
              onClick={handleExportWord}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
              title="Download formatted Word (.docx) document"
            >
              <FileText className="w-3.5 h-3.5 text-blue-200" />
              <span>Download Word (.docx)</span>
            </button>

            {/* Primary: Direct Download as PDF */}
            <button
              type="button"
              id="btn-modal-download-pdf"
              onClick={handleDownloadPDF}
              disabled={isDownloadingPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-75"
              title="Download official PDF directly to your device"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download PDF (.pdf)'}</span>
            </button>

            {/* Secondary: Print or Save as PDF */}
            <button
              type="button"
              id="btn-modal-print-pdf"
              onClick={handleDownloadPDF}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-900/90 hover:bg-blue-800 text-slate-200 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
              title="Save or Download PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-300 hover:text-white p-1 rounded-md cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Download Success Notice */}
        {downloadNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between text-xs font-semibold text-emerald-900 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{downloadNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setDownloadNotice(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Printable Marksheet Container */}
        <div className="p-6 sm:p-8 overflow-y-auto print:p-0 print:overflow-visible font-sans text-slate-800">
          {/* Official Letterhead - Exact Match to New Title Model */}
          <div className="pb-2 mb-4 text-center">
            <div className="flex items-center justify-between gap-2 sm:gap-4 mb-2">
              <div className="shrink-0 flex items-center justify-center">
                <CollegeLogo size={62} />
              </div>
              <div className="flex-1 text-center px-1">
                <h2 className="text-lg sm:text-2xl font-black text-[#0b1e36] uppercase tracking-tight">
                  JAYA SAKTHI ENGINEERING COLLEGE
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 font-medium mt-0.5">
                  Approved by AICTE, New Delhi &amp; Affiliated to Anna University, Chennai
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  St. Mary&apos;s Nagar, Thiruninravur, Chennai - 602024, Tamil Nadu
                </p>
              </div>
              <div
                className="relative flex items-center justify-center shrink-0 select-none overflow-hidden"
                style={{ width: 75, height: 60 }}
              >
                <img
                  src={NAAC_LOGO_BASE64}
                  alt="NAAC Accredited Grade A"
                  width={75}
                  height={60}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Decorative double line rule (Navy top line + Golden amber bottom line) */}
            <div className="w-full my-2.5 space-y-[2px]">
              <div className="h-[2.5px] bg-[#0f284e] w-full rounded-full"></div>
              <div className="h-[1.5px] bg-[#d97706] w-full rounded-full"></div>
            </div>

            {/* Document Title Banner (New Model - Exact match with reference image) */}
            <div className="w-full bg-[#0b1e36] text-white py-2 px-4 rounded-xl text-center shadow-xs">
              <h3 className="text-xs sm:text-sm md:text-base font-black tracking-wider uppercase">
                CONTINUOUS ASSESSMENT MARKSHEET — {meta.examType.toUpperCase()}
              </h3>
            </div>
          </div>

          {/* Assessment Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border border-slate-200 bg-slate-50/70 p-3 rounded-lg mb-4">
            <div>
              <span className="text-slate-500 font-medium">Department: </span>
              <span className="font-bold text-slate-900">{meta.department}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Semester: </span>
              <span className="font-bold text-slate-900">{meta.semester}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">BATCH: </span>
              <span className="font-bold text-slate-900">{meta.academicYear}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Assessment Date: </span>
              <span className="font-bold text-slate-900">{meta.assessmentDate}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Subject Code: </span>
              <span className="font-bold text-slate-900">{meta.subjectCode}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Subject Name: </span>
              <span className="font-bold text-slate-900">{meta.subjectName}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Max Marks: </span>
              <span className="font-bold text-slate-900">{meta.maxMarks}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Pass Mark: </span>
              <span className="font-bold text-slate-900">{meta.passMark}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Faculty: </span>
              <span className="font-bold text-slate-900">{meta.facultyInCharge || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Evaluator: </span>
              <span className="font-bold text-slate-900">{meta.evaluatorName || 'N/A'}</span>
            </div>
          </div>

          {/* Marksheet Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0b1e36] text-white font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 border-r border-slate-700 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 border-r border-slate-700">Register No</th>
                  <th className="py-2.5 px-3 border-r border-slate-700">Student Name</th>
                  <th className="py-2.5 px-3 border-r border-slate-700 text-center">Attendance</th>
                  <th className="py-2.5 px-3 border-r border-slate-700 text-center">Max</th>
                  <th className="py-2.5 px-3 border-r border-slate-700 text-center">Obt</th>
                  <th className="py-2.5 px-3 border-r border-slate-700 text-center">Grade</th>
                  <th className="py-2.5 px-3 text-center">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.map((s, idx) => (
                  <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-500 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 font-mono font-medium text-slate-900">
                      {s.regNo}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 font-medium text-slate-800">
                      {s.name}
                    </td>
                    <td className="py-2 px-3 text-center border-r border-slate-200">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.attendance === 'PRESENT'
                            ? 'text-emerald-700 bg-emerald-50'
                            : 'text-amber-800 bg-amber-50'
                        }`}
                      >
                        {s.attendance}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-600">
                      {s.maxMarks}
                    </td>
                    <td className="py-2 px-3 text-center border-r border-slate-200 font-bold text-slate-900">
                      {s.attendance === 'ABSENT' ? 'AB' : s.marksObtained}
                    </td>
                    <td className="py-2 px-3 text-center border-r border-slate-200 font-bold">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black ${
                          s.grade === 'O'
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : s.grade === 'A+'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : s.grade === 'A'
                            ? 'bg-teal-100 text-teal-900 border border-teal-200'
                            : s.grade === 'B+'
                            ? 'bg-blue-100 text-blue-900 border border-blue-200'
                            : s.grade === 'B'
                            ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                            : s.grade === 'C'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : s.grade === 'AB'
                            ? 'bg-slate-200 text-slate-700 border border-slate-300'
                            : 'bg-rose-100 text-rose-900 border border-rose-200'
                        }`}
                      >
                        {s.grade}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-bold">
                      <span
                        className={
                          s.result === 'PASS'
                            ? 'text-emerald-700'
                            : s.result === 'FAIL'
                            ? 'text-red-600'
                            : 'text-amber-600'
                        }
                      >
                        {s.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Evaluation Summary & Performance Metrics Card (Below of Students Table - Exact match to uploaded image) */}
          <div className="border border-slate-300 rounded-xl p-5 bg-white shadow-2xs mb-8">
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide pb-2.5 border-b border-slate-200">
              EVALUATION SUMMARY &amp; PERFORMANCE METRICS
            </h4>

            <div className="grid grid-cols-2 gap-x-12 gap-y-3 py-4 text-xs font-bold text-slate-800 max-w-2xl">
              {/* Row 1 */}
              <div className="flex items-center justify-between">
                <span className="text-slate-700">No of Student Present:</span>
                <span className="text-emerald-600 font-black text-sm">{metrics.presentCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">No of Student Pass:</span>
                <span className="text-emerald-600 font-black text-sm">{metrics.passCount}</span>
              </div>

              {/* Row 2 */}
              <div className="flex items-center justify-between">
                <span className="text-slate-700">No of Student Absent:</span>
                <span className="text-slate-900 font-black text-sm">{metrics.absentCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">No of Student Fail:</span>
                <span className="text-slate-900 font-black text-sm">{metrics.failCount}</span>
              </div>
            </div>

            {/* Pass Percentage Pill Banner */}
            <div className="bg-[#eef2ff] border border-blue-100 rounded-xl py-2.5 text-center text-xs sm:text-sm font-bold text-blue-700">
              Pass percentage: {metrics.passPercentage.toFixed(2)}%
            </div>
          </div>

          {/* Official 3-Column Signatures Section: 1. Evaluator Name & Sign, 2. Exam Cell Coordinator, 3. Principal Sign */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 pb-2 text-center text-xs">
            <div>
              <div className="h-10 sm:h-12" />
              <div className="text-slate-400 font-bold tracking-tighter mb-1 select-none font-mono">____________________________</div>
              <p className="font-bold text-slate-800">Evaluator Signature</p>
              {meta.evaluatorName && (
                <p className="text-slate-500 font-medium text-[11px]">({meta.evaluatorName})</p>
              )}
            </div>
            <div>
              <div className="h-10 sm:h-12" />
              <div className="text-slate-400 font-bold tracking-tighter mb-1 select-none font-mono">____________________________</div>
              <p className="font-bold text-slate-800">Exam Cell Coordinator</p>
              <p className="text-slate-500 font-medium text-[11px]">
                {meta.examCellCoordinator ? `(${meta.examCellCoordinator})` : '(Central Exam Cell)'}
              </p>
            </div>
            <div>
              <div className="h-10 sm:h-12" />
              <div className="text-slate-400 font-bold tracking-tighter mb-1 select-none font-mono">____________________________</div>
              <p className="font-bold text-slate-800">Principal Signature</p>
              <p className="text-slate-500 font-medium text-[11px]">
                {meta.principalName
                  ? `(${meta.principalName})`
                  : meta.principalSignature
                  ? `(${meta.principalSignature})`
                  : '(Principal)'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
