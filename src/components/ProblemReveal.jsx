import { useState } from 'react';
import {
  FileText,
  Users,
  CheckCircle2,
  AlertTriangle,
  Brain,
  Wrench,
  Award,
  Copy,
  Check,
  Printer,
  RotateCcw,
  ExternalLink
} from 'lucide-react';

export default function ProblemReveal({ assignment, onReset }) {
  const [copied, setCopied] = useState(false);
  const problem = assignment?.problem;

  if (!problem) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-[#B9B3A8] font-['DM_Sans']">No problem statement currently assigned.</p>
        <button
          onClick={onReset}
          className="mt-4 px-5 py-2.5 bg-[#D9653B] hover:bg-[#E27750] rounded-lg text-[#F2EEE5] font-['DM_Sans'] font-semibold text-sm transition cursor-pointer"
        >
          Return to Team Registration
        </button>
      </div>
    );
  }

  const handleCopy = () => {
    const textToCopy = `
========================================
AI - SPIN & SOLVE: PROBLEM ASSIGNMENT
========================================
Assigned Team: ${assignment.teamName} ${assignment.teamId ? `[Team ID: ${assignment.teamId}]` : ''}
Assignment ID: ${assignment.assignmentId}
Assigned At: ${new Date(assignment.assignedAt).toLocaleString()}

Problem ID: ${problem.id}
Title: ${problem.title}
Category: ${problem.category}

--- PROBLEM SCENARIO ---
${problem.scenario}

--- TARGET USERS ---
${problem.targetUsers}

--- WHAT YOUR SOLUTION MUST DO ---
${problem.requiredFeatures.map((f, i) => `${i + 1}. ${f}`).join('\n')}

--- CONSTRAINTS ---
${problem.constraints.map((c) => `• ${c}`).join('\n')}

--- REASONING CHALLENGE ---
${Array.isArray(problem.reasoningChallenge)
  ? problem.reasoningChallenge.map((q) => `• ${q}`).join('\n')
  : problem.reasoningChallenge}

--- WHAT PARTICIPANTS SHOULD BE ALLOWED TO BUILD ---
${Array.isArray(problem.permittedBuild)
  ? problem.permittedBuild.map((b) => `• ${b}`).join('\n')
  : (problem.permittedBuild || problem.allowedToBuild || '')}

--- EXPECTED PROTOTYPE ---
${problem.expectedDeliverable}
========================================
`.trim();

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 sm:py-8">
      {/* Top Action & Navigation Bar (hidden on print) */}
      <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#101216] border border-[#657568]/60 text-[#657568] text-xs font-['IBM_Plex_Mono'] font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#657568]" />
            <span>Assignment Ratified</span>
          </span>
          <span className="text-xs text-[#B9B3A8] font-['IBM_Plex_Mono']">
            ID: {assignment.assignmentId}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Brief Button */}
          <button
            type="button"
            id="copy-brief-button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1D2024] hover:bg-[#252930] text-[#F2EEE5] text-xs font-['DM_Sans'] font-semibold border border-[#3A3B3A] hover:border-[#6F8799]/60 transition duration-150 cursor-pointer shadow-sm active:scale-[0.98]"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#657568]" />
                <span className="text-[#657568]">Brief Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#6F8799]" />
                <span>Copy Brief</span>
              </>
            )}
          </button>

          {/* Print / Save PDF Button */}
          <button
            type="button"
            id="print-brief-button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1D2024] hover:bg-[#252930] text-[#F2EEE5] text-xs font-['DM_Sans'] font-semibold border border-[#3A3B3A] hover:border-[#6F8799]/60 transition duration-150 cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <Printer className="w-3.5 h-3.5 text-[#6F8799]" />
            <span>Print / Save PDF</span>
          </button>

          {/* New Team Reset Button */}
          <button
            type="button"
            id="new-team-button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#D9653B] hover:bg-[#E27750] active:bg-[#C2552E] text-[#F2EEE5] text-xs font-['DM_Sans'] font-semibold transition duration-150 cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Team</span>
          </button>
        </div>
      </div>

      {/* Main Problem Brief Document Container */}
      <div className="corner-marks print-area relative rounded-xl bg-[#1D2024] border border-[#3A3B3A] p-6 sm:p-10 shadow-2xl shadow-black/50">
        {/* Document Header Banner */}
        <div className="border-b border-[#3A3B3A] pb-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded bg-[#101216] border border-[#D9653B]/60 text-[#D9653B] font-['IBM_Plex_Mono'] font-bold text-xs sm:text-sm tracking-wider">
                {problem.id}
              </span>
              <span className="px-2.5 py-1 rounded bg-[#101216] text-[#B9B3A8] text-xs font-['IBM_Plex_Mono'] border border-[#3A3B3A]">
                {problem.category}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-['DM_Sans']">
              <span className="text-[#B9B3A8]">Team Assigned:</span>
              <span className="font-bold text-[#F2EEE5] bg-[#101216] px-3 py-1 rounded border border-[#3A3B3A]">
                {assignment.teamName}
                {assignment.teamId && (
                  <span className="ml-1.5 font-['IBM_Plex_Mono'] text-[#D9653B] font-normal">
                    ({assignment.teamId})
                  </span>
                )}
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold font-['Space_Grotesk'] text-[#F2EEE5] tracking-tight mb-2 mt-4">
            {problem.title}
          </h1>

          {/* Metadata Row: Clean arrangement without Google Sheets label */}
          <div className="text-xs text-[#B9B3A8] font-['IBM_Plex_Mono'] flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
            <span>Assigned on: {new Date(assignment.assignedAt).toLocaleString()}</span>
            {assignment.status && (
              <>
                <span className="text-[#3A3B3A]">•</span>
                <span>Status: <span className="text-[#657568] font-semibold">{assignment.status}</span></span>
              </>
            )}
          </div>
        </div>

        {/* Content Flow with Visual Hierarchy (Replacing Repetitive Boxy Cards) */}
        <div className="space-y-8">
          {/* 1. SCENARIO & TARGET USERS (Open Editorial Layout) */}
          <section className="space-y-4">
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-['IBM_Plex_Mono'] text-[#D9653B] mb-2">
                <FileText className="w-4 h-4 text-[#D9653B]" />
                <span>Problem Scenario</span>
              </h3>
              <p className="text-base sm:text-lg text-[#F2EEE5] font-['DM_Sans'] leading-relaxed">
                {problem.scenario}
              </p>
            </div>

            {/* Target Users with subtle left border */}
            <div className="pt-3 border-t border-[#3A3B3A]/60 flex items-start gap-3 text-xs text-[#B9B3A8] font-['DM_Sans']">
              <Users className="w-4 h-4 text-[#6F8799] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#F2EEE5] font-['IBM_Plex_Mono'] uppercase tracking-wider text-[11px] block mb-0.5">
                  Target Users &amp; Stakeholders
                </span>
                <span className="leading-relaxed">{problem.targetUsers}</span>
              </div>
            </div>
          </section>

          {/* Fine Divider Rule */}
          <div className="h-px bg-[#3A3B3A]/80"></div>

          {/* 2. REQUIRED FEATURES & CONSTRAINTS (Two-Column Specification Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* What Your Solution Must Do */}
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-['IBM_Plex_Mono'] text-[#F2EEE5] mb-3.5 pb-2 border-b border-[#3A3B3A]/60">
                <CheckCircle2 className="w-4 h-4 text-[#D9653B]" />
                <span>What Your Solution Must Do</span>
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-[#F2EEE5] font-['DM_Sans']">
                {problem.requiredFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded bg-[#101216] border border-[#3A3B3A] text-[#D9653B] font-['IBM_Plex_Mono'] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Constraints */}
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-['IBM_Plex_Mono'] text-[#F2EEE5] mb-3.5 pb-2 border-b border-[#3A3B3A]/60">
                <AlertTriangle className="w-4 h-4 text-[#D9653B]" />
                <span>Constraints</span>
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-[#B9B3A8] font-['DM_Sans']">
                {problem.constraints.map((constraint, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D9653B] shrink-0 mt-2"></span>
                    <span className="leading-snug">{constraint}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 3. REASONING CHALLENGE (Selective Accent Panel) */}
          <div className="p-5 sm:p-6 rounded-lg bg-[#101216] border border-[#D9653B]/50 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-5 h-5 text-[#D9653B]" />
              <h3 className="text-xs font-bold uppercase tracking-wider font-['IBM_Plex_Mono'] text-[#D9653B]">
                Reasoning Challenge
              </h3>
            </div>
            <p className="text-xs text-[#B9B3A8] font-['DM_Sans'] font-medium mb-3">
              &ldquo;AI can build it. You must understand it.&rdquo; — Prepare to address these questions during evaluation:
            </p>
            <div className="p-4 rounded bg-[#171A1F] border border-[#3A3B3A] text-sm text-[#F2EEE5] font-['DM_Sans'] font-medium leading-relaxed">
              {Array.isArray(problem.reasoningChallenge) ? (
                <ul className="space-y-2.5">
                  {problem.reasoningChallenge.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="text-[#D9653B] font-bold shrink-0 mt-0.5">•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="italic">&ldquo;{problem.reasoningChallenge}&rdquo;</p>
              )}
            </div>
          </div>

          {/* 4. PERMITTED BUILD & EXPECTED DELIVERABLE (Technical Scope Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
            {/* What Participants Should Be Allowed to Build */}
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-['IBM_Plex_Mono'] text-[#657568] mb-3 pb-2 border-b border-[#3A3B3A]/60">
                <Wrench className="w-4 h-4 text-[#657568]" />
                <span>What Participants Should Be Allowed to Build</span>
              </h3>
              {Array.isArray(problem.permittedBuild) ? (
                <ul className="space-y-2.5 text-xs sm:text-sm text-[#B9B3A8] font-['DM_Sans']">
                  {problem.permittedBuild.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#657568] shrink-0 mt-2"></span>
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs sm:text-sm text-[#B9B3A8] font-['DM_Sans'] leading-relaxed">
                  {problem.permittedBuild || problem.allowedToBuild}
                </p>
              )}
            </div>

            {/* Expected Prototype */}
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-['IBM_Plex_Mono'] text-[#6F8799] mb-3 pb-2 border-b border-[#3A3B3A]/60">
                <Award className="w-4 h-4 text-[#6F8799]" />
                <span>Expected Prototype</span>
              </h3>
              <p className="text-xs sm:text-sm text-[#B9B3A8] font-['DM_Sans'] leading-relaxed">
                {problem.expectedDeliverable}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Instructions */}
        <div className="mt-8 pt-6 border-t border-[#3A3B3A] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-['DM_Sans'] text-[#B9B3A8]">
          <div>
            <span className="font-semibold text-[#F2EEE5]">Rules Reminder:</span> AI coding assistants (Copilot, Claude, Gemini, ChatGPT) are permitted, but all code must be fully explained and defended.
          </div>
          <div className="no-print">
            <button
              onClick={handlePrint}
              className="text-[#D9653B] hover:text-[#E27750] font-medium inline-flex items-center gap-1 cursor-pointer transition"
            >
              <span>Download printable brief</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
