# GitHub Pages Deployment Guide

Deploy EdgeChain to GitHub Pages for live demo and testing.

---

## 🌐 Live Demo URL

Once deployed, EdgeChain will be available at:

**https://solkem.github.io/edgechain-midnight-hackathon/**

---

## ✅ What's Already Done

- ✅ Vite config updated with GitHub Pages support
- ✅ Base path configured: `/edgechain-midnight-hackathon/`
- ✅ GitHub Actions workflow created: [.github/workflows/deploy-gh-pages.yml](.github/workflows/deploy-gh-pages.yml)
- ✅ Manual deployment script: [deploy-gh-pages.sh](deploy-gh-pages.sh)
- ✅ Production build tested and verified

---

## 🚀 Deployment Methods

### Method 1: Automatic Deployment (Recommended)

GitHub Actions will automatically deploy on every push to `main` branch.

#### Setup Steps:

1. **Enable GitHub Pages in Repository Settings**

   Navigate to: https://github.com/solkem/edgechain-midnight-hackathon/settings/pages

   Configure:
   - **Source**: `GitHub Actions`
   - Click **Save**

2. **Commit and Push the Workflow**

   ```bash
   git add .github/workflows/deploy-gh-pages.yml
   git add vite.config.ts deploy-gh-pages.sh
   git commit -m "feat: Add GitHub Pages deployment workflow"
   git push origin main
   ```

3. **Monitor Deployment**

   View workflow status: https://github.com/solkem/edgechain-midnight-hackathon/actions

   First deployment takes ~2-3 minutes

4. **Access Your App**

   Once the workflow completes (green checkmark ✅):

   🌐 https://solkem.github.io/edgechain-midnight-hackathon/

---

### Method 2: Manual Deployment

Build and verify locally before pushing:

```bash
# Run deployment script
./deploy-gh-pages.sh

# Or build manually
export VITE_BASE_PATH=/edgechain-midnight-hackathon/
yarn workspace edgechain-ui build

# Commit and push
git add .
git commit -m "feat: Deploy to GitHub Pages"
git push origin main
```

---

## 🎯 What Works on GitHub Pages

### ✅ Fully Functional Features:

1. **Federated Learning Dashboard**
   - View FL system status
   - Train local models (in-browser TensorFlow.js)
   - Generate mock farm datasets
   - Model aggregation visualization

2. **Wallet Connection**
   - Lace Midnight Preview wallet detection
   - Connect wallet button
   - Wallet status display
   - Address display

3. **Contract Deployment UI**
   - Deployment instructions banner
   - Step-by-step guide with links
   - Faucet and wallet resources

4. **Demo Mode**
   - HTTP-based FL workflow (for testing without blockchain)
   - Local model training
   - Mock submissions
   - Progress tracking

### ⚠️ Limitations on GitHub Pages:

1. **No Backend Server**
   - The Node.js backend (`server/`) won't run on GitHub Pages (static hosting only)
   - Aggregation endpoints won't be available
   - Model submission will use demo mode

2. **Contract Deployment Requires Wallet**
   - Users can connect Lace wallet
   - Contract deployment requires actual Midnight devnet access
   - For demo purposes, the app shows deployment instructions

3. **Environment Variables**
   - `VITE_CONTRACT_ADDRESS` won't be set (no .env file on GitHub Pages)
   - App will show "contract not deployed" banner
   - This is intentional - guides users through deployment

---

## 🔧 How It Works

### Build Process:

1. **GitHub Actions Workflow** (`.github/workflows/deploy-gh-pages.yml`):
   ```yaml
   - Checkout code
   - Setup Node.js 20
   - Enable Corepack (for Yarn)
   - Install dependencies
   - Build UI with VITE_BASE_PATH=/edgechain-midnight-hackathon/
   - Upload artifact to GitHub Pages
   - Deploy to GitHub Pages
   ```

2. **Vite Configuration** (`packages/ui/vite.config.ts`):
   ```typescript
   base: process.env.VITE_BASE_PATH || '/'
   ```

   This ensures all asset paths are relative to `/edgechain-midnight-hackathon/` on GitHub Pages

3. **Static Assets**:
   - All files in `packages/ui/dist/` are deployed
   - JavaScript, CSS, images, fonts
   - index.html with correct base path

---

## 🎨 User Experience on GitHub Pages

### When Users Visit:

1. **Landing Page**
   - EdgeChain dashboard loads
   - Shows FL system status
   - Displays wallet connection prompt

2. **Contract Deployment Banner**
   - Visible because `VITE_CONTRACT_ADDRESS` is not set
   - Shows step-by-step deployment guide:
     - Install Lace Midnight Preview wallet
     - Get tDUST tokens from faucet
     - Deploy contract instructions
     - Environment configuration

3. **Wallet Connection**
   - Users can install Lace Midnight Preview
   - Click "Connect Wallet"
   - Wallet detection works in browser
   - Address displayed once connected

4. **Federated Learning Demo**
   - Train Model button works (TensorFlow.js runs in-browser)
   - Local training shows progress
   - Generates mock farm data
   - Displays metrics (loss, accuracy, MAE)

5. **What Doesn't Work (Expected)**
   - Model submission to backend (no server on GitHub Pages)
   - Global model aggregation (requires backend)
   - Contract transactions (requires deployed contract + wallet approval)

---

## 🧪 Testing the Deployment

### After Deployment:

1. **Visit the URL**
   ```
   https://solkem.github.io/edgechain-midnight-hackathon/
   ```

2. **Check the Console**
   - Open browser DevTools (F12)
   - Look for "EdgeChain" logs
   - Verify no 404 errors for assets

3. **Test Wallet Connection**
   - Install Lace Midnight Preview if not already
   - Click "Connect Wallet"
   - Approve connection in wallet popup
   - Verify address appears in dashboard

4. **Test Local Training**
   - Click "Train Model"
   - Watch training progress bar
   - Check console for training logs
   - Verify metrics update

5. **Test Contract Instructions**
   - Deployment banner should be visible
   - All links should work (wallet, faucet, docs)
   - Instructions should be clear

---

## 🔄 Updating the Deployment

### Automatic Updates:

Every push to `main` branch triggers a new deployment:

```bash
# Make changes
git add .
git commit -m "feat: Update feature X"
git push origin main

# GitHub Actions automatically:
# 1. Builds the app
# 2. Deploys to GitHub Pages
# 3. Updates live site in ~2-3 minutes
```

### Manual Re-deployment:

Trigger workflow manually:

1. Go to: https://github.com/solkem/edgechain-midnight-hackathon/actions
2. Select "Deploy to GitHub Pages" workflow
3. Click "Run workflow"
4. Select `main` branch
5. Click "Run workflow" button

---

## 🐛 Troubleshooting

### Issue: 404 Errors for Assets

**Cause**: Base path not configured correctly

**Fix**:
```bash
# Rebuild with correct base path
export VITE_BASE_PATH=/edgechain-midnight-hackathon/
yarn workspace edgechain-ui build
```

### Issue: Workflow Fails

**Check**:
1. View workflow logs: https://github.com/solkem/edgechain-midnight-hackathon/actions
2. Ensure GitHub Pages is enabled (Settings → Pages → Source: GitHub Actions)
3. Check YAML syntax in workflow file

### Issue: App Loads But Breaks

**Debug**:
1. Open browser DevTools (F12)
2. Check Console for errors
3. Check Network tab for failed requests
4. Verify all paths use `/edgechain-midnight-hackathon/` prefix

### Issue: Wallet Connection Fails

**Expected on GitHub Pages**:
- Wallet connection **should work** (browser-based)
- Contract transactions **won't work** (requires deployed contract)
- Check console for specific error messages

---

## 📊 Monitoring

### GitHub Actions Dashboard:
https://github.com/solkem/edgechain-midnight-hackathon/actions

Shows:
- Deployment status (✅ success, ❌ failed)
- Build logs
- Deployment time
- Historical deployments

### GitHub Pages Settings:
https://github.com/solkem/edgechain-midnight-hackathon/settings/pages

Shows:
- Live site URL
- Last deployment timestamp
- Build source configuration

---

## 🎯 What This Enables

### For Hackathon Demo:

1. **Live Demo Link**
   - Share URL with judges, users, investors
   - No need for local setup
   - Works on any device with modern browser

2. **Wallet Testing**
   - Users can install Lace wallet
   - Test wallet connection flow
   - Experience privacy-preserving features

3. **FL Demonstration**
   - Show local model training
   - Demonstrate privacy (data never leaves browser)
   - Explain federated learning concept

4. **Contract Deployment Guide**
   - In-app instructions for deploying to Midnight
   - Links to all required resources
   - Clear next steps for production

### For Development:

1. **Preview Changes**
   - Every push deploys automatically
   - See changes live immediately
   - Share preview with team

2. **User Testing**
   - Get feedback from real users
   - Test on different devices/browsers
   - Identify UX issues

3. **Integration Testing**
   - Test wallet integration
   - Verify TensorFlow.js works in production
   - Check asset loading

---

## 🚀 Next Steps After Deployment

1. **Share the URL**
   ```
   🌐 https://solkem.github.io/edgechain-midnight-hackathon/
   ```

   - Add to README.md
   - Share with hackathon judges
   - Post on social media
   - Add to project documentation

2. **Deploy Contract to Midnight Devnet**
   - Follow instructions in [CONTRACT_DEPLOYMENT_READY.md](CONTRACT_DEPLOYMENT_READY.md)
   - Get tDUST tokens
   - Deploy contract
   - Add contract address to workflow (future enhancement)

3. **Enable Analytics** (Optional)
   - Add Google Analytics to track usage
   - Monitor user interactions
   - Gather feedback

4. **Add Custom Domain** (Optional)
   - Purchase domain (e.g., edgechain.app)
   - Configure in GitHub Pages settings
   - Update CNAME record

---

## 📝 Summary

**EdgeChain is now deployable to GitHub Pages!**

- ✅ Workflow configured for automatic deployment
- ✅ Production build tested and working
- ✅ Base path correctly configured
- ✅ Wallet connection functional
- ✅ FL demo works in-browser
- ✅ Clear deployment instructions

**To deploy right now:**

```bash
git add .github/workflows/deploy-gh-pages.yml vite.config.ts deploy-gh-pages.sh
git commit -m "feat: Add GitHub Pages deployment"
git push origin main
```

Then enable GitHub Pages in repository settings and watch it deploy! 🚀
