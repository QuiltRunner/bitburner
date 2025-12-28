// Script: hacknet-status.js
//
// Purpose: Prints a quick Hacknet dashboard with node stats and totals. 
//
// Use:
// - run hacknet-status.js
//

/** @param {NS} ns */
export async function main(ns) {
  const n = ns.hacknet.numNodes();
  if (n === 0) {
    ns.tprint("No Hacknet Nodes yet.");
    return;
  }

  let total = 0;
  ns.tprint("Hacknet Nodes:");
  for (let i = 0; i < n; i++) {
    const s = ns.hacknet.getNodeStats(i);
    total += s.production;
    ns.tprint(
      `#${i} Level=${s.level} RAM=${s.ram} Cores=${s.cores} Production=${s.production.toFixed(4)}/s`
    );
  }
  ns.tprint(`Total Production: ${total.toFixed(4)}/s`);
}
