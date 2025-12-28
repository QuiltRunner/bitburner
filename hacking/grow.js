// Script: grow.js
// 
// Purpose: Performs a single grow() against a target.
//
// Use:
//  - run grow.js <target>
//
// Requirements:
//  - Root access on target
//  - ~1.7 GB RAM per thread
// 
// Warnings:
//  - Increases money
//  - Increases security
//

/** @param {NS} ns */
export async function main(ns) {
  const target = String(ns.args[0] ?? "");
  if (!target) {
    ns.tprint("Usage: run hack-grow.js <target>");
    return;
  }
  await ns.grow(target);
}
