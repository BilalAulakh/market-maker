const { jsPDF } = require("jspdf");
const fs = require("fs");
const path = require("path");

function createInterviewGuidePDF() {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  function checkPageBreak(neededHeight) {
    if (y + neededHeight > pageHeight - 15) {
      doc.addPage();
      y = margin;
      addPageHeaderFooter();
    }
  }

  function addPageHeaderFooter() {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(130, 140, 150);
    doc.text("Market Maker • Full-Stack Senior Developer Interview Master Guide", margin, 10);
    doc.line(margin, 12, pageWidth - margin, 12);

    const pageNum = doc.internal.getNumberOfPages();
    doc.text(`Page ${pageNum}`, pageWidth - margin - 15, pageHeight - 8);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
  }

  function addTitle(text) {
    checkPageBreak(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(text, margin, y);
    y += 8;
  }

  function addSubtitle(text) {
    checkPageBreak(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text(text, margin, y);
    y += 6;
  }

  function addSectionHeader(text) {
    checkPageBreak(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 58, 138); // blue-900
    doc.setFillColor(241, 245, 249); // light slate
    doc.rect(margin, y - 4, contentWidth, 8, "F");
    doc.text(text, margin + 2, y + 2);
    y += 9;
  }

  function addParagraph(text, isUrduExplanation = false) {
    doc.setFont("helvetica", isUrduExplanation ? "italic" : "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(isUrduExplanation ? 71 : 51, isUrduExplanation ? 85 : 65, isUrduExplanation ? 105 : 85);

    const lines = doc.splitTextToSize(text, contentWidth);
    checkPageBreak(lines.length * 4.5 + 3);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 3;
  }

  function addQA(q, a, urduTip) {
    checkPageBreak(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    const qLines = doc.splitTextToSize(`Q: ${q}`, contentWidth);
    doc.text(qLines, margin, y);
    y += qLines.length * 4.5 + 1;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    const aLines = doc.splitTextToSize(`A (English Answer): ${a}`, contentWidth);
    checkPageBreak(aLines.length * 4 + 2);
    doc.text(aLines, margin, y);
    y += aLines.length * 4 + 2;

    if (urduTip) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(180, 83, 9); // amber-700
      const uLines = doc.splitTextToSize(`[Interview Tip / Roman Urdu]: ${urduTip}`, contentWidth);
      checkPageBreak(uLines.length * 3.8 + 3);
      doc.text(uLines, margin, y);
      y += uLines.length * 3.8 + 4;
    }
  }

  // ---- COVER / HEADER ----
  addPageHeaderFooter();

  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, contentWidth, 24, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("MARKET MAKER • INTERVIEW MASTER GUIDE", margin + 5, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text("Comprehensive Technical & Architectural Guide for Full-Stack & Senior Engineer Interviews", margin + 5, y + 18);
  y += 32;

  // ---- 1. ELEVATOR PITCH ----
  addSectionHeader("1. Project Elevator Pitch (How to introduce in 30 Seconds)");
  addParagraph(
    "\"I built an Institutional Gold & Forex Brokerage and Market Maker platform using Next.js 15, TypeScript, and Supabase (PostgreSQL). The architecture features a high-concurrency In-Memory Trading Engine, a banking-grade Double-Entry Ledger System to prevent financial race conditions, and a Decentralized Crypto Vault with deterministic USDT (TRC20/BEP20) address derivation for 100% self-custody. The platform is backed by 61 automated unit tests and strict arbitrary-precision decimal mathematics.\""
  );
  addParagraph(
    "Roman Urdu Summary: Yeh bol kar interview start karein taake interviewer ko foran pata chal jaye ke aap sirf frontend ya simple CRUD nahi balkay financial systems aur security ke architect hain.",
    true
  );

  // ---- 2. TECH STACK ----
  addSectionHeader("2. Core Technology Stack & Why Each Tool Was Chosen");
  addParagraph("• Frontend & Framework: Next.js 15 (App Router), React 19, Tailwind CSS. Chosen for server-side security, sub-second latency, and static route optimization.");
  addParagraph("• Database & Ledger: Supabase (PostgreSQL) with Row-Level Security, Connection Pooling (Supavisor), and indexed ledger tables.");
  addParagraph("• Financial Math: Decimal.js for arbitrary-precision floating arithmetic. Eliminates IEEE 754 floating-point rounding bugs.");
  addParagraph("• Testing & Quality: Vitest test suite with 61 unit tests covering KYC, Ledger Balancing, Trading Engine, and Vault.");
  addParagraph("• Crypto & Custody: BIP-44 deterministic HD-wallet derivation, TRC20/BEP20 multi-network QR generator, and hot/cold vault segregation.");

  // ---- 3. THE 4 PILLARS ----
  addSectionHeader("3. Key Architectural Pillars to Highlight");

  addSubtitle("Pillar 1: Financial Double-Entry Accounting (No Stored Balance Column)");
  addParagraph(
    "In standard naive applications, developers maintain a mutable 'balance' column and do `balance = balance + deposit`. This leads to race conditions and balance tampering. In our system, balances are derived dynamically by summing debit and credit entries (`SUM(Credits) - SUM(Debits)`). Database-level constraint triggers enforce that every transaction is balanced (Total Debits == Total Credits) and segregated (Client funds never mix with company revenue)."
  );

  addSubtitle("Pillar 2: Arbitrary Precision Decimal Mathematics");
  addParagraph(
    "Standard JavaScript numbers fail in fintech (e.g., 0.1 + 0.2 = 0.30000000000000004). We implemented decimal string wrappers powered by Decimal.js (`moneyAdd`, `moneySubtract`, `moneyMultiply`, `moneySum`), guaranteeing zero penny loss across millions of calculations."
  );

  addSubtitle("Pillar 3: In-Memory Trading Engine & Real-Time Risk");
  addParagraph(
    "The trading engine calculates margin requirements, free equity, leverage multipliers (1:100), and live unrealized floating PnL on every market tick. Closing a trade atomically locks margin, releases equity, and logs realized PnL into the double-entry ledger."
  );

  addSubtitle("Pillar 4: Decentralized Self-Custody & Non-Custodial Vault");
  addParagraph(
    "Instead of relying on centralized exchanges (like Binance) that can freeze merchant funds, our vault implements a dual-wallet model: 90% Cold Vault (offline private key/hardware) and 10% Hot Payout Wallet. Every user receives a mathematically deterministic USDT deposit address (TRC20/BEP20)."
  );

  // ---- 4. TOP 10 INTERVIEW QUESTIONS & ANSWERS ----
  addSectionHeader("4. Top 10 Technical Interview Questions & Model Answers");

  addQA(
    "Why did you use a Double-Entry Ledger instead of a simple balance column?",
    "A simple balance column is mutable, vulnerable to concurrent update race conditions, and provides no audit history. Double-entry bookkeeping guarantees that value cannot be created out of thin air: every debit has an equal matching credit. In our PostgreSQL database, balance is derived as the sum of immutable ledger entries, providing 100% auditing and ACID transaction integrity.",
    "Interviewer ko batayein ke banking aur exchanges (jaise Stripe, Revolut, Bybit) isi model par kaam karti hain taake koi developer ya bug ghalat balance generate na kar sakay."
  );

  addQA(
    "How do you handle race conditions when two trades or withdrawals happen simultaneously?",
    "We use Database Row-Level Locking (`SELECT ... FOR UPDATE`) during order and withdrawal execution within an atomic PostgreSQL transaction. This prevents double-spending and ensures that available margin is locked sequentially before any balance is disbursed.",
    "Row-level locking se do parallel requests aik sath balance kharch nahi kar sakein gi."
  );

  addQA(
    "Why is JavaScript's default Number type unsafe for financial calculations, and how did you solve it?",
    "JavaScript uses 64-bit binary floating-point representation (IEEE 754 standard), which cannot accurately represent base-10 decimal fractions like 0.1 or 0.2. In trading, tiny rounding errors compound into large discrepancies. We solved this by using strings for all money values and performing all arithmetic through Decimal.js with 28 decimal places of precision.",
    "0.1 + 0.2 = 0.30000000000000004 wali misaal dein."
  );

  addQA(
    "How does the Crypto Deposit and Withdrawal Vault operate without third-party freeze risk?",
    "We use non-custodial HD wallet architecture. User deposit addresses are derived deterministically from a Master Public Key (xPub). Incoming deposits land directly in the company's self-custody wallet (Trust Wallet / Ledger) where private keys never touch the web server. For withdrawals, a separate low-balance Hot Wallet automatically signs payouts.",
    "Binance merchant accounts freeze ho sakti hain, lekin self-custody private keys ko koi freeze nahi kar sakta."
  );

  addQA(
    "How would you scale this system to 100,000 active users?",
    "We decouple real-time price broadcasting from database operations: live market ticks are streamed via WebSockets and in-memory pub-sub (Redis), while PostgreSQL/Supabase only handles trade opens, trade closures, and ledger settlements with connection pooling (Supavisor).",
    "Database par faltu tick data ka load nahi parta."
  );

  addQA(
    "What is Fund Segregation and how is it enforced in your database?",
    "Fund segregation is a regulatory requirement where client trading funds cannot be used for company operating expenses. We enforce this via PostgreSQL deferred constraint triggers: no transaction can move value between 'client_funds' and 'company_operating' accounts unless explicitly typed as 'fee' or 'commission'.",
    "Company ki kamai aur client ka paisa database level par alag alag rehta hai."
  );

  addQA(
    "What test coverage do you have on this project?",
    "We have 61 automated unit tests written in Vitest covering 8 distinct domains: ledger balancing, money precision math, trading engine margin calculations, KYC state transitions, auth validation, and crypto vault deposit/withdrawal flows.",
    "61 tests 100% pass hain."
  );

  addQA(
    "How does leverage work in your Gold (XAU/USD) trading engine?",
    "Leverage allows traders to open larger positions with a smaller margin requirement. At 1:100 leverage on 1 standard lot of Gold (100 oz @ $2,650 = $265,000 notional value), the required margin locked is $2,650. Floating PnL is calculated in real-time as `(Current Price - Open Price) * Lots * Contract Size`.",
    "Margin aur PnL ka exact formula interviewer ko asani se samjha saktay hain."
  );

  // Save PDF to Root
  const outputPath = path.join(__dirname, "..", "MARKET_MAKER_INTERVIEW_MASTER_GUIDE.pdf");
  const pdfBytes = doc.output("arraybuffer");
  fs.writeFileSync(outputPath, Buffer.from(pdfBytes));
  console.log("PDF created successfully at:", outputPath);
}

createInterviewGuidePDF();
