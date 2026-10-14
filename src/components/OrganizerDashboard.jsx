import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  RotateCw,
  Search,
  Filter,
  Download,
  AlertCircle,
  ExternalLink,
  Layers,
  ArrowLeft,
  FileSpreadsheet,
  Tag,
  Lock
} from 'lucide-react';
import { PROBLEM_STATEMENTS } from '../data/problemStatements';
import {
  fetchLiveDashboardData,
  getAppsScriptEndpoint
} from '../services/assignmentService';
import {
  isOrganizerAuthorized,
  logoutOrganizer
} from '../services/authService';
import OrganizerAuthGate from './OrganizerAuthGate';

// Coordinated 5 flat colors matching Editorial Industrial palette
const PROBLEM_COLOR_MAP = {
  'PS-01': '#415A77', // Muted Steel Blue
  'PS-02': '#6F8799', // Muted Blue-Gray
  'PS-03': '#657568', // Muted Sage
  'PS-04': '#D9653B', // Burnt Orange
  'PS-05': '#3D5A5B', // Deep Industrial Teal
};

export default function OrganizerDashboard({ onBack }) {
  const [authorized, setAuthorized] = useState(() => isOrganizerAuthorized());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataPayload, setDataPayload] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProblemFilter, setSelectedProblemFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest' | 'name'

  const endpointUrl = getAppsScriptEndpoint();

  // Manual refresh handler
  const loadData = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const result = await fetchLiveDashboardData();
      setDataPayload(result);
    } catch (err) {
      setError(err?.message || 'Failed to fetch latest organizer dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    fetchLiveDashboardData().then(
      (result) => {
        if (isMounted) {
          setDataPayload(result);
          setLoading(false);
        }
      },
      (err) => {
        if (isMounted) {
          setError(err?.message || 'Failed to fetch latest organizer dashboard data.');
          setLoading(false);
        }
      }
    );
    return () => {
      isMounted = false;
    };
  }, []);

  const stats = dataPayload?.stats || {
    totalRegistered: 0,
    totalAssigned: 0,
    waitingToSpin: 0,
    problemCounts: {},
    assignments: [],
    registeredTeams: []
  };

  // Ensure problem stats always have entries for PS-01 through PS-05
  const problemRoster = useMemo(() => {
    return PROBLEM_STATEMENTS.map((prob) => {
      const stat = stats.problemCounts[prob.id] || { count: 0, percentage: 0 };
      return {
        ...prob,
        color: PROBLEM_COLOR_MAP[prob.id] || prob.color,
        count: stat.count || 0,
        percentage: stat.percentage || 0
      };
    });
  }, [stats.problemCounts]);

  // Filter and sort assignments for the table
  const filteredAssignments = useMemo(() => {
    const list = stats.assignments || [];
    const query = searchQuery.trim().toLowerCase();

    const filtered = list.filter((item) => {
      // Problem filter
      const pid = (item.problemId || item.problem?.id || '').toUpperCase();
      if (selectedProblemFilter !== 'ALL' && pid !== selectedProblemFilter) {
        return false;
      }

      // Search query filter
      if (query) {
        const teamName = (item.teamName || '').toLowerCase();
        const teamId = (item.teamId || '').toLowerCase();
        const problemTitle = (item.problemTitle || item.problem?.title || '').toLowerCase();
        return (
          teamName.includes(query) ||
          teamId.includes(query) ||
          pid.toLowerCase().includes(query) ||
          problemTitle.includes(query)
        );
      }

      return true;
    });

    // Sort order
    return filtered.sort((a, b) => {
      if (sortOrder === 'name') {
        return (a.teamName || '').localeCompare(b.teamName || '');
      }
      const timeA = new Date(a.assignedAt || 0).getTime();
      const timeB = new Date(b.assignedAt || 0).getTime();
      if (sortOrder === 'oldest') {
        return timeA - timeB;
      }
      return timeB - timeA; // newest first
    });
  }, [stats.assignments, searchQuery, selectedProblemFilter, sortOrder]);

  // CSV Export utility
  const handleExportCSV = () => {
    const assignments = stats.assignments || [];
    if (assignments.length === 0) {
      alert('No assignments recorded yet to export.');
      return;
    }

    const headers = ['Team ID', 'Team Name', 'Problem ID', 'Problem Title', 'Assigned At', 'Status'];
    const rows = assignments.map((a) => {
      const pid = a.problemId || a.problem?.id || '';
      const title = a.problemTitle || a.problem?.title || '';
      return [
        `"${(a.teamId || '').replace(/"/g, '""')}"`,
        `"${(a.teamName || '').replace(/"/g, '""')}"`,
        `"${pid.replace(/"/g, '""')}"`,
        `"${title.replace(/"/g, '""')}"`,
        `"${(a.assignedAt || '').replace(/"/g, '""')}"`,
        `"${(a.status || 'Assigned').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ai_spin_and_solve_assignments_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formattedTimestamp = dataPayload?.timestamp
    ? new Date(dataPayload.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    : null;

  if (!authorized) {
    return <OrganizerAuthGate onAuthorized={() => setAuthorized(true)} onCancel={onBack} />;
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-4 sm:py-8 space-y-6">
      {/* Top Bar with Navigation & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#3A3B3A]">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-[#1D2024] hover:bg-[#252930] text-[#B9B3A8] hover:text-[#F2EEE5] border border-[#3A3B3A] transition cursor-pointer active:scale-[0.98]"
              title="Return to Participant View"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-[#F2EEE5] tracking-tight">
                Organizer <span className="text-[#D9653B]">Command Center</span>
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-['IBM_Plex_Mono'] font-semibold uppercase tracking-wider bg-[#101216] border border-[#3A3B3A] text-[#D9653B]">
                Live Audit
              </span>
            </div>
            <p className="text-xs font-['DM_Sans'] text-[#B9B3A8] mt-0.5">
              Real-time assignment distribution, registry synchronization &amp; team audit
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Source indicator */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101216] border border-[#3A3B3A] text-xs font-['IBM_Plex_Mono']">
            <span
              className={`w-2 h-2 rounded-full ${
                dataPayload?.source === 'google_sheets_live'
                  ? 'bg-[#657568] animate-pulse'
                  : 'bg-[#6F8799]'
              }`}
            />
            <span className="text-[#B9B3A8] font-medium text-[11px]">
              {dataPayload?.source === 'google_sheets_live'
                ? 'Google Sheets Live'
                : 'Verified Local Registry'}
            </span>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            id="refresh-dashboard-button"
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1D2024] hover:bg-[#252930] text-[#F2EEE5] border border-[#3A3B3A] hover:border-[#D9653B]/50 text-xs font-['DM_Sans'] font-semibold transition cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 text-[#D9653B] ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Fetching...' : 'Refresh Data'}</span>
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1D2024] hover:bg-[#252930] text-[#F2EEE5] border border-[#3A3B3A] text-xs font-['DM_Sans'] font-semibold transition cursor-pointer active:scale-[0.98]"
            title="Download CSV export"
          >
            <Download className="w-3.5 h-3.5 text-[#6F8799]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Sign Out / Lock Button */}
          <button
            type="button"
            id="organizer-sign-out-button"
            onClick={() => {
              logoutOrganizer();
              setAuthorized(false);
              if (onBack) onBack();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1D2024] hover:bg-rose-950/40 text-rose-300 border border-[#3A3B3A] hover:border-rose-500/40 text-xs font-['DM_Sans'] font-semibold transition cursor-pointer active:scale-[0.98]"
            title="Sign out and lock organizer dashboard"
          >
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-[#101216] border border-rose-500/40 flex items-start gap-3 text-rose-200 text-xs sm:text-sm font-['DM_Sans']">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-rose-300">Synchronization Alert</h4>
            <p className="mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => loadData(true)}
            className="px-2.5 py-1 rounded bg-rose-900/50 hover:bg-rose-800/70 text-rose-200 font-semibold text-xs transition cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4 Metric Cards (KPIs) with Architectural Accents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Registered */}
        <div className="p-5 rounded-xl bg-[#1D2024] border border-[#3A3B3A] border-t-2 border-t-[#6F8799] shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-['IBM_Plex_Mono'] font-semibold uppercase tracking-wider text-[#B9B3A8]">
              Total Registered
            </span>
            <div className="p-2 rounded-lg bg-[#101216] border border-[#3A3B3A] text-[#6F8799]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#F2EEE5] font-['IBM_Plex_Mono']">
              {loading ? '--' : stats.totalRegistered}
            </span>
            <span className="text-xs text-[#B9B3A8] font-['DM_Sans']">teams logged</span>
          </div>
          <p className="mt-2 text-[11px] text-[#B9B3A8]/70 font-['DM_Sans']">
            All teams initiated through symposium registration
          </p>
        </div>

        {/* Metric 2: Assigned Teams */}
        <div className="p-5 rounded-xl bg-[#1D2024] border border-[#3A3B3A] border-t-2 border-t-[#657568] shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-['IBM_Plex_Mono'] font-semibold uppercase tracking-wider text-[#B9B3A8]">
              Assignments Ratified
            </span>
            <div className="p-2 rounded-lg bg-[#101216] border border-[#3A3B3A] text-[#657568]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#657568] font-['IBM_Plex_Mono']">
              {loading ? '--' : stats.totalAssigned}
            </span>
            <span className="text-xs text-[#B9B3A8] font-['DM_Sans']">
              ({stats.totalRegistered > 0 ? Math.round((stats.totalAssigned / stats.totalRegistered) * 100) : 0}%)
            </span>
          </div>
          <p className="mt-2 text-[11px] text-[#B9B3A8]/70 font-['DM_Sans']">
            Confirmed saved to Google Sheets backend
          </p>
        </div>

        {/* Metric 3: Waiting to Spin */}
        <div className="p-5 rounded-xl bg-[#1D2024] border border-[#3A3B3A] border-t-2 border-t-[#D9653B] shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-['IBM_Plex_Mono'] font-semibold uppercase tracking-wider text-[#B9B3A8]">
              Waiting to Spin
            </span>
            <div className="p-2 rounded-lg bg-[#101216] border border-[#3A3B3A] text-[#D9653B]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#D9653B] font-['IBM_Plex_Mono']">
              {loading ? '--' : stats.waitingToSpin}
            </span>
            <span className="text-xs text-[#B9B3A8] font-['DM_Sans']">pending spin</span>
          </div>
          <p className="mt-2 text-[11px] text-[#B9B3A8]/70 font-['DM_Sans']">
            Registered teams yet to lock in a problem statement
          </p>
        </div>

        {/* Metric 4: Problem Statement Balance */}
        <div className="p-5 rounded-xl bg-[#1D2024] border border-[#3A3B3A] border-t-2 border-t-[#6F8799] shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-['IBM_Plex_Mono'] font-semibold uppercase tracking-wider text-[#B9B3A8]">
              Challenge Roster
            </span>
            <div className="p-2 rounded-lg bg-[#101216] border border-[#3A3B3A] text-[#6F8799]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#F2EEE5] font-['IBM_Plex_Mono']">
              5 of 5
            </span>
            <span className="text-xs text-[#B9B3A8] font-['DM_Sans']">problems active</span>
          </div>
          <p className="mt-2 text-[11px] text-[#B9B3A8]/70 font-['DM_Sans']">
            Even distribution algorithm active across wheel
          </p>
        </div>
      </div>

      {/* 5 Problem Statements Distribution Card Roster */}
      <div className="p-5 sm:p-6 rounded-xl bg-[#1D2024] border border-[#3A3B3A] shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#3A3B3A]">
          <div>
            <h3 className="text-base font-bold font-['Space_Grotesk'] text-[#F2EEE5] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#D9653B]" />
              <span>Assignment Distribution Across 5 Problem Statements</span>
            </h3>
            <p className="text-xs font-['DM_Sans'] text-[#B9B3A8] mt-0.5">
              Live count and percentage allocated per finalized symposium challenge
            </p>
          </div>
          <div className="text-xs text-[#B9B3A8] font-['IBM_Plex_Mono']">
            Total Allocated: <span className="text-[#D9653B] font-bold">{stats.totalAssigned}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          {problemRoster.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-lg bg-[#101216] border border-[#3A3B3A] flex flex-col justify-between hover:border-[#6F8799]/50 transition"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className="px-2 py-0.5 rounded font-['IBM_Plex_Mono'] font-bold text-xs text-[#F2EEE5] border border-[#101216]"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.id}
                  </span>
                  <span className="text-xl font-['IBM_Plex_Mono'] font-bold text-[#F2EEE5]">
                    {loading ? '-' : item.count}
                  </span>
                </div>
                <h4 className="text-xs font-bold font-['Space_Grotesk'] text-[#F2EEE5] line-clamp-2 leading-snug">
                  {item.title}
                </h4>
                <p className="text-[10px] font-['DM_Sans'] text-[#B9B3A8] mt-1 truncate">
                  {item.category}
                </p>
              </div>

              {/* Progress bar */}
              <div className="mt-4 pt-3 border-t border-[#3A3B3A]">
                <div className="flex items-center justify-between text-[10px] text-[#B9B3A8] font-['IBM_Plex_Mono'] mb-1">
                  <span>Share</span>
                  <span>{item.percentage}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#171A1F] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assignment Table Section */}
      <div className="rounded-xl bg-[#1D2024] border border-[#3A3B3A] shadow-xl overflow-hidden">
        {/* Table Controls Header */}
        <div className="p-4 sm:p-5 border-b border-[#3A3B3A] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold font-['Space_Grotesk'] text-[#F2EEE5] flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#657568]" />
              <span>Ratified Assignments Registry</span>
            </h3>
            <p className="text-xs font-['DM_Sans'] text-[#B9B3A8] mt-0.5">
              Verified records stored in Google Sheets worksheet <code className="text-[#D9653B] font-['IBM_Plex_Mono']">Assignments</code>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#B9B3A8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team, ID, problem..."
                className="w-full sm:w-56 pl-8 pr-3 py-1.5 rounded-lg bg-[#101216] border border-[#3A3B3A] hover:border-[#6F8799]/60 focus:border-[#D9653B] focus:ring-1 focus:ring-[#D9653B]/30 text-xs font-['DM_Sans'] text-[#F2EEE5] placeholder:text-[#B9B3A8]/50 focus:outline-none transition"
              />
            </div>

            {/* Filter by Problem Dropdown */}
            <div className="relative flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#B9B3A8] shrink-0" />
              <select
                value={selectedProblemFilter}
                onChange={(e) => setSelectedProblemFilter(e.target.value)}
                className="w-full sm:w-auto px-2.5 py-1.5 rounded-lg bg-[#101216] border border-[#3A3B3A] text-xs font-['DM_Sans'] text-[#F2EEE5] focus:border-[#D9653B] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Problems ({stats.totalAssigned})</option>
                <option value="PS-01">PS-01: Lost &amp; Found</option>
                <option value="PS-02">PS-02: Event Registration</option>
                <option value="PS-03">PS-03: Complaint Tracker</option>
                <option value="PS-04">PS-04: Canteen Pre-Order</option>
                <option value="PS-05">PS-05: Emergency Finder</option>
              </select>
            </div>

            {/* Sort order select */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full sm:w-auto px-2.5 py-1.5 rounded-lg bg-[#101216] border border-[#3A3B3A] text-xs font-['DM_Sans'] text-[#F2EEE5] focus:border-[#D9653B] focus:outline-none cursor-pointer"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="name">Sort: Team Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#3A3B3A] bg-[#101216] text-[#B9B3A8] font-['IBM_Plex_Mono'] font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Team ID</th>
                <th className="py-3 px-4">Team Name</th>
                <th className="py-3 px-4">Problem ID</th>
                <th className="py-3 px-4">Problem Title</th>
                <th className="py-3 px-4">Assigned At</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3A3B3A] font-medium">
              {loading ? (
                // Skeleton loading state
                [1, 2, 3].map((n) => (
                  <tr key={n} className="animate-pulse">
                    <td className="py-3 px-4 text-[#B9B3A8]/50 font-['IBM_Plex_Mono']">--</td>
                    <td className="py-3 px-4"><div className="h-4 w-16 bg-[#101216] rounded"></div></td>
                    <td className="py-3 px-4"><div className="h-4 w-28 bg-[#101216] rounded"></div></td>
                    <td className="py-3 px-4"><div className="h-4 w-12 bg-[#101216] rounded"></div></td>
                    <td className="py-3 px-4"><div className="h-4 w-36 bg-[#101216] rounded"></div></td>
                    <td className="py-3 px-4"><div className="h-4 w-24 bg-[#101216] rounded"></div></td>
                    <td className="py-3 px-4"><div className="h-4 w-16 bg-[#101216] rounded"></div></td>
                  </tr>
                ))
              ) : filteredAssignments.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-[#101216] border border-[#3A3B3A] flex items-center justify-center text-[#B9B3A8]">
                        <FileSpreadsheet className="w-5 h-5 text-[#657568]" />
                      </div>
                      <h4 className="text-sm font-bold font-['Space_Grotesk'] text-[#F2EEE5]">No Assignments Found</h4>
                      <p className="text-xs font-['DM_Sans'] text-[#B9B3A8] leading-relaxed">
                        {searchQuery || selectedProblemFilter !== 'ALL'
                          ? 'No recorded team assignments match the active filter criteria.'
                          : 'No team assignments have been recorded in Google Sheets yet. Teams will appear here automatically once they spin the wheel.'}
                      </p>
                      {(searchQuery || selectedProblemFilter !== 'ALL') && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedProblemFilter('ALL');
                          }}
                          className="mt-2 text-xs font-semibold text-[#D9653B] hover:text-[#E27750] cursor-pointer"
                        >
                          Clear active filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((row, idx) => {
                  const pid = (row.problemId || row.problem?.id || 'PS-01').toUpperCase();
                  const matchedProblem = PROBLEM_STATEMENTS.find((p) => p.id === pid);
                  const color = PROBLEM_COLOR_MAP[pid] || matchedProblem?.color || '#D9653B';
                  const title = row.problemTitle || row.problem?.title || matchedProblem?.title || '--';
                  const dateStr = row.assignedAt
                    ? new Date(row.assignedAt).toLocaleString()
                    : '--';

                  return (
                    <tr
                      key={row.assignmentId || `${row.teamId}-${idx}`}
                      className="hover:bg-[#20242B] transition-colors"
                    >
                      <td className="py-3 px-4 text-[#B9B3A8] font-['IBM_Plex_Mono'] text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-['IBM_Plex_Mono'] font-semibold text-[#D9653B]">
                        <span className="inline-flex items-center gap-1 bg-[#101216] px-2 py-0.5 rounded border border-[#3A3B3A]">
                          <Tag className="w-3 h-3 text-[#D9653B]" />
                          {row.teamId || '--'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#F2EEE5] font-['DM_Sans']">
                        {row.teamName}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-0.5 rounded font-['IBM_Plex_Mono'] font-bold text-[11px] text-[#F2EEE5] border border-[#101216]"
                          style={{ backgroundColor: color }}
                        >
                          {pid}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#B9B3A8] font-['DM_Sans'] max-w-xs truncate" title={title}>
                        {title}
                      </td>
                      <td className="py-3 px-4 text-[#B9B3A8] font-['IBM_Plex_Mono'] text-[11px]" title={row.assignedAt}>
                        {dateStr}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-['IBM_Plex_Mono'] font-semibold bg-[#101216] border border-[#657568]/50 text-[#657568]">
                          <CheckCircle2 className="w-3 h-3 text-[#657568]" />
                          <span>{row.status || 'Assigned'}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="p-3.5 bg-[#101216] border-t border-[#3A3B3A] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-['DM_Sans'] text-[#B9B3A8]">
          <div>
            Showing <span className="font-semibold text-[#F2EEE5]">{filteredAssignments.length}</span> of{' '}
            <span className="font-semibold text-[#F2EEE5]">{stats.totalAssigned}</span> ratified assignments
          </div>
          {formattedTimestamp && (
            <div className="text-[11px] text-[#B9B3A8] font-['IBM_Plex_Mono']">
              Last synchronized at: {formattedTimestamp}
            </div>
          )}
        </div>
      </div>

      {/* Data Architecture Transparency Box */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#101216] border border-[#3A3B3A] text-xs font-['DM_Sans'] text-[#B9B3A8] space-y-2">
        <div className="flex items-center gap-2 font-semibold text-[#F2EEE5]">
          <ExternalLink className="w-4 h-4 text-[#D9653B]" />
          <span>Google Sheets Backend Synchronization Notice</span>
        </div>
        <p className="leading-relaxed">
          The organizer dashboard connects directly to the Apps Script endpoint:
          <code className="mx-1.5 px-1.5 py-0.5 rounded bg-[#171A1F] text-[#D9653B] font-['IBM_Plex_Mono'] text-[11px] break-all border border-[#3A3B3A]">
            {endpointUrl}
          </code>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[11px]">
          <div className="p-2.5 rounded bg-[#171A1F] border border-[#3A3B3A]">
            <span className="font-bold text-[#F2EEE5]">1. Assigned Teams (Live in Sheets):</span> All teams that spun the wheel are ratified in the <span className="text-[#D9653B] font-['IBM_Plex_Mono']">Assignments</span> worksheet with columns <code className="text-[#B9B3A8]">Team ID | Team Name | Problem ID | Problem Title | Assigned At | Status</code>.
          </div>
          <div className="p-2.5 rounded bg-[#171A1F] border border-[#3A3B3A]">
            <span className="font-bold text-[#F2EEE5]">2. Waiting to Spin Teams:</span> Registered teams that have not yet spun are tracked via the client registry. To sync unspun teams across multiple devices in Google Sheets, an optional <span className="text-[#D9653B] font-['IBM_Plex_Mono']">Teams</span> worksheet can be added.
          </div>
        </div>
      </div>
    </div>
  );
}
