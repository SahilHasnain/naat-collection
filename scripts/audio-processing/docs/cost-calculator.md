# Azure GPU Cost Calculator

Use this to estimate costs before deploying.

## 💰 VM Pricing (Pay-as-you-go)

| VM Size     | GPU  | vCPUs | RAM   | Cost/Hour | Cost/Day (24h) |
| ----------- | ---- | ----- | ----- | --------- | -------------- |
| NC4as_T4_v3 | T4   | 4     | 28GB  | $0.526    | $12.62         |
| NC6s_v3     | V100 | 6     | 112GB | $3.06     | $73.44         |
| NC8as_T4_v3 | T4   | 8     | 56GB  | $1.052    | $25.25         |
| NC12s_v3    | V100 | 12    | 224GB | $6.12     | $146.88        |

**Spot Pricing** (up to 90% off):

- NC4as_T4_v3: ~$0.05-0.15/hour
- NC6s_v3: ~$0.30-0.90/hour

## 📊 Processing Time Estimates

### Per Video (15-minute audio)

| Model    | T4 GPU  | V100 GPU |
| -------- | ------- | -------- |
| tiny     | ~2 min  | ~1 min   |
| small    | ~4 min  | ~2 min   |
| medium   | ~8 min  | ~4 min   |
| large-v3 | ~12 min | ~6 min   |

### Batch Processing

| Videos | Model    | T4 Time   | T4 Cost | V100 Time | V100 Cost |
| ------ | -------- | --------- | ------- | --------- | --------- |
| 10     | large-v3 | 2 hours   | $1.05   | 1 hour    | $3.06     |
| 50     | large-v3 | 10 hours  | $5.26   | 5 hours   | $15.30    |
| 100    | large-v3 | 20 hours  | $10.52  | 10 hours  | $30.60    |
| 500    | large-v3 | 100 hours | $52.60  | 50 hours  | $153.00   |

## 🧮 Your Cost Calculator

### Step 1: Count Your Videos

Number of videos: `_____`

Average duration: `_____ minutes`

### Step 2: Choose Model

- [ ] tiny (fastest, good)
- [ ] small (fast, better)
- [ ] medium (balanced, great)
- [ ] large-v3 (best accuracy) ← Recommended

### Step 3: Choose VM

- [ ] NC4as_T4_v3 ($0.526/hour) ← Recommended
- [ ] NC6s_v3 ($3.06/hour)
- [ ] Spot instance (90% cheaper)

### Step 4: Calculate

**Formula**:

```
Total Time = (Number of Videos × Processing Time per Video)
Total Cost = (Total Time in Hours × VM Cost per Hour)
```

**Example** (100 videos, 15min each, large-v3, T4):

```
Processing Time = 100 × 12 min = 1,200 min = 20 hours
Total Cost = 20 hours × $0.526 = $10.52
```

**Your Calculation**:

```
Number of videos: _____
Processing time per video: _____ min
Total processing time: _____ hours
VM cost per hour: $_____
Total cost: $_____
```

## 💳 With Your Azure Credits

If you have **$100 in credits**:

### Option 1: NC4as_T4_v3 (T4) + large-v3

- Videos you can process: ~900 videos
- Cost per video: ~$0.11
- Best for: Maximum volume

### Option 2: NC6s_v3 (V100) + large-v3

- Videos you can process: ~300 videos
- Cost per video: ~$0.31
- Best for: Faster processing

### Option 3: Spot Instance (T4) + large-v3

- Videos you can process: ~9,000 videos
- Cost per video: ~$0.01
- Best for: Maximum savings (but can be interrupted)

## 📈 Cost Comparison

### Per Video (15 minutes)

| Approach                 | Cost  | Time   | Quality  |
| ------------------------ | ----- | ------ | -------- |
| Local (tiny)             | $0.00 | 5 min  | Good     |
| Groq                     | $0.00 | 3 min  | Good     |
| Azure T4 (large-v3)      | $0.11 | 12 min | **Best** |
| Azure V100 (large-v3)    | $0.31 | 6 min  | **Best** |
| Azure Spot T4 (large-v3) | $0.01 | 12 min | **Best** |

### For 100 Videos

| Approach                 | Total Cost | Total Time | Quality  |
| ------------------------ | ---------- | ---------- | -------- |
| Local (tiny)             | $0.00      | 8.3 hours  | Good     |
| Groq                     | $0.00      | 5 hours    | Good     |
| Azure T4 (large-v3)      | $10.52     | 20 hours   | **Best** |
| Azure V100 (large-v3)    | $30.60     | 10 hours   | **Best** |
| Azure Spot T4 (large-v3) | $1.05      | 20 hours   | **Best** |

## 🎯 Optimization Strategies

### Strategy 1: Hybrid Approach

```
Test locally (free): 10 videos
Process important on Azure: 50 videos ($5.26)
Keep rest for future: $94.74 remaining
```

### Strategy 2: Spot Instances

```
Use spot instances: 90% cheaper
Risk: Can be interrupted
Best for: Non-urgent batch processing
Savings: $10.52 → $1.05 for 100 videos
```

### Strategy 3: Model Selection

```
Use medium model instead of large-v3:
- 2x faster processing
- 50% cost savings
- Still great quality (90% vs 95% accuracy)
```

### Strategy 4: Batch Optimization

```
Process during off-peak hours
Use auto-shutdown
Batch multiple videos together
Monitor and stop if needed
```

## 💡 Cost-Saving Tips

### 1. Use Spot Instances

```bash
# Enable in Azure Portal when creating VM
# Savings: Up to 90%
# Trade-off: Can be interrupted
```

### 2. Auto-Shutdown

```bash
# Shutdown after 1 hour idle
sudo shutdown -h +60

# Or use Azure auto-shutdown feature
```

### 3. Right-Size VM

```
Small batch (<20 videos): NC4as_T4_v3
Large batch (>100 videos): NC6s_v3 (faster = less time = less cost)
```

### 4. Optimize Model

```
Test with medium model first
Only use large-v3 if accuracy difference matters
medium = 50% cost savings
```

### 5. Batch Processing

```
Process multiple videos in one session
Avoid multiple VM startups
Setup time is fixed cost
```

## 📊 Break-Even Analysis

### When is Azure worth it vs Local?

**Time Value**:

- If your time is worth $20/hour
- Local processing: 8.3 hours for 100 videos = $166 of your time
- Azure processing: 20 hours unattended = $0 of your time
- Azure cost: $10.52
- **Savings: $155.48**

**Quality Value**:

- Local accuracy: 85%
- Azure accuracy: 95%
- Improvement: 10% absolute = 40% error reduction
- If quality matters: **Priceless**

**Convenience Value**:

- Local: Ties up your PC
- Azure: Runs in background
- Can work on other things: **Valuable**

## 🎓 Real-World Examples

### Example 1: Personal Collection

```
Videos: 50 naats (15 min each)
Model: large-v3
VM: NC4as_T4_v3 (T4)

Processing time: 10 hours
Cost: $5.26
Cost per video: $0.11

With $100 credits remaining: $94.74
Worth it? YES (best quality for collection)
```

### Example 2: Testing Phase

```
Videos: 5 test videos
Model: medium
VM: NC4as_T4_v3 (T4)

Processing time: 40 minutes
Cost: $0.35
Cost per video: $0.07

Worth it? MAYBE (local is free, but this is fast)
```

### Example 3: Production Service

```
Videos: 500 naats
Model: large-v3
VM: NC6s_v3 (V100) for speed

Processing time: 50 hours
Cost: $153.00
Cost per video: $0.31

Worth it? YES (if providing service to others)
```

### Example 4: Budget-Conscious

```
Videos: 100 naats
Model: medium (not large-v3)
VM: NC4as_T4_v3 Spot

Processing time: 13.3 hours
Cost: $1.33
Cost per video: $0.01

Worth it? YES (90% accuracy, 99% cost savings)
```

## 🎯 Your Decision

Fill this out:

**Your Situation**:

- Number of videos: `_____`
- Azure credits available: `$_____`
- Quality requirement: Best / Great / Good
- Time available: Urgent / Normal / Flexible
- Budget: No limit / Moderate / Strict

**Recommended Setup**:

- VM: `_____`
- Model: `_____`
- Spot instance: Yes / No
- Estimated cost: `$_____`
- Estimated time: `_____ hours`

**Decision**:

- [ ] Use Azure GPU
- [ ] Use Local
- [ ] Use Groq
- [ ] Hybrid approach

## 📞 Need Help Deciding?

### If you have Azure credits:

→ **Use Azure GPU** (you have credits, use them!)

### If processing >20 videos:

→ **Use Azure GPU** (batch automation saves time)

### If need best quality:

→ **Use Azure GPU** (large-v3 model)

### If budget is $0:

→ **Use Local or Groq** (both free)

### If testing:

→ **Use Local** (no setup needed)

---

**Ready to calculate?** Fill out the sections above!

**Ready to deploy?** → [QUICKSTART_AZURE.md](QUICKSTART_AZURE.md)
