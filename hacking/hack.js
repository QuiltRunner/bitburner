// Script: hack.js
//
// Purpose: Performs a single hack() against a target.
//
// Use:
//  - run hack.js <target>
//
// Requirements:
//  - Root access on target
//  - ~1.7 GB of RAM per thread
// 
// Warnings:
//  - Uses money
//  - Increases security
//

/** @param {NS} ns */
export async function main(ns) {
  const target = String(ns.args[0] ?? "");
  if (!target) {
    ns.tprint("Running hack.js on <target>");
    return;
  }
  await ns.hack(target);
}
