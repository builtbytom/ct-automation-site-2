# CT Business Automations - Client Onboarding SOP

## 🎯 Overview
This SOP ensures every client gets a consistent, professional white-label automation platform experience. Follow these steps EXACTLY for every new client.

---

## Phase 1: Discovery & Setup (Day 1-2)

### 1.1 Initial Client Setup
```bash
# Create client folder structure
/clients/
  /[client-name]/
    /workflows/      # N8N workflow JSONs
    /portal-config/  # Portal customizations
    /credentials/    # Encrypted credentials
    /documentation/  # Client-specific docs
```

### 1.2 Discovery Call Checklist
- [ ] **"What's your #1 most painful manual task?"** (START HERE)
- [ ] Business name and branding colors
- [ ] Current manual processes (prioritize top 3)
- [ ] Hourly rate for ROI calculations
- [ ] Tools they use (QuickBooks, Gmail, CRM, etc.)
- [ ] **Email platform** (Gmail vs Outlook - this matters!)
- [ ] Average transaction values (for opportunity tracking)
- [ ] Business hours and response time expectations
- [ ] Email templates they currently use
- [ ] **Any compliance requirements?** (HIPAA, PCI, etc.)

### 1.3 N8N Infrastructure Setup
```yaml
Client Environment:
  - Dedicated N8N instance OR shared with namespace
  - PostgreSQL database for execution data
  - Environment variables:
    CLIENT_ID: "unique-identifier"
    CLIENT_NAME: "Business Name"
    PORTAL_API_KEY: "generated-key"
    HOURLY_RATE: 25
```

---

## Phase 2: Workflow Development (Day 3-5)

### 2.1 Standard Workflow Templates

#### Invoice Follow-up Template
```javascript
// N8N Workflow Structure
{
  "name": "[CLIENT]_Invoice_Followup",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": { "interval": [{ "field": "days", "value": 1 }] }
      }
    },
    {
      "name": "Get Portal Config",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "={{$env.PORTAL_API}}/config/{{$env.CLIENT_ID}}/invoice-followup"
      }
    },
    // ... rest of workflow
  ]
}
```

#### Key N8N Variables to Use
```javascript
// Always pull from portal config
const followUpDelay = items[0].json.config.followUpDelay;
const emailTemplate = items[0].json.config.emailTemplate;
const excludeList = items[0].json.config.excludeCustomers;

// Track metrics
const metricsPayload = {
  client_id: $env.CLIENT_ID,
  automation: 'invoice_followup',
  tasks_completed: processedInvoices.length,
  time_saved: processedInvoices.length * 15, // 15 min per invoice
  timestamp: new Date()
};
```

### 2.2 Portal Integration Points

#### Required API Endpoints
```javascript
// Your backend needs these endpoints
POST   /api/config/{client_id}/{automation_id}  // Save settings
GET    /api/config/{client_id}/{automation_id}  // Get settings
POST   /api/metrics/{client_id}                 // Track executions
GET    /api/metrics/{client_id}/dashboard       // Dashboard data
POST   /api/activity/{client_id}                // Log activity
```

#### N8N Webhook for Real-time Updates
```javascript
// In N8N workflow
{
  "name": "Update Portal Activity",
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "path": "portal-activity",
    "method": "POST",
    "responseData": {
      "client_id": "={{$env.CLIENT_ID}}",
      "message": "={{$json.message}}",
      "type": "={{$json.type}}",
      "revenue": "={{$json.revenue}}"
    }
  }
}
```

---

## Phase 3: Portal Configuration (Day 4-5)

### 3.1 Database Schema
```sql
-- Clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  business_name VARCHAR(255),
  hourly_rate DECIMAL(10,2),
  portal_subdomain VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Automation configs
CREATE TABLE automation_configs (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  automation_type VARCHAR(100),
  config JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Metrics tracking
CREATE TABLE automation_metrics (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  automation_type VARCHAR(100),
  tasks_completed INTEGER,
  time_saved_minutes INTEGER,
  revenue_captured DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Version control for configs (CYA!)
CREATE TABLE automation_config_history (
  id UUID PRIMARY KEY,
  config_id UUID REFERENCES automation_configs(id),
  previous_config JSONB,
  new_config JSONB,
  changed_by VARCHAR(255),
  changed_at TIMESTAMP DEFAULT NOW(),
  change_reason TEXT
);
```

### 3.2 Portal Deployment Steps
```bash
# 1. Clone portal template
cp -r portal-template/ clients/[client-name]/portal/

# 2. Update configuration
# Edit /clients/[client-name]/portal/config.js
export const CLIENT_CONFIG = {
  id: 'unique-client-id',
  name: 'Connecticut Pizza Co.',
  hourlyRate: 25,
  apiEndpoint: 'https://api.ctbusinessautomations.com',
  n8nWebhook: 'https://n8n.ctbusinessautomations.com/webhook/[client-id]'
};

# 3. Deploy to subdomain
# [client-name].portal.ctbusinessautomations.com
```

### 3.3 Authentication Setup
```javascript
// Simple JWT-based auth
const portalAuth = {
  users: [
    {
      email: 'owner@clientbusiness.com',
      role: 'admin',
      password: 'hashed-password'
    }
  ],
  sessions: {
    duration: '7d',
    refresh: true
  }
};
```

---

## Phase 4: Testing & Launch (Day 6-7)

### 4.1 Testing Checklist
- [ ] All automations trigger correctly
- [ ] Portal settings update N8N workflows
- [ ] Metrics track accurately
- [ ] Activity feed shows real-time updates
- [ ] Email templates personalize correctly
- [ ] Exclusion lists work
- [ ] Mobile responsive
- [ ] SSL certificate active

### 4.2 Client Training & Acceptance
```markdown
## Training Agenda (30 minutes)
1. Portal login and navigation (5 min)
2. Understanding your dashboard metrics (10 min)
3. Configuring automation settings (10 min)
4. Using vacation mode and quick actions (5 min)
```

### 4.3 Client Sign-off (CRITICAL!)
- [ ] Client confirms test data processed correctly
- [ ] Client approves all email templates
- [ ] Client successfully tests portal login
- [ ] **Record video/email of client saying "this looks good"**
- [ ] Client acknowledges training completed
- [ ] Document any client-specific requests

### 4.3 Go-Live Checklist
- [ ] All credentials stored securely
- [ ] Monitoring alerts configured
- [ ] Backup automation in place
- [ ] Client has login credentials
- [ ] First month's invoice sent
- [ ] Follow-up call scheduled for Day 7

---

## Phase 5: Maintenance & Scaling

### 5.1 Monthly Maintenance Tasks
```yaml
Every Month:
  - Review automation performance metrics
  - Check for failed executions
  - Update client on ROI/savings
  - Suggest new automation opportunities
  - Backup workflow configurations
```

### 5.2 Adding New Automations
```bash
# Use Claude Code with this prompt template:
"Create a new N8N automation for [CLIENT_NAME] that:
1. [Specific task description]
2. Pulls configuration from portal API endpoint
3. Tracks metrics (tasks_completed, time_saved)
4. Updates activity feed with results
5. Handles errors gracefully

Client details:
- Client ID: [id]
- API Endpoint: [endpoint]
- Portal Config Path: /api/config/[client_id]/[automation_name]
"
```

### 5.3 Week 2 Check-in (CRITICAL FOR RETENTION!)
```markdown
## Week 2 Client Check-in Agenda
1. Review metrics together
   - "You've saved X hours already!"
   - "You captured $X in after-hours revenue"
   
2. Identify ONE more automation opportunity
   - "What else is eating your time?"
   - Plant seed for expansion
   
3. Get testimonial while they're excited
   - Record video or get written quote
   - "What's been the biggest impact?"
   
4. Confirm monthly maintenance value
   - "Any issues this week?" (there won't be)
   - "Imagine handling this yourself..."
```

### 5.4 Common N8N Patterns

#### Pattern 1: Portal Config Fetcher
```javascript
// Always start workflows with this
const getPortalConfig = async () => {
  const response = await $http.get({
    url: `${$env.PORTAL_API}/config/${$env.CLIENT_ID}/${automationName}`,
    headers: { 'X-API-Key': $env.PORTAL_API_KEY }
  });
  return response.data;
};
```

#### Pattern 2: Metric Reporter
```javascript
// End workflows with this
const reportMetrics = async (metrics) => {
  await $http.post({
    url: `${$env.PORTAL_API}/metrics/${$env.CLIENT_ID}`,
    body: {
      automation: automationName,
      ...metrics,
      timestamp: new Date().toISOString()
    }
  });
};
```

#### Pattern 3: Activity Logger
```javascript
// Log important events
const logActivity = async (message, type = 'success', revenue = null) => {
  await $http.post({
    url: `${$env.PORTAL_API}/activity/${$env.CLIENT_ID}`,
    body: { message, type, revenue }
  });
};
```

#### Pattern 4: Error Handler with Client Notification
```javascript
const handleError = async (error, context) => {
  // Log technical details to N8N
  console.error(`Error in ${context}:`, error);
  
  // Notify portal with client-friendly message
  await logActivity(
    `Automation issue: ${context}. We're on it!`,
    'warning'
  );
  
  // Alert support team
  if (error.severity === 'critical') {
    await notifySupport(error, context);
  }
  
  // Don't expose technical details to client
  return;
};
```

---

## 🚨 CRITICAL REMINDERS

1. **NEVER expose N8N directly** - Everything goes through the portal
2. **ALWAYS use environment variables** - No hardcoded values
3. **TRACK everything** - Every automation must report metrics
4. **TEST before going live** - Use test data first
5. **DOCUMENT client-specific quirks** - In their folder
6. **BILLING KILL SWITCH** - Non-payment = automations off

---

## Quick Reference Commands

```bash
# Check N8N workflow status
curl https://n8n.ctbusinessautomations.com/api/v1/workflows

# Test portal API connection
curl https://api.ctbusinessautomations.com/health

# View client metrics
curl https://api.ctbusinessautomations.com/metrics/[client_id]/summary

# Deploy portal updates
./deploy-portal.sh [client_name]
```

---

## 📛 Emergency Procedures

### If N8N Goes Down:
1. Switch to backup N8N instance (should be pre-configured)
2. Update portal API to point to backup
3. Notify affected clients: "Maintenance in progress, no action needed"
4. Do NOT mention technical details

### If Portal Goes Down:
1. Clients can email urgent changes to support@ctbusinessautomations.com
2. Manual config updates via N8N admin panel
3. Priority support clients get called within 1 hour

### If Both Go Down:
1. Activate manual process documentation
2. Call priority clients immediately
3. "We're upgrading systems, here's how to handle today manually..."

### Billing Integration Kill Switch:
```javascript
// In every N8N workflow
const checkBillingStatus = async () => {
  const status = await $http.get({
    url: `${$env.PORTAL_API}/billing-status/${$env.CLIENT_ID}`
  });
  
  if (status.data.status !== 'active') {
    await logActivity(
      'Automation paused. Please update billing.',
      'warning'
    );
    throw new Error('Billing not current');
  }
};
```

---

## 🚪 Client Offboarding Process

### When a Client Leaves (Make it Smooth):

1. **Export Everything (Day 1)**
   - All N8N workflows to JSON files
   - Portal configuration history
   - 12 months of metrics data
   - Activity logs in CSV format

2. **Provide Migration Package ($500 service)**
   ```
   /client-export/
     /workflows/       # N8N JSONs
     /zapier-guide/    # How to rebuild in Zapier
     /metrics/         # Their historical data
     /documentation/   # How their automations work
   ```

3. **Grace Period**
   - 30 days portal access (read-only)
   - Download their data anytime
   - One "emergency help" call included

4. **The Professional Touch**
   - "We're sad to see you go"
   - "Here's everything you need"
   - "Door's always open to come back"
   - Delete credentials after 60 days

5. **CYA Documentation**
   - Email confirming export delivered
   - Client acknowledgment of data receipt
   - Note why they left (for improvement)

---

## Support Contacts
- N8N Issues: [Your N8N support process]
- Portal Bugs: [Your debugging process]
- Emergency: [Your phone number]

---

Last Updated: January 2025
Version: 1.1