# Hacknet Automation

Scripts for automating Hacknet nodes:
- Purchasing nodes
- Upgrade optimization
- Cost / ROI balancing

NB: These scripts spend money **aggressively.** Hacknet is a trap if mismanaged. These scripts *try* to make it a "tool."

## File Structure
```
├── hacknet-manager.js  # Automates node purchases / upgrades with a spending cap
└── hacknet-status.js   # Prints a dashboard to confirm production and node status
```
## Recommendations

- Do not run blindly during the early game
- Always set spending caps if available
- Print and read the dashboard logs the first time you run them

## Note

My `hacknet-manager.js` uses a heuristic ROI because Bitburner doesn't offer a clean simulation API for production after upgrade. This heuristic model works well in the early to mid-game but you may want a more exact ROI model later in the game.
