import { useState } from 'react';
import { ArrowRight, ShieldAlert, Terminal, Layers, HelpCircle } from 'lucide-react';

export default function TeamRegistration({ onRegister, initialTeamName = '' }) {
  const [teamName, setTeamName] = useState(initialTeamName);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = teamName.trim();

    if (!trimmedName) {
      setError('Team name cannot be empty. Please enter your team name to continue.');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Team name must be at least 2 characters long.');
      return;
    }

    setError('');
    onRegister(trimmedName);
  };

  const handleInputChange = (e) => {
    setTeamName(e.target.value);
    if (touched && error) {
      if (e.target.value.trim().length >= 2) {
        setError('');
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 sm:py-10">
      {/* Hero Header Presentation */}
      <div className="text-center mb-8 sm:mb-10">
        {/* Technical Kicker */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#101216] border border-[#3A3B3A] text-[11px] font-mono uppercase tracking-widest text-[#B9B3A8] mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D9653B]"></span>
          <span>Technical Symposium // Stage 01</span>
        </div>

        <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-[#F2EEE5] mb-2">
          AI – <span className="text-[#D9653B]">Spin &amp; Solve</span>
        </h1>

        {/* Tagline with hairline accents */}
        <div className="flex items-center justify-center gap-3 my-2.5">
          <div className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-[#3A3B3A]"></div>
          <p className="font-heading text-xs sm:text-sm font-medium text-[#B9B3A8] tracking-normal">
            &ldquo;AI can build it. <span className="text-[#F2EEE5] font-semibold">You must understand it.</span>&rdquo;
          </p>
          <div className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-[#3A3B3A]"></div>
        </div>

        <p className="text-xs sm:text-sm text-[#B9B3A8] max-w-lg mx-auto leading-relaxed mt-2">
          Welcome participants! Spin the assignment wheel to unlock your team&apos;s allocated challenge.
          Use AI tools to accelerate your build, but master every architectural trade-off to defend your solution.
        </p>
      </div>

      {/* Registration Card with Architectural Details */}
      <div className="corner-marks relative rounded-xl bg-[#1D2024] border border-[#3A3B3A] p-6 sm:p-8 shadow-xl">
        {/* Top Spec Header */}
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#B9B3A8] mb-5 flex items-center justify-between border-b border-[#3A3B3A] pb-2.5">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#D9653B] rounded-full"></span>
            <span>Registration Protocol</span>
          </span>
          <span className="text-[#6F8799]">Team ID: Auto-Generated</span>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div>
            <label
              htmlFor="team-name"
              className="block font-heading text-xs uppercase tracking-wider font-semibold text-[#F2EEE5] mb-2"
            >
              Enter Your Team Name <span className="text-[#D9653B]">*</span>
            </label>
            <div className="relative">
              <input
                id="team-name"
                name="teamName"
                type="text"
                autoComplete="off"
                autoFocus
                value={teamName}
                onChange={handleInputChange}
                onBlur={() => setTouched(true)}
                placeholder="e.g. NeuralKnights, TuringForce, AlgoArchitects"
                maxLength={45}
                aria-required="true"
                aria-invalid={!!error}
                aria-describedby={error ? 'team-name-error' : 'team-name-hint'}
                className={`w-full px-4 py-3.5 rounded-lg bg-[#101216] border text-[#F2EEE5] placeholder:text-[#B9B3A8]/40 text-base font-medium transition duration-150 focus:outline-none ${
                  error
                    ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/40'
                    : 'border-[#3A3B3A] hover:border-[#6F8799]/50 focus:border-[#D9653B] focus:ring-1 focus:ring-[#D9653B]'
                }`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#B9B3A8]">
                {teamName.length}/45
              </span>
            </div>

            {error ? (
              <p
                id="team-name-error"
                role="alert"
                className="mt-2 flex items-center gap-1.5 text-xs text-rose-400 font-medium"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </p>
            ) : (
              <p id="team-name-hint" className="mt-2 text-xs text-[#B9B3A8] leading-relaxed">
                Please use your registered symposium team name. This will be stamped on your assigned problem brief.
              </p>
            )}
          </div>

          {/* Primary Continue Button in Burnt Orange */}
          <button
            type="submit"
            id="continue-button"
            className="w-full py-3.5 px-6 rounded-lg bg-[#D9653B] hover:bg-[#E27750] active:bg-[#C2552E] text-[#F2EEE5] font-heading font-semibold text-base transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99]"
          >
            <span>Continue to Spin Wheel</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Symposium Architectural Specs / Highlights */}
        <div className="mt-8 pt-6 border-t border-[#3A3B3A] grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="p-3 rounded-lg bg-[#101216] border border-[#3A3B3A] hover:border-[#6F8799]/50 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] text-[#D9653B] font-bold">[01]</span>
              <Layers className="w-3.5 h-3.5 text-[#D9653B]" />
            </div>
            <h4 className="font-heading text-xs font-semibold text-[#F2EEE5]">5 Curated Problems</h4>
            <p className="text-[11px] text-[#B9B3A8] leading-relaxed mt-1">Real-world campus utility, events, safety &amp; convenience.</p>
          </div>

          <div className="p-3 rounded-lg bg-[#101216] border border-[#3A3B3A] hover:border-[#6F8799]/50 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] text-[#6F8799] font-bold">[02]</span>
              <Terminal className="w-3.5 h-3.5 text-[#6F8799]" />
            </div>
            <h4 className="font-heading text-xs font-semibold text-[#F2EEE5]">AI-Assisted Build</h4>
            <p className="text-[11px] text-[#B9B3A8] leading-relaxed mt-1">Accelerate dev speed, but master each function and constraint.</p>
          </div>

          <div className="p-3 rounded-lg bg-[#101216] border border-[#3A3B3A] hover:border-[#6F8799]/50 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] text-[#657568] font-bold">[03]</span>
              <HelpCircle className="w-3.5 h-3.5 text-[#657568]" />
            </div>
            <h4 className="font-heading text-xs font-semibold text-[#F2EEE5]">Reasoning Defense</h4>
            <p className="text-[11px] text-[#B9B3A8] leading-relaxed mt-1">Defend your architectural trade-offs during live evaluation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
