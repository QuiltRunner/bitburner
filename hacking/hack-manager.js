// Script: hack-manager.js
//
// Purpose: Manages hacking for a single target:
//  - Weakens security
//  - Grows money
//  - Hacks profit
//
// Use:
//  - run hack-manager.js
//  - run hack-manager.js --target n00dles
//
// Arguments: 
//  --target <host> : Force a specific target
//
// Requirements:
//  - hack.js
//  - grow.js
//  - weaken.js
//
// Warnings:
//  - Spawns scripts on the current server
//  - Uses available RAM aggressively
//

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.args.map(String);
  const forcedTarget = getArgValue(args, "--target");

  ns.disableLog("sleep");
  ns.disableLog("getServerSecurityLevel");
  ns.disableLog("getServerMoneyAvailable");

  const target = forcedTarget ?? pickBestTarget(ns);
  ns.tprint(`Best Target: ${target}`);

  const moneyHackFraction = 0.1;     // Hack ~10% at a time
  const growThreshold = 0.9;         // Regenerate money when threshold falls below 90%
  const securityBuffer = 5;          // Allow min + buffer

  while (true) {
    const minSec = ns.getServerMinSecurityLevel(target);
    const curSec = ns.getServerSecurityLevel(target);
    const maxMoney = ns.getServerMaxMoney(target);
    const curMoney = ns.getServerMoneyAvailable(target);

    if (curSec > minSec + securityBuffer) {
      await runAllThreads(ns, "weaken.js", target);
    } else if (curMoney < maxMoney * growThreshold) {
      await runAllThreads(ns, "grow.js", target);
    } else {
      await runAllThreads(ns, "hack.js", target);
    }

    await ns.sleep(200);
  }
}

// Helpers : Helpers abstract argument parsing, full-network scanning, target scoring, and max-thread script execution.
//
// Functions:
//  - getArgvalue : Reads flag-style CLI arguments (e.g. --target n00dles)
//  - runAllThreads : Kills existing worker scripts and relaunches using all available RAM
//  - pickBestTarget : Scans the network and selects the best hackable server based on money / security ratio
//  - scanAll : Performs a full network scan starting from home

function getArgValue(args, flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}

function runAllThreads(ns, script, target) {
  ns.scriptKill(script, ns.getHostname());
  const ramPerThread = ns.getScriptRam(script);
  const maxThreads = Math.floor(
    (ns.getServerMaxRam(ns.getHostname()) - ns.getServerUsedRam(ns.getHostname())) / ramPerThread
  );
  if (maxThreads > 0) {
    ns.exec(script, ns.getHostname(), maxThreads, target);
  }
}

function pickBestTarget(ns) {
  const servers = scanAll(ns, "home")
    .filter(s => ns.hasRootAccess(s))
    .filter(s => ns.getServerMaxMoney(s) > 0)
    .filter(s => ns.getServerRequiredHackingLevel(s) <= ns.getHackingLevel());

  servers.sort((a, b) =>
    ns.getServerMaxMoney(b) / ns.getServerMinSecurityLevel(b) -
    ns.getServerMaxMoney(a) / ns.getServerMinSecurityLevel(a)
  );

  return servers[0] ?? "n00dles";
}

function scanAll(ns, start) {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    for (const next of ns.scan(cur)) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return [...seen];
}
