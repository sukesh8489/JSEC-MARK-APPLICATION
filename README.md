# Jaya Sakthi Engineering College — Exam Cell Portal

<div align="center">

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![ExcelJS](https://img.shields.io/badge/ExcelJS-Export-217346?style=for-the-badge&logo=microsoftexcel&logoColor=white)
![jsPDF](https://img.shields.io/badge/jsPDF-AutoTable-E11D48?style=for-the-badge&logo=adobeacrobatreader&logoColor=white)

**An institutional continuous assessment mark entry, automated evaluation, and central examination governance platform for Jaya Sakthi Engineering College (Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai).**

[Features](#-key-features) • [Default Credentials](#-default-credentials) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [Export Specs](#-export-specifications) • [Security](#-security--data-persistence)

</div>

---

## 🏛️ Overview

The **Jaya Sakthi Engineering College Exam Cell Portal** is a web-based examination management and mark entry application designed to streamline internal continuous assessment tests (CAT-1, CAT-2, CAT-3, M-1, M-2, M-3). It bridges faculty mark entry with central examination cell administration, providing real-time evaluation metrics, automatic Anna University grade assignment, and client-side institutional PDF and Excel report generation.

---

## ✨ Key Features

### 👨‍🏫 Faculty Mark Entry
- **Batch-Aware Rosters**: Automatic filtering by academic year (First Year S&H and Higher Semesters across all departments).
- **Fast Tabular Entry**: Rapid entry with keyboard navigation, attendance toggling (`PRESENT` / `ABSENT`), and bulk fill.
- **50 to 100 Auto Conversion**: Seamless scaling of continuous assessment marks from 50 to 100 with a single click.
- **Instant Anna University Grade Matrix**: Real-time evaluation of grades (`O`, `A+`, `A`, `B+`, `B`, `C`, `U`, `RA`, `AB`) and pass/fail results based on customizable maximum and pass marks.
- **Dynamic Metrics Card**: Live calculation of total enrolled, present count, absent count, pass count, fail count, and pass percentage.
- **Locked After Submission**: Submissions lock editing to prevent accidental alterations while notifying the Central Exam Cell.

### 🛡️ Central Exam Cell (Admin)
- **Department & Semester Filtering**: Real-time lookup across AI&DS, CSE, ECE, EEE, MECH, and First Year cohorts.
- **Live Firestore Sync**: Central dashboard reflects faculty submissions with timestamp, approval status, and verification workflows.
- **One-Click Marksheet Unlock**: Exam cell can unlock submitted marksheets back to draft mode if revisions are required.
- **Batch Management & QR Code Linkage**: Fast QR code verification linking directly to specific batches and subjects.

### 📄 Report Generation (PDF & Excel)
- **Official Institutional Letterhead**: Includes the college seal logo, AICTE/Anna University affiliation, and address.
- **Conditional Download Protection**: Marksheet downloads are locked until official submission by faculty.
- **Vector-Grade PDF Generation (`jsPDF` + `autoTable`)**: Formatted assessment document with evaluation summary and four-column signature block.
- **Native Excel Generation (`ExcelJS`)**: Formatted `.xlsx` spreadsheet with embedded dynamic Excel formulas (`COUNTIF`, `COUNTA`, `IF`) for live calculation and conditional formatting.
- **Configurable Bottom Signatures**: Explicit fields for Faculty In-Charge, Evaluator Name, Exam Cell Coordinator, and Principal.

---

## 🔐 Default Credentials

| Portal Role | User ID | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Faculty (Mark Enter)** | `XYZZ` | `XYZ` | Mark entry, 50→100 conversion, submission, PDF/XLS export |
| **Central Exam Cell (Admin)** | `XYZZZ` | `XYZ` | Department overview, mark verification, unlock controls |

---

## 🏗️ Architecture

```
jaya-sakthi-exam-portal/
├── public/                  # Public static assets & college logo
├── src/
│   ├── assets/              # Institutional logo base64 & icons
│   ├── components/          # Modular UI components
│   │   ├── AdminPanel.tsx           # Central Exam Cell management
│   │   ├── DownloadPrintModal.tsx   # Marksheet download preview & modal
│   │   ├── LoginPanel.tsx           # Dual-role authentication screen
│   │   ├── MarkEntryPanel.tsx       # Faculty tabular mark entry & metrics
│   │   └── Navbar.tsx               # Top institutional navigation bar
│   ├── data/
│   │   └── studentBatches.ts        # Department rosters & batch registry
│   ├── services/
│   │   └── firestoreService.ts      # Live Firebase Firestore data sync
│   ├── utils/
│   │   ├── excelExport.ts           # ExcelJS workbook with formulas
│   │   ├── pdfExport.ts             # jsPDF vector report generator
│   │   └── submittedSheets.ts       # Local storage & sheet state helpers
│   ├── types.ts             # TypeScript domain models
│   ├── App.tsx              # Root application router & state controller
│   └── main.tsx             # Application bootstrap
├── server.ts                # Express backend with Vite middleware
├── firestore.rules          # Firestore database security rules
└── package.json             # Build configuration & dependencies
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/jaya-sakthi-engineering-college-exam-cell-portal.git
   cd jaya-sakthi-engineering-college-exam-cell-portal
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory (refer to `.env.example` if available):
   ```env
   PORT=3000
   NODE_ENV=development
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

---

## 📊 Export Specifications

### 1. Official PDF Document
- **Page Format**: A4 Portrait with standard institutional margins.
- **Header**: Official Jaya Sakthi Engineering College seal logo, affiliations, and examination title banner.
- **Summary Box**: Department, Semester, Academic Year, Subject Code, Subject Name, and Marks Matrix.
- **Table Structure**: S.No, Register Number, Student Name, Attendance, Max Marks, Marks Obtained, Grade, and Result.
- **Evaluation Card**: Real-time present/absent and pass/fail counts with pass percentage highlight.
- **Bottom Signatures**: Four balanced signature sections:
  1. *Faculty In-Charge Signature*
  2. *Evaluator Name & Signature*
  3. *Exam Cell Coordinator*
  4. *Principal Signature*

### 2. Formatted Excel Worksheet (`.xlsx`)
- **Native Excel Formulas**: Uses dynamic formulas (`=COUNTIF(...)`, `=IF(...)`, `=TEXT(...)`) so metrics update if marks are recalculated in spreadsheet software.
- **Conditional Formatting**: Soft green and red color fills for PASS and FAIL outcomes.
- **Print Optimization**: Configured to fit 1 page wide on standard A4 paper.

---

## 🔒 Security & Data Persistence

- **Dual-Layer Persistence**: Automatic fallback to client-side storage when offline or when Firebase configuration is optional, with live cloud synchronization to Google Cloud Firestore when connected.
- **Strict Role-Based Routing**: Faculty cannot access Central Exam Cell unlocking mechanisms or administrative overrides without Admin authentication.
- **Audit-Ready Metadata**: All submissions track submission timestamp, year category, and evaluator metadata.

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <sub>Developed for Jaya Sakthi Engineering College — Central Examination Cell.</sub>
</div>
