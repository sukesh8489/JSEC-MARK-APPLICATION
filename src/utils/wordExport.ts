import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  VerticalAlign,
  BorderStyle,
  ImageRun,
  ShadingType,
} from 'docx';
import JSZip from 'jszip';
import { AssessmentMeta, StudentMarkRecord, EvaluationMetrics } from '../types';
import { COLLEGE_LOGO_BASE64 } from '../assets/logoBase64';
import { NAAC_LOGO_BASE64 } from '../assets/naacLogoBase64';

/**
 * Convert base64 data URI to Uint8Array for binary embedding into docx
 */
function base64ToUint8Array(base64Str: string): Uint8Array {
  try {
    const clean = base64Str.replace(/^data:image\/\w+;base64,/, '').replace(/\s+/g, '');
    const binaryString = atob(clean);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (err) {
    console.warn('Could not decode base64 image to Uint8Array:', err);
    return new Uint8Array();
  }
}

/**
 * Generate and download an official Marksheet Word document (.docx)
 * with the exact same visual design, typography, institutional headers,
 * College logo, NAAC 'A' Grade logo, metadata matrix, student marks table,
 * evaluation metrics card, and signatures matching the PDF and Excel outputs.
 * Uses native Office Open XML format (.docx) with embedded binary images so
 * Microsoft Word natively loads both logos with 100% fidelity without errors.
 */
export async function exportMarksheetToWord(
  meta: AssessmentMeta,
  students: StudentMarkRecord[],
  metrics: EvaluationMetrics
): Promise<void> {
  const collegeName = 'JAYA SAKTHI ENGINEERING COLLEGE';
  const affiliation = 'Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai';
  const address = "St. Mary's Nagar, Thiruninravur, Chennai - 602024, Tamil Nadu";
  const examTypeStr = (meta?.examType || 'Continuous Assessment').toString().toUpperCase();
  const assessmentTitle = `CONTINUOUS ASSESSMENT MARKSHEET — ${examTypeStr}`;
  const batchText = meta?.academicYear || '2024-2028';
  const assessmentDate = meta?.assessmentDate || new Date().toISOString().split('T')[0];
  const evaluatorName = meta?.evaluatorName || 'Evaluator Signature';
  const examCellCoordinator = meta?.examCellCoordinator || 'Central Exam Cell';
  const principalName = meta?.principalName || meta?.principalSignature || 'Principal';

  const cleanSubject = String(meta?.subjectCode || 'Marksheet').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanSem = String(meta?.semester || 'Assessment').replace(/[^a-zA-Z0-9_-]/g, '_');

  try {
    // 1. Prepare Embedded Images as Uint8Array
    const collegeLogoBytes = base64ToUint8Array(COLLEGE_LOGO_BASE64);
    const naacLogoBytes = base64ToUint8Array(NAAC_LOGO_BASE64);

    // Border definitions
    const noBorder = { style: BorderStyle.NONE, size: 0, color: 'auto' };
    const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

    const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };
    const tableBorders = {
      top: thinBorder,
      bottom: thinBorder,
      left: thinBorder,
      right: thinBorder,
      insideHorizontal: thinBorder,
      insideVertical: thinBorder,
    };

    // 2. Header Table (College Logo Left | Centered College Title | NAAC Logo Right)
    const headerChildrenLeft: Paragraph[] = [];
    if (collegeLogoBytes && collegeLogoBytes.length > 0) {
      try {
        headerChildrenLeft.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: collegeLogoBytes,
                transformation: { width: 65, height: 65 },
                type: 'png',
                altText: {
                  name: 'College_Logo',
                  description: 'Jaya Sakthi Engineering College Official Logo',
                },
              }),
            ],
          })
        );
      } catch (imgErr) {
        console.warn('College logo ImageRun warning:', imgErr);
        headerChildrenLeft.push(new Paragraph({}));
      }
    } else {
      headerChildrenLeft.push(new Paragraph({}));
    }

    const headerChildrenRight: Paragraph[] = [];
    if (naacLogoBytes && naacLogoBytes.length > 0) {
      try {
        headerChildrenRight.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: naacLogoBytes,
                transformation: { width: 75, height: 60 },
                type: 'png',
                altText: {
                  name: 'NAAC_Logo',
                  description: 'NAAC Grade A Emblem Badge',
                },
              }),
            ],
          })
        );
      } catch (imgErr) {
        console.warn('NAAC logo ImageRun warning:', imgErr);
        headerChildrenRight.push(new Paragraph({}));
      }
    } else {
      headerChildrenRight.push(new Paragraph({}));
    }

    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 15, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              borders: noBorders,
              children: headerChildrenLeft,
            }),
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              borders: noBorders,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: collegeName,
                      bold: true,
                      size: 26,
                      font: 'Times New Roman',
                      color: '0B1E36',
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 30 },
                  children: [
                    new TextRun({
                      text: affiliation,
                      size: 16,
                      font: 'Arial',
                      color: '334155',
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: address,
                      size: 15,
                      font: 'Arial',
                      color: '64748B',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 15, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              borders: noBorders,
              children: headerChildrenRight,
            }),
          ],
        }),
      ],
    });

    // 3. Document Title Banner (Navy Pill Capsule)
    const titleTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              shading: { fill: '0B1E36', type: ShadingType.CLEAR },
              borders: noBorders,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 80, after: 80 },
                  children: [
                    new TextRun({
                      text: assessmentTitle,
                      bold: true,
                      size: 20,
                      font: 'Arial',
                      color: 'FFFFFF',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    // 4. Metadata Matrix Box
    const metaCell = (label: string, value: string) =>
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
        borders: tableBorders,
        children: [
          new Paragraph({
            spacing: { before: 50, after: 50 },
            children: [
              new TextRun({ text: `${label}: `, bold: true, size: 18, color: '475569', font: 'Arial' }),
              new TextRun({ text: value, size: 18, bold: true, color: '0F172A', font: 'Arial' }),
            ],
          }),
        ],
      });

    const metaTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders,
      rows: [
        new TableRow({
          children: [
            metaCell('Department', meta?.department || 'Engineering'),
            metaCell('Assessment Date', assessmentDate),
          ],
        }),
        new TableRow({
          children: [
            metaCell('Semester', meta?.semester || 'Semester'),
            metaCell('BATCH', batchText),
          ],
        }),
        new TableRow({
          children: [
            metaCell('Subject', `${meta?.subjectCode || ''} – ${meta?.subjectName || ''}`),
            metaCell('Faculty In-Charge', meta?.facultyInCharge || 'Faculty In-Charge'),
          ],
        }),
        new TableRow({
          children: [
            metaCell('Marks Matrix', `Max: ${meta?.maxMarks ?? 100}    Pass Mark: ${meta?.passMark ?? 50}`),
            metaCell('Evaluator Name', evaluatorName),
          ],
        }),
      ],
    });

    // 5. Detailed Student Marksheet Table
    const headerCols = [
      { text: '#', width: 6, align: AlignmentType.CENTER },
      { text: 'REGISTER NO', width: 20, align: AlignmentType.CENTER },
      { text: 'STUDENT NAME', width: 28, align: AlignmentType.LEFT },
      { text: 'ATTENDANCE', width: 14, align: AlignmentType.CENTER },
      { text: 'MAX', width: 8, align: AlignmentType.CENTER },
      { text: 'OBT', width: 8, align: AlignmentType.CENTER },
      { text: 'GRADE', width: 8, align: AlignmentType.CENTER },
      { text: 'RESULT', width: 8, align: AlignmentType.CENTER },
    ];

    const studentTableRows: TableRow[] = [
      new TableRow({
        children: headerCols.map(
          (c) =>
            new TableCell({
              width: { size: c.width, type: WidthType.PERCENTAGE },
              shading: { fill: '0B1E36', type: ShadingType.CLEAR },
              verticalAlign: VerticalAlign.CENTER,
              borders: tableBorders,
              children: [
                new Paragraph({
                  alignment: c.align,
                  spacing: { before: 60, after: 60 },
                  children: [
                    new TextRun({
                      text: c.text,
                      bold: true,
                      size: 16,
                      font: 'Arial',
                      color: 'FFFFFF',
                    }),
                  ],
                }),
              ],
            })
        ),
      }),
    ];

    const validStudents = (students || []).filter(Boolean);
    if (validStudents.length === 0) {
      studentTableRows.push(
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 8,
              borders: tableBorders,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 80, after: 80 },
                  children: [
                    new TextRun({
                      text: 'No student marks recorded',
                      italics: true,
                      size: 18,
                      color: '64748B',
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
    } else {
      validStudents.forEach((s, idx) => {
        const regNo = String(s?.regNo || (s as any)?.registerNumber || (s as any)?.regno || '-');
        const studentName = String(s?.name || (s as any)?.studentName || '-').toUpperCase();
        const attendance = String(s?.attendance || 'PRESENT').toUpperCase();
        const isAbsent = attendance === 'ABSENT';
        const isPass = String(s?.result || '').toUpperCase() === 'PASS';
        const rowFill = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
        const obtVal =
          s?.marksObtained !== undefined && s?.marksObtained !== null && s?.marksObtained !== ''
            ? s.marksObtained
            : isAbsent
            ? 'AB'
            : '-';
        const markDisplay = isAbsent ? 'AB' : String(obtVal);
        const attendanceColor = isAbsent ? 'B45309' : '15803D';
        const markColor = isAbsent ? 'DC2626' : '0F172A';
        const resultColor = isPass ? '15803D' : 'DC2626';
        const resultFill = isPass ? 'DCFCE7' : 'FEE2E2';
        const maxM = String(s?.maxMarks ?? meta?.maxMarks ?? 100);
        const grade = String(s?.grade || (isAbsent ? 'AB' : isPass ? 'B' : 'U'));
        const result = String(s?.result || (isAbsent ? 'ABSENT' : isPass ? 'PASS' : 'FAIL'));

        studentTableRows.push(
          new TableRow({
            children: [
              // #
              new TableCell({
                width: { size: 6, type: WidthType.PERCENTAGE },
                shading: { fill: rowFill, type: ShadingType.CLEAR },
                borders: tableBorders,
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 40, after: 40 },
                    children: [
                      new TextRun({ text: String(idx + 1), size: 16, color: '64748B', font: 'Arial' }),
                    ],
                  }),
                ],
              }),
              // Reg No
              new TableCell({
                width: { size: 20, type: WidthType.PERCENTAGE },
                shading: { fill: rowFill, type: ShadingType.CLEAR },
                borders: tableBorders,
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 40, after: 40 },
                    children: [
                      new TextRun({ text: regNo, bold: true, size: 17, color: '0F172A', font: 'Courier New' }),
                    ],
                  }),
                ],
              }),
              // Name
              new TableCell({
                width: { size: 28, type: WidthType.PERCENTAGE },
                shading: { fill: rowFill, type: ShadingType.CLEAR },
                borders: tableBorders,
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { before: 40, after: 40 },
                    children: [
                      new TextRun({ text: studentName, bold: true, size: 17, color: '1E293B', font: 'Arial' }),
                    ],
                  }),
                ],
              }),
              // Attendance
              new TableCell({
                width: { size: 14, type: WidthType.PERCENTAGE },
                shading: { fill: rowFill, type: ShadingType.CLEAR },
                borders: tableBorders,
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 40, after: 40 },
                    children: [
                      new TextRun({ text: attendance, bold: true, size: 16, color: attendanceColor, font: 'Arial' }),
                    ],
                  }),
                ],
              }),
              // Max
              new TableCell({
                width: { size: 8, type: WidthType.PERCENTAGE },
                shading: { fill: rowFill, type: ShadingType.CLEAR },
                borders: tableBorders,
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 40, after: 40 },
                    children: [
                      new TextRun({ text: maxM, size: 16, color: '475569', font: 'Arial' }),
                    ],
                  }),
                ],
              }),
              // Obt
              new TableCell({
                width: { size: 8, type: WidthType.PERCENTAGE },
                shading: { fill: rowFill, type: ShadingType.CLEAR },
                borders: tableBorders,
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 40, after: 40 },
                    children: [
                      new TextRun({ text: markDisplay, bold: true, size: 18, color: markColor, font: 'Arial' }),
                    ],
                  }),
                ],
              }),
              // Grade
              new TableCell({
                width: { size: 8, type: WidthType.PERCENTAGE },
                shading: { fill: rowFill, type: ShadingType.CLEAR },
                borders: tableBorders,
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 40, after: 40 },
                    children: [
                      new TextRun({ text: grade, bold: true, size: 17, color: '1E293B', font: 'Arial' }),
                    ],
                  }),
                ],
              }),
              // Result
              new TableCell({
                width: { size: 8, type: WidthType.PERCENTAGE },
                shading: { fill: resultFill, type: ShadingType.CLEAR },
                borders: tableBorders,
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 40, after: 40 },
                    children: [
                      new TextRun({ text: result, bold: true, size: 16, color: resultColor, font: 'Arial' }),
                    ],
                  }),
                ],
              }),
            ],
          })
        );
      });
    }

    const studentTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders,
      rows: studentTableRows,
    });

    // 6. Evaluation Summary & Performance Metrics Table (No vertical lines between label & counts, clean column alignment)
    const passPct = typeof metrics?.passPercentage === 'number' ? metrics.passPercentage.toFixed(2) : '0.00';
    const borderOutline = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };
    const lightDivider = { style: BorderStyle.SINGLE, size: 2, color: 'F1F5F9' };

    const summaryTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              columnSpan: 4,
              shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
              borders: {
                top: borderOutline,
                bottom: borderOutline,
                left: borderOutline,
                right: borderOutline,
              },
              children: [
                new Paragraph({
                  spacing: { before: 60, after: 60 },
                  children: [
                    new TextRun({
                      text: 'EVALUATION SUMMARY & PERFORMANCE METRICS',
                      bold: true,
                      size: 18,
                      color: '0F172A',
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        // Row 1: Present & Pass counts (No vertical line between label and count, counts left-aligned in column)
        new TableRow({
          children: [
            // Present Label
            new TableCell({
              width: { size: 28, type: WidthType.PERCENTAGE },
              borders: {
                top: noBorders.top,
                bottom: lightDivider,
                left: borderOutline,
                right: noBorders.right,
              },
              children: [
                new Paragraph({
                  spacing: { before: 50, after: 50 },
                  children: [
                    new TextRun({ text: 'No of Student Present:', bold: true, size: 18, color: '334155', font: 'Arial' }),
                  ],
                }),
              ],
            }),
            // Present Value (Aligned cleanly, no vertical line)
            new TableCell({
              width: { size: 22, type: WidthType.PERCENTAGE },
              borders: {
                top: noBorders.top,
                bottom: lightDivider,
                left: noBorders.left,
                right: noBorders.right,
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  spacing: { before: 50, after: 50 },
                  children: [
                    new TextRun({ text: String(metrics?.presentCount ?? 0), bold: true, size: 20, color: '15803D', font: 'Arial' }),
                  ],
                }),
              ],
            }),
            // Pass Label
            new TableCell({
              width: { size: 28, type: WidthType.PERCENTAGE },
              borders: {
                top: noBorders.top,
                bottom: lightDivider,
                left: noBorders.left,
                right: noBorders.right,
              },
              children: [
                new Paragraph({
                  spacing: { before: 50, after: 50 },
                  children: [
                    new TextRun({ text: 'No of Student Pass:', bold: true, size: 18, color: '334155', font: 'Arial' }),
                  ],
                }),
              ],
            }),
            // Pass Value (Aligned cleanly, no vertical line)
            new TableCell({
              width: { size: 22, type: WidthType.PERCENTAGE },
              borders: {
                top: noBorders.top,
                bottom: lightDivider,
                left: noBorders.left,
                right: borderOutline,
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  spacing: { before: 50, after: 50 },
                  children: [
                    new TextRun({ text: String(metrics?.passCount ?? 0), bold: true, size: 20, color: '15803D', font: 'Arial' }),
                  ],
                }),
              ],
            }),
          ],
        }),
        // Row 2: Absent & Fail counts (No vertical line between label and count, aligned in exact same column)
        new TableRow({
          children: [
            // Absent Label
            new TableCell({
              width: { size: 28, type: WidthType.PERCENTAGE },
              borders: {
                top: noBorders.top,
                bottom: borderOutline,
                left: borderOutline,
                right: noBorders.right,
              },
              children: [
                new Paragraph({
                  spacing: { before: 50, after: 50 },
                  children: [
                    new TextRun({ text: 'No of Student Absent:', bold: true, size: 18, color: '334155', font: 'Arial' }),
                  ],
                }),
              ],
            }),
            // Absent Value (Aligned in exact same column as Present count)
            new TableCell({
              width: { size: 22, type: WidthType.PERCENTAGE },
              borders: {
                top: noBorders.top,
                bottom: borderOutline,
                left: noBorders.left,
                right: noBorders.right,
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  spacing: { before: 50, after: 50 },
                  children: [
                    new TextRun({ text: String(metrics?.absentCount ?? 0), bold: true, size: 20, color: '0F172A', font: 'Arial' }),
                  ],
                }),
              ],
            }),
            // Fail Label
            new TableCell({
              width: { size: 28, type: WidthType.PERCENTAGE },
              borders: {
                top: noBorders.top,
                bottom: borderOutline,
                left: noBorders.left,
                right: noBorders.right,
              },
              children: [
                new Paragraph({
                  spacing: { before: 50, after: 50 },
                  children: [
                    new TextRun({ text: 'No of Student Fail:', bold: true, size: 18, color: '334155', font: 'Arial' }),
                  ],
                }),
              ],
            }),
            // Fail Value (Aligned in exact same column as Pass count)
            new TableCell({
              width: { size: 22, type: WidthType.PERCENTAGE },
              borders: {
                top: noBorders.top,
                bottom: borderOutline,
                left: noBorders.left,
                right: borderOutline,
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  spacing: { before: 50, after: 50 },
                  children: [
                    new TextRun({ text: String(metrics?.failCount ?? 0), bold: true, size: 20, color: '0F172A', font: 'Arial' }),
                  ],
                }),
              ],
            }),
          ],
        }),
        // Row 3: Pass Percentage Banner
        new TableRow({
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              columnSpan: 4,
              shading: { fill: 'EEF2FF', type: ShadingType.CLEAR },
              borders: {
                top: borderOutline,
                bottom: borderOutline,
                left: borderOutline,
                right: borderOutline,
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 60, after: 60 },
                  children: [
                    new TextRun({
                      text: `Pass percentage:  ${passPct}%`,
                      bold: true,
                      size: 20,
                      color: '2563EB',
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    // 7. Three Signatures Table with dedicated signing space and prominent underline
    const sigCell = (role: string, name: string) =>
      new TableCell({
        width: { size: 33.33, type: WidthType.PERCENTAGE },
        borders: noBorders,
        verticalAlign: VerticalAlign.BOTTOM,
        children: [
          // Blank vertical space for putting the physical pen signature or official stamp
          new Paragraph({
            spacing: { before: 800, after: 0 },
            children: [],
          }),
          // Explicit signature underline: ________________________________
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({
                text: '________________________________',
                bold: true,
                size: 18,
                color: '64748B',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 30 },
            children: [
              new TextRun({
                text: role,
                bold: true,
                size: 18,
                color: '1E293B',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: `(${name})`,
                size: 16,
                color: '64748B',
                font: 'Arial',
              }),
            ],
          }),
        ],
      });

    const signaturesTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            sigCell('Evaluator Signature', evaluatorName),
            sigCell('Exam Cell Coordinator', examCellCoordinator),
            sigCell('Principal Signature', principalName),
          ],
        }),
      ],
    });

    // Construct Document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: { top: 720, bottom: 720, left: 720, right: 720 },
            },
          },
          children: [
            headerTable,
            new Paragraph({ spacing: { before: 80, after: 80 } }),
            titleTable,
            new Paragraph({ spacing: { before: 80, after: 80 } }),
            metaTable,
            new Paragraph({ spacing: { before: 100, after: 100 } }),
            studentTable,
            new Paragraph({ spacing: { before: 100, after: 100 } }),
            summaryTable,
            new Paragraph({ spacing: { before: 400, after: 160 } }),
            signaturesTable,
          ],
        },
      ],
    });

    // Generate initial DOCX blob
    let rawBlob: Blob;
    try {
      rawBlob = await Packer.toBlob(doc);
    } catch (packerErr) {
      console.warn('Packer.toBlob failed, using toArrayBuffer fallback:', packerErr);
      const arrayBuffer = await Packer.toArrayBuffer(doc);
      rawBlob = new Blob([arrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
    }

    // Sanitize document.xml with JSZip:
    // Word requires non-empty name and unique positive IDs on drawing elements (<wp:docPr> & <pic:cNvPr>)
    let finalBlob: Blob = rawBlob;
    try {
      const zip = await JSZip.loadAsync(rawBlob);
      let docXml = await zip.file('word/document.xml')?.async('string');
      if (docXml) {
        let docPrCount = 0;
        docXml = docXml.replace(/<wp:docPr\b([^>]*)\/>/g, () => {
          docPrCount++;
          const name = docPrCount === 1 ? 'College_Logo' : 'NAAC_Logo';
          return `<wp:docPr id="${docPrCount}" name="${name}" descr="${name}"/>`;
        });

        let cNvPrCount = 0;
        docXml = docXml.replace(/<pic:cNvPr\b([^>]*)\/>/g, () => {
          cNvPrCount++;
          const name = cNvPrCount === 1 ? 'College_Logo' : 'NAAC_Logo';
          return `<pic:cNvPr id="${cNvPrCount + 100}" name="${name}"/>`;
        });

        zip.file('word/document.xml', docXml);
        finalBlob = await zip.generateAsync({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
      }
    } catch (zipSanitizeErr) {
      console.warn('Zip XML sanitization notice:', zipSanitizeErr);
    }

    const filename = `${cleanSubject}_${cleanSem}_Marksheet.docx`;
    const url = URL.createObjectURL(finalBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Critical: do not revoke immediately; give the browser enough time to write the file stream to disk
    setTimeout(() => {
      try {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      } catch (cleanupErr) {
        console.warn('URL cleanup notice:', cleanupErr);
      }
    }, 4000);
  } catch (error) {
    console.error('Docx generation encountered an issue, running fallback:', error);
    fallbackHtmlExport(meta, students, metrics, cleanSubject, cleanSem);
  }
}

/**
 * Fallback Word document HTML generator
 */
function fallbackHtmlExport(
  meta: AssessmentMeta,
  students: StudentMarkRecord[],
  metrics: EvaluationMetrics,
  cleanSubject: string,
  cleanSem: string
): void {
  const collegeName = 'JAYA SAKTHI ENGINEERING COLLEGE';
  const affiliation = 'Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai';
  const address = "St. Mary's Nagar, Thiruninravur, Chennai - 602024, Tamil Nadu";
  const assessmentTitle = `CONTINUOUS ASSESSMENT MARKSHEET &nbsp;&mdash;&nbsp; ${meta.examType.toUpperCase()}`;
  const batchText = meta.academicYear || '2024-2028';
  const assessmentDate = meta.assessmentDate || new Date().toISOString().split('T')[0];

  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
  const collegeLogoUrl = origin ? `${origin}/assets/college_logo.png` : COLLEGE_LOGO_BASE64;
  const naacLogoUrl = origin ? `${origin}/assets/naac_logo.png` : NAAC_LOGO_BASE64;

  const studentRowsHtml = students
    .map((s, idx) => {
      const isAbsent = s.attendance === 'ABSENT';
      const isPass = s.result === 'PASS';
      const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
      const markDisplay = isAbsent ? 'AB' : s.marksObtained === '' ? '-' : s.marksObtained;
      const resultColor = isPass ? '#15803d' : '#dc2626';
      const resultBg = isPass ? '#dcfce7' : '#fee2e2';

      return `
        <tr style="background-color: ${rowBg};">
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-size: 9pt; color: #64748b;">${idx + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-family: 'Courier New', monospace; font-weight: bold; font-size: 9.5pt; color: #0f172a;">${s.regNo}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-weight: bold; font-size: 9.5pt; color: #1e293b; text-transform: uppercase;">${s.name}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-size: 9pt; font-weight: bold; color: ${isAbsent ? '#b45309' : '#15803d'};">${s.attendance}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-size: 9pt; color: #475569;">${s.maxMarks}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-weight: bold; font-size: 10pt; color: ${isAbsent ? '#dc2626' : '#0f172a'};">${markDisplay}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-weight: bold; font-size: 9.5pt; color: #1e293b;">${s.grade}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-weight: bold; font-size: 9pt;">
            <span style="background-color: ${resultBg}; color: ${resultColor}; padding: 3px 8px; border-radius: 4px; display: inline-block;">${s.result}</span>
          </td>
        </tr>
      `;
    })
    .join('');

  const wordContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${meta.subjectCode} - Continuous Assessment Marksheet</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 595.3pt 841.9pt;
          margin: 36pt 36pt 36pt 36pt;
          mso-header-margin: 18pt;
          mso-footer-margin: 18pt;
        }
        div.Section1 { page: Section1; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10pt;
          color: #0f172a;
          margin: 0;
          padding: 0;
          background-color: #ffffff;
        }
        table {
          border-collapse: collapse;
          width: 100%;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <table style="width: 100%; border: none; margin-bottom: 6px;">
          <tr>
            <td style="width: 75px; text-align: center; vertical-align: middle; padding: 2px 4px 2px 0;">
              <img src="${collegeLogoUrl}" width="65" height="65" alt="College Logo" style="width: 65px; height: 65px; border: none; display: block;" />
            </td>
            <td style="text-align: center; vertical-align: middle; padding: 2px 8px;">
              <h1 style="font-family: 'Times New Roman', Georgia, serif; font-size: 16pt; font-weight: bold; color: #0b1e36; margin-bottom: 3px;">
                ${collegeName}
              </h1>
              <p style="font-size: 9pt; color: #334155; margin-bottom: 2px;">${affiliation}</p>
              <p style="font-size: 8.5pt; color: #64748b;">${address}</p>
            </td>
            <td style="width: 80px; text-align: center; vertical-align: middle; padding: 2px 0 2px 4px;">
              <img src="${naacLogoUrl}" width="75" height="60" alt="NAAC A Grade Logo" style="width: 75px; height: 60px; border: none; display: block;" />
            </td>
          </tr>
        </table>
        <div style="border-top: 2.5px solid #0f284e; margin-top: 6px; margin-bottom: 2px;"></div>
        <div style="border-top: 1.5px solid #d97706; margin-bottom: 10px;"></div>
        <table style="width: 100%; border: none; margin-bottom: 12px;">
          <tr>
            <td style="background-color: #0b1e36; color: #ffffff; text-align: center; padding: 8px 12px; border-radius: 4px;">
              <span style="font-size: 11pt; font-weight: bold; text-transform: uppercase;">
                ${assessmentTitle}
              </span>
            </td>
          </tr>
        </table>
        <table style="width: 100%; border: 1px solid #cbd5e1; background-color: #f8fafc; border-radius: 4px; margin-bottom: 14px;">
          <tr>
            <td style="padding: 7px 12px; font-size: 9.5pt; width: 50%; border-bottom: 1px solid #e2e8f0;">
              <strong style="color: #475569;">Department:&nbsp; </strong>
              <span style="color: #0f172a; font-weight: bold;">${meta.department}</span>
            </td>
            <td style="padding: 7px 12px; font-size: 9.5pt; width: 50%; border-bottom: 1px solid #e2e8f0;">
              <strong style="color: #475569;">Assessment Date:&nbsp; </strong>
              <span style="color: #0f172a;">${assessmentDate}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 7px 12px; font-size: 9.5pt; border-bottom: 1px solid #e2e8f0;">
              <strong style="color: #475569;">Semester:&nbsp; </strong>
              <span style="color: #0f172a;">${meta.semester}</span>
            </td>
            <td style="padding: 7px 12px; font-size: 9.5pt; border-bottom: 1px solid #e2e8f0;">
              <strong style="color: #475569;">BATCH:&nbsp; </strong>
              <span style="color: #0f172a; font-weight: bold;">${batchText}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 7px 12px; font-size: 9.5pt; border-bottom: 1px solid #e2e8f0;">
              <strong style="color: #475569;">Subject:&nbsp; </strong>
              <span style="color: #0f172a; font-weight: bold;">${meta.subjectCode} &nbsp;&ndash;&nbsp; ${meta.subjectName}</span>
            </td>
            <td style="padding: 7px 12px; font-size: 9.5pt; border-bottom: 1px solid #e2e8f0;">
              <strong style="color: #475569;">Faculty In-Charge:&nbsp; </strong>
              <span style="color: #0f172a;">${meta.facultyInCharge || 'Faculty In-Charge'}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 7px 12px; font-size: 9.5pt;">
              <strong style="color: #475569;">Marks Matrix:&nbsp; </strong>
              <span style="color: #0f172a;">Max: ${meta.maxMarks} &nbsp;&nbsp;&nbsp;&nbsp; Pass Mark: ${meta.passMark}</span>
            </td>
            <td style="padding: 7px 12px; font-size: 9.5pt;">
              <strong style="color: #475569;">Evaluator Name:&nbsp; </strong>
              <span style="color: #0f172a;">${meta.evaluatorName || '-'}</span>
            </td>
          </tr>
        </table>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px;">
          <thead>
            <tr style="background-color: #0b1e36; color: #ffffff;">
              <th style="border: 1px solid #0b1e36; padding: 8px 6px; text-align: center; font-size: 9pt; width: 5%;">#</th>
              <th style="border: 1px solid #0b1e36; padding: 8px 6px; text-align: center; font-size: 9pt; width: 18%;">REGISTER NO</th>
              <th style="border: 1px solid #0b1e36; padding: 8px 10px; text-align: left; font-size: 9pt; width: 28%;">STUDENT NAME</th>
              <th style="border: 1px solid #0b1e36; padding: 8px 6px; text-align: center; font-size: 9pt; width: 13%;">ATTENDANCE</th>
              <th style="border: 1px solid #0b1e36; padding: 8px 6px; text-align: center; font-size: 9pt; width: 8%;">MAX</th>
              <th style="border: 1px solid #0b1e36; padding: 8px 6px; text-align: center; font-size: 9pt; width: 9%;">OBT</th>
              <th style="border: 1px solid #0b1e36; padding: 8px 6px; text-align: center; font-size: 9pt; width: 9%;">GRADE</th>
              <th style="border: 1px solid #0b1e36; padding: 8px 6px; text-align: center; font-size: 9pt; width: 10%;">RESULT</th>
            </tr>
          </thead>
          <tbody>
            ${studentRowsHtml}
          </tbody>
        </table>
        <table style="width: 100%; border: 1px solid #cbd5e1; background-color: #ffffff; border-radius: 4px; margin-bottom: 16px;">
          <tr>
            <td colspan="4" style="background-color: #f1f5f9; padding: 8px 12px; border-bottom: 1px solid #cbd5e1; text-align: left;">
              <strong style="font-size: 9.5pt; color: #0f172a; text-transform: uppercase;">
                EVALUATION SUMMARY &amp; PERFORMANCE METRICS
              </strong>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; width: 28%; font-size: 9.5pt; border-bottom: 1px solid #f1f5f9; color: #334155; font-weight: bold;">No of Student Present:</td>
            <td style="padding: 8px 12px; width: 22%; font-size: 11pt; border-bottom: 1px solid #f1f5f9; color: #15803d; font-weight: bold; text-align: left;">${metrics.presentCount}</td>
            <td style="padding: 8px 12px; width: 28%; font-size: 9.5pt; border-bottom: 1px solid #f1f5f9; color: #334155; font-weight: bold;">No of Student Pass:</td>
            <td style="padding: 8px 12px; width: 22%; font-size: 11pt; border-bottom: 1px solid #f1f5f9; color: #15803d; font-weight: bold; text-align: left;">${metrics.passCount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; width: 28%; font-size: 9.5pt; border-bottom: 1px solid #cbd5e1; color: #334155; font-weight: bold;">No of Student Absent:</td>
            <td style="padding: 8px 12px; width: 22%; font-size: 11pt; border-bottom: 1px solid #cbd5e1; color: #0f172a; font-weight: bold; text-align: left;">${metrics.absentCount}</td>
            <td style="padding: 8px 12px; width: 28%; font-size: 9.5pt; border-bottom: 1px solid #cbd5e1; color: #334155; font-weight: bold;">No of Student Fail:</td>
            <td style="padding: 8px 12px; width: 22%; font-size: 11pt; border-bottom: 1px solid #cbd5e1; color: #0f172a; font-weight: bold; text-align: left;">${metrics.failCount}</td>
          </tr>
          <tr>
            <td colspan="4" style="padding: 8px 14px; text-align: center; background-color: #eef2ff;">
              <strong style="color: #2563eb; font-size: 10pt;">
                Pass percentage:&nbsp;&nbsp;${metrics.passPercentage.toFixed(2)}%
              </strong>
            </td>
          </tr>
        </table>
        <table style="width: 100%; border: none; margin-top: 40px; margin-bottom: 25px;">
          <tr>
            <td style="width: 33.33%; text-align: center; vertical-align: bottom; padding: 0 12px;">
              <!-- Generous vertical space for putting the signature -->
              <div style="height: 60px;"></div>
              <p style="font-family: Arial, sans-serif; font-size: 11pt; color: #64748b; font-weight: bold; margin: 0 0 6px 0; letter-spacing: -0.5px;">____________________________</p>
              <p style="font-size: 9.5pt; font-weight: bold; color: #1e293b; margin: 0 0 3px 0;">Evaluator Signature</p>
              <p style="font-size: 8.5pt; color: #64748b; margin: 0;">(${meta.evaluatorName || 'Evaluator Signature'})</p>
            </td>
            <td style="width: 33.33%; text-align: center; vertical-align: bottom; padding: 0 12px;">
              <!-- Generous vertical space for putting the signature -->
              <div style="height: 60px;"></div>
              <p style="font-family: Arial, sans-serif; font-size: 11pt; color: #64748b; font-weight: bold; margin: 0 0 6px 0; letter-spacing: -0.5px;">____________________________</p>
              <p style="font-size: 9.5pt; font-weight: bold; color: #1e293b; margin: 0 0 3px 0;">Exam Cell Coordinator</p>
              <p style="font-size: 8.5pt; color: #64748b; margin: 0;">(${meta.examCellCoordinator || 'Central Exam Cell'})</p>
            </td>
            <td style="width: 33.33%; text-align: center; vertical-align: bottom; padding: 0 12px;">
              <!-- Generous vertical space for putting the signature -->
              <div style="height: 60px;"></div>
              <p style="font-family: Arial, sans-serif; font-size: 11pt; color: #64748b; font-weight: bold; margin: 0 0 6px 0; letter-spacing: -0.5px;">____________________________</p>
              <p style="font-size: 9.5pt; font-weight: bold; color: #1e293b; margin: 0 0 3px 0;">Principal Signature</p>
              <p style="font-size: 8.5pt; color: #64748b; margin: 0;">(${meta.principalName || meta.principalSignature || 'Principal'})</p>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', wordContent], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const filename = `${cleanSubject}_${cleanSem}_Marksheet.doc`;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    try {
      if (link.parentNode) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('URL cleanup notice:', e);
    }
  }, 4000);
}
