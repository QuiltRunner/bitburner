// Script: contract-find.js
//
// Purpose: Scan reachable servers and list Coding Contracts found, including server, filename, and contract type.
//
// Use:
//  - run contract-find.js
//  - run contract-find.js --type "Generate IP Addresses"
//  - run contract-find.js --target n00dles
//

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.args.map(String);
  const typeFilter = getArg(args, "--type");
  const target = getArg(args, "--target");

  ns.disableLog("scan");

  const servers = target ? [target] : scanAll(ns, "home");
  let count = 0;

  for (const host of servers) {
    for (const file of ns.ls(host, ".cct")) {
      const type = ns.codingcontract.getContractType(file, host);
      if (typeFilter && type !== typeFilter) continue;
      count++;
      ns.tprint(`[${type}] ${host}:${file}`);
    }
  }

  if (count === 0) ns.tprint("No matching contracts found.");
}

// Helpers
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

function getArg(args, flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}
