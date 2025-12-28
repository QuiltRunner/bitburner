// Script: contracts-solve.js
//
// Purpose: Finds Coding Contracts (.cct) on reachable servers, solves supported types, and submit answers (optional).
//
// Use:
//  - run contracts-solve.js 
//  - run contracts-solve.js -- submit 
//  - run contracts-solve.js -- target foodnstuff 
//
// Arguments:
//  --submit : Submit answers (default is DRY-RUN)
//  -- target <server> : Only scan one server (debugging)
//
// Requirements:
//  - Coding Contract API access (ns.codingcontract)
//  - Root access helps you reach more servers but scanning from home will still work
//
// Warnings:
//  - Submitting a wrong answer can destroy a contract
//  - Always run once without --submit first
//
// Notes:
//  - Unsupported contract types are skipped safely
//  - This file is intentionally structured as one script with many basic solvers. 

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.args.map(String);
  const submit = args.includes("--submit");

  const targetIdx = args.indexOf("--target");
  const targetServer = targetIdx !== -1 ? args[targetIdx + 1] : null;

  ns.disableLog("scan");
  ns.disableLog("sleep");

  const servers = targetServer ? [targetServer] : scanAll(ns, "home");
  const contracts = findContracts(ns, servers);

  if (contracts.length === 0) {
    ns.tprint("No coding contracts found.");
    return;
  }

  ns.tprint(`Found ${contracts.length} contract(s). Mode=${submit ? "SUBMIT" : "DRY-RUN"}`);

  let attempted = 0, solved = 0, skipped = 0;

  for (const { host, file } of contracts) {
    const type = ns.codingcontract.getContractType(file, host);
    const data = ns.codingcontract.getData(file, host);

    const solver = SOLVERS[type];
    if (!solver) {
      skipped++;
      ns.tprint(`SKIP (no solver): [${type}] ${host}:${file}`);
      continue;
    }

    attempted++;

    let answer;
    try {
      answer = solver(data, ns);
    } catch (e) {
      ns.tprint(`FAILED (exception): [${type}] ${host}:${file} -> ${String(e)}`);
      continue;
    }

    // If solver returns null/undefined, don’t submit.
    if (answer === null || answer === undefined) {
      ns.tprint(`FAILED (no answer): [${type}] ${host}:${file}`);
      continue;
    }

    if (!submit) {
      ns.tprint(`DRY: [${type}] ${host}:${file}`);
      ns.tprint(`  Answer: ${formatAnswer(answer)}`);
      continue;
    }

    const reward = ns.codingcontract.attempt(answer, file, host, { returnReward: true });
    if (reward) {
      solved++;
      ns.tprint(`SOLVED: [${type}] ${host}:${file}`);
      ns.tprint(`  Reward: ${reward}`);
    } else {
      ns.tprint(`WRONG:  [${type}] ${host}:${file}`);
      ns.tprint(`  Answer tried: ${formatAnswer(answer)}`);
    }

    await ns.sleep(10);
  }

  ns.tprint(`Done. Attempted=${attempted}, Solved=${solved}, Skipped=${skipped}, Found=${contracts.length}`);
}

// Discovery Helpers

function scanAll(ns, start) {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    for (const nxt of ns.scan(cur)) {
      if (!seen.has(nxt)) {
        seen.add(nxt);
        queue.push(nxt);
      }
    }
  }
  return [...seen];
}

function findContracts(ns, servers) {
  const out = [];
  for (const host of servers) {
    const files = ns.ls(host, ".cct");
    for (const file of files) out.push({ host, file });
  }
  return out;
}

function formatAnswer(ans) {
  if (typeof ans === "string") return ans;
  return JSON.stringify(ans);
}

// Solver Route

const SOLVERS = {
  "Find Largest Prime Factor": solveLargestPrimeFactor,

  "Generate IP Addresses": solveGenerateIPAddresses,

  "Algorithmic Stock Trader I": (data) => solveStockTrader(data, 1),
  "Algorithmic Stock Trader II": (data) => solveStockTrader(data, Infinity),
  "Algorithmic Stock Trader III": (data) => solveStockTrader(data, 2),
  "Algorithmic Stock Trader IV": (data) => {
    // data can be [k, prices] or [prices, k] depending on contract instance
    const a = data[0], b = data[1];
    const k = typeof a === "number" ? a : b;
    const prices = Array.isArray(a) ? a : b;
    return solveStockTrader(prices, k);
  },

  "Total Ways to Sum": solveTotalWaysToSum,

  "Spiralize Matrix": solveSpiralizeMatrix,

  "Minimum Path Sum in a Triangle": solveMinPathTriangle,

  "Unique Paths in a Grid I": solveUniquePathsI,
  "Unique Paths in a Grid II": solveUniquePathsII,
};

// Solvers

// Find Largest Prime Factor
function solveLargestPrimeFactor(n) {
  let x = n;
  let largest = 1;

  while (x % 2 === 0) {
    largest = 2;
    x = Math.floor(x / 2);
  }
  let f = 3;
  while (f * f <= x) {
    while (x % f === 0) {
      largest = f;
      x = Math.floor(x / f);
    }
    f += 2;
  }
  if (x > 1) largest = x;
  return largest;
}

// Generate IP Addresses
function solveGenerateIPAddresses(s) {
  const res = [];
  const n = s.length;

  for (let i = 1; i <= 3; i++) {
    for (let j = 1; j <= 3; j++) {
      for (let k = 1; k <= 3; k++) {
        const l = n - (i + j + k);
        if (l < 1 || l > 3) continue;

        const a = s.slice(0, i);
        const b = s.slice(i, i + j);
        const c = s.slice(i + j, i + j + k);
        const d = s.slice(i + j + k);

        if (validOctet(a) && validOctet(b) && validOctet(c) && validOctet(d)) {
          res.push(`${a}.${b}.${c}.${d}`);
        }
      }
    }
  }
  return res;

  function validOctet(x) {
    if (x.length === 0 || x.length > 3) return false;
    if (x.length > 1 && x[0] === "0") return false;
    const v = Number(x);
    return v >= 0 && v <= 255;
  }
}

// Algorithmic Stock Trader (max profit with at most k transactions)
function solveStockTrader(prices, k) {
  if (!Array.isArray(prices) || prices.length === 0) return 0;

  if (k === Infinity) {
    let profit = 0;
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > prices[i - 1]) profit += prices[i] - prices[i - 1];
    }
    return profit;
  }

  const n = prices.length;
  const dp = Array.from({ length: k + 1 }, () => Array(n).fill(0));

  for (let t = 1; t <= k; t++) {
    let best = -prices[0];
    for (let i = 1; i < n; i++) {
      dp[t][i] = Math.max(dp[t][i - 1], prices[i] + best);
      best = Math.max(best, dp[t - 1][i] - prices[i]);
    }
  }
  return dp[k][n - 1];
}

// Total Ways to Sum (partitions excluding n itself)
function solveTotalWaysToSum(n) {
  const dp = Array(n + 1).fill(0);
  dp[0] = 1;

  for (let add = 1; add <= n - 1; add++) {
    for (let sum = add; sum <= n; sum++) {
      dp[sum] += dp[sum - add];
    }
  }
  return dp[n];
}

// Spiralize Matrix
function solveSpiralizeMatrix(mat) {
  const res = [];
  let top = 0, left = 0;
  let bottom = mat.length - 1;
  let right = mat[0].length - 1;

  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) res.push(mat[top][c]);
    top++;

    for (let r = top; r <= bottom; r++) res.push(mat[r][right]);
    right--;

    if (top <= bottom) {
      for (let c = right; c >= left; c--) res.push(mat[bottom][c]);
      bottom--;
    }

    if (left <= right) {
      for (let r = bottom; r >= top; r--) res.push(mat[r][left]);
      left++;
    }
  }
  return res;
}

// Minimum Path Sum in a Triangle
function solveMinPathTriangle(tri) {
  const dp = tri[tri.length - 1].slice();
  for (let r = tri.length - 2; r >= 0; r--) {
    for (let i = 0; i <= r; i++) {
      dp[i] = tri[r][i] + Math.min(dp[i], dp[i + 1]);
    }
  }
  return dp[0];
}

// Unique Paths in a Grid I: data = [m, n]
function solveUniquePathsI(data) {
  const [m, n] = data;
  const dp = Array(n).fill(1);
  for (let r = 1; r < m; r++) {
    for (let c = 1; c < n; c++) dp[c] += dp[c - 1];
  }
  return dp[n - 1];
}

// Unique Paths in a Grid II: grid with 0 free, 1 obstacle
function solveUniquePathsII(grid) {
  const m = grid.length;
  const n = grid[0].length;
  const dp = Array(n).fill(0);

  dp[0] = grid[0][0] === 0 ? 1 : 0;

  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] === 1) dp[c] = 0;
      else if (c > 0) dp[c] += dp[c - 1];
    }
  }
  return dp[n - 1];
}
