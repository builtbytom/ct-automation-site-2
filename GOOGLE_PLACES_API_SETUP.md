# Google Places API Setup Instructions

## Overview
This guide will help you set up the Google Places API for the Competition Snapshot tool. Expected time: 15-20 minutes.

## Step 1: Create Google Cloud Account
1. Go to https://console.cloud.google.com
2. Sign in with your Google account (or create one)
3. Accept the terms if this is your first time

## Step 2: Create a New Project
1. Click the project dropdown at the top
2. Click "New Project"
3. Name it: "CT Business Competition Tool"
4. Click "Create"
5. Wait 30 seconds for it to create

## Step 3: Enable the Places API
1. In the search bar at the top, type "Places API"
2. Click on "Places API (New)"
3. Click the big blue "ENABLE" button
4. Wait for it to enable (10-15 seconds)

## Step 4: Create API Credentials
1. After enabling, click "CREATE CREDENTIALS" at the top
2. Choose "API key"
3. Your API key will appear - COPY IT NOW
4. Click "Edit API key" (pencil icon)
5. Rename it to "Competition Tool API Key"

## Step 5: Secure Your API Key
1. Under "API restrictions", select "Restrict key"
2. In the dropdown, select only:
   - Places API (New)
3. Under "Application restrictions", select "HTTP referrers"
4. Add these websites:
   - https://ctbusinessautomations.com/*
   - https://*.ctbusinessautomations.com/*
   - http://localhost:3000/* (for testing)
5. Click "SAVE"

## Step 6: Set Up Billing
1. Click the menu (☰) → "Billing"
2. Click "LINK A BILLING ACCOUNT"
3. Create a billing account or use existing
4. Enter payment info (you won't be charged immediately)

## Step 7: Set Budget Alerts
1. In Billing, click "Budgets & alerts"
2. Click "CREATE BUDGET"
3. Name: "Competition Tool Budget"
4. Amount: $50 (monthly)
5. Set alert at 50%, 90%, and 100%
6. Add your email for notifications
7. Click "SAVE"

## Step 8: Add API Key to Netlify
1. Go to your Netlify dashboard
2. Select the CT Business Automations site
3. Go to Site settings → Environment variables
4. Add new variable:
   - Key: `GOOGLE_PLACES_API_KEY`
   - Value: [paste your API key]
5. Click "Save"

## Step 9: Update the Function
Replace the mock data section in `netlify/functions/analyze-competition.js` with actual API calls:

```javascript
// Add at the top
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Replace the TODO section with:
if (!GOOGLE_PLACES_API_KEY) {
  throw new Error('Google Places API key not configured');
}

// Make actual API call
const searchResponse = await fetch(
  `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(businessName)}+in+${encodeURIComponent(location)}&key=${GOOGLE_PLACES_API_KEY}`
);

const searchData = await searchResponse.json();
// Process the real data...
```

## Cost Monitoring
- Check your usage: https://console.cloud.google.com/apis/api/places-backend.googleapis.com/metrics
- You get $200 free credit monthly
- Each search costs ~$0.032
- 1,000 searches = ~$32
- Budget alerts will email you before hitting limits

## Testing
1. Go to https://ctbusinessautomations.com/tools/competition-snapshot
2. Try searching for a real business
3. Check the browser console for any errors
4. Verify results show real data

## Troubleshooting
- **"API key not valid"**: Check restrictions in Google Console
- **"Billing not enabled"**: Make sure billing is linked to the project
- **No results**: Try a more specific business name + city
- **Rate limit**: Wait a few minutes, check quotas in Google Console

## Support
- Google Cloud Support: https://cloud.google.com/support
- Places API Docs: https://developers.google.com/maps/documentation/places/web-service

---

**Remember**: The tool works with mock data until you complete these steps. This is intentional so you can test everything before incurring any costs.