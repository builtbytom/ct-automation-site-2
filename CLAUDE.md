# CT Business Automations - Project Context for Claude

## 🎯 Project Overview

Building a white-label business automation platform where Tom provides automation services to Connecticut businesses at $2,500 setup + $400/month recurring.

### 🆕 Free Competition Analysis Tool (July 30, 2025)
- **URL**: /tools/competition-snapshot
- **Purpose**: Lead generation through generosity marketing
- **Status**: Built with mock data, ready for Google Places API
- **Features**: 
  - Compare ratings, reviews, response rates vs competitors
  - Identify missing keywords and growth opportunities
  - Natural tie-in to automation services
  - 24-hour caching and rate limiting built in

## 🏗️ Current Infrastructure (July 23, 2025)

### Live Services
- **VPS**: DigitalOcean droplet at 159.89.84.35
- **N8N**: https://n8n.ctbusinessautomations.com (operational)
- **SSL**: Let's Encrypt certificate installed
- **Backups**: Automated daily at 2 AM

### Architecture
```
Client → Portal (friendly UI) → API → N8N (hidden backend)
         ↓
    They see ROI metrics
    They configure settings
    They NEVER see N8N
```

## 💡 Key Technical Decisions

### Credential Management (DECIDED)
- Use SMTP for ALL email operations (universal compatibility)
- Portal collects credentials, passes to N8N
- Auto-detect SMTP settings for common providers
- No OAuth complexity - just email/password

### Why This Approach Works
1. Every business has email
2. SMTP works with Gmail, Outlook, everything
3. Clear error messages ("wrong password" vs OAuth cryptic errors)
4. 10-minute setup calls instead of 45 minutes

## 🚧 What Needs Building

### 1. Portal Credential System
```javascript
// Portal collects
Email: ________________
Password: _____________
[Auto-Detect Settings]

// Auto-detection logic
gmail.com → smtp.gmail.com:587
outlook.com → smtp-mail.outlook.com:587
other → standard SMTP settings

// Pass to N8N, never store
```

### 2. Portal Backend API
- Authentication endpoints
- Automation status/metrics
- Credential pass-through to N8N
- ROI calculations

### 3. Portal Deployment
- Build for production
- Deploy to Netlify
- Configure portal.ctbusinessautomations.com

## 📁 Project Structure

```
/ct-automation-site/
├── src/pages/portal/          # Client portal (Astro)
│   └── dashboard.astro        # Main portal UI
├── workflows/                 # N8N workflow templates
│   ├── lead-capture-automation.json
│   └── lead-capture-no-twilio.json
├── infrastructure/            # Server setup files
├── STATUS.md                  # Current project status
└── SECURITY_CHECKLIST.md      # Security requirements
```

## 🔐 Access Information

- **SSH**: root@159.89.84.35 (pw: TomCT2025!Setup)
- **N8N**: https://n8n.ctbusinessautomations.com
- **DNS**: Managed via Netlify

## 🎯 Business Model

- **Setup Fee**: $2,500 (one-time)
- **Monthly**: $400 (recurring)
- **Includes**: Monitoring, updates, support
- **Target**: CT businesses happy with website but drowning in manual work

## ⚠️ Tom's Technical Context

- Comfortable with: N8N interface, basic terminal commands
- Learning: Docker, SSL, server management
- Approach: Make everything as simple as possible
- Success metric: Can Tom do this without calling for help?

## 🚀 Next Session Focus

**Start with**: "Continue CT Business Automations - implement portal credential management"

**Priority tasks**:
1. Add credential input to portal
2. Create SMTP auto-detection
3. Build pass-through to N8N
4. Test with real email account

## 📝 Important Notes

- Tom successfully deployed infrastructure but found it stressful
- Future work should minimize terminal usage
- Portal must hide ALL technical complexity
- Clients should NEVER see N8N interface
- Everything through simple web forms

---

Remember: This is for Bob's Pizza and Sarah's Salon, not Silicon Valley startups. Keep it simple!