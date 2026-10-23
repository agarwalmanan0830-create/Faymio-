
You are an expert founding engineer, full-stack developer, AI product architect, and award-winning UI/UX designer.

Your task is to design and BUILD a fully functional, professional, modern, investor-demo-ready MVP web application for my startup named FAYMIO.

Do not produce only a proposal, wireframe, UI mockup, or static HTML landing page. Build the actual working application in the current project, including the frontend, backend, database, real CRUD functionality, sample data, and AI integration architecture.

Work autonomously within the project, make sensible technical decisions, and complete the implementation as far as the available environment allows.

==================================================
1. ABOUT THE STARTUP
==================================================

Company name: FAYMIO
Tagline: The Professional World of Entertainment.
Secondary tagline: Where Talent Meets Opportunity.

Faymio is an AI-powered professional talent operations platform, designed to eventually connect three main groups:

1. TALENT
   Influencers, actors, commercial models, UGC creators, and other creative professionals.

2. COMMERCIAL BUYERS
   Brands, advertisers, production houses, studios, and companies hiring creative talent.

3. INDUSTRY INTERMEDIARIES
   Talent agencies, casting directors, artist managers, and creative production teams.

The long-term product vision combines:
- Professional talent portfolios
- Verified professional identities
- Commercial talent discovery and matching
- AI-assisted campaign and casting operations
- Scheduling and collaboration
- Booking and commercial workflow management
- Verified work histories

However, DO NOT attempt to build the entire future marketplace in this MVP.

Our immediate business goal is to sell AI-powered workflow software to talent agencies and production teams.

FAYMIO MVP 1.0 must solve this problem:

"Agencies spend too much time manually coordinating creator campaigns, tracking deliverables, managing approvals, following up with talent, and preparing project reports."

The MVP should make this work faster, clearer, and easier to manage.

It must be genuinely useful even when the AI API is not configured.

==================================================
2. DESIGN DIRECTION
==================================================

Faymio must have a unique, modern, premium, professional visual identity.

The design should feel like a polished commercial SaaS product with entertainment-industry sophistication.

Take high-level inspiration from:
- Linear: clean product design and navigation
- Notion: clarity and organized workflows
- Vercel: technical sophistication
- Apple: typography, whitespace and refinement
- Modern editorial fashion platforms: professional imagery and tasteful presentation

Do NOT clone these products.

Brand personality:
- Premium
- Modern
- Creative
- Trustworthy
- Intelligent
- International
- Minimalistic
- Professional

COLOR SYSTEM

Primary background:
#F7F7F5

Dark surfaces:
#12141C

Primary accent:
#7967ED

Secondary lavender:
#D9D2FF

Primary text:
#171821

Muted text:
#87908F

Borders:
#E7E7EA

Success:
#118A64

Warning:
#C98929

Error:
#D55252

Create semantic design tokens so changing the theme is easy.

Use a modern professional font such as Geist or Inter.

TYPOGRAPHY
- Large, elegant page titles
- Strong hierarchy
- Comfortable spacing
- Small but highly legible metadata
- Clear labels
- Consistent number formatting
- No cluttered or excessively decorative UI

LAYOUT
- Fixed or collapsible left sidebar on desktop
- Compact top navigation
- Main dashboard content area
- Responsive mobile navigation
- Beautiful cards
- Subtle borders and shadows
- Professional tables
- Clear empty states
- Loading skeletons
- Useful toast notifications
- Keyboard-accessible controls
- Light and dark mode

Create a simple custom Faymio wordmark and an original geometric symbol.

Do not use another company's logo or copyrighted brand asset.

Use realistic initials or clean professional avatar placeholders where profile photographs are unavailable.

Prioritize elegant, high-quality execution over excessive animation.

==================================================
3. TECHNOLOGY STACK
==================================================

Use a practical modern full-stack TypeScript architecture.

Preferred stack:

Frontend and backend:
- Next.js with App Router
- TypeScript
- React
- Tailwind CSS

UI:
- shadcn/ui
- Lucide icons
- Recharts for dashboard charts

Database:
- Prisma ORM
- SQLite for easy local development
- Organization-scoped schema designed for later PostgreSQL migration

Validation:
- Zod

Testing:
- Vitest for important logic
- Playwright for critical end-to-end journeys where feasible

AI:
- Server-side AI provider adapter
- Optional OpenAI API integration through environment variables
- Deterministic demo fallback when no API credentials are available

Use compatible, stable dependency versions.

If a preferred package has a compatibility problem, select a stable alternative and document the decision.

Never expose API keys in browser code.

Never hard-code secrets.

Use environment variables and provide a .env.example file.

Do not require paid infrastructure for the local demo.

==================================================
4. PRIMARY MVP SCREENS
==================================================

Build FIVE core application screens.

SCREEN 1: PROJECT OVERVIEW

Route:
 /dashboard

This is the main operations command center.

Display:

KPI cards:
- Active campaigns
- Total assigned talent
- Confirmed talent
- Completed deliverables
- Pending approvals
- Overdue tasks
- Payments needing follow-up

Charts:
- Campaign progress
- Deliverables by status
- Upcoming deadlines

Additional sections:
- Recent activity
- Priority action queue
- Campaign list
- Quick actions
- AI-generated status summary

Example action queue:
"2 creator submissions are overdue."
"4 content approvals require attention."
"3 payments need follow-up."

The statistics must be calculated from persisted records, not hard-coded display text.

Clicking any KPI should open a relevant filtered list or page.

SCREEN 2: TALENT WORKSPACE

Route:
 /talent

Build a professional talent management database.

A record can represent:
- Influencer
- Model
- Actor
- UGC creator

Fields:
- Full name
- Professional category
- Email
- Phone (optional)
- City
- Social or portfolio links
- Primary content category
- Languages
- Management or representation
- Commercial rate range (optional)
- Availability status
- Professional notes
- Verification status (manual flag only)
- Created and updated timestamps

Features:
- Add talent
- Edit talent
- Delete talent with confirmation
- Search
- Filter by category
- Filter by city
- Filter by availability
- Talent detail drawer or profile page
- View assigned campaigns
- View project history

Do not pretend talent identities or social metrics have been independently verified.

A verification badge should appear only if a human has explicitly marked the record verified.

For MVP, talent records are managed by agencies. Do not build public talent registration or social networking.

SCREEN 3: AI BRIEF ASSISTANT

Route:
 /briefs

The user can paste a brand brief in plain text.

Example:

"GlowLab Skincare is launching a new vitamin C serum. We need 20 beauty and lifestyle creators. Budget ₹2,00,000. Campaign duration 15 days. Each creator should publish one Instagram reel. Brand approval is required before publishing."

The AI assistant should extract:

- Brand name
- Campaign name
- Campaign objective
- Campaign budget
- Required talent category
- Number of creators
- Deliverables
- Approval requirements
- Timeline
- Important missing information

Display the extracted information in an editable structured form.

The user must REVIEW AND CONFIRM before saving.

Allow creating a new campaign from the confirmed brief.

Add:
- Clear AI processing status
- Validation feedback
- Missing-information warnings
- Regenerate option
- Manual entry fallback
- Save draft
- Create campaign button

AI DESIGN:

When OPENAI_API_KEY is available:
- Call the model on the server.
- Require schema-validated structured output.
- Never let the model directly modify database records.
- Use suitable rate limiting and error handling.

When OPENAI_API_KEY is missing:
- Provide a clearly labeled "Demo AI mode".
- Use deterministic parsing and sample fixtures.
- Keep the complete workflow usable.

Do not present simulated AI responses as live model-generated intelligence.

SCREEN 4: EXECUTION TRACKER

Route:
 /campaigns/[id]

This is the most important operational screen.

Display campaign details:
- Name
- Brand
- Budget
- Timeline
- Campaign manager
- Current status
- Assigned creators
- Deliverables
- Pending approvals
- Outstanding tasks

Create a table with:

Talent
Category
Assigned task
Due date
Assignment status
Deliverable status
Approval status
Payment status
Actions

Possible assignment statuses:
- Invited
- Confirmed
- Declined
- Cancelled

Possible deliverable statuses:
- Not started
- In progress
- Submitted
- Approved
- Published

Approval statuses:
- Not required
- Pending
- Approved
- Changes requested

Features:
- Assign talent to campaign
- Update status
- Submit deliverable URL
- Review submission
- Approve or request changes
- Add deadline
- Create task
- Add internal note
- Mark follow-up needed
- Record invoice amount
- Track payment status
- View campaign history
- Export campaign CSV

When a status changes:
- Persist the change
- Update related KPIs
- Add an activity log entry
- Refresh the relevant UI

Include an approvals queue with working actions.

Never send messages or make financial payments automatically.

Implement sensible transition validation so impossible workflow states are not accepted.

SCREEN 5: AI OPERATIONS COPILOT

Route:
 /assistant

Create an AI-assisted operations workspace with a premium chat-style interface.

The user should be able to ask questions such as:

"Which creators are delaying the skincare campaign?"

"Show pending approvals."

"Which payments need follow-up?"

"Prepare a summary for the brand."

"Draft reminders for creators who are overdue."

"Summarize this week's campaign progress."

The assistant should use actual application database records for factual answers.

For structured questions, prefer deterministic database queries over model guesses.

The AI may convert a user request into a supported read-only operation, but the application must validate it.

Display:
- User message
- Assistant response
- Related campaign references
- Relevant supporting records
- Suggested next actions

Allow suggested follow-up text to be copied.

Do NOT automatically send emails, WhatsApp messages, or external messages.

If the request cannot be answered from available data, the assistant must say so clearly.

When no AI key exists:
- Support a useful set of predefined operational questions
- Show relevant database-backed responses
- Label the experience as Demo AI mode
- Avoid pretending arbitrary free-text requests were genuinely answered by a live LLM

==================================================
5. SAMPLE CAMPAIGN
==================================================

Seed the application with a fictional campaign:

Campaign:
GlowLab Vitamin C Launch

Brand:
GlowLab Skincare

Campaign budget:
₹2,00,000

Duration:
15 days

Total assigned creators:
20

Confirmed creators:
16

Completed/published creator deliverables:
11

Pending content approvals:
4

Overdue operational tasks:
2

Payments requiring follow-up:
3

IMPORTANT:
These numbers must arise consistently from actual seeded database records.

Suggested assignment distribution:
- 11 confirmed creators with published deliverables
- 4 confirmed creators with submitted deliverables awaiting approval
- 1 additional confirmed creator with incomplete work
- 4 creators still invited

Total = 20

Represent the 2 overdue tasks and 3 payment follow-ups using separate task and payment records linked to those creators.

Define "completed" as successfully published or otherwise explicitly completed according to the campaign requirements.

Use a consistent reference date or dates relative to the current system date so overdue calculations work correctly.

Create realistic fictional Indian creator names and fictional portfolio data.

Clearly mark all seeded data as DEMO DATA.

Never imply these are real celebrities, clients or bookings.

Also seed:
- A few other fictional campaigns
- Relevant talent profiles
- Sample tasks
- Activity records
- Draft follow-up messages

==================================================
6. DATABASE MODEL
==================================================

Create a well-structured relational database.

Core entities should include:

Organization
User
Talent
Brand
Campaign
CampaignAssignment
Deliverable
Approval
Task
PaymentRecord
ActivityLog
AIRequestLog

Support organization_id fields to prepare for future multi-tenant usage.

Every organization-scoped query and mutation must consistently enforce organization ownership.

Do not trust organization IDs directly supplied by the browser without verifying access.

For the initial local demo, a single seeded demonstration organization is acceptable.

Clearly isolate demo access from any future real-customer deployment.

Avoid advertising demo-only access as production-grade authentication.

Document what additional authentication, authorization, security and infrastructure work is required before onboarding real customers.

Store dates consistently.

Represent money in integer paise or another documented fixed-precision format, not JavaScript floating-point values.

Support soft deletion or appropriate audit retention for important business records.

==================================================
7. USER EXPERIENCE
==================================================

Create a polished onboarding and demonstration experience.

Initial app load:
- Faymio branding
- Sample agency workspace
- Overview dashboard populated with demonstration data

Left navigation:
- Overview
- Campaigns
- Talent
- AI Briefs
- AI Assistant
- Activity
- Settings

The five primary screens must be complete.

Activity and Settings may be simpler supporting screens, but must not contain dead-end controls.

Dashboard interactions:
- Search campaigns
- Filter campaigns
- Open campaign detail
- Create a campaign
- Assign talent
- Change statuses
- Open the approvals queue
- Review activity
- Generate brief summary
- Draft a follow-up
- Export data

Implement:
- Toast notifications
- Confirmation dialogs
- Form validation
- Saving indicators
- Useful empty states
- Error states
- Accessible labels
- Keyboard navigation
- Responsive layouts

Support rupee currency formatting and Indian date conventions.

Use tasteful transitions.

No fake buttons or controls that imply functionality they do not actually have.

If a feature is unavailable, clearly label it as planned rather than presenting it as active.

==================================================
8. IMPORTANT PRODUCT RULES
==================================================

The product must be realistic about what AI can and cannot do.

AI may:
- Analyze supplied briefs
- Structure data
- Summarize campaign progress
- Identify overdue tasks
- Draft messages
- Suggest operational next steps

AI must NOT:
- Automatically sign contracts
- Automatically negotiate binding commitments
- Execute payments
- Send messages without approval
- Publicly disclose private talent data
- Make sensitive personal judgments
- Fabricate booking history or social metrics

Maintain a human approval step for commercial or externally visible actions.

The demo must work without scraping Instagram or using unofficial platform APIs.

Do not build a real payment gateway, social feed, public casting marketplace, messaging infrastructure, or autonomous booking agent.

Do not introduce unnecessary microservices.

Keep the architecture clean enough for later expansion without overengineering.

==================================================
9. INVESTOR-DEMO QUALITY
==================================================

This product will be shown to:
- Potential co-founders
- Talent managers
- Agency owners
- Casting directors
- Brands
- Early investors

It should feel credible and commercially useful.

Prioritize:
- Consistent branding
- Smooth navigation
- Impressive but readable dashboards
- Working interactions
- Beautiful status components
- Realistic sample workflows
- Clear value proposition
- Minimal visual clutter

Include a discreet "Demo workspace" label.

Do not fabricate testimonials, customer counts, company revenue, partnership logos, or live AI claims.

Use premium microcopy.

Avoid unnecessary AI buzzwords in the UI.

==================================================
10. TESTING AND COMPLETION
==================================================

Build the application, not just its design.

Ensure the following flows actually work:

TEST A:
Load the overview dashboard and verify all campaign metrics match the database.

TEST B:
Create a new talent profile, edit it, search for it, and confirm persistence.

TEST C:
Paste a campaign brief, review extracted fields, modify them, and create a campaign.

TEST D:
Assign talent to an existing campaign and verify the assignment appears in the tracker.

TEST E:
Submit a deliverable, approve it, and verify campaign progress updates.

TEST F:
Create an overdue task and verify it appears in the dashboard action queue.

TEST G:
Ask the operations assistant for pending approvals and receive a response grounded in real stored records.

TEST H:
Reload the browser and confirm previously saved changes persist.

TEST I:
Verify mobile layout and desktop layout.

TEST J:
Verify that one organization cannot access another organization's records through manipulated IDs, if multi-organization access is implemented.

Write appropriate unit and integration tests.

If Playwright is available, create and run smoke tests for the main user journey.

Fix build, TypeScript, runtime and database errors before finishing.

==================================================
11. DELIVERABLES
==================================================

At completion provide:

1. A working local application.
2. All source code organized into sensible folders.
3. Database schema and migrations.
4. Seed script.
5. Functional dashboard with sample data.
6. All five core screens.
7. AI adapter and safe demo fallback.
8. Responsive design.
9. .env.example.
10. README with installation and run instructions.
11. Test commands and test results.
12. A concise list of features implemented.
13. A list of intentionally deferred features.
14. Known limitations and production-readiness requirements.

Prefer a clean modular structure such as:

src/
  app/
  components/
    layout/
    dashboard/
    campaigns/
    talent/
    briefs/
    assistant/
    ui/
  lib/
    ai/
    db/
    validation/
    permissions/
    utilities/
  server/
    services/
    repositories/
  types/

prisma/
  schema.prisma
  seed.ts

tests/

public/

You can modify this structure if technically appropriate.

==================================================
12. DEVELOPMENT INSTRUCTIONS
==================================================

First inspect the current project.

If it already contains a useful application, preserve reusable work rather than deleting everything unnecessarily.

If it is empty, scaffold the application.

Create a concise implementation plan, then execute it.

Implement the project in working increments:
1. Project setup and visual system
2. Database and seeded demonstration data
3. Dashboard and navigation
4. Talent and campaign CRUD
5. Brief assistant
6. Execution and approvals
7. Operations copilot
8. Testing and polish

Do not stop after creating a plan.

Do not ask unnecessary product-design questions.
Make reasonable decisions based on the requirements.

Do not claim a feature is complete until it is implemented and checked.

Run the appropriate install, migration, seed, typecheck, lint, tests and build commands where possible.

If a command cannot run due to environment restrictions, document that limitation rather than claiming success.

Make it possible to start locally with clear commands in the README.

Finally, summarize what was built, provide the commands to run it, explain what is demonstrated versus production-ready, and identify the next highest-value product improvements.

SUCCESS CONDITION:

I should be able to open Faymio locally, view a beautiful professional dashboard, manage a sample skincare campaign, add talent, track deliverables and approvals, create a campaign from a brief, and use an AI-assisted operations interface.

All important workflows should persist to the database and behave consistently.

Build Faymio as a serious early-stage SaaS product, not a decorative prototype.
