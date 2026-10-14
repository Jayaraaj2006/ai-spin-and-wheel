import { useState, useEffect } from 'react';
import Header from './components/Header';
import StepProgress from './components/StepProgress';
import TeamRegistration from './components/TeamRegistration';
import SpinWheel from './components/SpinWheel';
import ProblemReveal from './components/ProblemReveal';
import OrganizerDashboard from './components/OrganizerDashboard';
import { PROBLEM_STATEMENTS } from './data/problemStatements';
import {
  requestProblemAssignment,
  getTeamAssignment,
  getActiveSession,
  saveActiveSession,
  clearActiveSession,
  generateTeamId,
  getOrCreateTeamId,
  recordTeamRegistration,
  updateTeamRegistrationStatus
} from './services/assignmentService';
import { logoutOrganizer } from './services/authService';

export default function App() {
  // Initialize state with active session to preserve screen on refresh
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = getActiveSession();
    return saved?.currentStep || 'registration';
  });
  const [teamName, setTeamName] = useState(() => {
    const saved = getActiveSession();
    return saved?.teamName || '';
  });
  const [teamId, setTeamId] = useState(() => {
    const saved = getActiveSession();
    return saved?.teamId || '';
  });
  const [assignment, setAssignment] = useState(() => {
    const saved = getActiveSession();
    return saved?.assignment || null;
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Organizer Dashboard view toggle - supports both #dashboard and #organizer entry points
  const checkIsDashboardRoute = () => {
    if (typeof window !== 'undefined') {
      return window.location.hash === '#dashboard' || window.location.hash === '#organizer';
    }
    return false;
  };

  const [isDashboard, setIsDashboard] = useState(checkIsDashboardRoute);

  // Listen to hash changes (supports direct organizer entry via #organizer or #dashboard)
  useEffect(() => {
    const handleHashChange = () => {
      setIsDashboard(checkIsDashboardRoute());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleToggleDashboard = () => {
    setIsDashboard(false);
    logoutOrganizer();
    if (typeof window !== 'undefined') {
      if (window.location.hash === '#dashboard' || window.location.hash === '#organizer') {
        history.pushState('', document.title, window.location.pathname + window.location.search);
      }
    }
  };

  // Sync session state to storage whenever it changes
  useEffect(() => {
    if (teamName || currentStep !== 'registration') {
      saveActiveSession({ currentStep, teamName, teamId, assignment });
    }
  }, [currentStep, teamName, teamId, assignment]);

  /**
   * State 1 -> State 2 (or directly State 3 if already assigned):
   * Enforces assignment integrity: If the team has already completed their spin,
   * restores their ratified assignment immediately to prevent duplicate spins.
   */
  const handleRegisterTeam = (name) => {
    const trimmedName = name.trim();
    // Resolves established Team ID or generates a consistent unique Team ID automatically
    const resolvedId = getOrCreateTeamId(trimmedName);

    setTeamName(trimmedName);
    setTeamId(resolvedId);

    // Persist registration in local registry for organizer dashboard visibility
    recordTeamRegistration(trimmedName, resolvedId);

    const existingAssignment =
      getTeamAssignment(trimmedName) || getTeamAssignment(resolvedId);

    if (existingAssignment) {
      // Team has already completed their single permitted spin!
      setAssignment(existingAssignment);
      setCurrentStep('reveal');
      saveActiveSession({
        currentStep: 'reveal',
        teamName: trimmedName,
        teamId: resolvedId,
        assignment: existingAssignment
      });
    } else {
      // New team: proceed to wheel
      setAssignment(null);
      setCurrentStep('wheel');
      saveActiveSession({
        currentStep: 'wheel',
        teamName: trimmedName,
        teamId: resolvedId,
        assignment: null
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Called by the Wheel component when the user clicks "Spin".
   * Calls the decoupled assignment service to get the official assignment,
   * which then directs the wheel rotation to the assigned slice.
   */
  const handleSpinRequest = async () => {
    setIsProcessing(true);
    try {
      const activeId = teamId || getOrCreateTeamId(teamName);
      const result = await requestProblemAssignment({
        teamName,
        teamId: activeId
      });
      setAssignment(result);
      return result;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * State 2 -> State 3: Wheel finished spinning on the assigned target
   */
  const handleSpinComplete = (completedAssignment) => {
    setAssignment(completedAssignment);
    setCurrentStep('reveal');

    // Update registration status to 'assigned' in local registry
    updateTeamRegistrationStatus(
      completedAssignment.teamId || completedAssignment.teamName,
      'assigned'
    );

    saveActiveSession({
      currentStep: 'reveal',
      teamName: completedAssignment.teamName,
      teamId: completedAssignment.teamId || teamId,
      assignment: completedAssignment
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Reset / Start Over flow for registering the next team.
   * Clears active view session but preserves all recorded team assignments.
   */
  const handleReset = () => {
    if (currentStep === 'wheel' || currentStep === 'reveal') {
      const confirmReset = window.confirm(
        'Are you sure you want to register a new team? This will reset the current view.'
      );
      if (!confirmReset) return;
    }
    setTeamName('');
    setTeamId('');
    setAssignment(null);
    setCurrentStep('registration');
    clearActiveSession();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#171A1F] text-[#F2EEE5] flex flex-col font-body selection:bg-[#D9653B]/30 selection:text-[#F2EEE5]">
      {/* Background technical grid texture */}
      <div className="fixed inset-0 tech-grid-pattern pointer-events-none -z-10" />

      {/* Global Symposium Header */}
      <Header
        currentStep={currentStep}
        teamName={teamName}
        teamId={teamId}
        isDashboard={isDashboard}
        onToggleDashboard={handleToggleDashboard}
        onReset={handleReset}
      />

      {/* Main Content Area */}
      {isDashboard ? (
        <main className="flex-1 pb-12">
          <OrganizerDashboard onBack={handleToggleDashboard} />
        </main>
      ) : (
        <>
          {/* Step Progress Indicator (Participant View only) */}
          <StepProgress currentStep={currentStep} />

          {/* Main Content Area based on 3 Participant States */}
          <main className="flex-1 pb-12">
            {currentStep === 'registration' && (
              <TeamRegistration
                onRegister={handleRegisterTeam}
                initialTeamName={teamName}
              />
            )}

            {currentStep === 'wheel' && (
              <SpinWheel
                problems={PROBLEM_STATEMENTS}
                teamName={teamName}
                teamId={teamId}
                onSpinRequest={handleSpinRequest}
                onSpinComplete={handleSpinComplete}
                isProcessing={isProcessing}
              />
            )}

            {currentStep === 'reveal' && (
              <ProblemReveal
                assignment={assignment}
                onReset={handleReset}
              />
            )}
          </main>
        </>
      )}

      {/* Symposium Footer */}
      <footer className="no-print border-t border-[#3A3B3A] bg-[#101216]/90 py-6 px-4 text-center text-xs text-[#B9B3A8]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D9653B]"></span>
            <span className="font-semibold text-[#F2EEE5]">AI – Spin &amp; Solve</span>
            <span>•</span>
            <span>College Technical Symposium</span>
          </div>
          <p className="text-[#B9B3A8]">
            &ldquo;AI can build it. You must understand it.&rdquo;
          </p>
        </div>
      </footer>
    </div>
  );
}
