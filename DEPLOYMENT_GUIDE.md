# Vercel Deployment Guide

This guide walks you through deploying the EventBase frontend to Vercel using best practices.

## Prerequisites

- [Vercel Account](https://vercel.com/signup) (free tier works)
- Vercel CLI installed (`npm i -g vercel`)
- Git repository pushed to GitHub/GitLab/Bitbucket
- Environment variables ready:
  - WalletConnect Project ID
  - Pinata JWT Token
  - Pinata Gateway URL

## Deployment Steps

### 1. Login to Vercel CLI

```bash
vercel login
```

This will open your browser to authenticate.

### 2. Navigate to Frontend Directory

```bash
cd frontend
```

### 3. Deploy to Vercel

For the first deployment, run:

```bash
vercel
```

You'll be asked several questions:

- **Set up and deploy?** → `Y`
- **Which scope?** → Select your account/team
- **Link to existing project?** → `N` (for first time)
- **What's your project's name?** → `eventbase-ticketing` (or your preferred name)
- **In which directory is your code located?** → `.` (current directory)
- **Want to modify settings?** → `N` (use defaults)

This creates a **preview deployment**.

### 4. Add Environment Variables

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | `6b87a3c69cbd8b52055d7aef763148d6` | Production, Preview, Development |
| `NEXT_PUBLIC_PINATA_JWT` | Your Pinata JWT token | Production, Preview, Development |
| `NEXT_PUBLIC_PINATA_GATEWAY` | `gateway.pinata.cloud` | Production, Preview, Development |

#### Option B: Via CLI

```bash
vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID production
# Paste: 6b87a3c69cbd8b52055d7aef763148d6

vercel env add NEXT_PUBLIC_PINATA_JWT production
# Paste your Pinata JWT

vercel env add NEXT_PUBLIC_PINATA_GATEWAY production
# Paste: gateway.pinata.cloud
```

Repeat for `preview` and `development` environments.

### 5. Deploy to Production

```bash
vercel --prod
```

This deploys to your production domain.

## Post-Deployment

### 1. Verify Deployment

Visit your deployment URL and test:
- ✅ Wallet connection works
- ✅ Event browsing loads
- ✅ Images load from IPFS
- ✅ Contract interactions work
- ✅ No console errors

### 2. Configure Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for DNS propagation (5-30 minutes)

### 3. Set Up Git Integration (Recommended)

1. Go to **Settings** → **Git**
2. Connect your GitHub repository
3. Enable **Automatic Deployments**:
   - Production: Deploy on push to `main` branch
   - Preview: Deploy on push to any branch

Now every push automatically deploys!

## Environment-Specific Deployments

### Preview Deployments (Staging)

```bash
vercel
```

Creates a unique URL for testing before production.

### Production Deployment

```bash
vercel --prod
```

Deploys to your production domain.

### Specific Branch

```bash
vercel --prod --branch feature-name
```

## Best Practices Implemented

### Security

✅ **Security Headers**: Added in `vercel.json`:
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy

✅ **Environment Variables**: Stored securely in Vercel, not in code

✅ **Gitignore**: `.env` files excluded from version control

### Performance

✅ **Edge Network**: Deployed to Vercel's global CDN

✅ **Automatic HTTPS**: SSL certificates auto-provisioned

✅ **Optimized Builds**: Next.js with Turbopack for faster builds

✅ **Caching**: Static assets cached at edge

### Reliability

✅ **Atomic Deployments**: Zero-downtime deployments

✅ **Instant Rollbacks**: Revert to any previous deployment in 1 click

✅ **Preview URLs**: Test before pushing to production

✅ **Health Checks**: Automatic deployment validation

## Common Issues & Solutions

### Issue: Build Fails

**Solution**: Check build logs in Vercel dashboard
```bash
# Test build locally first
npm run build
```

### Issue: Environment Variables Not Working

**Solution**: 
1. Ensure variables start with `NEXT_PUBLIC_` for client-side
2. Redeploy after adding variables
3. Check variable names match exactly

### Issue: Images Not Loading

**Solution**:
1. Verify Pinata JWT token is valid
2. Check IPFS gateway is accessible
3. Verify image URLs in browser console

### Issue: Wallet Connection Fails

**Solution**:
1. Verify WalletConnect Project ID is correct
2. Check browser console for errors
3. Ensure Base Sepolia RPC is accessible

## Monitoring & Analytics

### Enable Vercel Analytics

```bash
npm install @vercel/analytics
```

Add to `app/layout.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### View Deployment Logs

```bash
vercel logs [deployment-url]
```

Or view in dashboard: **Deployments** → Select deployment → **Logs**

## Useful Commands

```bash
# Check deployment status
vercel ls

# View project info
vercel inspect

# View logs
vercel logs

# Rollback to previous deployment
vercel rollback

# Remove project
vercel remove [project-name]

# Link local project to Vercel
vercel link
```

## Continuous Deployment Workflow

1. **Develop locally**: `npm run dev`
2. **Push to feature branch**: Creates preview deployment
3. **Test preview URL**: Share with team
4. **Merge to main**: Auto-deploys to production
5. **Monitor**: Check logs and analytics

## Production Checklist

Before deploying to production:

- [ ] All environment variables configured
- [ ] Build succeeds locally (`npm run build`)
- [ ] No TypeScript errors
- [ ] Smart contracts deployed to mainnet
- [ ] Contract addresses updated in `smcontract/abiAndAddress.ts`
- [ ] WalletConnect Project ID configured
- [ ] Pinata IPFS configured
- [ ] Custom domain DNS configured (if using)
- [ ] Analytics enabled
- [ ] Error monitoring set up
- [ ] Performance tested
- [ ] Security headers verified

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Support**: https://vercel.com/support

## Quick Reference

| Action | Command |
|--------|---------|
| Login | `vercel login` |
| Deploy preview | `vercel` |
| Deploy production | `vercel --prod` |
| Add env var | `vercel env add <NAME>` |
| View logs | `vercel logs` |
| List deployments | `vercel ls` |
| Rollback | `vercel rollback` |

---

**Need Help?** Check the [Vercel Documentation](https://vercel.com/docs) or create an issue in the repository.
