## Coding Contract Solver

`contracts-solve.js` is a single-file Coding Contract solver. It scans reachable servers for `.cct` files, solves supported contract types, and can submit answers (if desired). 

By default, the script runs in **dry-run mode** to prevent accidental contract destruction. 

## What This Script Does

- Scans the network (starting from `home`) for Coding Contracts
- Detects the contract type and input data
- Solves supported contract types automatically (optional)
- Prints answers in dry-run mode
- Safely skips unsupported contract types

## Supported Contract Types

- Find Largest Prime Factor
- Generate IP Address
- Algorithmic Stock Trader I-IV
- Total Ways to Sum
- Minimum Path Sum in a Triangle
- Unique Paths in a Grid I and II

Unsupported contracts are skipped without error. 

## Use

### Dry-Run Mode (Recommended First)
Prints answers without submitting them:
```
run contracts-solve.js
```

### Submission Mode
Submit contract solutions:
```
run contracts-solve.js --submit
```

### Debug Specific Server
Only scan one server:
```
run contracts-solve.js --target <target>
```

## Notes

- Submitting a wrong answer can permanently destroy a contract
- Always run without ```--submit``` to verify answers before submission
- The script will attempt all supported contracts it finds
- Bitburner API changes may require solver updates

This script assumes you under the risk of automation. 
