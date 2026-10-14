import { useState, useRef, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Disc, Volume2, VolumeX, ArrowRight } from 'lucide-react';
import { playTickSound, playChimeSound } from '../utils/sound';
import { getTeamAssignment } from '../services/assignmentService';

/**
 * Editorial Industrial Coordinated Segment Palette:
 * 5 distinct flat colors adhering to the symposium theme:
 * 0: Muted Steel Blue
 * 1: Muted Blue-Gray (#6F8799)
 * 2: Muted Sage (#657568)
 * 3: Burnt Orange (#D9653B)
 * 4: Deep Industrial Teal
 */
export const EDITORIAL_SEGMENT_COLORS = [
  '#415A77', // PS-01: Campus Lost & Found
  '#6F8799', // PS-02: Smart Event Registration
  '#657568', // PS-03: Campus Complaint Tracker
  '#D9653B', // PS-04: Smart Canteen Pre-Order System
  '#3D5A5B', // PS-05: Campus Emergency Resource Finder
];

export default function SpinWheel({
  problems,
  teamName,
  teamId,
  onSpinRequest,
  onSpinComplete,
  isProcessing = false
}) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [assignedResult, setAssignedResult] = useState(null);
  const [spinError, setSpinError] = useState('');
  const [pointerTick, setPointerTick] = useState(false);
  const spinDuration = 6000; // 6 seconds

  const currentRotationRef = useRef(0);
  const tickIntervalRef = useRef(null);
  const isSpinningRef = useRef(false);
  const hasCompletedRef = useRef(false);
  const assignedResultRef = useRef(null);
  const completionTimeoutRef = useRef(null);
  const redirectTimeoutRef = useRef(null);

  const numSegments = problems.length;
  const sliceAngle = 360 / numSegments;

  // Pre-calculate SVG slice paths and geometry
  const segments = useMemo(() => {
    const center = 250;
    const radius = 232;
    const innerRadius = 45;

    return problems.map((prob, i) => {
      const startAngle = i * sliceAngle;
      const endAngle = (i + 1) * sliceAngle;
      const midAngle = startAngle + sliceAngle / 2;

      // Convert polar coordinates (clockwise from top / 12 o'clock)
      const toRad = (deg) => ((deg - 90) * Math.PI) / 180;

      const x1 = center + radius * Math.cos(toRad(startAngle));
      const y1 = center + radius * Math.sin(toRad(startAngle));
      const x2 = center + radius * Math.cos(toRad(endAngle));
      const y2 = center + radius * Math.sin(toRad(endAngle));

      const ix1 = center + innerRadius * Math.cos(toRad(startAngle));
      const iy1 = center + innerRadius * Math.sin(toRad(startAngle));
      const ix2 = center + innerRadius * Math.cos(toRad(endAngle));
      const iy2 = center + innerRadius * Math.sin(toRad(endAngle));

      // Donut slice path
      const pathD = [
        `M ${ix1} ${iy1}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 0 1 ${x2} ${y2}`,
        `L ${ix2} ${iy2}`,
        `A ${innerRadius} ${innerRadius} 0 0 0 ${ix1} ${iy1}`,
        'Z'
      ].join(' ');

      return {
        ...prob,
        pathD,
        midAngle,
        labelAngle: midAngle,
      };
    });
  }, [problems, sliceAngle]);

  // Clean up any audio tick intervals and timeouts on unmount
  useEffect(() => {
    return () => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    };
  }, []);

  /**
   * Triggers the decoupled assignment flow:
   * 1. Asks container/service for the assignment payload.
   * 2. Calculates exact target rotation so pointer lands on assigned segment.
   * 3. Animates wheel rotation.
   */
  const handleSpinClick = async () => {
    // Prevent overlapping spins or duplicate assignment requests
    if (isSpinning || isProcessing || isSpinningRef.current) return;
    isSpinningRef.current = true;
    hasCompletedRef.current = false;

    // Check if team already has an assignment before initiating spin
    const existing = getTeamAssignment(teamName) || (teamId && getTeamAssignment(teamId));
    if (existing) {
      isSpinningRef.current = false;
      setAssignedResult(existing);
      assignedResultRef.current = existing;
      setSpinError(`Team "${teamName}" has already completed problem assignment (${existing.problem.id}). Navigating to brief...`);
      redirectTimeoutRef.current = setTimeout(() => {
        onSpinComplete(existing);
      }, 1000);
      return;
    }

    setSpinError('');
    setIsSpinning(true);

    try {
      // 1. Fetch assignment from backend service (decoupled from wheel UI)
      const assignment = await onSpinRequest();
      if (!assignment || typeof assignment.problemIndex !== 'number') {
        throw new Error('Invalid assignment received from backend service.');
      }

      // If backend reports team was already assigned, transition directly
      if (assignment.alreadyAssigned) {
        isSpinningRef.current = false;
        setIsSpinning(false);
        setAssignedResult(assignment);
        assignedResultRef.current = assignment;
        setSpinError(`Team "${teamName}" already has an assigned challenge (${assignment.problem.id}). Navigating to brief...`);
        redirectTimeoutRef.current = setTimeout(() => {
          onSpinComplete(assignment);
        }, 1000);
        return;
      }

      setAssignedResult(assignment);
      assignedResultRef.current = assignment;
      const targetIndex = assignment.problemIndex;

      // 2. Compute exact target rotation
      // Center of segment targetIndex is at: targetIndex * sliceAngle + sliceAngle / 2 degrees clockwise from 12 o'clock
      const midAngle = targetIndex * sliceAngle + sliceAngle / 2;
      const baseLandingAngle = (360 - (midAngle % 360) + 360) % 360;

      const current = currentRotationRef.current;
      const currentMod = ((current % 360) + 360) % 360;
      let forwardDelta = (baseLandingAngle - currentMod + 360) % 360;
      if (forwardDelta < 60) {
        forwardDelta += 360; // ensure satisfying forward sweep
      }

      // Add 7 full revolutions (2520 deg) for a dramatic spin
      const fullRevolutions = 360 * 7;
      const nextTotalRotation = current + fullRevolutions + forwardDelta;

      currentRotationRef.current = nextTotalRotation;
      setRotation(nextTotalRotation);

      // 3. Audio & pointer ticker simulation
      if (soundEnabled) {
        let tickCount = 0;
        const totalTicks = 32;
        if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = setInterval(() => {
          tickCount++;
          playTickSound();
          setPointerTick((prev) => !prev);
          if (tickCount >= totalTicks) {
            clearInterval(tickIntervalRef.current);
          }
        }, 150);
      }
    } catch (err) {
      setSpinError(err?.message || 'Failed to retrieve assignment from server.');
      isSpinningRef.current = false;
      setIsSpinning(false);
    }
  };

  /**
   * Called when the wheel SVG's CSS transition completes.
   *
   * STRICT GUARD:
   * 1. e.target === e.currentTarget (ensures event originated on the SVG wheel itself)
   * 2. e.propertyName === 'transform' (ensures event was rotation, not opacity or other styles)
   * 3. isSpinningRef.current is true (ensures a spin was actively in progress)
   * 4. hasCompletedRef.current is false (prevents double execution)
   */
  const handleTransitionEnd = (e) => {
    if (!e || e.target !== e.currentTarget) return;
    if (e.propertyName !== 'transform') return;
    if (!isSpinningRef.current) return;
    if (hasCompletedRef.current) return;

    hasCompletedRef.current = true;
    isSpinningRef.current = false;
    setIsSpinning(false);
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);

    if (soundEnabled) {
      playChimeSound();
    }

    // Celebrate with confetti using Editorial Industrial palette
    confetti({
      particleCount: 85,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#D9653B', '#6F8799', '#657568', '#F2EEE5', '#1D2024']
    });

    const finalResult = assignedResultRef.current || assignedResult;

    // Notify container after brief highlight pause
    completionTimeoutRef.current = setTimeout(() => {
      if (finalResult) {
        onSpinComplete(finalResult);
      }
    }, 1400);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 sm:py-6 flex flex-col items-center">
      {/* Team Header banner */}
      <div className="text-center mb-4 sm:mb-6">
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-md bg-[#1D2024] border border-[#3A3B3A] text-xs font-['DM_Sans'] text-[#B9B3A8] mb-2.5">
          <span className="text-[#B9B3A8]">Active Team:</span>
          <span className="font-bold text-[#F2EEE5]">{teamName}</span>
          {teamId && (
            <span className="font-['IBM_Plex_Mono'] text-xs text-[#D9653B] bg-[#101216] px-2 py-0.5 rounded border border-[#3A3B3A]">
              ID: {teamId}
            </span>
          )}
        </div>
        <h2 className="text-2xl sm:text-4xl font-bold font-['Space_Grotesk'] text-[#F2EEE5] tracking-tight">
          Spin for Your <span className="text-[#D9653B]">Problem Statement</span>
        </h2>
        <p className="text-xs sm:text-sm font-['DM_Sans'] text-[#B9B3A8] max-w-md mx-auto mt-1">
          {problems.length} curated challenges on the wheel. Click &ldquo;Spin the Wheel&rdquo; to lock in your assignment.
        </p>
      </div>

      {/* Wheel Area Wrapper */}
      <div className="relative flex flex-col items-center justify-center my-2">
        {/* Distinctive Precision Pointer Needle at Top */}
        <div className="relative z-30 -mb-5 flex flex-col items-center pointer-events-none">
          <div
            className={`w-8 h-11 transition-transform duration-75 origin-top filter drop-shadow-md ${
              pointerTick ? 'rotate-[-6deg] scale-105' : 'rotate-0'
            }`}
          >
            <svg viewBox="0 0 32 44" className="w-full h-full">
              <defs>
                <filter id="pointerShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#101216" floodOpacity="0.8" />
                </filter>
              </defs>
              {/* Precision Triangular Indicator */}
              <polygon
                points="16,42 4,8 28,8"
                fill="#D9653B"
                stroke="#101216"
                strokeWidth="2"
                strokeLinejoin="round"
                filter="url(#pointerShadow)"
              />
              {/* Axial Centerline Indicator */}
              <line x1="16" y1="9" x2="16" y2="38" stroke="#101216" strokeWidth="1.5" strokeDasharray="3 2" />
              {/* Top Mounting Block */}
              <rect x="6" y="2" width="20" height="7" rx="1.5" fill="#1D2024" stroke="#3A3B3A" strokeWidth="1" />
              <circle cx="9" cy="5.5" r="1" fill="#B9B3A8" />
              <circle cx="23" cy="5.5" r="1" fill="#B9B3A8" />
              {/* Precision Center Pivot Jewel */}
              <circle cx="16" cy="14" r="3" fill="#F2EEE5" stroke="#101216" strokeWidth="1" />
              <circle cx="16" cy="14" r="1.5" fill="#D9653B" />
            </svg>
          </div>
        </div>

        {/* Outer Wheel Container */}
        <div className="relative p-2.5 sm:p-3.5 rounded-full bg-[#1D2024] border-2 border-[#3A3B3A] shadow-2xl shadow-black/60">
          {/* Wheel SVG */}
          <div className="w-[310px] h-[310px] xs:w-[350px] xs:h-[350px] sm:w-[420px] sm:h-[420px] md:w-[450px] md:h-[450px] relative">
            <svg
              viewBox="0 0 500 500"
              className="w-full h-full transform will-change-transform"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning
                  ? `transform ${spinDuration}ms cubic-bezier(0.12, 0.9, 0.22, 1)`
                  : 'none'
              }}
              onTransitionEnd={handleTransitionEnd}
            >
              {/* Background circular plate */}
              <circle cx="250" cy="250" r="248" fill="#101216" stroke="#3A3B3A" strokeWidth="2.5" />
              <circle cx="250" cy="250" r="236" fill="none" stroke="#2B2D31" strokeWidth="1" strokeDasharray="3 3" />

              {/* Engineering Dial Calibration Measurement Ticks (Every 10 degrees) */}
              {Array.from({ length: 36 }).map((_, i) => {
                const angle = (i * 10 * Math.PI) / 180;
                const isSegmentBorder = i % (36 / numSegments) === 0;
                const r1 = 247;
                const r2 = isSegmentBorder ? 236 : 241;
                const x1 = 250 + r1 * Math.sin(angle);
                const y1 = 250 - r1 * Math.cos(angle);
                const x2 = 250 + r2 * Math.sin(angle);
                const y2 = 250 - r2 * Math.cos(angle);
                return (
                  <line
                    key={`meas-tick-${i}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isSegmentBorder ? '#D9653B' : '#3A3B3A'}
                    strokeWidth={isSegmentBorder ? '1.5' : '1'}
                  />
                );
              })}

              {/* Wheel Slices */}
              {segments.map((seg, idx) => {
                const isBottomHalf = seg.midAngle > 90 && seg.midAngle < 270;
                const rotationAngle = isBottomHalf ? seg.midAngle - 180 : seg.midAngle;
                const badgeY = isBottomHalf ? 455 : 45;
                const badgeTextY = isBottomHalf ? 459 : 49;
                const titleY = isBottomHalf ? 418 : 82;
                const sliceColor = EDITORIAL_SEGMENT_COLORS[idx % EDITORIAL_SEGMENT_COLORS.length];

                return (
                  <g key={seg.id} className="cursor-default">
                    {/* Slice Wedge with crisp separation */}
                    <path
                      d={seg.pathD}
                      fill={sliceColor}
                      stroke="#101216"
                      strokeWidth="2.5"
                    />

                    {/* Perfectly oriented text label */}
                    <g transform={`rotate(${rotationAngle} 250 250)`}>
                      {/* Problem Index Pill */}
                      <circle
                        cx="250"
                        cy={badgeY}
                        r="12.5"
                        fill="#101216"
                        stroke="#3A3B3A"
                        strokeWidth="1.5"
                      />
                      <text
                        x="250"
                        y={badgeTextY}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#F2EEE5"
                        fontSize="11"
                        fontWeight="700"
                        fontFamily="'IBM Plex Mono', monospace"
                        className="select-none"
                      >
                        {idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`}
                      </text>

                      {/* Short Title on Slice */}
                      <text
                        x="250"
                        y={titleY}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#F2EEE5"
                        fontSize="12.5"
                        fontWeight="700"
                        fontFamily="'Space Grotesk', sans-serif"
                        letterSpacing="0.02em"
                        className="select-none tracking-wide"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(16,18,22,0.95))',
                        }}
                      >
                        {seg.shortTitle}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Outer Ring Rim Accents (Precision Rivets) */}
              {segments.map((seg, idx) => {
                const angle = (idx * sliceAngle * Math.PI) / 180;
                const bx = 250 + 242 * Math.sin(angle);
                const by = 250 - 242 * Math.cos(angle);
                return (
                  <g key={`rivet-${idx}`}>
                    <circle
                      cx={bx}
                      cy={by}
                      r="4.5"
                      fill="#1D2024"
                      stroke="#3A3B3A"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={bx}
                      cy={by}
                      r="1.5"
                      fill="#D9653B"
                    />
                  </g>
                );
              })}

              {/* Inner Center Hub - Industrial Precision Lathe Cap */}
              <circle
                cx="250"
                cy="250"
                r="46"
                fill="#1D2024"
                stroke="#3A3B3A"
                strokeWidth="2.5"
              />
              {/* Concentric Lathe Groove */}
              <circle cx="250" cy="250" r="41" fill="none" stroke="#2B2D31" strokeWidth="1" />
              <circle
                cx="250"
                cy="250"
                r="36"
                fill="#101216"
                stroke="#D9653B"
                strokeWidth="1.5"
              />
              <text
                x="250"
                y="245"
                textAnchor="middle"
                fill="#F2EEE5"
                fontSize="12.5"
                fontWeight="800"
                fontFamily="'Space Grotesk', sans-serif"
                letterSpacing="2px"
              >
                AI
              </text>
              <text
                x="250"
                y="261"
                textAnchor="middle"
                fill="#D9653B"
                fontSize="9.5"
                fontWeight="700"
                fontFamily="'IBM Plex Mono', monospace"
                letterSpacing="1.5px"
              >
                SPIN
              </text>
            </svg>
          </div>
        </div>
      </div>

      {/* Control Actions & Status */}
      <div className="w-full max-w-md mt-6 flex flex-col items-center gap-3">
        {/* Spin Error Feedback */}
        {spinError && (
          <div className="w-full p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs text-center font-['DM_Sans']">
            {spinError}
          </div>
        )}

        {/* Spin Wheel Button */}
        <button
          type="button"
          id="spin-button"
          onClick={handleSpinClick}
          disabled={isSpinning || isProcessing}
          className={`w-full py-4 px-8 rounded-xl font-['Space_Grotesk'] font-bold text-base sm:text-lg tracking-wide uppercase shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-3 ${
            isSpinning || isProcessing
              ? 'bg-[#1D2024] text-[#B9B3A8]/50 border border-[#3A3B3A] cursor-not-allowed'
              : 'bg-[#D9653B] hover:bg-[#E27750] active:bg-[#C2552E] text-[#F2EEE5] border border-[#E27750]/50 shadow-black/40 hover:shadow-xl active:scale-[0.99]'
          }`}
        >
          <Disc className={`w-5 h-5 ${isSpinning ? 'animate-spin text-[#D9653B]' : 'text-[#F2EEE5]'}`} />
          <span>{isSpinning ? 'Determining Challenge...' : 'Spin the Wheel'}</span>
          {!isSpinning && <Sparkles className="w-4 h-4 text-[#F2EEE5]/90" />}
        </button>

        {/* Wheel Options Bar */}
        <div className="w-full flex items-center justify-between text-xs text-[#B9B3A8] px-1 pt-1">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1D2024] border border-[#3A3B3A] hover:border-[#6F8799]/50 text-[#B9B3A8] hover:text-[#F2EEE5] transition cursor-pointer font-['IBM_Plex_Mono'] text-xs active:scale-[0.98]"
            title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#D9653B]" />
                <span>Audio Ticks ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-[#6F8799]" />
                <span>Audio Muted</span>
              </>
            )}
          </button>

          <span className="text-[11px] text-[#6F8799] font-['IBM_Plex_Mono']">
            {numSegments} equal {Math.round(sliceAngle)}° segments
          </span>
        </div>

        {/* Spinning Active Message */}
        {isSpinning && (
          <div className="mt-2 text-center">
            <p className="text-xs sm:text-sm font-semibold font-['Space_Grotesk'] text-[#F2EEE5] animate-pulse">
              Allocating challenge for Team {teamName}...
            </p>
            <p className="text-[11px] font-['IBM_Plex_Mono'] text-[#B9B3A8] mt-0.5">
              Synchronizing with backend assignment registry
            </p>
          </div>
        )}

        {/* Result Preview (if completed and waiting to transition) */}
        {assignedResult && !isSpinning && (
          <div className="w-full mt-3 p-4 rounded-xl bg-[#1D2024] border border-[#3A3B3A] text-center shadow-lg">
            <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-['IBM_Plex_Mono'] font-bold uppercase tracking-wider text-[#D9653B] bg-[#101216] border border-[#3A3B3A] mb-1.5">
              Challenge Locked In
            </span>
            <h4 className="text-base sm:text-lg font-bold font-['Space_Grotesk'] text-[#F2EEE5]">
              [{assignedResult.problem.id}] {assignedResult.problem.title}
            </h4>
            <button
              onClick={() => onSpinComplete(assignedResult)}
              className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D9653B] hover:bg-[#E27750] text-[#F2EEE5] font-['DM_Sans'] font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md active:scale-[0.98]"
            >
              <span>View Full Problem Brief</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Legend / Quick Overview of all problems */}
      <div className="w-full mt-8 pt-6 border-t border-[#3A3B3A]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider font-['IBM_Plex_Mono'] text-[#B9B3A8]">
            Wheel Segment Roster ({problems.length} Problems)
          </h3>
          <span className="text-[11px] font-['IBM_Plex_Mono'] text-[#6F8799]">
            1 per team • non-repeatable
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          {problems.map((p, idx) => {
            const isAssigned = assignedResult?.problemIndex === idx && !isSpinning;
            const segColor = EDITORIAL_SEGMENT_COLORS[idx % EDITORIAL_SEGMENT_COLORS.length];
            return (
              <div
                key={p.id}
                className={`p-2.5 rounded-lg border text-xs transition-colors flex items-center gap-2.5 ${
                  isAssigned
                    ? 'bg-[#1D2024] border-2 border-[#D9653B] text-[#F2EEE5] shadow-lg shadow-black/40'
                    : 'bg-[#1D2024] border-[#3A3B3A] hover:border-[#6F8799]/50 text-[#B9B3A8]'
                }`}
              >
                <span
                  className="w-6 h-6 rounded flex items-center justify-center font-['IBM_Plex_Mono'] font-bold text-[10px] text-[#F2EEE5] shrink-0 border border-[#101216]"
                  style={{ backgroundColor: segColor }}
                >
                  {p.id.replace('PS-', '')}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="truncate block font-['DM_Sans'] text-xs font-medium text-[#F2EEE5]" title={p.title}>
                    {p.shortTitle}
                  </span>
                  <span className="block font-['IBM_Plex_Mono'] text-[10px] text-[#6F8799]">
                    {p.id}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
