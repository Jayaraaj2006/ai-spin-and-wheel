import { Cpu, Users, RotateCcw } from 'lucide-react';

export default function Header({
  currentStep,
  teamName,
  teamId,
  isDashboard = false,
  onToggleDashboard,
  onReset
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#3A3B3A] bg-[#171A1F]/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Event Title */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-[#101216] border border-[#3A3B3A] text-[#D9653B] shadow-sm">
            <Cpu className="w-5 h-5 text-[#D9653B]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-heading font-bold tracking-tight text-[#F2EEE5]">
                AI – Spin &amp; Solve
              </span>
              <span className="hidden xs:inline-block text-[10px] font-mono font-medium tracking-wider px-2 py-0.5 rounded bg-[#101216] text-[#D9653B] border border-[#3A3B3A]">
                SPEC-2026
              </span>
            </div>
            <p className="text-[12px] text-[#B9B3A8] font-medium hidden sm:block">
              AI can build it. You must understand it.
            </p>
          </div>
        </div>

        {/* Right Info & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Team Badge (hidden in dashboard if space is tight) */}
          {!isDashboard && teamName && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#101216] border border-[#3A3B3A] text-xs sm:text-sm">
              <Users className="w-3.5 h-3.5 text-[#D9653B]" />
              <span className="text-[#B9B3A8] hidden sm:inline font-mono text-[11px] uppercase tracking-wider">Team:</span>
              <span className="font-semibold text-[#F2EEE5] max-w-[100px] sm:max-w-[150px] truncate">
                {teamName}
              </span>
              {teamId && (
                <span className="hidden md:inline font-mono text-[11px] text-[#D9653B] bg-[#171A1F] px-1.5 py-0.5 rounded border border-[#3A3B3A]">
                  {teamId}
                </span>
              )}
            </div>
          )}

          {/* Organizer Exit Button (only rendered when in organizer dashboard view) */}
          {isDashboard && onToggleDashboard && (
            <button
              type="button"
              id="exit-dashboard-button"
              onClick={onToggleDashboard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition duration-150 cursor-pointer border bg-[#1D2024] hover:bg-[#24282F] text-[#F2EEE5] border-[#3A3B3A] hover:border-[#D9653B]/50 active:scale-[0.98]"
              title="Return to Participant View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Exit Organizer Portal</span>
            </button>
          )}

          {/* Reset / Start Over */}
          {!isDashboard && currentStep !== 'registration' && (
            <button
              onClick={onReset}
              title="Reset and register a new team"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-[#B9B3A8] hover:text-[#F2EEE5] bg-[#101216] hover:bg-[#1D2024] border border-[#3A3B3A] hover:border-[#6F8799]/50 transition duration-150 cursor-pointer active:scale-[0.98]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Start Over</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
