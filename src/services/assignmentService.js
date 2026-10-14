/**
 * Assignment Service
 * 
 * Responsible for assignment logic and integration with Google Sheets
 * via the deployed Google Apps Script Web App. Decoupled from UI components
 * and the Wheel animation.
 * 
 * Enforces assignment integrity:
 * - One-spin-per-team rule: Each team receives exactly one assignment.
 * - Prevents duplicate assignments on page refresh, re-spin, or repeated requests.
 * - Enforces server-side confirmation: Never ratifies an assignment unless the
 *   trusted backend has successfully recorded it.
 * - Balanced distribution: Fairly distributes assignments across the 5 problems
 *   (expected for ~10 teams, allocating ~2 teams per problem).
 * - Validates problem statements: strictly restricted to PS-01 through PS-05.
 * - Persistent registry: Saves ratified assignments so historical records are retained.
 */

import { PROBLEM_STATEMENTS, getProblemByIndex, getProblemById } from '../data/problemStatements.js';

export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycby-gwaNKBeGWrQvNFBZafjMJb1Bu5E9neZenIYv78-hF1AKC0bK0HnhuNdRaKHhdFB_SQ/exec';

const REGISTRY_STORAGE_KEY = 'aiss_assignment_registry_v1';
const ACTIVE_SESSION_KEY = 'aiss_active_session_v1';
const REGISTERED_TEAMS_STORAGE_KEY = 'aiss_registered_teams_v1';
const CLIENT_DEVICE_KEY = 'aiss_client_device_id_v1';

// In-memory fallback if storage is restricted or unavailable
const memoryRegistry = new Map();
const memoryRegisteredTeams = new Map();

/**
 * Resolves the active Apps Script Web App endpoint URL.
 * Allows override via VITE_APPS_SCRIPT_URL environment variable if configured.
 * @returns {string}
 */
export function getAppsScriptEndpoint() {
  if (typeof window !== 'undefined' && window.VITE_APPS_SCRIPT_URL) {
    return window.VITE_APPS_SCRIPT_URL;
  }
  if (
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_APPS_SCRIPT_URL
  ) {
    return import.meta.env.VITE_APPS_SCRIPT_URL;
  }
  return DEFAULT_APPS_SCRIPT_URL;
}

/**
 * Hash function to provide deterministic entropy based on team name.
 */
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generates a clean, consistent Team ID if one was not manually entered.
 * Examples:
 * - "Team 01" -> "TEAM-01"
 * - "T-04" -> "TEAM-04"
 * - "NeuralKnights" -> "TM-NEURAL-XXX"
 * 
 * @param {string} teamName
 * @returns {string}
 */
export function generateTeamId(teamName) {
  if (!teamName || typeof teamName !== 'string') return 'TEAM-01';
  const trimmed = teamName.trim();

  // Pattern 1: User typed "Team 1", "T02", "Team-03", etc.
  const prefixMatch = trimmed.match(/^(?:team|t)[\s-_]*([0-9a-z]+)/i);
  if (prefixMatch) {
    const code = prefixMatch[1].toUpperCase();
    return `TEAM-${code.length === 1 ? '0' + code : code}`;
  }

  // Pattern 2: Arbitrary team name (e.g. "NeuralKnights")
  const clean = trimmed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const slug = clean.slice(0, 6) || 'TEAM';
  const suffix = (hashString(trimmed) % 900 + 100).toString();
  return `TM-${slug}-${suffix}`;
}

/**
 * Returns a persistent client device identifier.
 * Preserves team registration identity across page reloads and browser sessions.
 * @returns {string}
 */
export function getClientDeviceId() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      let id = window.localStorage.getItem(CLIENT_DEVICE_KEY);
      if (!id) {
        id = `DEV-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
        window.localStorage.setItem(CLIENT_DEVICE_KEY, id);
      }
      return id;
    }
  } catch {
    // fallback
  }
  return 'DEV-LOCAL';
}

/**
 * Retrieves the established Team ID for a team, or generates and registers
 * a new unique Team ID if this team has not registered yet.
 *
 * Guarantees that refreshing the page, returning to registration, or repeated
 * calls will consistently return the exact same Team ID for that team.
 *
 * @param {string} teamName
 * @returns {string}
 */
export function getOrCreateTeamId(teamName) {
  if (!teamName || typeof teamName !== 'string') return 'TEAM-01';
  const cleanName = teamName.trim();
  if (!cleanName) return 'TEAM-01';
  const normalizedKey = cleanName.toLowerCase();

  // 1. Check if the team already has a ratified assignment
  const existingAssignment = getTeamAssignment(cleanName);
  if (existingAssignment?.teamId) {
    return existingAssignment.teamId;
  }

  // 2. Check registered teams registry
  const existingTeams = getRegisteredTeams();
  const matchedRegistered = existingTeams.find(
    (t) => t.teamName && t.teamName.trim().toLowerCase() === normalizedKey
  );
  if (matchedRegistered?.teamId) {
    return matchedRegistered.teamId;
  }

  // 3. Check active session state
  const activeSession = getActiveSession();
  if (
    activeSession?.teamName &&
    activeSession.teamName.trim().toLowerCase() === normalizedKey &&
    activeSession.teamId
  ) {
    return activeSession.teamId;
  }

  // 4. Generate new Team ID
  let generatedId = generateTeamId(cleanName);

  // Avoid collisions with other teams having different names
  const isIdTaken = existingTeams.some(
    (t) => t.teamId === generatedId && t.teamName?.trim().toLowerCase() !== normalizedKey
  );
  if (isIdTaken) {
    generatedId = `${generatedId}-${Math.floor(10 + Math.random() * 90)}`;
  }

  // 5. Store in registration pool immediately to guarantee future reuse
  recordTeamRegistration(cleanName, generatedId);
  return generatedId;
}

/**
 * Validates that a problem ID and title correspond strictly to one of PS-01 through PS-05.
 * 
 * @param {string} problemId
 * @param {string} problemTitle
 * @returns {{ valid: boolean, error?: string, problem?: object }}
 */
export function validateProblemAssignment(problemId, problemTitle) {
  if (!problemId || typeof problemId !== 'string') {
    return { valid: false, error: 'Problem ID is required.' };
  }

  const validIds = ['PS-01', 'PS-02', 'PS-03', 'PS-04', 'PS-05'];
  const normalizedId = problemId.trim().toUpperCase();

  if (!validIds.includes(normalizedId)) {
    return {
      valid: false,
      error: `Invalid problem ID "${problemId}". Problem ID must be one of PS-01 through PS-05.`
    };
  }

  const matchingProblem = getProblemById(normalizedId);
  if (!matchingProblem) {
    return {
      valid: false,
      error: `Problem statement with ID "${normalizedId}" was not found in finalized problem roster.`
    };
  }

  if (problemTitle && problemTitle.trim() !== matchingProblem.title.trim()) {
    return {
      valid: false,
      error: `Problem title mismatch for ${normalizedId}. Expected "${matchingProblem.title}", got "${problemTitle}".`
    };
  }

  return { valid: true, problem: matchingProblem };
}

/**
 * Retrieves the full map of team assignments from persistent storage.
 * @returns {Record<string, object>}
 */
export function getAssignmentRegistry() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(REGISTRY_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch {
    // fallback to in-memory store
  }

  const obj = {};
  for (const [k, v] of memoryRegistry.entries()) {
    obj[k] = v;
  }
  return obj;
}

/**
 * Persists an assignment record into the assignment registry.
 * Indexed by both normalized team name and team ID.
 */
export function saveAssignmentToRegistry(assignment) {
  const normalizedName = assignment.teamName.trim().toLowerCase();
  const normalizedId = assignment.teamId ? assignment.teamId.trim().toLowerCase() : null;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const registry = getAssignmentRegistry();
      registry[normalizedName] = assignment;
      if (normalizedId) {
        registry[normalizedId] = assignment;
      }
      window.localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(registry));
    }
  } catch {
    // storage unavailable
  }

  memoryRegistry.set(normalizedName, assignment);
  if (normalizedId) {
    memoryRegistry.set(normalizedId, assignment);
  }
}

/**
 * Look up an existing assignment by team name or team ID.
 * @param {string} identifier
 * @returns {object|null}
 */
export function getTeamAssignment(identifier) {
  if (!identifier || typeof identifier !== 'string') return null;
  const normalizedKey = identifier.trim().toLowerCase();
  const registry = getAssignmentRegistry();

  if (registry[normalizedKey]) return registry[normalizedKey];
  if (memoryRegistry.has(normalizedKey)) return memoryRegistry.get(normalizedKey);

  // Search across values
  for (const item of Object.values(registry)) {
    if (
      (item.teamName && item.teamName.trim().toLowerCase() === normalizedKey) ||
      (item.teamId && item.teamId.trim().toLowerCase() === normalizedKey)
    ) {
      return item;
    }
  }
  return null;
}

/**
 * Check if a team has already received an assignment.
 * @param {string} identifier
 * @returns {boolean}
 */
export function isTeamAssigned(identifier) {
  return !!getTeamAssignment(identifier);
}

/**
 * Saves the active UI session state (for preserving view on page reload).
 */
export function saveActiveSession(session) {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // ignore storage exceptions
  }
}

/**
 * Retrieves the active UI session state.
 */
export function getActiveSession() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(ACTIVE_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Clears the active UI session state (for starting over with a new team).
 * Does NOT erase historical assignments.
 */
export function clearActiveSession() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Clear all assignments (used only for development/resetting).
 */
export function clearAllAssignments() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(REGISTRY_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  memoryRegistry.clear();
}

/**
 * Selects a problem index with balanced distribution across the 5 problems.
 * Prioritizes problem statements that have the lowest assignment count in the registry.
 */
export function selectBalancedProblemIndex(teamName, totalProblems = 5) {
  const registry = getAssignmentRegistry();
  const assignments = Object.values(registry);

  // De-duplicate assignments if saved under both name and ID
  const seenIds = new Set();
  const uniqueAssignments = [];
  for (const item of assignments) {
    const key = item.assignmentId || `${item.teamName}-${item.problemIndex}`;
    if (!seenIds.has(key)) {
      seenIds.add(key);
      uniqueAssignments.push(item);
    }
  }

  // Count existing assignments per problem index
  const counts = new Array(totalProblems).fill(0);
  for (const item of uniqueAssignments) {
    if (
      typeof item.problemIndex === 'number' &&
      item.problemIndex >= 0 &&
      item.problemIndex < totalProblems
    ) {
      counts[item.problemIndex]++;
    }
  }

  // Find minimum count among all problems
  const minCount = Math.min(...counts);

  // Collect candidate problem indices that have the lowest count
  const candidates = [];
  for (let i = 0; i < totalProblems; i++) {
    if (counts[i] === minCount) {
      candidates.push(i);
    }
  }

  // Select fairly among the least-assigned problems using team name entropy
  const teamEntropy = hashString(teamName.trim().toLowerCase());
  const chosenIndex = candidates[teamEntropy % candidates.length];
  return chosenIndex;
}

/**
 * Transmits the assignment payload to the Google Apps Script Web App endpoint.
 * 
 * Browser CORS & Reliability Handling:
 * 1. Do NOT use `no-cors`: In no-cors mode, the response is opaque (status 0, body unreadable).
 *    This would violate Requirement 3 ("Show assignment success only after the server has confirmed")
 *    and Requirement 5 ("do not allow the UI to invent a successful assignment when saving fails").
 * 2. Standard CORS + Simple Request: We send `POST` with `Content-Type: text/plain;charset=utf-8`
 *    and body containing the JSON string. Because `text/plain` is a CORS-safelisted MIME type,
 *    browsers do not send an OPTIONS preflight request (which Google Apps Script does not support).
 *    Google Apps Script receives the JSON in `e.postData.contents`, processes it, and responds with
 *    a 302 redirect to `script.googleusercontent.com` which provides `Access-Control-Allow-Origin: *`.
 *    This allows the browser to read the JSON response, inspect the HTTP status code, and confirm
 *    that the row was saved.
 * 
 * @param {object} params
 * @param {string} params.teamId
 * @param {string} params.teamName
 * @param {string} params.problemId - Must be PS-01 through PS-05
 * @param {string} params.problemTitle - Exact finalized problem title
 * @param {string} [params.endpoint] - Optional custom endpoint URL
 * @returns {Promise<{ success: boolean, serverData: object }>}
 */
export async function sendAssignmentToAppsScript({
  teamId,
  teamName,
  problemId,
  problemTitle,
  endpoint
}) {
  const url = endpoint || getAppsScriptEndpoint();

  const cleanTeamId = (teamId || '').trim();
  const cleanTeamName = (teamName || '').trim();
  const cleanProblemId = (problemId || '').trim();
  const cleanProblemTitle = (problemTitle || '').trim();

  if (!cleanTeamId) {
    throw new Error('Team ID is required to record problem assignment.');
  }
  if (!cleanTeamName) {
    throw new Error('Team Name is required to record problem assignment.');
  }

  // Requirement 2: Ensure problem ID and title correspond to PS-01 through PS-05
  const validation = validateProblemAssignment(cleanProblemId, cleanProblemTitle);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const payload = {
    teamId: cleanTeamId,
    teamName: cleanTeamName,
    problemId: cleanProblemId,
    problemTitle: cleanProblemTitle
  };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
  } catch (networkErr) {
    // Network failure, DNS issue, offline, or CORS network block
    const error = new Error(
      `Network failure communicating with assignment server: ${networkErr.message}. ` +
      `Please check your internet connection.`
    );
    error.isNetworkError = true;
    error.originalError = networkErr;
    throw error;
  }

  // Handle HTTP authorization or permission errors
  if (response.status === 401 || response.status === 403) {
    const error = new Error(
      `Apps Script authorization failed (HTTP ${response.status}). ` +
      `The Google Apps Script Web App is deployed with restricted access. ` +
      `In the Apps Script editor, open "Deploy" > "Manage deployments" > Edit, ` +
      `and configure "Who has access" to "Anyone".`
    );
    error.isAuthError = true;
    error.status = response.status;
    throw error;
  }

  if (response.status === 404) {
    const error = new Error(
      `Apps Script endpoint not found (HTTP 404). ` +
      `Please verify that the deployed Web App URL is active.`
    );
    error.isNotFoundError = true;
    error.status = 404;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(
      `Assignment server returned error HTTP ${response.status} (${response.statusText || 'Unknown error'}).`
    );
    error.status = response.status;
    throw error;
  }

  // Read response text
  const responseText = await response.text();
  let serverResult;

  try {
    serverResult = JSON.parse(responseText);
  } catch {
    // If Google returned an HTML login or error page
    if (responseText.includes('accounts.google.com') || responseText.includes('ServiceLogin')) {
      const error = new Error(
        `Google Apps Script redirected to a Google login page. ` +
        `The Web App deployment must be configured with "Who has access: Anyone" so requests can be processed.`
      );
      error.isAuthError = true;
      throw error;
    }

    if (responseText.includes('Script function not found: doPost')) {
      const error = new Error(
        `Google Apps Script error: "Script function not found: doPost". ` +
        `Please ensure the doPost(e) function is defined in Code.gs and a new version is deployed.`
      );
      throw error;
    }

    const error = new Error(
      `Invalid server response format: Expected JSON but received HTML or plain text: ${responseText.slice(0, 100)}`
    );
    error.rawResponse = responseText;
    throw error;
  }

  // Check backend application-level status
  const isError =
    serverResult.status === 'error' ||
    serverResult.success === false ||
    !!serverResult.error;

  if (isError) {
    const message =
      serverResult.message ||
      serverResult.error ||
      'The server rejected the assignment request.';

    const isDuplicate =
      serverResult.alreadyAssigned === true ||
      message.toLowerCase().includes('already') ||
      message.toLowerCase().includes('duplicate');

    const err = new Error(message);
    err.isDuplicate = isDuplicate;
    err.serverData = serverResult;
    err.existingAssignment = serverResult.existingAssignment || null;
    throw err;
  }

  // Server confirmed success!
  return {
    success: true,
    serverData: serverResult
  };
}

// In-flight mutex set to prevent race conditions from concurrent duplicate requests
const inFlightRequests = new Set();

/**
 * Requests an official problem assignment for a team.
 * 
 * Enforces assignment integrity:
 * 1. Checks local cache first: if already assigned, returns existing ratified record.
 * 2. Rejects concurrent in-flight requests for the same team.
 * 3. Selects a candidate problem from PS-01 through PS-05 using balanced distribution.
 * 4. Strictly validates candidate problem ID and exact title.
 * 5. Transmits payload (teamId, teamName, problemId, problemTitle) to Apps Script Web App.
 * 6. Only saves to local persistent registry AFTER server confirms success.
 * 7. On duplicate report from server, handles gracefully without fabricating a new assignment.
 * 8. On server error or network failure, aborts cleanly with clear actionable message.
 * 
 * @param {string|object} teamArg - Either a team name string or { teamName, teamId } object
 * @param {object} [options] - Optional override parameters
 * @param {number} [options.forcedIndex] - Optional index to test a specific problem
 * @param {string} [options.endpoint] - Optional custom endpoint URL
 * @returns {Promise<object>}
 */
export async function requestProblemAssignment(teamArg, options = {}) {
  let teamName = '';
  let teamId = '';

  if (typeof teamArg === 'string') {
    teamName = teamArg;
  } else if (teamArg && typeof teamArg === 'object') {
    teamName = teamArg.teamName || '';
    teamId = teamArg.teamId || '';
  }

  const cleanName = teamName ? teamName.trim() : '';
  if (!cleanName) {
    throw new Error('Team name is required for problem assignment.');
  }

  const cleanId = teamId ? teamId.trim() : getOrCreateTeamId(cleanName);
  const normalizedKey = cleanName.toLowerCase();
  const normalizedIdKey = cleanId.toLowerCase();

  // 1. Assignment Integrity Check (Client Cache):
  // If team has already received an assignment locally, return the ratified record
  const existingAssignment =
    getTeamAssignment(cleanName) || getTeamAssignment(cleanId);
  if (existingAssignment) {
    return {
      ...existingAssignment,
      alreadyAssigned: true
    };
  }

  // Guard against concurrent repeated requests for the same team
  if (inFlightRequests.has(normalizedKey) || inFlightRequests.has(normalizedIdKey)) {
    throw new Error(`Assignment request for team "${cleanName}" (${cleanId}) is already in progress.`);
  }

  inFlightRequests.add(normalizedKey);
  inFlightRequests.add(normalizedIdKey);

  try {
    const totalProblems = PROBLEM_STATEMENTS.length;
    let targetIndex;

    if (
      typeof options.forcedIndex === 'number' &&
      options.forcedIndex >= 0 &&
      options.forcedIndex < totalProblems
    ) {
      targetIndex = options.forcedIndex;
    } else {
      // Balanced distribution algorithm across the 5 problems
      targetIndex = selectBalancedProblemIndex(cleanName, totalProblems);
    }

    const assignedProblem = getProblemByIndex(targetIndex);

    // Validate the candidate problem strictly against PS-01..PS-05
    const validation = validateProblemAssignment(assignedProblem.id, assignedProblem.title);
    if (!validation.valid) {
      throw new Error(`Integrity error: ${validation.error}`);
    }

    // 2. Transmit to trusted backend (Google Apps Script)
    // Requirement 3: Show assignment success ONLY after the server has confirmed that it was saved.
    let serverConfirmation;
    try {
      serverConfirmation = await sendAssignmentToAppsScript({
        teamId: cleanId,
        teamName: cleanName,
        problemId: assignedProblem.id,
        problemTitle: assignedProblem.title,
        endpoint: options.endpoint
      });
    } catch (backendError) {
      // If backend reports team is already assigned (Requirement 4 & 6)
      if (backendError.isDuplicate) {
        if (backendError.existingAssignment) {
          const existingProb =
            getProblemById(backendError.existingAssignment.problemId) || assignedProblem;
          const restoredRecord = {
            assignmentId:
              backendError.existingAssignment.teamId ||
              `AISS-${Date.now().toString(36).toUpperCase()}`,
            teamId: backendError.existingAssignment.teamId || cleanId,
            teamName: backendError.existingAssignment.teamName || cleanName,
            problemIndex: existingProb.index,
            problem: existingProb,
            assignedAt:
              backendError.existingAssignment.assignedAt || new Date().toISOString(),
            status: backendError.existingAssignment.status || 'Assigned',
            source: 'google_sheets_apps_script',
            alreadyAssigned: true
          };
          saveAssignmentToRegistry(restoredRecord);
          return restoredRecord;
        }

        throw new Error(
          `Backend duplicate check: Team "${cleanName}" (${cleanId}) already has an assignment recorded in Google Sheets.`,
          { cause: backendError }
        );
      }

      // Requirement 5: Do not allow the UI to invent a successful assignment when saving fails
      throw backendError;
    }

    // 3. Construct ratified assignment payload from confirmed server data
    const serverData = serverConfirmation.serverData || {};
    const confirmedData = serverData.data || serverData;

    const assignmentPayload = {
      assignmentId:
        confirmedData.assignmentId ||
        `AISS-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      teamId: cleanId,
      teamName: cleanName,
      problemIndex: targetIndex,
      problem: assignedProblem,
      assignedAt: confirmedData.assignedAt || new Date().toISOString(),
      status: confirmedData.status || 'Assigned',
      source: 'google_sheets_apps_script'
    };

    // 4. Commit to persistent registry only AFTER server has confirmed
    saveAssignmentToRegistry(assignmentPayload);

    return assignmentPayload;
  } finally {
    inFlightRequests.delete(normalizedKey);
    inFlightRequests.delete(normalizedIdKey);
  }
}

/**
 * Retrieves all registered teams from local persistent storage.
 * @returns {Array<object>}
 */
export function getRegisteredTeams() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(REGISTERED_TEAMS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {
    // fallback to in-memory map
  }

  return Array.from(memoryRegisteredTeams.values());
}

/**
 * Records a newly registered team.
 * Stored locally so we can track teams waiting to spin before they have spun.
 * 
 * @param {string} teamName
 * @param {string} [teamId]
 * @returns {object}
 */
export function recordTeamRegistration(teamName, teamId) {
  if (!teamName || typeof teamName !== 'string') return null;
  const cleanName = teamName.trim();
  const normalizedKey = cleanName.toLowerCase();

  const existingTeams = getRegisteredTeams();
  const existingIdx = existingTeams.findIndex(
    (t) =>
      (t.teamName && t.teamName.toLowerCase() === normalizedKey) ||
      (teamId && t.teamId && t.teamId.toLowerCase() === teamId.toLowerCase())
  );

  // Preserve existing teamId if already recorded for this team
  const cleanId = teamId
    ? teamId.trim()
    : existingIdx >= 0 && existingTeams[existingIdx].teamId
    ? existingTeams[existingIdx].teamId
    : generateTeamId(cleanName);

  const teamRecord = {
    teamId: cleanId,
    teamName: cleanName,
    deviceId: getClientDeviceId(),
    registeredAt: existingIdx >= 0 ? existingTeams[existingIdx].registeredAt : new Date().toISOString(),
    status: existingIdx >= 0 ? existingTeams[existingIdx].status : 'waiting_to_spin'
  };

  if (existingIdx >= 0) {
    existingTeams[existingIdx] = { ...existingTeams[existingIdx], ...teamRecord };
  } else {
    existingTeams.push(teamRecord);
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(REGISTERED_TEAMS_STORAGE_KEY, JSON.stringify(existingTeams));
    }
  } catch {
    // ignore
  }

  memoryRegisteredTeams.set(normalizedKey, teamRecord);
  return teamRecord;
}

/**
 * Updates a team's registration status (e.g. from 'waiting_to_spin' to 'assigned').
 * 
 * @param {string} identifier - teamName or teamId
 * @param {string} [status='assigned']
 */
export function updateTeamRegistrationStatus(identifier, status = 'assigned') {
  if (!identifier) return;
  const normalizedKey = identifier.toString().trim().toLowerCase();
  const existingTeams = getRegisteredTeams();

  let updated = false;
  const newTeams = existingTeams.map((t) => {
    if (
      (t.teamName && t.teamName.toLowerCase() === normalizedKey) ||
      (t.teamId && t.teamId.toLowerCase() === normalizedKey)
    ) {
      updated = true;
      return { ...t, status };
    }
    return t;
  });

  if (updated) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(REGISTERED_TEAMS_STORAGE_KEY, JSON.stringify(newTeams));
      }
    } catch {
      // ignore
    }
    for (const t of newTeams) {
      memoryRegisteredTeams.set(t.teamName.toLowerCase(), t);
    }
  }
}

/**
 * Calculates complete, de-duplicated organizer statistics.
 * 
 * Accurately prevents duplicate team counts and ensures the 5 problem statements
 * are always consistently accounted for.
 * 
 * @param {Array<object>} rawAssignments - Array of assignment objects
 * @param {Array<object>} rawRegisteredTeams - Array of registered team objects
 * @returns {object}
 */
export function calculateDashboardStats(rawAssignments = [], rawRegisteredTeams = []) {
  // 1. De-duplicate assignments by normalized team identifier
  const uniqueAssignmentsMap = new Map();
  for (const item of rawAssignments) {
    if (!item) continue;
    const name = (item.teamName || '').toString().trim();
    const id = (item.teamId || '').toString().trim();
    if (!name && !id) continue;
    
    // Normalize key: prioritize ID if present, otherwise name
    const key = (id || name).toLowerCase();
    if (!uniqueAssignmentsMap.has(key)) {
      uniqueAssignmentsMap.set(key, {
        ...item,
        teamId: id || generateTeamId(name),
        teamName: name,
        assignedAt: item.assignedAt || new Date().toISOString(),
        status: item.status || 'Assigned'
      });
    }
  }

  const uniqueAssignments = Array.from(uniqueAssignmentsMap.values());

  // 2. De-duplicate registered teams and build a combined set
  const registeredTeamsMap = new Map();
  for (const t of rawRegisteredTeams) {
    if (!t) continue;
    const name = (t.teamName || '').toString().trim();
    const id = (t.teamId || '').toString().trim();
    if (!name && !id) continue;
    const key = (id || name).toLowerCase();
    registeredTeamsMap.set(key, {
      teamId: id || generateTeamId(name),
      teamName: name,
      registeredAt: t.registeredAt || new Date().toISOString(),
      status: t.status || 'waiting_to_spin'
    });
  }

  // Ensure any team that has an assignment is also counted in the registered teams pool
  for (const a of uniqueAssignments) {
    const key = (a.teamId || a.teamName).toLowerCase();
    if (!registeredTeamsMap.has(key)) {
      registeredTeamsMap.set(key, {
        teamId: a.teamId,
        teamName: a.teamName,
        registeredAt: a.assignedAt,
        status: 'assigned'
      });
    } else {
      registeredTeamsMap.get(key).status = 'assigned';
    }
  }

  const totalRegistered = registeredTeamsMap.size;
  const totalAssigned = uniqueAssignments.length;
  const waitingToSpin = Math.max(0, totalRegistered - totalAssigned);

  // 3. Calculate assignment counts for each of the 5 problems strictly
  const problemCounts = {};
  for (const p of PROBLEM_STATEMENTS) {
    problemCounts[p.id] = {
      id: p.id,
      title: p.title,
      category: p.category,
      color: p.color,
      count: 0,
      percentage: 0
    };
  }

  for (const a of uniqueAssignments) {
    const pid = (a.problemId || a.problem?.id || '').toString().trim().toUpperCase();
    if (problemCounts[pid]) {
      problemCounts[pid].count++;
    }
  }

  for (const pid of Object.keys(problemCounts)) {
    problemCounts[pid].percentage = totalAssigned > 0
      ? Math.round((problemCounts[pid].count / totalAssigned) * 100)
      : 0;
  }

  return {
    totalRegistered,
    totalAssigned,
    waitingToSpin,
    problemCounts,
    assignments: uniqueAssignments,
    registeredTeams: Array.from(registeredTeamsMap.values())
  };
}

/**
 * Fetches dashboard data from the live Google Apps Script endpoint or falls back
 * to locally persisted data with clear status reporting.
 * 
 * @param {object} [options]
 * @param {string} [options.endpoint]
 * @returns {Promise<object>}
 */
export async function fetchLiveDashboardData(options = {}) {
  const url = options.endpoint || getAppsScriptEndpoint();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      redirect: 'follow'
    });

    if (response.ok) {
      const text = await response.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        // Not JSON
      }

      if (data && data.status === 'success' && Array.isArray(data.assignments)) {
        // Live streaming from Google Sheets successful!
        const stats = calculateDashboardStats(data.assignments, data.teams || []);
        return {
          success: true,
          source: 'google_sheets_live',
          endpoint: url,
          timestamp: data.timestamp || new Date().toISOString(),
          stats,
          message: 'Real-time data synchronized with Google Sheets'
        };
      }
    }
  } catch {
    // network or endpoint unreachable
  }

  // Graceful fallback to verified local persistent records
  const localAssignments = Object.values(getAssignmentRegistry());
  const localRegisteredTeams = getRegisteredTeams();
  const stats = calculateDashboardStats(localAssignments, localRegisteredTeams);

  return {
    success: true,
    source: 'local_storage',
    endpoint: url,
    timestamp: new Date().toISOString(),
    stats,
    message: 'Displaying locally persisted records. Live Apps Script GET streaming requires doGet update.'
  };
}

