# N8N Workflow Templates for CT Business Automations

## 🎯 How to Use These Templates

1. Copy the JSON template
2. Import into N8N
3. Replace `[CLIENT_ID]` with actual client ID
4. Update webhook URLs to match your setup
5. Test with sample data before going live

---

## Template 1: Invoice Follow-up Automation

### What it does:
- Checks for unpaid invoices daily
- Sends personalized follow-ups based on portal settings
- Tracks success metrics
- Updates activity feed

```json
{
  "name": "[CLIENT]_Invoice_Followup",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "hours",
              "hoursInterval": 24
            }
          ]
        }
      },
      "name": "Daily at 9 AM",
      "type": "n8n-nodes-base.scheduleTrigger",
      "position": [250, 300]
    },
    {
      "parameters": {
        "url": "={{$env.PORTAL_API}}/billing-status/{{$env.CLIENT_ID}}",
        "options": {
          "headers": {
            "X-API-Key": "={{$env.PORTAL_API_KEY}}"
          }
        }
      },
      "name": "Check Billing Status",
      "type": "n8n-nodes-base.httpRequest",
      "position": [350, 300]
    },
    {
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{$json.status}}",
              "value2": "active"
            }
          ]
        }
      },
      "name": "Is Billing Active?",
      "type": "n8n-nodes-base.if",
      "position": [450, 300]
    },
    {
      "parameters": {
        "url": "={{$env.PORTAL_API}}/config/{{$env.CLIENT_ID}}/invoice-followup",
        "options": {
          "headers": {
            "X-API-Key": "={{$env.PORTAL_API_KEY}}"
          }
        }
      },
      "name": "Get Portal Settings",
      "type": "n8n-nodes-base.httpRequest",
      "position": [450, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT * FROM invoices WHERE status = 'unpaid' AND due_date < NOW() - INTERVAL '{{$json.config.followUpDelay}} days' AND customer_email NOT IN ({{$json.config.excludeList}})"
      },
      "name": "Get Overdue Invoices",
      "type": "n8n-nodes-base.postgres",
      "position": [650, 300]
    },
    {
      "parameters": {
        "fromEmail": "={{$env.CLIENT_EMAIL}}",
        "toEmail": "={{$item.customer_email}}",
        "subject": "Reminder: Invoice #{{$item.invoice_number}}",
        "text": "={{$node['Get Portal Settings'].json.config.emailTemplate.replace('{{customer_name}}', $item.customer_name).replace('{{invoice_number}}', $item.invoice_number).replace('{{amount}}', $item.amount)}}"
      },
      "name": "Send Reminder Email",
      "type": "n8n-nodes-base.emailSend",
      "position": [850, 300]
    },
    {
      "parameters": {
        "url": "={{$env.PORTAL_API}}/activity/{{$env.CLIENT_ID}}",
        "method": "POST",
        "body": {
          "message": "Invoice reminder sent to {{$item.customer_name}} for ${{$item.amount}}",
          "type": "success"
        }
      },
      "name": "Log to Activity Feed",
      "type": "n8n-nodes-base.httpRequest",
      "position": [1050, 300]
    },
    {
      "parameters": {
        "url": "={{$env.PORTAL_API}}/metrics/{{$env.CLIENT_ID}}",
        "method": "POST",
        "body": {
          "automation": "invoice_followup",
          "tasks_completed": "={{$items().length}}",
          "time_saved_minutes": "={{$items().length * 15}}"
        }
      },
      "name": "Report Metrics",
      "type": "n8n-nodes-base.httpRequest",
      "position": [1250, 300]
    }
  ]
}
```

---

## Template 2: After-Hours Lead Capture

### What it does:
- Monitors for new inquiries outside business hours
- Sends immediate auto-response
- Notifies owner via SMS
- Tracks revenue opportunities

```json
{
  "name": "[CLIENT]_AfterHours_Lead_Capture",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "{{$env.WEBHOOK_PATH_RANDOM}}",
        "authentication": "headerAuth",
        "headerAuth": {
          "name": "X-Webhook-Secret",
          "value": "={{$env.WEBHOOK_SECRET_CLIENT_ID}}"
        },
        "options": {
          "responseData": "allEntries"
        }
      },
      "name": "Lead Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300]
    },
    {
      "parameters": {
        "functionCode": "const crypto = require('crypto');\nconst payload = JSON.stringify($input.first().json.body);\nconst signature = $input.first().json.headers['x-signature'];\n\nconst expectedSig = crypto\n  .createHmac('sha256', $env.WEBHOOK_SECRET_CLIENT_ID)\n  .update(payload)\n  .digest('hex');\n\nif (signature !== expectedSig) {\n  throw new Error('Invalid webhook signature');\n}\n\nreturn $input.all();"
      },
      "name": "Verify Signature",
      "type": "n8n-nodes-base.code",
      "position": [350, 300]
    },
    {
      "parameters": {
        "url": "={{$env.PORTAL_API}}/config/{{$env.CLIENT_ID}}/business-hours",
        "options": {
          "headers": {
            "X-API-Key": "={{$env.PORTAL_API_KEY}}"
          }
        }
      },
      "name": "Get Business Hours",
      "type": "n8n-nodes-base.httpRequest",
      "position": [450, 300]
    },
    {
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{$now.hour() < $json.config.startHour || $now.hour() > $json.config.endHour || $now.weekday() === 0 || $now.weekday() === 6}}",
              "value2": true
            }
          ]
        }
      },
      "name": "Is After Hours?",
      "type": "n8n-nodes-base.if",
      "position": [650, 300]
    },
    {
      "parameters": {
        "fromEmail": "={{$env.CLIENT_EMAIL}}",
        "toEmail": "={{$json.email}}",
        "subject": "We received your message!",
        "text": "={{$node['Get Business Hours'].json.config.autoResponseMessage}}"
      },
      "name": "Send Auto Response",
      "type": "n8n-nodes-base.emailSend",
      "position": [850, 200]
    },
    {
      "parameters": {
        "message": "New after-hours lead from {{$json.name}}. Estimated value: ${{$json.estimatedValue}}",
        "toNumber": "={{$env.OWNER_PHONE}}"
      },
      "name": "SMS to Owner",
      "type": "n8n-nodes-base.twilio",
      "position": [850, 400]
    },
    {
      "parameters": {
        "url": "={{$env.PORTAL_API}}/activity/{{$env.CLIENT_ID}}",
        "method": "POST",
        "body": {
          "message": "After-hours lead from {{$json.name}} captured and responded",
          "type": "capture",
          "revenue": "={{$json.estimatedValue}}"
        }
      },
      "name": "Log Activity",
      "type": "n8n-nodes-base.httpRequest",
      "position": [1050, 300]
    }
  ]
}
```

---

## Template 3: Customer Onboarding

### What it does:
- Triggers when new customer added
- Executes customizable onboarding steps
- Sends welcome materials
- Schedules follow-ups

```json
{
  "name": "[CLIENT]_Customer_Onboarding",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "new-customer-{{$env.CLIENT_ID}}"
      },
      "name": "New Customer Trigger",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300]
    },
    {
      "parameters": {
        "url": "={{$env.PORTAL_API}}/config/{{$env.CLIENT_ID}}/onboarding",
        "options": {
          "headers": {
            "X-API-Key": "={{$env.PORTAL_API_KEY}}"
          }
        }
      },
      "name": "Get Onboarding Config",
      "type": "n8n-nodes-base.httpRequest",
      "position": [450, 300]
    },
    {
      "parameters": {
        "amount": "={{$json.config.welcomeDelay}}",
        "unit": "minutes"
      },
      "name": "Wait for Delay",
      "type": "n8n-nodes-base.wait",
      "position": [650, 300]
    },
    {
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{$json.config.sendWelcomeEmail}}",
              "value2": true
            }
          ]
        }
      },
      "name": "Should Send Welcome?",
      "type": "n8n-nodes-base.if",
      "position": [850, 300]
    },
    {
      "parameters": {
        "fromEmail": "={{$env.CLIENT_EMAIL}}",
        "toEmail": "={{$node['New Customer Trigger'].json.email}}",
        "subject": "Welcome to {{$env.CLIENT_NAME}}!",
        "text": "={{$json.config.welcomeEmailTemplate}}"
      },
      "name": "Send Welcome Email",
      "type": "n8n-nodes-base.emailSend",
      "position": [1050, 200]
    }
  ]
}
```

---

## Critical Integration Code Snippets

### 1. Always Start With Config Fetch
```javascript
// In Code node
const config = await $http.get({
  url: `${$env.PORTAL_API}/config/${$env.CLIENT_ID}/${automationType}`,
  headers: { 'X-API-Key': $env.PORTAL_API_KEY }
});

// Use config values
const delay = config.data.followUpDelay;
const template = config.data.emailTemplate;
```

### 2. Activity Logging Pattern
```javascript
// Success
await logActivity(
  `Invoice #${invoiceNumber} reminder sent`,
  'success'
);

// Warning
await logActivity(
  `Email to ${email} bounced - needs attention`,
  'warning'
);

// Revenue Capture
await logActivity(
  `After-hours lead from ${name} captured`,
  'capture',
  estimatedValue
);
```

### 3. Metric Tracking Pattern
```javascript
// At end of workflow
const metrics = {
  automation: 'invoice_followup',
  tasks_completed: processedItems.length,
  time_saved_minutes: processedItems.length * avgTimePerTask,
  timestamp: new Date().toISOString()
};

await $http.post({
  url: `${$env.PORTAL_API}/metrics/${$env.CLIENT_ID}`,
  body: metrics
});
```

### 4. Error Handling Pattern
```javascript
try {
  // Main workflow logic
} catch (error) {
  await logActivity(
    `Automation error: ${error.message}`,
    'error'
  );
  
  // Still report partial metrics
  await reportMetrics({
    automation: automationType,
    tasks_completed: successCount,
    tasks_failed: failCount
  });
  
  throw error; // Re-throw to mark workflow as failed
}
```

---

## Environment Variables Required

```bash
# In N8N settings for each client
CLIENT_ID=unique-client-identifier
CLIENT_NAME=Connecticut Pizza Co
CLIENT_EMAIL=noreply@clientdomain.com
OWNER_PHONE=+18605551234
PORTAL_API=https://api.ctbusinessautomations.com
PORTAL_API_KEY=generated-api-key-for-client
```

---

## Testing Checklist

Before going live with any workflow:

- [ ] Import and configure all environment variables
- [ ] Test portal API connection
- [ ] Run with test data
- [ ] Verify metrics tracking
- [ ] Check activity feed updates
- [ ] Test error scenarios
- [ ] Confirm email/SMS delivery
- [ ] Validate all portal settings are respected

---

Last Updated: January 2025