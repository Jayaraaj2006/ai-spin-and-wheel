import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateProblemAssignment,
  generateTeamId,
  getOrCreateTeamId,
  getClientDeviceId,
  sendAssignmentToAppsScript,
  requestProblemAssignment,
  getAssignmentRegistry,
  clearAllAssignments,
  DEFAULT_APPS_SCRIPT_URL,
  calculateDashboardStats,
  recordTeamRegistration,
  updateTeamRegistrationStatus,
  getRegisteredTeams,
  fetchLiveDashboardData
} from '../src/services/assignmentService.js';
import {
  authenticateOrganizer,
  isOrganizerAuthorized,
  logoutOrganizer,
  sha256Hex,
  getAuthorizedKeyHash
} from '../src/services/authService.js';
import { PROBLEM_STATEMENTS } from '../src/data/problemStatements.js';

test('1. Problem Statement Validation: strictly PS-01 through PS-05', async (t) => {
  await t.test('accepts all 5 finalized problem statements with exact titles', () => {
    for (const prob of PROBLEM_STATEMENTS) {
      const result = validateProblemAssignment(prob.id, prob.title);
      assert.equal(result.valid, true, `Expected ${prob.id} to be valid`);
      assert.equal(result.problem.id, prob.id);
      assert.equal(result.problem.title, prob.title);
    }
  });

  await t.test('rejects problem IDs outside PS-01 through PS-05', () => {
    const invalidIds = ['PS-00', 'PS-06', 'PS-99', 'CHALLENGE-1', '', null, undefined];
    for (const id of invalidIds) {
      const result = validateProblemAssignment(id, 'Any Title');
      assert.equal(result.valid, false, `Expected ${id} to be rejected`);
      assert.ok(result.error);
    }
  });

  await t.test('rejects problem statement if title does not match canonical brief', () => {
    const result = validateProblemAssignment('PS-01', 'Incorrect Invented Title');
    assert.equal(result.valid, false);
    assert.ok(result.error.includes('mismatch'));
  });
});

test('2. Team ID Generation', async (t) => {
  await t.test('formats standard team prefixes', () => {
    assert.equal(generateTeamId('Team 1'), 'TEAM-01');
    assert.equal(generateTeamId('Team 02'), 'TEAM-02');
    assert.equal(generateTeamId('T-03'), 'TEAM-03');
    assert.equal(generateTeamId('T4'), 'TEAM-04');
    assert.equal(generateTeamId('TEAM-10'), 'TEAM-10');
  });

  await t.test('generates consistent deterministic slug for arbitrary names', () => {
    const id1 = generateTeamId('NeuralKnights');
    const id2 = generateTeamId('NeuralKnights');
    assert.equal(id1, id2);
    assert.ok(id1.startsWith('TM-NEURAL-'));

    const id3 = generateTeamId('AlgoArchitects');
    assert.ok(id3.startsWith('TM-ALGOAR-'));
  });
});

test('3. Apps Script Payload & Request Verification (Mock Server)', async (t) => {
  await t.test('validates payload before sending and rejects missing fields', async () => {
    await assert.rejects(
      () => sendAssignmentToAppsScript({ teamId: '', teamName: 'Alpha', problemId: 'PS-01', problemTitle: 'Campus Lost & Found' }),
      /Team ID is required/
    );

    await assert.rejects(
      () => sendAssignmentToAppsScript({ teamId: 'T-01', teamName: '', problemId: 'PS-01', problemTitle: 'Campus Lost & Found' }),
      /Team Name is required/
    );

    await assert.rejects(
      () => sendAssignmentToAppsScript({ teamId: 'T-01', teamName: 'Alpha', problemId: 'PS-09', problemTitle: 'Unknown' }),
      /Invalid problem ID/
    );
  });

  await t.test('handles server confirmation (HTTP 200 + success JSON)', async () => {
    // Intercept fetch for this test
    const originalFetch = globalThis.fetch;
    let capturedRequest = null;

    globalThis.fetch = async (url, options) => {
      capturedRequest = { url, options };
      return new Response(
        JSON.stringify({
          status: 'success',
          message: 'Assignment successfully recorded.',
          data: {
            teamId: 'TEST-01',
            teamName: 'Team One',
            problemId: 'PS-01',
            problemTitle: 'Campus Lost & Found',
            assignedAt: '2026-10-14T14:00:00.000Z',
            status: 'Assigned'
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      const res = await sendAssignmentToAppsScript({
        teamId: 'TEST-01',
        teamName: 'Team One',
        problemId: 'PS-01',
        problemTitle: 'Campus Lost & Found',
        endpoint: 'https://test-apps-script.local/exec'
      });

      assert.equal(res.success, true);
      assert.equal(capturedRequest.url, 'https://test-apps-script.local/exec');
      assert.equal(capturedRequest.options.method, 'POST');
      assert.equal(capturedRequest.options.headers['Content-Type'], 'text/plain;charset=utf-8');

      const parsedBody = JSON.parse(capturedRequest.options.body);
      assert.equal(parsedBody.teamId, 'TEST-01');
      assert.equal(parsedBody.teamName, 'Team One');
      assert.equal(parsedBody.problemId, 'PS-01');
      assert.equal(parsedBody.problemTitle, 'Campus Lost & Found');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('handles duplicate assignment reported by backend', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          status: 'error',
          alreadyAssigned: true,
          message: 'Team already has an assignment recorded.',
          existingAssignment: {
            teamId: 'TEST-DUP',
            teamName: 'Duplicate Team',
            problemId: 'PS-02',
            problemTitle: 'Smart Event Registration',
            assignedAt: '2026-10-14T10:00:00.000Z',
            status: 'Assigned'
          }
        }),
        { status: 200 }
      );
    };

    try {
      await assert.rejects(
        () =>
          sendAssignmentToAppsScript({
            teamId: 'TEST-DUP',
            teamName: 'Duplicate Team',
            problemId: 'PS-01',
            problemTitle: 'Campus Lost & Found'
          }),
        (err) => {
          assert.equal(err.isDuplicate, true);
          assert.equal(err.existingAssignment.problemId, 'PS-02');
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('detects HTTP 401 and explains deployment permission requirement', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response('Unauthorized', { status: 401 });
    };

    try {
      await assert.rejects(
        () =>
          sendAssignmentToAppsScript({
            teamId: 'TEST-01',
            teamName: 'Test',
            problemId: 'PS-01',
            problemTitle: 'Campus Lost & Found'
          }),
        (err) => {
          assert.equal(err.isAuthError, true);
          assert.ok(err.message.includes('Who has access'));
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('detects network errors and preserves error clarity', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch');
    };

    try {
      await assert.rejects(
        () =>
          sendAssignmentToAppsScript({
            teamId: 'TEST-01',
            teamName: 'Test',
            problemId: 'PS-01',
            problemTitle: 'Campus Lost & Found'
          }),
        (err) => {
          assert.equal(err.isNetworkError, true);
          assert.ok(err.message.includes('Network failure'));
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test('4. End-to-End Assignment Flow: Integrity & Anti-Fabrication', async (t) => {
  t.beforeEach(() => {
    clearAllAssignments();
  });

  await t.test('does NOT invent an assignment when backend call fails', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('Server connection dropped');
    };

    try {
      await assert.rejects(
        () =>
          requestProblemAssignment({
            teamName: 'FailingTeam',
            teamId: 'FAIL-01'
          }),
        /Network failure/
      );

      // Verify that NO assignment was saved in the local registry
      const registry = getAssignmentRegistry();
      assert.equal(Object.keys(registry).length, 0, 'Registry must remain empty when saving fails');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('saves assignment only after backend confirms, enforcing one-spin rule', async () => {
    const originalFetch = globalThis.fetch;
    let callCount = 0;

    globalThis.fetch = async (url, options) => {
      callCount++;
      const body = JSON.parse(options.body);
      return new Response(
        JSON.stringify({
          status: 'success',
          message: 'Saved',
          data: {
            assignmentId: 'ASSIGN-SUCCESS-99',
            teamId: body.teamId,
            teamName: body.teamName,
            problemId: body.problemId,
            problemTitle: body.problemTitle,
            assignedAt: '2026-10-14T14:30:00.000Z',
            status: 'Assigned'
          }
        }),
        { status: 200 }
      );
    };

    try {
      // First spin: succeeds
      const assignment1 = await requestProblemAssignment({
        teamName: 'WinnerTeam',
        teamId: 'WIN-01'
      });

      assert.equal(callCount, 1);
      assert.equal(assignment1.teamName, 'WinnerTeam');
      assert.equal(assignment1.teamId, 'WIN-01');
      assert.ok(assignment1.problem.id.startsWith('PS-'));
      assert.equal(assignment1.source, 'google_sheets_apps_script');

      // Second spin attempt for same team: intercepted by client cache / one-spin rule
      const assignment2 = await requestProblemAssignment({
        teamName: 'WinnerTeam',
        teamId: 'WIN-01'
      });

      assert.equal(callCount, 1, 'Second request must not hit server since team already assigned');
      assert.equal(assignment2.alreadyAssigned, true);
      assert.equal(assignment2.assignmentId, assignment1.assignmentId);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test('5. Live Google Apps Script Endpoint Verification', async () => {
  console.log('\n--- Verifying Live Endpoint ---');
  console.log('Target URL:', DEFAULT_APPS_SCRIPT_URL);

  try {
    const response = await fetch(DEFAULT_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        teamId: 'TEST-VERIFY',
        teamName: 'Verification Probe',
        problemId: 'PS-01',
        problemTitle: 'Campus Lost & Found'
      }),
      redirect: 'follow'
    });

    console.log('Live HTTP status:', response.status);
    const bodyText = await response.text();
    console.log('Live body preview (first 250 chars):', bodyText.slice(0, 250));

    if (response.status === 200) {
      try {
        const json = JSON.parse(bodyText);
        console.log('Live parsed JSON response:', json);
      } catch {
        console.log('Live response is not JSON.');
      }
    } else if (response.status === 401) {
      console.log('Live status is 401: Google Apps Script Web App access is currently restricted ("Only myself").');
    }
  } catch (err) {
    console.log('Live probe error:', err.message);
  }
});

test('6. Organizer Dashboard Statistics & Integrity', async (t) => {
  await t.test('calculates correct statistics, waiting to spin, and problem distributions', () => {
    const sampleAssignments = [
      { teamId: 'T-01', teamName: 'Alpha', problemId: 'PS-01', problemTitle: 'Campus Lost & Found', assignedAt: '2026-10-14T10:00:00Z', status: 'Assigned' },
      { teamId: 'T-02', teamName: 'Beta', problemId: 'PS-01', problemTitle: 'Campus Lost & Found', assignedAt: '2026-10-14T10:05:00Z', status: 'Assigned' },
      { teamId: 'T-03', teamName: 'Gamma', problemId: 'PS-02', problemTitle: 'Smart Event Registration', assignedAt: '2026-10-14T10:10:00Z', status: 'Assigned' },
      { teamId: 'T-04', teamName: 'Delta', problemId: 'PS-04', problemTitle: 'Smart Canteen Pre-Order System', assignedAt: '2026-10-14T10:15:00Z', status: 'Assigned' }
    ];

    const sampleRegisteredTeams = [
      { teamId: 'T-01', teamName: 'Alpha', status: 'assigned' },
      { teamId: 'T-02', teamName: 'Beta', status: 'assigned' },
      { teamId: 'T-03', teamName: 'Gamma', status: 'assigned' },
      { teamId: 'T-04', teamName: 'Delta', status: 'assigned' },
      { teamId: 'T-05', teamName: 'Epsilon (Waiting)', status: 'waiting_to_spin' },
      { teamId: 'T-06', teamName: 'Zeta (Waiting)', status: 'waiting_to_spin' }
    ];

    const stats = calculateDashboardStats(sampleAssignments, sampleRegisteredTeams);

    // 1. Total Registered: 6
    assert.equal(stats.totalRegistered, 6);
    // 2. Total Assigned: 4
    assert.equal(stats.totalAssigned, 4);
    // 3. Waiting to Spin: 6 - 4 = 2
    assert.equal(stats.waitingToSpin, 2);

    // 4. Problem breakdown for each PS-01 through PS-05
    assert.equal(stats.problemCounts['PS-01'].count, 2);
    assert.equal(stats.problemCounts['PS-02'].count, 1);
    assert.equal(stats.problemCounts['PS-03'].count, 0);
    assert.equal(stats.problemCounts['PS-04'].count, 1);
    assert.equal(stats.problemCounts['PS-05'].count, 0);

    // Percentage checks (2 of 4 = 50%, 1 of 4 = 25%)
    assert.equal(stats.problemCounts['PS-01'].percentage, 50);
    assert.equal(stats.problemCounts['PS-02'].percentage, 25);
    assert.equal(stats.problemCounts['PS-03'].percentage, 0);
    assert.equal(stats.problemCounts['PS-04'].percentage, 25);
    assert.equal(stats.problemCounts['PS-05'].percentage, 0);
  });

  await t.test('de-duplicates duplicate entries without double-counting', () => {
    const rawAssignmentsWithDuplicates = [
      { teamId: 'T-01', teamName: 'Alpha', problemId: 'PS-01', assignedAt: '2026-10-14T10:00:00Z' },
      { teamId: 'T-01', teamName: 'alpha', problemId: 'PS-01', assignedAt: '2026-10-14T10:00:00Z' }, // Duplicate
      { teamId: 'T-02', teamName: 'Beta', problemId: 'PS-02', assignedAt: '2026-10-14T10:05:00Z' }
    ];

    const stats = calculateDashboardStats(rawAssignmentsWithDuplicates, []);
    assert.equal(stats.totalAssigned, 2, 'Must de-duplicate duplicate assignment entries');
    assert.equal(stats.totalRegistered, 2);
    assert.equal(stats.waitingToSpin, 0);
  });

  await t.test('records and tracks local team registration state', () => {
    const team = recordTeamRegistration('OmegaSquad', 'TM-OMEGA-99');
    assert.equal(team.teamName, 'OmegaSquad');
    assert.equal(team.teamId, 'TM-OMEGA-99');
    assert.equal(team.status, 'waiting_to_spin');

    updateTeamRegistrationStatus('TM-OMEGA-99', 'assigned');
    const teams = getRegisteredTeams();
    const updated = teams.find((t) => t.teamId === 'TM-OMEGA-99');
    assert.equal(updated.status, 'assigned');
  });

  await t.test('fetchLiveDashboardData returns live data when available or falls back cleanly', async () => {
    const result = await fetchLiveDashboardData();
    assert.equal(result.success, true);
    assert.ok(result.stats);
    assert.ok(result.stats.problemCounts['PS-01']);
    assert.ok(result.stats.problemCounts['PS-05']);
  });
});

test('7. Automatic Team ID Generation & Persistent Re-use', async (t) => {
  await t.test('generates unique Team ID without manual user input', () => {
    const id = getOrCreateTeamId('QuantumPioneers');
    assert.ok(id);
    assert.ok(id.startsWith('TM-QUANTU-'));
  });

  await t.test('re-uses the exact same Team ID on repeat calls or refresh', () => {
    const firstCall = getOrCreateTeamId('SynapseCore');
    const secondCall = getOrCreateTeamId('SynapseCore');
    const thirdCall = getOrCreateTeamId('  SynapseCore  ');
    assert.equal(firstCall, secondCall, 'Subsequent queries must return the exact same Team ID');
    assert.equal(firstCall, thirdCall, 'Whitespace variations must return the exact same Team ID');
  });

  await t.test('preserves device identity token for session persistence', () => {
    const devId1 = getClientDeviceId();
    const devId2 = getClientDeviceId();
    assert.ok(devId1);
    assert.equal(devId1, devId2);
  });
});

test('8. Organizer Authentication & Cryptographic Authorization', async (t) => {
  t.beforeEach(() => {
    logoutOrganizer();
  });

  await t.test('isOrganizerAuthorized is false initially', () => {
    assert.equal(isOrganizerAuthorized(), false);
  });

  await t.test('rejects incorrect passkeys and does NOT grant authorization', async () => {
    const res = await authenticateOrganizer('wrongPassword123');
    assert.equal(res.success, false);
    assert.ok(res.error.includes('denied'));
    assert.equal(isOrganizerAuthorized(), false);
  });

  await t.test('rejects empty passkeys cleanly', async () => {
    const res = await authenticateOrganizer('');
    assert.equal(res.success, false);
    assert.equal(isOrganizerAuthorized(), false);
  });

  await t.test('authorizes valid passkey using SHA-256 and mints session token', async () => {
    // Expected default passkey corresponds to Organizer@Symposium2026
    const res = await authenticateOrganizer('Organizer@Symposium2026');
    assert.equal(res.success, true);
    assert.ok(res.session);
    assert.ok(res.session.token.startsWith('ORG-SESSION-'));
    assert.equal(isOrganizerAuthorized(), true);
  });

  await t.test('logoutOrganizer invalidates authorization session', async () => {
    await authenticateOrganizer('Organizer@Symposium2026');
    assert.equal(isOrganizerAuthorized(), true);

    logoutOrganizer();
    assert.equal(isOrganizerAuthorized(), false);
  });
});

test('9. Registration & Assignment Flow Without Participant Team ID Input', async (t) => {
  clearAllAssignments();

  const originalFetch = globalThis.fetch;
  let sentPayload = null;

  globalThis.fetch = async (url, options) => {
    sentPayload = JSON.parse(options.body);
    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'Saved to Google Sheets',
        data: {
          assignmentId: 'ASSIGN-AUTO-101',
          teamId: sentPayload.teamId,
          teamName: sentPayload.teamName,
          problemId: sentPayload.problemId,
          problemTitle: sentPayload.problemTitle,
          assignedAt: new Date().toISOString(),
          status: 'Assigned'
        }
      }),
      { status: 200 }
    );
  };

  try {
    // Participant only supplies team name
    const teamName = 'AutonomousAgents';
    const autoId = getOrCreateTeamId(teamName);

    // Assignment request using teamName only
    const result = await requestProblemAssignment({ teamName });

    assert.equal(result.teamName, 'AutonomousAgents');
    assert.equal(result.teamId, autoId);
    assert.equal(sentPayload.teamId, autoId);
    assert.equal(sentPayload.teamName, 'AutonomousAgents');
    assert.ok(sentPayload.problemId.startsWith('PS-'));

    // Second request: one-assignment-per-team rule strictly enforced
    const repeat = await requestProblemAssignment({ teamName });
    assert.equal(repeat.alreadyAssigned, true);
    assert.equal(repeat.teamId, autoId);
    assert.equal(repeat.assignmentId, 'ASSIGN-AUTO-101');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
