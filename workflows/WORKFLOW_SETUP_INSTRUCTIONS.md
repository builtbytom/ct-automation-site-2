# Lead Capture Automation - Setup Instructions

## What This Does:
Captures leads from any website form and instantly:
1. Saves to Google Sheets
2. Sends thank-you email to customer  
3. Sends URGENT email alert to business owner
4. Sends push notifications (via IFTTT or Telegram)

## Import Instructions:

1. **In N8N:**
   - Click the menu (three dots, top right)
   - Select "Import from File"
   - Choose `lead-capture-no-twilio.json`

2. **Connect Your Accounts:**
   - **Google Sheets**: Click the node → Credentials → Create New
   - **Email (SMTP)**: Use client's email or SendGrid
   - **IFTTT** (optional): Free push notifications
   - **Telegram** (optional): Free instant messages

## For Each Client Setup:

### 1. Get Their Info:
- Business name
- Business email (for sending)
- Owner's email (for alerts)
- Owner's phone (for push notifications)
- Google account access

### 2. Webhook Setup:
- Copy the webhook URL from N8N
- Add to their website form as the action URL
- Test with a fake submission

### 3. Customize Messages:
- Update the thank-you email template
- Adjust the urgent alert formatting
- Set their business hours

### 4. Notification Options (Pick One):

**Option A - Email Only** (Easiest)
- Just configure SMTP
- Owner gets email alerts
- Works everywhere

**Option B - IFTTT Push** (Free)
- Client downloads IFTTT app
- Connect to "Webhooks" service
- Get push notifications

**Option C - Telegram** (Most Reliable)
- Create bot with @BotFather
- Client joins bot chat
- Instant notifications

## Testing Checklist:
- [ ] Submit test form
- [ ] Check Google Sheet updated
- [ ] Customer gets thank-you email
- [ ] Owner gets alert email
- [ ] Push notification received
- [ ] All data looks correct

## What to Charge:
- **Setup Fee**: $500-1000
- **Monthly**: $150-300
- Includes: Monitoring, updates, 100 leads/month

## Common Issues:

**Gmail blocking?**
- Use app-specific password
- Or use SendGrid (free tier)

**Not receiving alerts?**
- Check spam folder
- Whitelist the sender
- Use high priority flag

**Form not working?**
- Check webhook URL is correct
- Ensure form sends JSON
- Test with Postman first