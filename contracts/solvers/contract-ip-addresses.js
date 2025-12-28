// Scripts: contract-ip-addresses.js
//
// Purpose: Only solve "Generate IP Addresses" Coding Contracts. 
//
// Use:
//  - run contract-ip-addresses.js
//  - run contract-ip-addresses.js --submit
//  - run contract-ip-addresses.js --target n00dles
//
// Warnings:
//  - Wrong submissions can destroy a contract
//  - Always do a dry-run first

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.args.map(String);
  const submit = args.includes("--submit");
  const target = getArg(args, "--target");

  ns.disableLog("scan");
  ns.disableLog("sleep");

  const TYPE = "Generate IP Addresses";
  const servers = target ? [target] : scanAll(ns, "home");

  let found = 0;
  let solved = 0;

  for (const host of servers) {
    for (const file of ns.ls(host, ".cct")) {
      if (ns.codingcontract.getContractType(file, host) !== TYPE) continue;

      found++;
      const data = ns.codingcontract.getData(file, host);
      const answer = solve(String(data));

      if (!submit) {
        ns.tprint(`DRY: ${host}:${file}`);
        ns.tprint(`  ${JSON.stringify(answer)}`);
        continue;
      }

      const reward = ns.codingcontract.attempt(answer, file, host, { returnReward: true });
      if (reward) {
        solved++;
        ns.tprint(`SOLVED: ${host}:${file} -> ${reward}`);
      } else {
        ns.tprint(`FAILED:  ${host}:${file}`);
      }

      await ns.sleep(10);
    }
  }

  ns.tprint(`Done. Found=${found}, Solved=${solved}, Mode=${submit ? "SUBMIT" : "DRY-RUN"}`);
}

/* solver */
function solve(s) {
  const res = [];
  for (let i = 1; i <= 3; i++)
    for (let j = 1; j <= 3; j++)
      for (let k = 1; k <= 3; k++) {
        const l = s.length - (i + j + k);
        if (l < 1 || l > 3) continue;

        const a = s.slice(0, i);
        const b = s.slice(i, i + j);
        const c = s.slice(i + j, i + j + k);
        const d = s.slice(i + j + k);

        if ([a, b, c, d].every(valid)) res.push(`${a}.${b}.${c}.${d}`);
      }
  return res;

  function valid(x) {
    if (x.length > 1 && x[0] === "0") return false;
    const n = Number(x);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  }
}

/* helpers */
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
