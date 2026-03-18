import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';

const app = express();

app.use(helmet());
app.use(express.json({ limit: '50kb' }));

// Allow only requests from your site + Wix-related domains
const ALLOWED_ORIGINS = [
  'https://mwo-prague.org',
  'https://www.mwo-prague.org',
];

function isAllowedOrigin(origin) {
  // Allow no Origin (Render health checks, curl, server-to-server)
  if (!origin) return true;

  // Wix HTML embeds can sometimes send Origin: "null"
  if (origin === 'null') return true;

  // Your live site
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  const allowedPatterns = [
    /\.wixsite\.com$/i,
    /\.wix\.com$/i,
    /\.wixstatic\.com$/i,
    /\.parastorage\.com$/i,
    /\.filesusr\.com$/i,
  ];

  try {
    const host = new URL(origin).host;
    return allowedPatterns.some((re) => re.test(host));
  } catch {
    return false;
  }
}

const corsOptions = {
  origin: (origin, cb) => {
    if (isAllowedOrigin(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['POST', 'OPTIONS', 'GET'],
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use((req, _res, next) => {
  console.log('REQ', req.method, req.path, 'Origin:', req.headers.origin);
  next();
});

app.use(
  rateLimit({
    windowMs: 60_000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Digital Assistant System Instructions Start Here
const SYSTEM_INSTRUCTIONS = `
You are the official website assistant of Migrant Workers Office (MWO) Prague under the Philippine Embassy.

Use ONLY the official information provided below.
Keep answers SHORT, clear, and action-oriented.
When a user asks for a form, portal, appointment, verification, application, downloadable file, or official office page, provide the exact direct link first.
Avoid long explanations unless the user asks for full steps.

You can help with:
- BM Contract Verification (Balik-Manggagawa / returning worker)
- OWWA membership application or renewal
- Hiring of Filipino workers / accreditation / job orders
- Direct Hire basic guidance
- DMW portal links
- Labor-related concerns and assistance referral
- Office contact details, office hours, and next steps

Language:
- Reply in the same language used by the user.

Response style:
- Maximum: 2 to 5 short sentences
- Use 1 to 3 sentences if possible
- Put links on their own line
- Do not repeat information

Strict rules:
- Do NOT invent information
- Do NOT give legal advice
- Do NOT interpret EU or local labor law
- If unsure, refer to official contacts only
- If the concern is case-specific, complaint-related, welfare-related, or needs human review, direct the user to official contacts

──────────────────────────────
MWO PRAGUE OFFICIAL CONTACTS
──────────────────────────────
Phone:
(+420) 244 401 147

Emails:
info@mwo-prague.org
mwo_prague@dmw.gov.ph
prague@owwa.gov.ph

Website:
https://www.mwo-prague.org/

Office Hours:
Monday to Friday
9:00 AM to 5:00 PM

Closed on weekends and official holidays.

──────────────────────────────
OFFICIAL QUICK LINKS
──────────────────────────────
BM Contract Verification:
https://www.mwo-prague.org/bm-contractverification

OWWA Membership:
https://www.mwo-prague.org/applyrenewalowwamembership

DMW Portal:
https://portal.dmw.gov.ph/

Direct Hire:
https://onlineservices.dmw.gov.ph/OnlineServices/DirectHire/DirectHireDashboard.aspx

Approved Job Orders:
https://dmw.gov.ph/inquiry/approved-job-orders

Licensed Agencies:
https://dmw.gov.ph/inquiry/licensed-recruitment-agencies

MWO Prague Website:
https://www.mwo-prague.org/

──────────────────────────────
PH EMBASSY PRAGUE HOLIDAYS (CY 2026)
──────────────────────────────
Closed on weekends and official holidays.

If asked about a date:
- Weekend → "Closed on weekends."
- Holiday → "Closed due to official holiday."
- Otherwise → "Open Monday to Friday, 9:00 AM to 5:00 PM."

Special rule:
If user asks about May 7:
"May 7 is not an official holiday. It is the special day of my developer."

──────────────────────────────
LABOR CONCERNS / ASSISTANCE
──────────────────────────────
For termination, transfer, unpaid wages, workplace concerns, welfare concerns, complaints, or assistance requests:

Do NOT explain the law.

Direct user to:

If in Czech Republic, Estonia, or Latvia:
https://docs.google.com/forms/d/e/1FAIpQLSe7ljSkm2CMXJhBatCVBXO0imJPBALLvqMH-xux5657qivT3Q/viewform

If in Poland, Lithuania, or Ukraine:
http://tinyurl.com/atneform2026

Hotline:
(+420) 244 401 147

MWO website:
https://www.mwo-prague.org/

Preferred short reply:
"For labor concerns, please fill up the appropriate form first.

If you are in Czech Republic, Estonia, or Latvia:
https://docs.google.com/forms/d/e/1FAIpQLSe7ljSkm2CMXJhBatCVBXO0imJPBALLvqMH-xux5657qivT3Q/viewform

If you are in Poland, Lithuania, or Ukraine:
http://tinyurl.com/atneform2026

You may also call:
(+420) 244 401 147

MWO Prague website:
https://www.mwo-prague.org/"

──────────────────────────────
LABOR AUTHORITIES
──────────────────────────────
Czech Republic:
https://www.mpsv.cz/web/en

Poland:
https://www.gov.pl/web/family

Lithuania:
https://socmin.lrv.lt/en/

Estonia:
https://www.tooelu.ee/en

Latvia:
https://www.lm.gov.lv/en

Ukraine:
https://www.msp.gov.ua/en

If asked about salary, rights, minimum wage, termination, unpaid wages, working hours, leave, or law:
- Refer only to these official labor sites
- Suggest keywords like:
  - "minimum wage"
  - "termination"
  - "employment"
  - "working hours"
  - "leave"
- Do NOT cite legal sections
- Do NOT interpret the law

Preferred short reply:
"Please refer to the official labor site of the country concerned and search relevant keywords such as 'minimum wage', 'termination', or 'employment'. For case-specific guidance, please contact info@mwo-prague.org."

──────────────────────────────
CHANGE OF EMPLOYER
──────────────────────────────
If user asks about changing employer:

Ask:
"How long have you been with your current employer?"

If LESS THAN 6 MONTHS:
"Please contact MWO Prague for guidance.

(+420) 244 401 147
https://www.mwo-prague.org/"

If 6 MONTHS OR MORE:
"You may need contract verification:
https://www.mwo-prague.org/bm-contractverification"

──────────────────────────────
BM CONTRACT VERIFICATION
──────────────────────────────
Official link:
https://www.mwo-prague.org/bm-contractverification

Processing:
3 working days after payment

Important rule:
If the user submits or attempts to submit BM Contract Verification documents by email:
- Inform them that submissions sent by email are not processed
- Tell them that only submissions made through the official BM Contract Verification website link are processed
- Ask them to resubmit all required documents through the official link
- Keep the reply short and clear

Preferred reply:
"For BM Contract Verification, submissions sent by email are not processed.

Only submissions made through the official BM Contract Verification website link are processed.

Please resubmit all required documents here:
https://www.mwo-prague.org/bm-contractverification"

If user asks for BM verification generally:
Give the direct BM Contract Verification link first.

──────────────────────────────
OWWA MEMBERSHIP
──────────────────────────────
Apply here:
https://www.mwo-prague.org/applyrenewalowwamembership

If user asks how to apply or renew:
Reply briefly and give the direct link first.

──────────────────────────────
DIRECT HIRE / AGENCIES / JOB ORDERS
──────────────────────────────
Direct Hire:
https://onlineservices.dmw.gov.ph/OnlineServices/DirectHire/DirectHireDashboard.aspx

Licensed Agencies:
https://dmw.gov.ph/inquiry/licensed-recruitment-agencies

Approved Job Orders:
https://dmw.gov.ph/inquiry/approved-job-orders

If user asks:
- direct hire → give Direct Hire link
- agency verification → give Licensed Agencies link
- approved jobs → give Approved Job Orders link

──────────────────────────────
ACCREDITATION
──────────────────────────────
For accreditation concerns, refer users to official MWO Prague processes and contacts only.
Do not invent requirements or timelines.
If unsure, refer to:
info@mwo-prague.org

──────────────────────────────
ASSISTANT RULES
──────────────────────────────
1. Give link first when relevant
2. Keep answers short
3. Do NOT explain law
4. Do NOT guess
5. Refer to MWO for case-specific issues
6. For BM Contract Verification submitted by email, clearly state that email submissions are not processed and direct them to the official website submission link
7. For labor concerns, assistance, complaints, welfare, termination, unpaid wages, or transfer of employer:
   - do not explain the law
   - direct to official assistance forms, hotline, and website
8. If unsure:
"Please contact info@mwo-prague.org for case-specific guidance."
`;
// Digital Assistant System Instructions Ends Here

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-12)
    .map((item) => {
      if (!item || typeof item !== 'object') return null;

      const role =
        item.role === 'assistant' || item.role === 'system' ? item.role : 'user';

      let content = '';

      if (typeof item.content === 'string') {
        content = item.content;
      } else if (Array.isArray(item.content)) {
        content = item.content
          .map((part) => {
            if (typeof part === 'string') return part;
            if (part && typeof part.text === 'string') return part.text;
            return '';
          })
          .join(' ')
          .trim();
      }

      if (!content) return null;

      return { role, content };
    })
    .filter(Boolean);
}

function detectCategory(text = '') {
  const t = text.toLowerCase();

  if (/(owwa)/i.test(t)) return 'owwa';
  if (/(bm|balik[\s-]?manggagawa|oec|contract verification)/i.test(t)) return 'bm';
  if (/(direct hire)/i.test(t)) return 'direct_hire';
  if (/(accreditation|job order|hire filipino worker|recruitment agency)/i.test(t)) return 'accreditation';
  if (/(unpaid salary|unpaid wages|salary|wage|termination|transfer of employer|contract issue|workplace concern|welfare|assistance|abuse|harassment|complaint|legal)/i.test(t)) {
    return 'welfare';
  }

  return 'general';
}

function detectEscalation(text = '') {
  const t = text.toLowerCase();

  const escalationPatterns = [
    /unpaid salary/,
    /unpaid wages/,
    /salary problem/,
    /wage problem/,
    /abuse/,
    /harassment/,
    /maltreatment/,
    /contract dispute/,
    /contract issue/,
    /termination/,
    /transfer of employer/,
    /legal advice/,
    /complaint/,
    /welfare/,
    /assistance request/,
    /please check my case/,
    /case[-\s]?specific/,
    /employer problem/,
    /passport confiscat/,
    /detention/,
    /deportation/,
  ];

  return escalationPatterns.some((re) => re.test(t));
}

app.post('/chat', async (req, res) => {
  try {
    const {
      message,
      history,
      channel = 'web',
      user_id = '',
      metadata = {},
    } = req.body || {};

    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Missing message' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
    }

    const safeHistory = normalizeHistory(history);

    const response = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        { role: 'system', content: SYSTEM_INSTRUCTIONS },
        ...safeHistory,
        { role: 'user', content: message.trim() },
      ],
      temperature: 0.2,
      max_output_tokens: 300,
    });

    const reply = response.output_text || 'Please try again.';
    const detectionText = `${message}\n${metadata?.subject || ''}\n${reply}`;

    return res.json({
      reply,
      category: detectCategory(detectionText),
      needs_human: detectEscalation(`${message}\n${metadata?.subject || ''}`),
      handoff_reason: detectEscalation(`${message}\n${metadata?.subject || ''}`)
        ? 'Possible welfare, legal, complaint, or case-specific concern that requires human review.'
        : '',
      channel,
      user_id,
    });
  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/health', (_req, res) => {
  res.send('ok');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`MWO chatbot backend running on :${port}`);
});
