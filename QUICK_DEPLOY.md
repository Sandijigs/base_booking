# Quick Deploy Guide

Deploy EventBase to Vercel in 5 minutes! 🚀

## Prerequisites

- ✅ Vercel account ([signup free](https://vercel.com/signup))
- ✅ Vercel CLI installed (`npm i -g vercel`)
- ✅ Environment variables ready

## Option 1: Automated Script (Easiest)

```bash
cd frontend
./deploy.sh
```

The script will:
1. ✅ Check Vercel CLI is installed
2. ✅ Verify environment variables
3. ✅ Test build locally
4. ✅ Deploy to Vercel
5. ✅ Provide deployment URL

## Option 2: Manual Commands

### Step 1: Login to Vercel

```bash
vercel login
```

### Step 2: Navigate to Frontend

```bash
cd frontend
```

### Step 3: Deploy

**For Preview (Staging):**
```bash
vercel
```

**For Production:**
```bash
vercel --prod
```

## Configure Environment Variables

### Via Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. **Settings** → **Environment Variables**
4. Add these variables:

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=6b87a3c69cbd8b52055d7aef763148d6
NEXT_PUBLIC_PINATA_JWT=<your-pinata-jwt>
NEXT_PUBLIC_PINATA_GATEWAY=gateway.pinata.cloud
```

### Via CLI

```bash
vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
# Paste: 6b87a3c69cbd8b52055d7aef763148d6

vercel env add NEXT_PUBLIC_PINATA_JWT
# Paste your Pinata JWT

vercel env add NEXT_PUBLIC_PINATA_GATEWAY
# Paste: gateway.pinata.cloud
```

**Important**: Add for all environments (Production, Preview, Development)

## Post-Deployment Checklist

After deployment, verify:

- [ ] Deployment URL is accessible
- [ ] Wallet connection works (MetaMask/WalletConnect)
- [ ] Event marketplace loads
- [ ] Images display from IPFS
- [ ] Smart contract interactions work
- [ ] No console errors

## Quick Test Commands

```bash
# View deployment status
vercel ls

# View deployment logs  
vercel logs

# View project info
vercel inspect
```

## Troubleshooting

### Build Fails

**Test locally first:**
```bash
npm run build
```

Fix any errors, then redeploy.

### Environment Variables Not Working

1. Ensure variables start with `NEXT_PUBLIC_`
2. Check exact spelling/casing
3. Redeploy after adding variables:
   ```bash
   vercel --prod --force
   ```

### Wallet Connection Issues

1. Verify WalletConnect Project ID is correct
2. Check browser console for errors
3. Try clearing browser cache

### Images Not Loading

1. Verify Pinata JWT is valid
2. Check IPFS gateway accessibility
3. Test image URL directly in browser

## CI/CD Setup (Optional)

Connect GitHub for automatic deployments:

1. **Settings** → **Git** 
2. Connect repository
3. Enable auto-deploy:
   - `main` branch → Production
   - Other branches → Preview

Now every push deploys automatically! 🎉

## Resources

- 📖 [Full Deployment Guide](./DEPLOYMENT_GUIDE.md)
- 🔧 [Vercel Documentation](https://vercel.com/docs)
- 💬 [Get Support](https://vercel.com/support)

## Quick Reference

| Action | Command |
|--------|---------|
| Login | `vercel login` |
| Preview deploy | `vercel` |
| Production deploy | `vercel --prod` |
| View logs | `vercel logs` |
| Rollback | `vercel rollback` |

---

**Need detailed instructions?** See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

**Having issues?** Check troubleshooting section above or create an issue.
