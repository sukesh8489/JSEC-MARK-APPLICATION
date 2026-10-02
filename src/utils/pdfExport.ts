import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AssessmentMeta, StudentMarkRecord, EvaluationMetrics } from '../types';
import { COLLEGE_LOGO_BASE64 } from '../assets/logoBase64';
import { NAAC_LOGO_BASE64 } from '../assets/naacLogoBase64';
import { generateHeaderBannerBase64 } from './headerBannerImage';

/**
 * Render vector fallback for institutional letterhead & document title banner
 */
function renderVectorHeaderFallback(
  doc: jsPDF,
  meta: AssessmentMeta,
  pageWidth: number,
  margin: number
): void {
  // Official College Seal Logo (Left)
  try {
    if (COLLEGE_LOGO_BASE64) {
      doc.addImage(COLLEGE_LOGO_BASE64, 'PNG', 13, 8, 18, 18);
    }
  } catch (imgErr) {
    console.warn('Could not render college logo in PDF:', imgErr);
  }

  // Official NAAC Accreditation A Grade Insignia Logo (Right side of college name)
  try {
    if (NAAC_LOGO_BASE64) {
      const naacFormat = NAAC_LOGO_BASE64.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(NAAC_LOGO_BASE64, naacFormat, pageWidth - 13 - 22, 7.5, 22, 17.6);
    }
  } catch (imgErr) {
    console.warn('Could not render NAAC accreditation logo in PDF:', imgErr);
  }

  // Main College Name
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(11, 30, 54); // Dark Navy #0b1e36
  doc.text('JAYA SAKTHI ENGINEERING COLLEGE', pageWidth / 2, 15.5, { align: 'center' });

  // AICTE & Anna University Affiliation
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85); // Slate-700
  doc.text(
    'Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai',
    pageWidth / 2,
    20.5,
    { align: 'center' }
  );

  // Address
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(
    "St. Mary's Nagar, Thiruninravur, Chennai - 602024, Tamil Nadu",
    pageWidth / 2,
    25,
    { align: 'center' }
  );

  // Decorative double line rule (Navy top line + Golden amber bottom line)
  doc.setDrawColor(15, 40, 78); // Navy
  doc.setLineWidth(0.7);
  doc.line(margin, 28, pageWidth - margin, 28);
  doc.setDrawColor(217, 119, 6); // Amber gold #d97706
  doc.setLineWidth(0.35);
  doc.line(margin, 29.2, pageWidth - margin, 29.2);

  // DOCUMENT TITLE BANNER (Pill rounded corners exactly like the reference image)
  const bannerY = 32.5;
  const bannerHeight = 8.5;
  doc.setFillColor(11, 30, 54); // Dark Navy background #0b1e36
  doc.roundedRect(margin, bannerY, pageWidth - margin * 2, bannerHeight, 2.5, 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `CONTINUOUS ASSESSMENT MARKSHEET — ${meta.examType.toUpperCase()}`,
    pageWidth / 2,
    bannerY + 5.8,
    { align: 'center' }
  );
}

/**
 * Generate and download an official Marksheet PDF document
 * using jsPDF and jspdf-autotable.
 * This runs directly in the client browser without any server dependency
 * and reliably triggers file download in all environments including iframes.
 */
export async function exportMarksheetToPDF(
  meta: AssessmentMeta,
  students: StudentMarkRecord[],
  metrics: EvaluationMetrics
): Promise<string> {
  // Create A4 portrait document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  // 1 & 2. INSTITUTIONAL LETTERHEAD & DOCUMENT TITLE BANNER
  // Renders the exact composite institutional header matching the reference image
  let headerRendered = false;
  try {
    const headerDataUrl = await generateHeaderBannerBase64(meta.examType);
    if (headerDataUrl) {
      // 186mm wide by 34.4mm tall (aspect ratio matches 1200 x 222 canvas)
      doc.addImage(headerDataUrl, 'PNG', margin, 7.5, pageWidth - margin * 2, 34.4);
      headerRendered = true;
    }
  } catch (err) {
    console.warn('Could not render composite header banner in PDF, falling back to vector:', err);
  }

  if (!headerRendered) {
    renderVectorHeaderFallback(doc, meta, pageWidth, margin);
  }

  // 3. METADATA SUMMARY BOX (Including Department, Assessment Date, Semester, Faculty, Subject, Evaluator, Marks Matrix)
  const metaBoxY = 44;
  const metaBoxHeight = 24.5;
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, metaBoxY, pageWidth - margin * 2, metaBoxHeight, 1.5, 1.5, 'FD');

  const col1X = margin + 3;
  const col2X = margin + 98;
  let currentY = metaBoxY + 4.8;

  doc.setFontSize(8);

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Department:', col1X, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(meta.department, col1X + 22, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Assessment Date:', col2X, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(meta.assessmentDate || new Date().toISOString().split('T')[0], col2X + 28, currentY);

  // Row 2
  currentY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Semester:', col1X, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${meta.semester}   (BATCH: ${meta.academicYear || '-'})`, col1X + 22, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Faculty In-Charge:', col2X, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(meta.facultyInCharge || 'Faculty In-Charge', col2X + 28, currentY);

  // Row 3
  currentY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Subject:', col1X, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const maxSubjWidth = col2X - col1X - 25;
  const subjFormatted = doc.splitTextToSize(`${meta.subjectCode} - ${meta.subjectName}`, maxSubjWidth)[0];
  doc.text(subjFormatted, col1X + 22, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Evaluator Name:', col2X, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(meta.evaluatorName || '-', col2X + 28, currentY);

  // Row 4
  currentY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Marks Matrix:', col1X, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`Max: ${meta.maxMarks}  |  Pass Mark: ${meta.passMark}`, col1X + 22, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Assessment Type:', col2X, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(meta.examType, col2X + 28, currentY);

  // 4. DETAILED MARKS TABLE VIA autoTable
  const tableData = students.map((s, idx) => [
    (idx + 1).toString(),
    s.regNo,
    s.name,
    s.attendance,
    s.maxMarks.toString(),
    s.attendance === 'ABSENT' ? 'AB' : s.marksObtained.toString() || '-',
    s.grade,
    s.result,
  ]);

  autoTable(doc, {
    startY: metaBoxY + metaBoxHeight + 3.5,
    margin: { left: margin, right: margin, bottom: 26 },
    head: [
      ['#', 'Register No', 'Student Name', 'Attendance', 'Max', 'Obt', 'Grade', 'Result'],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [11, 30, 54],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      cellPadding: 2,
    },
    styles: {
      fontSize: 8,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      lineWidth: 0.15,
      lineColor: [226, 232, 240],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 32, fontStyle: 'bold' },
      2: { halign: 'left', cellWidth: 54, fontStyle: 'bold' },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 14 },
      5: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
      6: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
      7: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Highlight PASS / FAIL / ABSENT
      if (data.section === 'body') {
        const rowData = students[data.row.index];
        if (!rowData) return;

        // Result column (index 7)
        if (data.column.index === 7) {
          if (rowData.result === 'PASS') {
            data.cell.styles.textColor = [16, 122, 60]; // Green
          } else if (rowData.result === 'FAIL') {
            data.cell.styles.textColor = [220, 38, 38]; // Red
          }
        }
        // Attendance column (index 3)
        if (data.column.index === 3 && rowData.attendance === 'ABSENT') {
          data.cell.styles.textColor = [180, 83, 9]; // Amber
          data.cell.styles.fontStyle = 'bold';
        }
        // Marks Obtained (index 5)
        if (data.column.index === 5 && rowData.attendance === 'ABSENT') {
          data.cell.styles.textColor = [180, 83, 9];
        }
      }
    },
  });

  // 5. EVALUATION SUMMARY & PERFORMANCE METRICS (BELOW STUDENTS TABLE)
  const lastTableY = (doc as any).lastAutoTable.finalY || 180;
  const evalCardHeight = 27;
  const sigSectionHeight = 18;
  let evalBoxY = lastTableY + 4;

  // If evaluation card + signatures would overflow page, add new page
  if (evalBoxY + evalCardHeight + sigSectionHeight + 8 > pageHeight - 12) {
    doc.addPage();
    evalBoxY = 16;
  }

  const evalBoxWidth = pageWidth - margin * 2;

  // Outer evaluation card container
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, evalBoxY, evalBoxWidth, evalCardHeight, 2, 2, 'FD');

  // Title: "EVALUATION SUMMARY & PERFORMANCE METRICS"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text('EVALUATION SUMMARY & PERFORMANCE METRICS', margin + 4, evalBoxY + 5.5);

  // Subtle divider line
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.25);
  doc.line(margin + 3.5, evalBoxY + 7.5, margin + evalBoxWidth - 3.5, evalBoxY + 7.5);

  // Metrics grid coordinates
  const leftColLabelX = margin + 6;
  const leftColValX = margin + 52;
  const rightColLabelX = margin + 82;
  const rightColValX = margin + 130;

  const row1Y = evalBoxY + 12;
  const row2Y = evalBoxY + 16.5;

  doc.setFontSize(8);

  // Left column - Row 1: "No of Student Present:"
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('No of Student Present:', leftColLabelX, row1Y);
  doc.setTextColor(16, 149, 93); // Green
  doc.text(metrics.presentCount.toString(), leftColValX, row1Y);

  // Left column - Row 2: "No of Student Absent:"
  doc.setTextColor(30, 41, 59);
  doc.text('No of Student Absent:', leftColLabelX, row2Y);
  doc.text(metrics.absentCount.toString(), leftColValX, row2Y);

  // Right column - Row 1: "No of Student Pass:"
  doc.setTextColor(30, 41, 59);
  doc.text('No of Student Pass:', rightColLabelX, row1Y);
  doc.setTextColor(16, 149, 93); // Green
  doc.text(metrics.passCount.toString(), rightColValX, row1Y);

  // Right column - Row 2: "No of Student Fail:"
  doc.setTextColor(30, 41, 59);
  doc.text('No of Student Fail:', rightColLabelX, row2Y);
  doc.text(metrics.failCount.toString(), rightColValX, row2Y);

  // Centered Pass percentage banner pill
  const pillY = evalBoxY + 19.5;
  const pillHeight = 5.5;
  const pillMargin = 6;
  const pillWidth = evalBoxWidth - pillMargin * 2;
  doc.setFillColor(238, 242, 255); // Indigo/Blue-50
  doc.roundedRect(margin + pillMargin, pillY, pillWidth, pillHeight, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(37, 99, 235); // Blue
  doc.text(
    `Pass percentage:  ${metrics.passPercentage.toFixed(2)}%`,
    margin + evalBoxWidth / 2,
    pillY + 4,
    { align: 'center' }
  );

  // 6. SIGNATURE SECTION (3 Signatures: 1. Evaluator Signature, 2. Exam Cell Coordinator, 3. Principal Signature)
  const sigY = evalBoxY + evalCardHeight + 12;
  const sigBlockWidth = (pageWidth - margin * 2) / 3;

  const sigs = [
    {
      title: 'Evaluator Signature',
      name: meta.evaluatorName ? `(${meta.evaluatorName})` : '',
      x: margin + sigBlockWidth * 0.5,
    },
    {
      title: 'Exam Cell Coordinator',
      name: meta.examCellCoordinator ? `(${meta.examCellCoordinator})` : '',
      x: margin + sigBlockWidth * 1.5,
    },
    {
      title: 'Principal Signature',
      name: meta.principalName
        ? `(${meta.principalName})`
        : meta.principalSignature
        ? `(${meta.principalSignature})`
        : '',
      x: margin + sigBlockWidth * 2.5,
    },
  ];

  sigs.forEach((s) => {
    // Signature underline
    doc.setDrawColor(148, 163, 184); // Slate-400
    doc.setLineWidth(0.3);
    doc.line(s.x - 24, sigY, s.x + 24, sigY);

    // Title
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text(s.title, s.x, sigY + 4.5, { align: 'center' });

    // Optional Name
    if (s.name) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(30, 41, 59);
      doc.text(s.name, s.x, sigY + 8.2, { align: 'center' });
    }
  });

  // 7. FOOTER ON ALL PAGES
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);

    // Left: Generated Timestamp
    const printDate = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    doc.text(
      `Generated by JSEC Central Examination Cell on ${printDate} IST`,
      margin,
      pageHeight - 6
    );

    // Right: Page X of Y
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, {
      align: 'right',
    });
  }

  // 8. GENERATE CLEAN FILENAME AND TRIGGER DOWNLOAD
  const cleanDept = (meta.department.split(' - ')[0] || 'JSEC')
    .replace(/[^a-zA-Z0-9]/g, '_');
  const cleanSub = (meta.subjectCode || 'MARK')
    .replace(/[^a-zA-Z0-9]/g, '_');
  const cleanSem = (meta.semester || 'SEM')
    .replace(/\s+/g, '_');
  const cleanExam = (meta.examType.split(' ')[0] || 'CAT')
    .replace(/[^a-zA-Z0-9]/g, '_');

  const filename = `JSEC_${cleanDept}_${cleanSub}_${cleanSem}_${cleanExam}_Marksheet.pdf`;

  // Multi-method download trigger to work reliably inside sandboxed iframes & direct tabs
  try {
    doc.save(filename);
  } catch {
    // Fallback using Blob & Anchor download
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    setTimeout(() => {
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobUrl);
    }, 1500);
  }

  return filename;
}
