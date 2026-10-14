import test from 'node:test';
import assert from 'node:assert/strict';
import { PROBLEM_STATEMENTS } from '../src/data/problemStatements.js';

test('Verification of complete content across all five problem statements', (t) => {
  assert.equal(PROBLEM_STATEMENTS.length, 5, 'Should have exactly 5 problem statements');

  const expectedIds = ['PS-01', 'PS-02', 'PS-03', 'PS-04', 'PS-05'];
  const expectedTitles = [
    'Campus Lost & Found',
    'Smart Event Registration',
    'Campus Complaint Tracker',
    'Smart Canteen Pre-Order System',
    'Campus Emergency Resource Finder'
  ];

  PROBLEM_STATEMENTS.forEach((prob, i) => {
    assert.equal(prob.id, expectedIds[i], `Problem ${i} ID mismatch`);
    assert.equal(prob.title, expectedTitles[i], `Problem ${i} title mismatch`);

    // 1. Scenario
    assert.ok(prob.scenario && prob.scenario.length > 30, `Problem ${prob.id} missing scenario`);

    // 2. Target Users
    assert.ok(prob.targetUsers && prob.targetUsers.length > 10, `Problem ${prob.id} missing targetUsers`);

    // 3. What Your Solution Must Do (requiredFeatures)
    assert.ok(Array.isArray(prob.requiredFeatures) && prob.requiredFeatures.length >= 4, `Problem ${prob.id} requiredFeatures incomplete`);
    prob.requiredFeatures.forEach((feat, fi) => {
      assert.ok(feat && feat.trim().length > 0, `Problem ${prob.id} feature ${fi} empty`);
    });

    // 4. Constraints
    assert.ok(Array.isArray(prob.constraints) && prob.constraints.length >= 3, `Problem ${prob.id} constraints incomplete`);
    prob.constraints.forEach((c, ci) => {
      assert.ok(c && c.trim().length > 0, `Problem ${prob.id} constraint ${ci} empty`);
    });

    // 5. Reasoning Challenge
    assert.ok(
      (Array.isArray(prob.reasoningChallenge) && prob.reasoningChallenge.length >= 2) ||
      (typeof prob.reasoningChallenge === 'string' && prob.reasoningChallenge.length > 10),
      `Problem ${prob.id} reasoningChallenge incomplete`
    );

    // 6. What Participants Should Be Allowed to Build (permittedBuild)
    assert.ok(
      (Array.isArray(prob.permittedBuild) && prob.permittedBuild.length >= 3) ||
      (typeof prob.permittedBuild === 'string' && prob.permittedBuild.length > 10),
      `Problem ${prob.id} permittedBuild incomplete`
    );

    // 7. Expected Prototype (expectedDeliverable)
    assert.ok(prob.expectedDeliverable && prob.expectedDeliverable.length > 15, `Problem ${prob.id} expectedDeliverable incomplete`);
  });
});
