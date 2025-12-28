// Script: hacknet-manager.js
//
// Purpose: Automate Hacknet purchases / upgrades using a simple ROI strategy.
//  - Buy new nodes when it's the best return
//  - Otherwise upgrade the best node component (level / RAM / cores)
//  - Obeys a spending budget so it doesn't bankrupt you
//
// Use:
//  - run hacknet-manager.js
//  - run hacknet-manager.js --budget 0.25
//  - run hacknet-manager.js --reserve 2000000
//  - run hacknet-manager.js --interval 2000
//
// Arguments:
//  --budget <0..1> : Fraction of current cash allowed to be spent per loop (default 0.25)
//  --reserve <money> : Minimum cash to keep (default 1_000_000)
//  --interval <ms> : Loop interval (default 1500)
//
// Requirements:
//  - Hacknet unlocked
//
// Warnings:
//  - Spends money automatically
//  - If you set a budget too high / reserve too low, it can starve other progression
//

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.args.map(String);
  const budgetFrac = clamp(parseFloat(getArgValue(args, "--budget") ?? "0.25"), 0, 1);
  const reserve = parseNumber(getArgValue(args, "--reserve")) ?? 1_000_000;
  const interval = parseInt(getArgValue(args, "--interval") ?? "1500", 10);

  ns.disableLog("sleep");

  if (!ns.hacknet) {
    ns.tprint("Hacknet API not available.");
    return;
  }

  ns.tprint(`Hacknet Manager Running: Budget=${budgetFrac}, Reserve=${formatMoney(ns, reserve)}, Interval=${interval}ms`);

  while (true) {
    const cash = ns.getServerMoneyAvailable("home");
    const spendCap = Math.max(0, cash - reserve) * budgetFrac;

    if (spendCap <= 0) {
      await ns.sleep(interval);
      continue;
    }

    const decision = bestHacknetPurchase(ns, spendCap);

    if (!decision) {
      await ns.sleep(interval);
      continue;
    }

    // Execute the decision
    const ok = applyDecision(ns, decision);
    if (ok) {
      ns.print(`Bought: ${decision.kind} ${decision.desc} for ${formatMoney(ns, decision.cost)} (gain +${decision.gain.toFixed(4)}/s)`);
    }

    await ns.sleep(interval);
  }
}

// Decision Engine

function bestHacknetPurchase(ns, spendCap) {
  const n = ns.hacknet.numNodes();
  let best = null;

  // Candidate: Buy a new node
  const newCost = ns.hacknet.getPurchaseNodeCost();
  if (newCost <= spendCap) {
    const gain = estimateNewNodeGain(ns);
    best = pickBetter(best, {
      kind: "new-node",
      cost: newCost,
      gain,
      ratio: gain / newCost,
      desc: "",
    });
  }

  // Candidates: Upgrades on existing nodes
  for (let i = 0; i < n; i++) {
    // Level +1
    const levelCost = ns.hacknet.getLevelUpgradeCost(i, 1);
    if (levelCost <= spendCap) {
      const gain = ns.hacknet.getNodeStats(i).production
        ? estimateUpgradeGain(ns, i, "level", 1)
        : estimateUpgradeGain(ns, i, "level", 1);
      best = pickBetter(best, {
        kind: "upgrade-level",
        node: i,
        cost: levelCost,
        gain,
        ratio: gain / levelCost,
        desc: `node ${i} +1 level`,
      });
    }

    // RAM x2 (Bitburner uses "ram upgrade by 1" meaning doubling steps)
    const ramCost = ns.hacknet.getRamUpgradeCost(i, 1);
    if (ramCost <= spendCap) {
      const gain = estimateUpgradeGain(ns, i, "ram", 1);
      best = pickBetter(best, {
        kind: "upgrade-ram",
        node: i,
        cost: ramCost,
        gain,
        ratio: gain / ramCost,
        desc: `node ${i} +1 RAM`,
      });
    }

    // Cores +1
    const coreCost = ns.hacknet.getCoreUpgradeCost(i, 1);
    if (coreCost <= spendCap) {
      const gain = estimateUpgradeGain(ns, i, "cores", 1);
      best = pickBetter(best, {
        kind: "upgrade-cores",
        node: i,
        cost: coreCost,
        gain,
        ratio: gain / coreCost,
        desc: `node ${i} +1 core`,
      });
    }
  }

  return best;
}

function pickBetter(current, candidate) {
  if (!candidate || candidate.gain <= 0) return current;
  if (!current) return candidate;
  return candidate.ratio > current.ratio ? candidate : current;
}

// Estimate gain from buying a fresh node.
// We approximate by using production of a hypothetical node at base stats.

function estimateNewNodeGain(ns) {
  
  // Base node stats are usually level 1, ram 1, cores 1; production depends on multipliers.
  // We don't have a direct "simulate new node" API, so we approximate:
  // Use production of the worst existing node if any, otherwise a small baseline.
  const n = ns.hacknet.numNodes();
  if (n === 0) return 0.1; // Tiny baseline
  let minProd = Infinity;
  for (let i = 0; i < n; i++) {
    minProd = Math.min(minProd, ns.hacknet.getNodeStats(i).production);
  }
  return Math.max(0.05, minProd);
}

// Estimate production increase from upgrading one stat by 1 step.
// Compute current production and compare to a simulated "after" production using a practical approximation:
//  - For level: assume roughly linear small gain relative to current production.
//  - For RAM/cores: assume multiplicative effects; give them a higher weight.
//
// This is intentionally simple but tends to make good choices early/mid game.

function estimateUpgradeGain(ns, i, type, amt) {
  const stats = ns.hacknet.getNodeStats(i);
  const cur = stats.production;

  // Heuristic weights
  if (type === "level") return Math.max(0.0001, cur * 0.015 * amt);
  if (type === "ram") return Math.max(0.0001, cur * 0.06 * amt);
  if (type === "cores") return Math.max(0.0001, cur * 0.045 * amt);
  return 0.0001;
}

function applyDecision(ns, d) {
  if (d.kind === "new-node") {
    const idx = ns.hacknet.purchaseNode();
    return idx !== -1;
  }
  if (d.kind === "upgrade-level") return ns.hacknet.upgradeLevel(d.node, 1);
  if (d.kind === "upgrade-ram") return ns.hacknet.upgradeRam(d.node, 1);
  if (d.kind === "upgrade-cores") return ns.hacknet.upgradeCore(d.node, 1);
  return false;
}

// Helpers

function getArgValue(args, flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}

function parseNumber(x) {
  if (x === null || x === undefined) return null;
  const s = String(x).replace(/_/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function formatMoney(ns, n) {
  try { return ns.nFormat(n, "$0.00a"); } catch { return `$${Math.round(n)}`; }
]
  
