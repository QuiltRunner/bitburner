// Script: hack-prep.js
//
// Purpose: Prep a target to a "ready" state for steady hacking, then exits (no infinite loop).
//  - Lowers security
//  - Grows money to near maximum
//
// Use:
//  - run hack-prep.js <target>
//
// Requirements: 
//  - Root access on target
//  - weaken.js and grow.js present (used as workers)
//
// Warnings:
//  - Uses available RAM aggressively (spawns max threads)
//  - Kills existing grow.js / weaken.js on the current host
//
// Notes:
//  - Best used before starting hack-manager.js

/** @param {NS} ns */
export async function main(ns) {
  const target = String(ns.args[0] ?? "");
  if (!target) {
    ns.tprint("Running hack-prep.js on <target>");
    return;
  }

  const host = ns.getHostname();
  const growScript = "grow.js";
  const weakenScript = "weaken.js";

  ns.disableLog("sleep");
  ns.disableLog("getServerSecurityLevel");
  ns.disableLog("getServerMoneyAvailable");

  const secBuffer = 1;        // How close to min security we want (min + buffer)
  const moneyThreshold = 0.99; // How close to max money we want (>= 99%)

  ns.tprint(`Prepping ${target} from ${host}...`);

  while (true) {
    const minSec = ns.getServerMinSecurityLevel(target);
    const curSec = ns.getServerSecurityLevel(target);
    const maxMoney = ns.getServerMaxMoney(target);
    const curMoney = ns.getServerMoneyAvailable(target);

    const secReady = curSec <= minSec + secBuffer;
    const moneyReady = maxMoney === 0 ? true : curMoney >= maxMoney * moneyThreshold;

    if (secReady && moneyReady) {
      ns.scriptKill(growScript, host);
      ns.scriptKill(weakenScript, host);
      ns.tprint(`✅ Prep complete: ${target}`);
      ns.tprint(`   Security: ${curSec.toFixed(2)} (min ${minSec.toFixed(2)})`);
      ns.tprint(`   Money:    ${formatMoney(ns, curMoney)} / ${formatMoney(ns, maxMoney)}`);
      return;
    }

    // Priority:
    //  1. If security is high, weaken first.
    //  2. Else if money is low, grow.
    //  3. Growing increases security, so we follow grows with weaken passes automatically as needed.
    if (!secReady) {
      await runMaxThreads(ns, weakenScript, target);
    } else if (!moneyReady) {
      await runMaxThreads(ns, growScript, target);
    }

    await ns.sleep(200);
  }
}

async function runMaxThreads(ns, script, target) {
  const host = ns.getHostname();

  // Kill existing copy so we don’t overlap runs and waste RAM.
  ns.scriptKill(script, host);

  const ramPerThread = ns.getScriptRam(script);
  const freeRam = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
  const threads = Math.floor(freeRam / ramPerThread);

  if (threads <= 0) {
    ns.tprint(`Not enough RAM to run ${script}. Free RAM: ${freeRam.toFixed(2)}GB`);
    await ns.sleep(1000);
    return;
  }

  ns.exec(script, host, threads, target);

  // Wait long enough for most threads to finish one cycle.
  // This can be timed precisely; but I am keeping it simple at this point.)
  const est =
    script === "weaken.js" ? ns.getWeakenTime(target) :
    script === "grow.js"   ? ns.getGrowTime(target) :
    2000;

  await ns.sleep(Math.min(est + 100, 30000));
}

function formatMoney(ns, n) {
  // ns.nFormat exists; keeping it simple and readable.
  try { return ns.nFormat(n, "$0.00a"); } catch { return `$${Math.round(n)}`; }
}
