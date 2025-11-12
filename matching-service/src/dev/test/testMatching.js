import {
  createRequest, getStatus, acceptMatch, declineMatch,
  cancelMyRequest, retryRequest, startSweeper
} from '../../services/matchManager.js';

import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

async function printStatus(label, ids) {
  const rows = [];
  for (const id of ids) {
    rows.push({ id, ...(await getStatus(id)) });
  }
  console.log(`\n${label}`);
  console.table(rows);
}

async function cleanSlate() {
  await redis.flushall();
  startSweeper(); // runs TTL + handshake expiry
}

// 1) Happy path (already working)
async function testHappyPath() {
  console.log('\n=== Test 1: Happy Path (A & B accept) ===');
  await cleanSlate();

  console.log('\nA joins: Easy + AI');
  await createRequest('A', { difficulty: 'Easy', topics: ['AI'] });
  await printStatus('After A joins:', ['A']);

  console.log('\nB joins: Easy + AI');
  await createRequest('B', { difficulty: 'Easy', topics: ['AI'] });

  await delay(400); // let tryMatch run
  await printStatus('After match formed:', ['A','B']);

  const pairId = (await getStatus('A')).pairId;
  console.log('\nPair formed:', pairId);

  console.log('\nA accepts');
  await acceptMatch('A', pairId);
  await printStatus('After A accepts:', ['A','B']);

  console.log('\nB accepts');
  await acceptMatch('B', pairId);
  await delay(400);
  await printStatus('After both accept (should be SESSION_READY):', ['A','B']);
}

// 2) Decline flow
async function testDeclineFlow() {
  console.log('\n=== Test 2: Decline Flow (B declines, A requeued) ===');
  await cleanSlate();

  console.log('\nA joins: Easy + AI');
  await createRequest('A', { difficulty: 'Easy', topics: ['AI'] });

  console.log('\nB joins: Easy + AI');
  await createRequest('B', { difficulty: 'Easy', topics: ['AI'] });

  await delay(400);
  await printStatus('After match formed:', ['A','B']);

  const pairId = (await getStatus('A')).pairId;
  console.log('\nB declines');
  await declineMatch('B', pairId);

  await delay(400);
  await printStatus('After B declines (A should be QUEUED again, B NONE):', ['A','B']);

  // Optional: show A can match again with C
  console.log('\nC joins: Easy + AI (to confirm A requeued correctly)');
  await createRequest('C', { difficulty: 'Easy', topics: ['AI'] });
  await delay(400);
  await printStatus('A should be PENDING_ACCEPT with C now:', ['A','C']);
}

// 3) Accept-timeout flow
// IMPORTANT: run with a short accept window so you don’t wait forever.
// In your terminal:  ACCEPT_WINDOW_SECS=5 node src/testMatching.js
async function testAcceptTimeoutFlow() {
  console.log('\n=== Test 3: Accept Timeout (A accepts, B never responds) ===');
  await cleanSlate();

  console.log('\nA joins: Easy + AI');
  await createRequest('A', { difficulty: 'Easy', topics: ['AI'] });

  console.log('\nB joins: Easy + AI');
  await createRequest('B', { difficulty: 'Easy', topics: ['AI'] });

  await delay(400);
  await printStatus('After match formed:', ['A','B']);

  const pairId = (await getStatus('A')).pairId;

  console.log('\nA accepts');
  await acceptMatch('A', pairId);
  await delay(200);
  await printStatus('A accepted, B pending:', ['A','B']);

  // Now we wait for the handshake to expire.
  // Make sure you run with a small ACCEPT_WINDOW_SECS (e.g., 5).
  console.log('\nWaiting for accept window to expire...');

  const aNow = await getStatus('A');                // has expiresAt
  const msToExpiry = Number(aNow.expiresAt) - Date.now();
  const SWEEP_SECS = Number(process.env.SWEEPER_INTERVAL_SECS || 5);
  const bufferMs = (SWEEP_SECS + 1) * 1000;         // sweeper + 1s
  
  await delay(Math.max(msToExpiry + bufferMs, 0));
  
  await printStatus('After timeout (A should be QUEUED again, B NONE):', ['A','B']);
}

async function testCrossProductIntersection() {
  console.log('\n=== Test 4: Cross-Product Intersection (topic-only vs diff-only) ===');
  await cleanSlate();

  // T: topic-only (AI) → goes into Easy:AI, Medium:AI, Hard:AI
  console.log('\nT joins: topics=["AI"], no difficulty');
  await createRequest('T', { topics: ['AI'] });
  await delay(200);
  await printStatus('After T joins:', ['T']);

  // U3: diff+topic (Medium, Trees) → only Medium:Trees (no overlap with T)
  console.log('\nU3 joins: difficulty="Medium", topics=["Trees"] (no overlap with T)');
  await createRequest('U3', { difficulty: 'Medium', topics: ['Trees'] });
  await delay(300);
  await printStatus('After U3 joins (should be no match yet):', ['T','U3']);

  // U2: difficulty-only (Medium), no topics → Medium:<ALL_TOPICS>
  // Intersection with T occurs at Medium:AI, so T & U2 should match.
  console.log('\nU2 joins: difficulty="Medium", no topics (should match with T at Medium:AI)');
  await createRequest('U2', { difficulty: 'Medium' });
  await delay(400);
  await printStatus('After U2 joins (T & U2 should be PENDING_ACCEPT; U3 still QUEUED):', ['T','U2','U3']);

  // Complete the handshake for T & U2
  const pairId = (await getStatus('T')).pairId;
  console.log('\nT accepts');
  await acceptMatch('T', pairId);
  await delay(200);
  console.log('U2 accepts');
  await acceptMatch('U2', pairId);
  await delay(400);
  await printStatus('After accept (T & U2 should be SESSION_READY):', ['T','U2']);
  await printStatus('U3 should still be QUEUED (Medium:Trees only):', ['U3']);

  // cleanup
  await cancelMyRequest('T').catch(()=>{});
  await cancelMyRequest('U2').catch(()=>{});
  await cancelMyRequest('U3').catch(()=>{});
  await redis.quit();
  console.log('\n=== Test 4 complete ===');
}

// Run tests
(async function main() {
  console.log('=== Starting M2 Matching Service algorithm tests ===');

  await testHappyPath();
  await testDeclineFlow();
  await testAcceptTimeoutFlow();
  await testCrossProductIntersection();

  console.log('\nCleaning up...');
  await cancelMyRequest('A').catch(()=>{});
  await cancelMyRequest('B').catch(()=>{});
  await cancelMyRequest('C').catch(()=>{});
  await redis.quit();

  console.log('\n=== Tests Complete ===');
})();
