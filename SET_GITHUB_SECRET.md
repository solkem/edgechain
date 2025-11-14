# 🚨 REQUIRED: Set GitHub Secret

The deployment is working, but you need to set the contract address as a GitHub Secret.

## Why You're Seeing the Old UI

The GitHub Actions log shows:
```
VITE_CONTRACT_ADDRESS: 
                      ^ EMPTY!
```

Without this secret:
- Build works fine
- But ContractProvider doesn't find the address
- So `isDeployed = false`
- UI shows the "Setup Required / Deploy Contract" section

## How to Fix (30 seconds)

### Step 1: Go to GitHub Secrets Page
**Direct Link**: https://github.com/solkem/edgechain-midnight-hackathon/settings/secrets/actions

### Step 2: Click "New repository secret"
(Green button on the right)

### Step 3: Enter the Secret
- **Name**: `VITE_CONTRACT_ADDRESS`
- **Value**: `02002f44e466b8c8a1422e269156a6bb4e098cde1007203adf7181eb6659211dbe39`

### Step 4: Click "Add secret"

### Step 5: Trigger New Deployment

Option A: Push an empty commit:
```bash
git commit --allow-empty -m "trigger: Redeploy with contract address secret"
git push
```

Option B: Go to Actions tab and re-run the last workflow:
https://github.com/solkem/edgechain-midnight-hackathon/actions

## After Setting the Secret

Next deployment will have:
```
VITE_CONTRACT_ADDRESS: 02002f44e466b8c8a1422e269156a6bb4e098cde1007203adf7181eb6659211dbe39
```

Then the UI will:
✅ Load contract address
✅ Set `isDeployed = true`
✅ Skip the "Deploy Contract" section
✅ Show clean "Connect Midnight Preview" button

---

**Contract Address (copy this)**:
```
02002f44e466b8c8a1422e269156a6bb4e098cde1007203adf7181eb6659211dbe39
```
