import ExcelJS from 'exceljs';
import { AssessmentMeta, StudentMarkRecord, EvaluationMetrics } from '../types';
import { COLLEGE_LOGO_BASE64 } from '../assets/logoBase64';
import { NAAC_LOGO_BASE64 } from '../assets/naacLogoBase64';
import { generateHeaderBannerBase64 } from './headerBannerImage';

/**
 * Generate and download an official Marksheet Excel (.xlsx) document
 * with institutional branding, college logo, metadata box, formatted student table,
 * evaluation summary card, and signature section matching the PDF layout.
 */
export async function exportMarksheetToExcel(
  meta: AssessmentMeta,
  students: StudentMarkRecord[],
  metrics: EvaluationMetrics
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Jaya Sakthi Engineering College';
  workbook.lastModifiedBy = 'Central Examination Cell';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Assessment Marksheet', {
    views: [{ showGridLines: true }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.6,
        bottom: 0.6,
        header: 0.3,
        footer: 0.3,
      },
    },
  });

  // Column definitions (8 columns: A through H)
  worksheet.columns = [
    { key: 'sno', width: 8 },         // A: S.No
    { key: 'regNo', width: 22 },       // B: Reg No
    { key: 'name', width: 34 },        // C: Student Name
    { key: 'attendance', width: 15 },  // D: Attendance
    { key: 'maxMarks', width: 13 },    // E: Max Marks
    { key: 'marks', width: 17 },       // F: Marks Obtained
    { key: 'grade', width: 12 },       // G: Grade
    { key: 'result', width: 15 },      // H: Result
  ];

  // Helper border styles
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  const navyDark = 'FF0B1E36';
  const slate900 = 'FF0F172A';
  const slate700 = 'FF334155';
  const slate500 = 'FF64748B';
  const greenPass = 'FF15803D';
  const redFail = 'FFDC2626';

  // 1 & 2. INSTITUTIONAL LETTERHEAD & DOCUMENT TITLE BANNER
  // Renders the exact composite institutional header matching the reference image
  let headerImageLoaded = false;
  try {
    const headerDataUrl = await generateHeaderBannerBase64(meta.examType);
    if (headerDataUrl) {
      const cleanHeaderBase64 = headerDataUrl.replace(/^data:image\/\w+;base64,/, '');
      const headerImgId = workbook.addImage({
        base64: cleanHeaderBase64,
        extension: 'png',
      });

      // Spans across columns A to H, covering rows 1 through 5
      worksheet.addImage(headerImgId, 'A1:H5');
      headerImageLoaded = true;
    }
  } catch (err) {
    console.warn('Could not add composite header banner to Excel:', err);
  }

  // Row heights for header rows 1 to 5 (total height ~130pt, perfectly proportioned)
  const row1 = worksheet.getRow(1);
  row1.height = 28;
  worksheet.mergeCells('A1:H1');
  const cellA1 = worksheet.getCell('A1');
  cellA1.value = 'JAYA SAKTHI ENGINEERING COLLEGE';
  cellA1.font = { name: 'Times New Roman', size: 16, bold: true, color: { argb: navyDark } };
  cellA1.alignment = { horizontal: 'center', vertical: 'middle' };

  const row2 = worksheet.getRow(2);
  row2.height = 18;
  worksheet.mergeCells('A2:H2');
  const cellA2 = worksheet.getCell('A2');
  cellA2.value = 'Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai';
  cellA2.font = { name: 'Arial', size: 9.5, color: { argb: slate700 } };
  cellA2.alignment = { horizontal: 'center', vertical: 'middle' };

  const row3 = worksheet.getRow(3);
  row3.height = 18;
  worksheet.mergeCells('A3:H3');
  const cellA3 = worksheet.getCell('A3');
  cellA3.value = "St. Mary's Nagar, Thiruninravur, Chennai - 602024, Tamil Nadu";
  cellA3.font = { name: 'Arial', size: 9, color: { argb: slate500 } };
  cellA3.alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 4: Decorative dual rule (Navy top line + Golden amber bottom line)
  const row4 = worksheet.getRow(4);
  row4.height = 8;
  for (let c = 1; c <= 8; c++) {
    const cell = row4.getCell(c);
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F284E' } },
      bottom: { style: 'thin', color: { argb: 'FFD97706' } },
    };
  }

  // Row 5: Assessment Title Banner (Deep Navy background + Bold white text)
  const row5 = worksheet.getRow(5);
  row5.height = 36;
  worksheet.mergeCells('A5:H5');
  const cellA5 = worksheet.getCell('A5');
  cellA5.value = `CONTINUOUS ASSESSMENT MARKSHEET — ${meta.examType.toUpperCase()}`;
  cellA5.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  cellA5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navyDark } };
  cellA5.alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 1; c <= 8; c++) {
    const cell = row5.getCell(c);
    cell.border = {
      top: { style: 'thin', color: { argb: navyDark } },
      bottom: { style: 'thin', color: { argb: navyDark } },
      left: { style: 'thin', color: { argb: navyDark } },
      right: { style: 'thin', color: { argb: navyDark } },
    };
  }

  // If composite header image could not be loaded, add individual logos as fallback
  if (!headerImageLoaded) {
    try {
      if (COLLEGE_LOGO_BASE64) {
        const cleanBase64 = COLLEGE_LOGO_BASE64.replace(/^data:image\/\w+;base64,/, '');
        const imageId = workbook.addImage({
          base64: cleanBase64,
          extension: 'png',
        });
        worksheet.addImage(imageId, {
          tl: { col: 0.1, row: 0.15 },
          ext: { width: 72, height: 72 },
        });
      }
      if (NAAC_LOGO_BASE64) {
        const cleanNaacBase64 = NAAC_LOGO_BASE64.replace(/^data:image\/\w+;base64,/, '');
        const naacExt = NAAC_LOGO_BASE64.startsWith('data:image/jpeg') ? 'jpeg' : 'png';
        const naacImageId = workbook.addImage({
          base64: cleanNaacBase64,
          extension: naacExt,
        });
        worksheet.addImage(naacImageId, {
          tl: { col: 6.8, row: 0.15 },
          ext: { width: 96, height: 66 },
        });
      }
    } catch (err) {
      console.warn('Could not add individual logos to Excel:', err);
    }
  }

  // Row 6: Spacing
  worksheet.getRow(6).height = 8;

  // 3. METADATA SUMMARY BOX (Rows 7, 8, 9)
  const metaFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' },
  };

  // Helper to style metadata rows
  const styleMetaRow = (rowNum: number, h: number) => {
    const r = worksheet.getRow(rowNum);
    r.height = h;
    for (let c = 1; c <= 8; c++) {
      const cell = r.getCell(c);
      cell.fill = metaFill;
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle' };
    }
  };

  // Row 7: Department & Assessment Date
  styleMetaRow(7, 22);
  worksheet.mergeCells('A7:D7');
  worksheet.mergeCells('E7:H7');
  const cellDept = worksheet.getCell('A7');
  cellDept.value = {
    richText: [
      { text: 'Department:  ', font: { name: 'Arial', size: 9.5, bold: true, color: { argb: slate700 } } },
      { text: meta.department, font: { name: 'Arial', size: 9.5, bold: true, color: { argb: slate900 } } },
    ],
  };
  cellDept.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  const cellDate = worksheet.getCell('E7');
  cellDate.value = {
    richText: [
      { text: 'Assessment Date:  ', font: { name: 'Arial', size: 9.5, bold: true, color: { argb: slate700 } } },
      { text: meta.assessmentDate || new Date().toISOString().split('T')[0], font: { name: 'Arial', size: 9.5, color: { argb: slate900 } } },
    ],
  };
  cellDate.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  // Row 8: Semester & Faculty In-Charge
  styleMetaRow(8, 22);
  worksheet.mergeCells('A8:D8');
  worksheet.mergeCells('E8:H8');
  const cellSem = worksheet.getCell('A8');
  cellSem.value = {
    richText: [
      { text: 'Semester:  ', font: { name: 'Arial', size: 9.5, bold: true, color: { argb: slate700 } } },
      { text: `${meta.semester} (${meta.academicYear})`, font: { name: 'Arial', size: 9.5, color: { argb: slate900 } } },
    ],
  };
  cellSem.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  const cellFaculty = worksheet.getCell('E8');
  const facultyRichText: any[] = [
    { text: 'Faculty: ', font: { name: 'Arial', size: 9.5, bold: true, color: { argb: slate700 } } },
    { text: `${meta.facultyInCharge || 'Faculty In-Charge'} `, font: { name: 'Arial', size: 9.5, color: { argb: slate900 } } },
  ];
  if (meta.evaluatorName) {
    facultyRichText.push(
      { text: '| Evaluator: ', font: { name: 'Arial', size: 9.5, bold: true, color: { argb: slate700 } } },
      { text: meta.evaluatorName, font: { name: 'Arial', size: 9.5, bold: true, color: { argb: slate900 } } }
    );
  }
  cellFaculty.value = { richText: facultyRichText };
  cellFaculty.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  // Row 9: Subject Code & Name + Max/Pass Marks
  styleMetaRow(9, 22);
  worksheet.mergeCells('A9:D9');
  worksheet.mergeCells('E9:H9');
  const cellSubj = worksheet.getCell('A9');
  cellSubj.value = {
    richText: [
      { text: 'Subject:  ', font: { name: 'Arial', size: 9.5, bold: true, color: { argb: slate700 } } },
      { text: `${meta.subjectCode} - ${meta.subjectName}`, font: { name: 'Arial', size: 9.5, bold: true, color: { argb: slate900 } } },
    ],
  };
  cellSubj.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  const cellMarksMeta = worksheet.getCell('E9');
  cellMarksMeta.value = {
    richText: [
      { text: 'Max Marks:  ', font: { name: 'Arial', size: 9.5, bold: true, color: { argb: slate700 } } },
      { text: `${meta.maxMarks}    `, font: { name: 'Arial', size: 9.5, bold: true, color: { argb: slate900 } } },
      { text: '|  Pass Mark:  ', font: { name: 'Arial', size: 9.5, bold: true, color: { argb: slate700 } } },
      { text: `${meta.passMark}`, font: { name: 'Arial', size: 9.5, bold: true, color: { argb: slate900 } } },
    ],
  };
  cellMarksMeta.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  // Row 10: Spacing before table
  worksheet.getRow(10).height = 10;

  // 4. STUDENT DETAILED MARKSHEET TABLE
  // Table Header Row 11
  const headerRow = worksheet.getRow(11);
  headerRow.height = 25;
  const headers = [
    'S.No',
    'Register Number',
    'Student Name',
    'Attendance',
    'Max Marks',
    'Marks Obtained',
    'Grade',
    'Result',
  ];

  headers.forEach((hdr, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = hdr;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navyDark } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });

  // Student Data Rows (starting from Row 12)
  let currentRowNum = 12;
  students.forEach((student, index) => {
    const row = worksheet.getRow(currentRowNum);
    row.height = 20;

    const isEven = index % 2 === 1;
    const rowBg = isEven ? 'FFF8FAFC' : 'FFFFFFFF';
    const isPass = student.result === 'PASS';
    const isAbsent = student.attendance === 'ABSENT' || student.marksObtained === '';

    // Col 1: S.No
    const c1 = row.getCell(1);
    c1.value = index + 1;
    c1.alignment = { horizontal: 'center', vertical: 'middle' };

    // Col 2: Reg No
    const c2 = row.getCell(2);
    c2.value = student.regNo;
    c2.alignment = { horizontal: 'center', vertical: 'middle' };
    c2.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: slate900 } };

    // Col 3: Student Name
    const c3 = row.getCell(3);
    c3.value = student.name;
    c3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    c3.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: slate900 } };

    // Col 4: Attendance
    const c4 = row.getCell(4);
    c4.value = student.attendance;
    c4.alignment = { horizontal: 'center', vertical: 'middle' };
    c4.font = {
      name: 'Arial',
      size: 9,
      bold: true,
      color: { argb: isAbsent ? redFail : greenPass },
    };

    // Col 5: Max Marks
    const c5 = row.getCell(5);
    c5.value = student.maxMarks;
    c5.alignment = { horizontal: 'center', vertical: 'middle' };
    c5.font = { name: 'Arial', size: 9.5, color: { argb: slate700 } };

    // Col 6: Marks Obtained
    const c6 = row.getCell(6);
    if (student.attendance === 'ABSENT') {
      c6.value = 'AB';
    } else if (student.marksObtained === '') {
      c6.value = '';
    } else {
      c6.value = Number(student.marksObtained);
    }
    c6.alignment = { horizontal: 'center', vertical: 'middle' };
    c6.font = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: { argb: isAbsent ? redFail : slate900 },
    };

    // Col 7: Grade with dynamic Excel formula (O: 91-100, A+: 81-90, A: 71-80, B+: 61-70, B: 56-60, C: 50-55, U: <50)
    const c7 = row.getCell(7);
    c7.value = {
      formula: `IF(D${currentRowNum}="ABSENT","AB",IF(ISNUMBER(F${currentRowNum}),IF(F${currentRowNum}>=91,"O",IF(F${currentRowNum}>=81,"A+",IF(F${currentRowNum}>=71,"A",IF(F${currentRowNum}>=61,"B+",IF(F${currentRowNum}>=56,"B",IF(F${currentRowNum}>=50,"C","U")))))),"U"))`,
      result: student.grade,
    };
    c7.alignment = { horizontal: 'center', vertical: 'middle' };
    c7.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: slate700 } };

    // Col 8: Result with dynamic Excel formula (PASS if marks >= passMark, FAIL if < passMark, ABSENT if absent)
    const c8 = row.getCell(8);
    c8.value = {
      formula: `IF(D${currentRowNum}="ABSENT","ABSENT",IF(ISNUMBER(F${currentRowNum}),IF(F${currentRowNum}>=${meta.passMark},"PASS","FAIL"),"FAIL"))`,
      result: student.result,
    };
    c8.alignment = { horizontal: 'center', vertical: 'middle' };
    c8.font = {
      name: 'Arial',
      size: 9.5,
      bold: true,
      color: { argb: isPass ? greenPass : redFail },
    };
    if (isPass) {
      c8.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Light emerald
    } else {
      c8.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Light red
    }

    // Apply base styling to all columns in row
    for (let c = 1; c <= 8; c++) {
      const cell = row.getCell(c);
      if (c !== 8) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      }
      cell.border = thinBorder;
      if (!cell.font) {
        cell.font = { name: 'Arial', size: 9.5, color: { argb: slate900 } };
      }
    }

    currentRowNum++;
  });

  const startStudentRow = 12;
  const endStudentRow = students.length > 0 ? currentRowNum - 1 : 12;

  // Add Excel Conditional Formatting for Column H (Result) so when marks change, colors adapt automatically
  if (students.length > 0) {
    try {
      worksheet.addConditionalFormatting({
        ref: `H${startStudentRow}:H${endStudentRow}`,
        rules: [
          {
            priority: 1,
            type: 'cellIs',
            operator: 'equal',
            formulae: ['"PASS"'],
            style: {
              fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFDCFCE7' } },
              font: { color: { argb: greenPass }, bold: true },
            },
          },
          {
            priority: 2,
            type: 'cellIs',
            operator: 'equal',
            formulae: ['"FAIL"'],
            style: {
              fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEE2E2' } },
              font: { color: { argb: redFail }, bold: true },
            },
          },
          {
            priority: 3,
            type: 'cellIs',
            operator: 'equal',
            formulae: ['"ABSENT"'],
            style: {
              fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEF3C7' } },
              font: { color: { argb: 'FFD97706' }, bold: true },
            },
          },
        ],
      });
    } catch (e) {
      console.warn('Conditional formatting error in Excel:', e);
    }
  }

  // Row Spacing after table
  worksheet.getRow(currentRowNum).height = 12;
  currentRowNum++;

  // 5. EVALUATION SUMMARY & PERFORMANCE METRICS (Directly Below Students Table - Exact Match to PDF & Image)
  const evalHeaderRow = worksheet.getRow(currentRowNum);
  evalHeaderRow.height = 24;
  worksheet.mergeCells(`A${currentRowNum}:H${currentRowNum}`);
  const evalHeaderCell = worksheet.getCell(`A${currentRowNum}`);
  evalHeaderCell.value = 'EVALUATION SUMMARY & PERFORMANCE METRICS';
  evalHeaderCell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: slate900 } };
  evalHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  evalHeaderCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  evalHeaderCell.border = thinBorder;
  for (let c = 2; c <= 8; c++) {
    evalHeaderRow.getCell(c).border = thinBorder;
  }
  currentRowNum++;

  // Metrics Grid Row 1: Present (A-D) & Pass (E-H) with real dynamic Excel formulas
  const gridRow1 = worksheet.getRow(currentRowNum);
  gridRow1.height = 23;
  worksheet.mergeCells(`A${currentRowNum}:C${currentRowNum}`);
  worksheet.mergeCells(`E${currentRowNum}:G${currentRowNum}`);

  const presLabelCell = worksheet.getCell(`A${currentRowNum}`);
  presLabelCell.value = 'No of student Present:';
  presLabelCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: slate700 } };
  presLabelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  presLabelCell.fill = metaFill;

  const presFormula = students.length > 0
    ? `COUNTIF(D${startStudentRow}:D${endStudentRow}, "PRESENT")`
    : `0`;
  const cellPres = worksheet.getCell(`D${currentRowNum}`);
  cellPres.value = {
    formula: presFormula,
    result: metrics.presentCount,
  };
  cellPres.font = { name: 'Arial', size: 11, bold: true, color: { argb: greenPass } };
  cellPres.alignment = { horizontal: 'center', vertical: 'middle' };
  cellPres.fill = metaFill;

  const passLabelCell = worksheet.getCell(`E${currentRowNum}`);
  passLabelCell.value = 'No of student Pass:';
  passLabelCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: slate700 } };
  passLabelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  passLabelCell.fill = metaFill;

  const passFormula = students.length > 0
    ? `COUNTIF(H${startStudentRow}:H${endStudentRow}, "PASS")`
    : `0`;
  const cellPass = worksheet.getCell(`H${currentRowNum}`);
  cellPass.value = {
    formula: passFormula,
    result: metrics.passCount,
  };
  cellPass.font = { name: 'Arial', size: 11, bold: true, color: { argb: greenPass } };
  cellPass.alignment = { horizontal: 'center', vertical: 'middle' };
  cellPass.fill = metaFill;

  for (let c = 1; c <= 8; c++) {
    gridRow1.getCell(c).border = thinBorder;
  }
  currentRowNum++;

  // Metrics Grid Row 2: Absent (A-D) & Fail (E-H) with real dynamic Excel formulas
  const gridRow2 = worksheet.getRow(currentRowNum);
  gridRow2.height = 23;
  worksheet.mergeCells(`A${currentRowNum}:C${currentRowNum}`);
  worksheet.mergeCells(`E${currentRowNum}:G${currentRowNum}`);

  const absLabelCell = worksheet.getCell(`A${currentRowNum}`);
  absLabelCell.value = 'No of student Absent:';
  absLabelCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: slate700 } };
  absLabelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  absLabelCell.fill = metaFill;

  const absFormula = students.length > 0
    ? `COUNTIF(D${startStudentRow}:D${endStudentRow}, "ABSENT")`
    : `0`;
  const cellAbs = worksheet.getCell(`D${currentRowNum}`);
  cellAbs.value = {
    formula: absFormula,
    result: metrics.absentCount,
  };
  cellAbs.font = { name: 'Arial', size: 11, bold: true, color: { argb: slate900 } };
  cellAbs.alignment = { horizontal: 'center', vertical: 'middle' };
  cellAbs.fill = metaFill;

  const failLabelCell = worksheet.getCell(`E${currentRowNum}`);
  failLabelCell.value = 'no of student Fail:';
  failLabelCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: slate700 } };
  failLabelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  failLabelCell.fill = metaFill;

  const failFormula = students.length > 0
    ? `COUNTIF(H${startStudentRow}:H${endStudentRow}, "FAIL")`
    : `0`;
  const cellFail = worksheet.getCell(`H${currentRowNum}`);
  cellFail.value = {
    formula: failFormula,
    result: metrics.failCount,
  };
  cellFail.font = { name: 'Arial', size: 11, bold: true, color: { argb: slate900 } };
  cellFail.alignment = { horizontal: 'center', vertical: 'middle' };
  cellFail.fill = metaFill;

  for (let c = 1; c <= 8; c++) {
    gridRow2.getCell(c).border = thinBorder;
  }
  currentRowNum++;

  // Pass Percentage Pill Banner with Dynamic Excel Formula: (No of Pass / Total Enrolled) * 100
  const passPctRow = worksheet.getRow(currentRowNum);
  passPctRow.height = 26;
  worksheet.mergeCells(`A${currentRowNum}:H${currentRowNum}`);
  const cellPassPct = worksheet.getCell(`A${currentRowNum}`);

  const passPctFormula = students.length > 0
    ? `="Pass percentage: " & TEXT(IF(COUNTA(B${startStudentRow}:B${endStudentRow})>0, (COUNTIF(H${startStudentRow}:H${endStudentRow},"PASS")/COUNTA(B${startStudentRow}:B${endStudentRow}))*100, 0), "0.00") & "%"`
    : `"Pass percentage: 0.00%"`;

  cellPassPct.value = {
    formula: passPctFormula,
    result: `Pass percentage: ${metrics.passPercentage.toFixed(2)}%`,
  };
  cellPassPct.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1D4ED8' } }; // Blue-700
  cellPassPct.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } }; // Light indigo #eef2ff
  cellPassPct.alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 1; c <= 8; c++) {
    passPctRow.getCell(c).border = {
      top: { style: 'thin', color: { argb: 'FFBFDBFE' } },
      bottom: { style: 'thin', color: { argb: 'FFBFDBFE' } },
      left: { style: 'thin', color: { argb: 'FFBFDBFE' } },
      right: { style: 'thin', color: { argb: 'FFBFDBFE' } },
    };
  }
  currentRowNum++;

  // Spacing before signatures
  worksheet.getRow(currentRowNum).height = 18;
  currentRowNum++;

  // 6. OFFICIAL 3-COLUMN SIGNATURE SECTION (1. EVALUATOR Name & Sign, 2. EXAM CELL COORDINATOR, 3. PRINCIPAL SIGNATURE)
  // Row 1: Underlines
  const sigLineRow = worksheet.getRow(currentRowNum);
  sigLineRow.height = 16;
  worksheet.mergeCells(`A${currentRowNum}:B${currentRowNum}`);
  worksheet.mergeCells(`D${currentRowNum}:E${currentRowNum}`);
  worksheet.mergeCells(`G${currentRowNum}:H${currentRowNum}`);

  const underLineStyle = '_________________________';
  const cSigL1 = worksheet.getCell(`A${currentRowNum}`);
  cSigL1.value = underLineStyle;
  cSigL1.alignment = { horizontal: 'center', vertical: 'bottom' };
  cSigL1.font = { name: 'Arial', size: 9, color: { argb: 'FF94A3B8' } };

  const cSigL2 = worksheet.getCell(`D${currentRowNum}`);
  cSigL2.value = underLineStyle;
  cSigL2.alignment = { horizontal: 'center', vertical: 'bottom' };
  cSigL2.font = { name: 'Arial', size: 9, color: { argb: 'FF94A3B8' } };

  const cSigL3 = worksheet.getCell(`G${currentRowNum}`);
  cSigL3.value = underLineStyle;
  cSigL3.alignment = { horizontal: 'center', vertical: 'bottom' };
  cSigL3.font = { name: 'Arial', size: 9, color: { argb: 'FF94A3B8' } };

  currentRowNum++;

  // Row 2: Signature Titles
  const sigTitleRow = worksheet.getRow(currentRowNum);
  sigTitleRow.height = 18;
  worksheet.mergeCells(`A${currentRowNum}:B${currentRowNum}`);
  worksheet.mergeCells(`D${currentRowNum}:E${currentRowNum}`);
  worksheet.mergeCells(`G${currentRowNum}:H${currentRowNum}`);

  const cSigT1 = worksheet.getCell(`A${currentRowNum}`);
  cSigT1.value = 'Evaluator Name & Signature';
  cSigT1.alignment = { horizontal: 'center', vertical: 'middle' };
  cSigT1.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: slate700 } };

  const cSigT2 = worksheet.getCell(`D${currentRowNum}`);
  cSigT2.value = 'Exam Cell Coordinator';
  cSigT2.alignment = { horizontal: 'center', vertical: 'middle' };
  cSigT2.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: slate700 } };

  const cSigT3 = worksheet.getCell(`G${currentRowNum}`);
  cSigT3.value = 'Principal Signature';
  cSigT3.alignment = { horizontal: 'center', vertical: 'middle' };
  cSigT3.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: slate700 } };

  currentRowNum++;

  // Row 3: Names under signatures
  const sigNameRow = worksheet.getRow(currentRowNum);
  sigNameRow.height = 16;
  worksheet.mergeCells(`A${currentRowNum}:B${currentRowNum}`);
  worksheet.mergeCells(`D${currentRowNum}:E${currentRowNum}`);
  worksheet.mergeCells(`G${currentRowNum}:H${currentRowNum}`);

  const cSigN1 = worksheet.getCell(`A${currentRowNum}`);
  cSigN1.value = meta.evaluatorName ? `(${meta.evaluatorName})` : '';
  cSigN1.alignment = { horizontal: 'center', vertical: 'middle' };
  cSigN1.font = { name: 'Arial', size: 9, bold: true, color: { argb: slate500 } };

  const cSigN2 = worksheet.getCell(`D${currentRowNum}`);
  cSigN2.value = meta.examCellCoordinator ? `(${meta.examCellCoordinator})` : '(Central Exam Cell)';
  cSigN2.alignment = { horizontal: 'center', vertical: 'middle' };
  cSigN2.font = { name: 'Arial', size: 9, bold: true, color: { argb: slate500 } };

  const cSigN3 = worksheet.getCell(`G${currentRowNum}`);
  cSigN3.value = meta.principalName
    ? `(${meta.principalName})`
    : meta.principalSignature
    ? `(${meta.principalSignature})`
    : '(Principal)';
  cSigN3.alignment = { horizontal: 'center', vertical: 'middle' };
  cSigN3.font = { name: 'Arial', size: 9, bold: true, color: { argb: slate500 } };

  // Generate File Buffer & Trigger Download in Browser
  const cleanSubject = meta.subjectCode.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanSem = meta.semester.replace(/\s+/g, '_');
  const filename = `${cleanSubject}_${cleanSem}_Marksheet.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}
