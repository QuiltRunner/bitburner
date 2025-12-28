// Script: weaken.js
//
// Purpose: Performs a single weaken() against a target.
//
// Use:
//  - run weaken.js <target>
//
// Requirements:
//  - Root access on target
//  - ~1.7 GB of RAM per thread
//
// Warnings:
//  - Slower than hack / grow
//

/** @param {NS} ns */
export async function main(ns) {
  const target = String(ns.args[0] ?? "");
  if (!target) {
    ns.tprint("Usage: run hack-weaken.js <target>");
    return;
  }
  await ns.weaken(target);
}
