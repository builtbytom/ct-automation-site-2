# N8N Contact Form Setup Instructions

## 1. Import the Workflow
- Open N8N
- Go to Workflows → Import
- Import the `n8n-contact-form-workflow-complete.json` file

## 2. Set Up Email Credentials (SMTP)
You'll need to create SMTP credentials in N8N with these settings:

### Create New SMTP Credential:
1. In the workflow, click on either email node
2. Click on "Credentials" → "Create New"
3. Use these settings:

**Connection:**
- Host: `mail.privateemail.com`
- Port: `587`
- Secure Connection: ON (STARTTLS)

**Authentication:**
- User: `tom@ctbusinessautomation.com`
- Password: `iebz-xrvk-mrfo-ealu` (the app password from Namecheap)

**Sender:**
- Email: `tom@ctbusinessautomation.com`
- Name: `Tom - CT Business Automation`

Save and test the connection.

## 3. Set Up Google Sheets Credentials
1. Click on the Google Sheets node
2. Connect your Google account (OAuth2)
3. The sheet ID and name are already configured

## 4. Activate and Test
1. Save the workflow
2. Activate it (toggle in top right)
3. Copy the webhook URL from the webhook node
4. Test with a form submission

## 5. Update Your Contact Form
The webhook URL will be something like:
`https://your-n8n-domain.com/webhook/ct-automation-contact`

Update your contact form to POST to this URL.

## What This Workflow Does:
1. **Receives** form submission via webhook
2. **Generates** smart tip based on their pain point
3. **Emails you** with all the lead details
4. **Auto-replies** to the prospect with personalized tip
5. **Logs** everything to Google Sheets
6. **Returns** success message to form

## Notes:
- Sheet ID: `1E_kOXx8_kMgZzRiz5TU4u5i2Ph42sYUYUC4sqPv2e60`
- Sheet Name: `Contact Form Submissions`
- No Slack integration (removed as requested)