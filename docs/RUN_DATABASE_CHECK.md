# Quick Start: Database Check

## Run the check in 2 steps:

### 1. Install dependencies (first time only)

```bash
npm install
```

### 2. Run the check

```bash
npm run check:non-owais
```

## What it does:

✅ Connects to your Appwrite database  
✅ Fetches all naats from "Baghdadi Sound and Media" channel  
✅ Counts how many DON'T have "Owais Raza/Qadri" in the title  
✅ Shows results in console  
✅ Saves detailed report to `non-owais-naats-report.json`

## Example Output:

```
📊 RESULTS:
════════════════════════════════════════════════════════════
Total naats in Baghdadi Sound and Media: 150
Naats WITHOUT Owais Raza/Qadri in title: 45
Naats WITH Owais Raza/Qadri in title: 105
════════════════════════════════════════════════════════════
```

The script will also show you a sample of the non-Owais naats and save the complete list to a JSON file for further analysis.
