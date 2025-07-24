# CT Business Automations - Security Implementation Guide

## 🔒 Core Security Principles
1. **Defense in Depth** - Multiple layers of security
2. **Least Privilege** - Only the access needed
3. **Zero Trust** - Verify everything, trust nothing
4. **Audit Everything** - If it's not logged, it didn't happen

---

## 🛡️ Webhook Security (CRITICAL)

### Every N8N Webhook MUST Have:

```javascript
// 1. Webhook Authentication Header
{
  "name": "Webhook",
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "authentication": "headerAuth",
    "headerAuth": {
      "name": "X-Webhook-Secret",
      "value": "={{$env.WEBHOOK_SECRET_CLIENT_ID}}"
    },
    "path": "invoice-webhook-{{$env.CLIENT_ID}}",
    "responseMode": "responseNode"
  }
}

// 2. IP Whitelist Check (if possible)
{
  "name": "Verify Source IP",
  "type": "n8n-nodes-base.code",
  "parameters": {
    "code": `
      const allowedIPs = $env.ALLOWED_IPS.split(',');
      const requestIP = $input.first().json.headers['x-forwarded-for'];
      
      if (!allowedIPs.includes(requestIP)) {
        throw new Error('Unauthorized IP');
      }
      
      return $input.all();
    `
  }
}

// 3. Payload Signature Verification
{
  "name": "Verify Signature",
  "type": "n8n-nodes-base.code",
  "parameters": {
    "code": `
      const crypto = require('crypto');
      const payload = JSON.stringify($input.first().json.body);
      const signature = $input.first().json.headers['x-signature'];
      
      const expectedSig = crypto
        .createHmac('sha256', $env.WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');
      
      if (signature !== expectedSig) {
        throw new Error('Invalid signature');
      }
      
      return $input.all();
    `
  }
}
```

### Webhook URL Strategy:
```
BAD:  https://n8n.domain.com/webhook/invoice
GOOD: https://n8n.domain.com/webhook/a7f3d2-invoice-5b9c1e
BEST: https://n8n.domain.com/webhook/[random-uuid]
```

---

## 🔐 Portal API Security

### 1. Authentication & Authorization

```javascript
// API Route Protection
const protectRoute = async (req, res, next) => {
  // Check API Key
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || !isValidApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  // Verify JWT for user actions
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    // Check if user has access to this client
    if (!userHasAccessToClient(decoded.userId, req.params.clientId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### 2. Rate Limiting (Prevent Abuse)

```javascript
const rateLimit = require('express-rate-limit');

// General API limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests'
});

// Strict limit for config updates
const configLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Only 10 config updates per 15 min
  skipSuccessfulRequests: false
});

app.use('/api/', apiLimiter);
app.use('/api/config/', configLimiter);
```

### 3. Input Validation (NEVER Trust User Input)

```javascript
const { body, validationResult } = require('express-validator');

// Validate config updates
app.post('/api/config/:clientId/:automationId',
  [
    body('followUpDelay').isIn(['0', '1', '3', '7', '14', '30']),
    body('emailTemplate').isString().isLength({ max: 1000 }),
    body('excludeList').optional().isEmail(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Process valid input
  }
);
```

---

## 🗄️ Database Security

### 1. Encryption at Rest
```sql
-- Encrypt sensitive columns
CREATE TABLE client_credentials (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  service_name VARCHAR(100),
  encrypted_credentials TEXT, -- AES-256 encrypted
  iv VARCHAR(32), -- Initialization vector
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Encryption in Code
```javascript
const crypto = require('crypto');

class CredentialManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  }
  
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  decrypt(encrypted, iv, authTag) {
    const decipher = crypto.createDecipheriv(
      this.algorithm, 
      this.key, 
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

---

## 📝 Audit Logging (CYA + Compliance)

### 1. Log EVERYTHING Important
```javascript
const auditLog = async (action, details) => {
  await db.query(`
    INSERT INTO audit_logs 
    (user_id, client_id, action, details, ip_address, user_agent, timestamp)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
  `, [
    details.userId,
    details.clientId,
    action,
    JSON.stringify(details),
    details.ipAddress,
    details.userAgent
  ]);
};

// Use it everywhere
await auditLog('CONFIG_UPDATE', {
  userId: req.user.id,
  clientId: req.params.clientId,
  automation: req.params.automationId,
  changes: req.body,
  previousValues: oldConfig,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});
```

### 2. Audit Log Schema
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  client_id UUID,
  action VARCHAR(100), -- CONFIG_UPDATE, LOGIN, EXPORT_DATA, etc
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_audit_logs_client_time 
ON audit_logs(client_id, timestamp DESC);
```

---

## 🔑 Secrets Management

### 1. Environment Variable Security
```bash
# .env.production (NEVER commit this)
ENCRYPTION_KEY=64-character-hex-string
JWT_SECRET=another-long-random-string
PORTAL_API_KEY_SALT=yet-another-secret
DATABASE_ENCRYPTION_KEY=separate-from-app-encryption

# Per-client webhook secrets (store encrypted in DB)
WEBHOOK_SECRET_CLIENT_123=unique-per-client-secret
```

### 2. Secrets Rotation
```javascript
// Rotate webhook secrets monthly
const rotateWebhookSecrets = async () => {
  const clients = await getActiveClients();
  
  for (const client of clients) {
    const newSecret = crypto.randomBytes(32).toString('hex');
    
    // Update in database (encrypted)
    await updateClientWebhookSecret(client.id, newSecret);
    
    // Update in N8N (via API)
    await updateN8NEnvironmentVariable(
      `WEBHOOK_SECRET_${client.id}`,
      newSecret
    );
    
    // Audit log
    await auditLog('WEBHOOK_SECRET_ROTATED', {
      clientId: client.id,
      rotatedBy: 'system'
    });
  }
};
```

---

## 🚨 Security Monitoring

### 1. Failed Authentication Alerts
```javascript
const checkFailedLogins = async () => {
  const recentFailures = await db.query(`
    SELECT client_id, COUNT(*) as failures
    FROM audit_logs
    WHERE action = 'LOGIN_FAILED'
    AND timestamp > NOW() - INTERVAL '15 minutes'
    GROUP BY client_id
    HAVING COUNT(*) > 5
  `);
  
  if (recentFailures.rows.length > 0) {
    await sendSecurityAlert('Multiple failed login attempts detected');
  }
};
```

### 2. Unusual Activity Detection
```javascript
const detectUnusualActivity = async () => {
  // Check for config changes outside business hours
  const afterHoursChanges = await db.query(`
    SELECT * FROM audit_logs
    WHERE action = 'CONFIG_UPDATE'
    AND EXTRACT(hour FROM timestamp) NOT BETWEEN 8 AND 18
    AND timestamp > NOW() - INTERVAL '1 hour'
  `);
  
  // Check for bulk data exports
  const bulkExports = await db.query(`
    SELECT client_id, COUNT(*) as export_count
    FROM audit_logs
    WHERE action = 'DATA_EXPORT'
    AND timestamp > NOW() - INTERVAL '1 hour'
    GROUP BY client_id
    HAVING COUNT(*) > 3
  `);
};
```

---

## 🛡️ Infrastructure Security

### 1. N8N Security
```yaml
# docker-compose.yml for N8N
services:
  n8n:
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - N8N_HOST_WHITELIST_ENABLED=true
      - N8N_HOST_WHITELIST=${ALLOWED_WEBHOOK_HOSTS}
      - WEBHOOK_URL=https://n8n.ctbusinessautomations.com
    networks:
      - internal
    restart: unless-stopped
```

### 2. Network Security
```nginx
# Nginx config for N8N
server {
    listen 443 ssl http2;
    server_name n8n.ctbusinessautomations.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/domain/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security Headers
    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Block direct access to N8N UI
    location /# {
        deny all;
    }
    
    # Only allow webhook endpoints
    location /webhook/ {
        proxy_pass http://n8n:5678;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 🔒 Data Privacy & Compliance

### 1. PII Handling
```javascript
// Never log sensitive data
const sanitizeForLogging = (data) => {
  const sanitized = { ...data };
  
  // Remove sensitive fields
  delete sanitized.ssn;
  delete sanitized.creditCard;
  delete sanitized.password;
  
  // Mask emails
  if (sanitized.email) {
    sanitized.email = sanitized.email.replace(/(?<=.{3}).(?=.*@)/g, '*');
  }
  
  return sanitized;
};
```

### 2. Data Retention
```javascript
// Auto-delete old logs
const cleanupOldData = async () => {
  // Delete activity logs older than 90 days
  await db.query(`
    DELETE FROM activity_logs 
    WHERE timestamp < NOW() - INTERVAL '90 days'
  `);
  
  // Archive audit logs older than 1 year
  await db.query(`
    INSERT INTO audit_logs_archive 
    SELECT * FROM audit_logs 
    WHERE timestamp < NOW() - INTERVAL '1 year'
  `);
  
  await db.query(`
    DELETE FROM audit_logs 
    WHERE timestamp < NOW() - INTERVAL '1 year'
  `);
};
```

---

## 🚨 Security Checklist for Each Client

### Before Going Live:
- [ ] Unique API keys generated
- [ ] Webhook secrets created and stored encrypted
- [ ] SSL certificates active
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Backup encryption keys stored securely
- [ ] Test unauthorized access attempts
- [ ] Verify all passwords are hashed (bcrypt)
- [ ] Check for any hardcoded secrets
- [ ] Confirm data encryption at rest

### Monthly Security Review:
- [ ] Rotate webhook secrets
- [ ] Review audit logs for anomalies
- [ ] Check for failed login attempts
- [ ] Update dependencies (security patches)
- [ ] Test backup restoration
- [ ] Review user access permissions
- [ ] Check SSL certificate expiration

---

## 🔥 Emergency Response Plan

### If Breach Suspected:
1. **Immediately**:
   - Revoke all API keys
   - Reset all webhook secrets
   - Enable maintenance mode
   
2. **Within 1 Hour**:
   - Audit all recent access logs
   - Identify affected clients
   - Change all admin passwords
   
3. **Within 24 Hours**:
   - Notify affected clients
   - Provide incident report
   - Implement fixes

### Security Contact:
- Primary: Tom (your phone)
- Backup: (backup contact)
- Email: security@ctbusinessautomations.com

---

## 🚨 Incident Response Plan

### When a Client Reports a Security Concern:

1. **Immediate (Within 15 minutes)**
   ```bash
   # Check audit logs for unusual activity
   SELECT * FROM audit_logs 
   WHERE client_id = '[client_id]' 
   AND timestamp > NOW() - INTERVAL '24 hours'
   ORDER BY timestamp DESC;
   ```

2. **Investigate (Within 1 hour)**
   - Review all authentication attempts
   - Check for config changes
   - Verify webhook activity
   - Look for data exports

3. **Contain (If breach confirmed)**
   - Rotate affected client's secrets immediately
   - Disable compromised API keys
   - Enable enhanced logging
   - Isolate affected systems

4. **Document Everything**
   ```markdown
   ## Incident Report [DATE]
   - Reported by: [Client name]
   - Time reported: [Timestamp]
   - Nature of concern: [Description]
   - Investigation findings: [What you found]
   - Actions taken: [What you did]
   - Resolution: [How it was fixed]
   ```

5. **Professional Client Communication**
   ```
   Subject: Security Update - Your Account is Safe
   
   Hi [Client Name],
   
   Thank you for bringing this to our attention. Here's what we found:
   
   ✓ What happened: [Simple explanation]
   ✓ Impact: [None/Minimal/Specific]
   ✓ What we did: [Actions taken]
   ✓ What you need to do: [Usually nothing]
   
   Your security is our top priority. All systems are now operating normally.
   
   If you have any questions, I'm personally available at [phone].
   
   Best,
   Tom
   ```

6. **Post-Incident**
   - Update security measures if needed
   - Add to monthly review agenda
   - Consider if other clients need notification
   - Update documentation

### The Business Impact Talking Points:

When pitching to enterprise-conscious clients:

✅ **"Bank-Level Encryption"**
- AES-256 for stored credentials
- TLS 1.3 for all communications
- Encrypted backups with separate keys

✅ **"Complete Audit Trail"**
- Every configuration change logged
- IP addresses and timestamps tracked
- 1-year retention for compliance
- Exportable for your records

✅ **"Zero-Trust Security Model"**
- Every request authenticated
- API keys + JWT double verification
- Automatic secret rotation
- No implicit trust

✅ **"GDPR & Privacy First"**
- Data minimization built-in
- Right to deletion supported
- Auto-purge of old data
- PII handling protocols

✅ **"24/7 Security Monitoring"**
- Automated anomaly detection
- Failed login alerts
- Unusual activity notifications
- Monthly security reviews

✅ **"Enterprise-Grade Infrastructure"**
- 99.9% uptime SLA
- Automated backups
- Disaster recovery plan
- Separate staging environment

---

Last Updated: January 2025
Version: 1.1