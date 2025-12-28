# Hacking Scripts

Core hacking automation: hack / grow / weaken loops and orchestrators.

These scripts handle:
- Selecting target servers
- Balancing hack / grow / weaken ratios
- Maximizing income while maintaining security
- Scaling across purchased servers

## Requirements

Most scripts expect the following: 
- Root access on targets
- Sufficient RAM
- A running 'weaken' baseline

Please read the script headers before running.

## File Structure
```
├── hack.js          # Worker script used by the manager (performs a single hack() against a target)
├── weaken.js        # Worker script used by the manager (performs a single weaken() against a target)
├── grow.js          # Worker script used by the manager (performs a single grow() against a target)
├── hack-prep.js     # Prep helper that brings a target to near-min security and near-max money (no loop)
└── hack-manager.js  # Main loop that decides when to weaken, grow, or hack a target using all available RAM
```

## Script Use

- Run ```hack-manager.js``` or run ```hack-manager.js --target <target>```
- Optional: run ```hack-prep.js <target>``` before starting the manager

Workers are not meant to be run manually unless you are testing. 

NB: These scripts will use RAM **aggressively** and may kill / restart worker scripts on the current host.
