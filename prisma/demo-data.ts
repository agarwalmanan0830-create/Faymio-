import type { PrismaClient } from "@prisma/client";

const organizationId = "demo-org";
const DAY = 86_400_000;
const reference = new Date();
const day = (offset: number) => new Date(reference.getTime() + offset * DAY);

// Every person, brand, portfolio URL and booking below is fictional DEMO DATA.
const people = [
  [
    "Aanya Mehta",
    "Influencer",
    "Mumbai",
    "Beauty & skincare",
    "English, Hindi",
  ],
  [
    "Ishaan Rao",
    "UGC creator",
    "Bengaluru",
    "Lifestyle & wellness",
    "English, Kannada",
  ],
  [
    "Kavya Nair",
    "Influencer",
    "Kochi",
    "Beauty & skincare",
    "English, Malayalam",
  ],
  ["Arjun Malhotra", "Model", "Delhi", "Fashion & grooming", "English, Hindi"],
  [
    "Sana Qureshi",
    "UGC creator",
    "Hyderabad",
    "Beauty & skincare",
    "English, Hindi, Telugu",
  ],
  [
    "Devika Iyer",
    "Influencer",
    "Chennai",
    "Beauty & wellness",
    "English, Tamil",
  ],
  [
    "Rohan Bhat",
    "Actor",
    "Mumbai",
    "Lifestyle & storytelling",
    "English, Hindi, Marathi",
  ],
  ["Tara Sethi", "Model", "Delhi", "Fashion & beauty", "English, Hindi"],
  [
    "Anika Desai",
    "UGC creator",
    "Pune",
    "Skincare & routines",
    "English, Marathi",
  ],
  [
    "Vivaan Joshi",
    "Influencer",
    "Jaipur",
    "Lifestyle & grooming",
    "English, Hindi",
  ],
  [
    "Mira Fernandes",
    "Influencer",
    "Goa",
    "Beauty & travel",
    "English, Konkani",
  ],
  [
    "Neel Shah",
    "UGC creator",
    "Ahmedabad",
    "Skincare & lifestyle",
    "English, Hindi, Gujarati",
  ],
  [
    "Priya Menon",
    "Influencer",
    "Bengaluru",
    "Beauty & wellness",
    "English, Malayalam",
  ],
  ["Kabir Anand", "Model", "Mumbai", "Fashion & lifestyle", "English, Hindi"],
  [
    "Zoya Mirza",
    "UGC creator",
    "Delhi",
    "Beauty & skincare",
    "English, Hindi, Urdu",
  ],
  [
    "Rhea Kapoor",
    "Influencer",
    "Mumbai",
    "Beauty & lifestyle",
    "English, Hindi",
  ],
  [
    "Aditya Kulkarni",
    "Actor",
    "Pune",
    "Commercial & lifestyle",
    "English, Marathi",
  ],
  ["Nisha Pillai", "Model", "Chennai", "Beauty & fashion", "English, Tamil"],
  [
    "Sahil Verma",
    "UGC creator",
    "Chandigarh",
    "Grooming & lifestyle",
    "English, Hindi, Punjabi",
  ],
  [
    "Leela Dutta",
    "Influencer",
    "Kolkata",
    "Beauty & culture",
    "English, Bengali",
  ],
  [
    "Meera Bansal",
    "UGC creator",
    "Delhi",
    "Food & lifestyle",
    "English, Hindi",
  ],
  [
    "Varun Shetty",
    "Model",
    "Bengaluru",
    "Fashion & fitness",
    "English, Kannada",
  ],
  [
    "Pooja Reddy",
    "Actor",
    "Hyderabad",
    "Commercial & storytelling",
    "English, Telugu",
  ],
  ["Aarav Khanna", "Influencer", "Mumbai", "Music & culture", "English, Hindi"],
] as const;

export async function seedDemo(db: PrismaClient) {
  // Keep seeding safe to rerun without undoing changes made during a demonstration.
  if (await db.campaign.findUnique({ where: { id: "glow-lab" } })) {
    console.log(
      "Faymio DEMO DATA already exists. Existing workspace changes were preserved.",
    );
    return;
  }

  await db.$transaction(
    async (tx) => {
      await tx.organization.upsert({
        where: { id: organizationId },
        update: {},
        create: {
          id: organizationId,
          name: "Atelier Talent Agency",
          isDemo: true,
        },
      });
      await tx.user.upsert({
        where: { id: "demo-user" },
        update: {},
        create: {
          id: "demo-user",
          organizationId,
          name: "Avni Sharma",
          email: "avni@atelier.example",
        },
      });

      for (const [index, person] of people.entries()) {
        const [fullName, category, city, contentCategory, languages] = person;
        await tx.talent.create({
          data: {
            id: `talent-${index + 1}`,
            organizationId,
            fullName,
            category,
            email: `${fullName.toLowerCase().replaceAll(" ", ".")}@creator.example`,
            phone: null,
            city,
            contentCategory,
            languages,
            representation: "Atelier Talent Agency",
            links: `https://example.com/faymio/demo/portfolio/${index + 1}`,
            rateMinPaise: 500_000,
            rateMaxPaise: 1_500_000,
            availability:
              index === 22 ? "UNAVAILABLE" : index > 19 ? "AVAILABLE" : "BUSY",
            notes:
              "DEMO DATA — fictional creator profile for product demonstration. No identity or social metrics have been independently verified.",
            verified: false,
            isDemo: true,
          },
        });
      }

      const brands = [
        { id: "glow-lab-brand", name: "GlowLab Skincare" },
        { id: "aurum-brand", name: "Aurum Audio" },
        { id: "sunday-brand", name: "Sunday Studio" },
        { id: "nomad-brand", name: "Nomad Coffee" },
      ];
      for (const brand of brands) {
        await tx.brand.create({
          data: { ...brand, organizationId, isDemo: true },
        });
      }
      await tx.campaign.create({
        data: {
          id: "glow-lab",
          organizationId,
          brandId: "glow-lab-brand",
          name: "GlowLab Vitamin C Launch",
          budgetPaise: 20_000_000,
          startDate: day(-8),
          endDate: day(7),
          manager: "Avni Sharma",
          status: "ACTIVE",
          objective:
            "Introduce the new vitamin C serum through authentic beauty and lifestyle routines. DEMO DATA — fictional campaign.",
          requiredCategory: "Influencer",
          creatorCount: 20,
          deliverableBrief:
            "One Instagram reel per creator. Showcase the morning routine, product texture and key benefit. Brand approval required before publishing.",
          approvalRequired: true,
          isDemo: true,
        },
      });
      const otherCampaigns = [
        {
          id: "aurum-summer",
          brandId: "aurum-brand",
          name: "Aurum Sound of Summer",
          budgetPaise: 35_000_000,
          status: "ACTIVE",
          startDate: day(-2),
          endDate: day(20),
          requiredCategory: "UGC creator",
          creatorCount: 12,
          objective:
            "Plan a creator-led audio lifestyle launch. DEMO DATA — fictional planning campaign.",
        },
        {
          id: "sunday-edit",
          brandId: "sunday-brand",
          name: "Sunday Edit · Festive Lookbook",
          budgetPaise: 48_000_000,
          status: "DRAFT",
          startDate: day(12),
          endDate: day(32),
          requiredCategory: "Model",
          creatorCount: 8,
          objective:
            "Develop a festive editorial lookbook. DEMO DATA — fictional planning campaign.",
        },
        {
          id: "nomad-mornings",
          brandId: "nomad-brand",
          name: "Nomad Morning Stories",
          budgetPaise: 12_000_000,
          status: "COMPLETED",
          startDate: day(-30),
          endDate: day(-15),
          requiredCategory: "UGC creator",
          creatorCount: 6,
          objective:
            "Archive a fictional coffee campaign planning record. DEMO DATA — no real bookings or creator work claimed.",
        },
      ];
      for (const campaign of otherCampaigns) {
        await tx.campaign.create({
          data: {
            ...campaign,
            organizationId,
            manager: "Avni Sharma",
            deliverableBrief: "One editorial short-form video per creator.",
            approvalRequired: true,
            isDemo: true,
          },
        });
      }

      for (let i = 1; i <= 20; i++) {
        const assignmentId = `glow-assignment-${i}`;
        const published = i <= 11;
        const submitted = i >= 12 && i <= 15;
        const status = i <= 16 ? "CONFIRMED" : "INVITED";
        const dueDate = i === 16 ? day(-1) : published ? day(-3) : day(3);
        await tx.campaignAssignment.create({
          data: {
            id: assignmentId,
            organizationId,
            campaignId: "glow-lab",
            talentId: `talent-${i}`,
            task: "Create one Instagram reel",
            dueDate,
            status,
          },
        });
        await tx.deliverable.create({
          data: {
            id: `glow-deliverable-${i}`,
            organizationId,
            assignmentId,
            status: published
              ? "PUBLISHED"
              : submitted
                ? "SUBMITTED"
                : i === 16
                  ? "IN_PROGRESS"
                  : "NOT_STARTED",
            url:
              published || submitted
                ? `https://example.com/faymio/demo/reel/${i}`
                : null,
          },
        });
        if (published || submitted) {
          await tx.approval.create({
            data: {
              id: `glow-approval-${i}`,
              organizationId,
              assignmentId,
              status: published ? "APPROVED" : "PENDING",
              reviewedAt: published ? day(-4) : null,
            },
          });
        }
        await tx.paymentRecord.create({
          data: {
            id: `glow-payment-${i}`,
            organizationId,
            assignmentId,
            amountPaise: 1_000_000,
            status: i <= 8 ? "PAID" : "PENDING",
            followUp: i >= 9 && i <= 11,
          },
        });
      }

      const tasks = [
        {
          id: "glow-task-overdue-1",
          assignmentId: "glow-assignment-16",
          title: "Follow up on Rhea Kapoor’s first reel draft",
          dueDate: day(-2),
          status: "OPEN",
        },
        {
          id: "glow-task-overdue-2",
          assignmentId: "glow-assignment-12",
          title: "Collect Neel Shah’s revised campaign caption",
          dueDate: day(-1),
          status: "OPEN",
        },
        {
          id: "glow-task-review",
          assignmentId: null,
          title: "Review four submitted creator reels with the brand",
          dueDate: day(1),
          status: "OPEN",
        },
        {
          id: "glow-task-report",
          assignmentId: null,
          title: "Prepare the weekly brand progress report",
          dueDate: day(3),
          status: "OPEN",
        },
        {
          id: "glow-task-brief",
          assignmentId: null,
          title: "Confirm campaign deliverable requirements",
          dueDate: day(-6),
          status: "COMPLETED",
        },
      ];
      for (const task of tasks) {
        await tx.task.create({
          data: { ...task, organizationId, campaignId: "glow-lab" },
        });
      }

      const events = [
        [
          "activity-1",
          "Mira Fernandes published her GlowLab reel. DEMO DATA.",
          -0.03,
        ],
        [
          "activity-2",
          "Zoya Mirza submitted a reel for brand approval. DEMO DATA.",
          -0.08,
        ],
        [
          "activity-3",
          "Priya Menon submitted a reel for brand approval. DEMO DATA.",
          -0.14,
        ],
        [
          "activity-4",
          "Payment follow-up flagged for Anika Desai, Vivaan Joshi and Mira Fernandes. DEMO DATA.",
          -0.3,
        ],
        [
          "activity-5",
          "Draft reminder saved: “Hi Rhea, please share your GlowLab reel draft and an updated ETA. Thank you.” Draft only — no message sent. DEMO DATA.",
          -0.5,
        ],
        [
          "activity-6",
          "Draft brand update saved: “11 of 20 creator reels are published; four are awaiting review. We are following up on two open operational tasks.” DEMO DATA.",
          -0.7,
        ],
        [
          "activity-7",
          "Avni Sharma confirmed the GlowLab campaign brief. All records are fictional DEMO DATA.",
          -7,
        ],
      ] as const;
      for (const [id, message, offset] of events) {
        await tx.activityLog.create({
          data: {
            id,
            organizationId,
            campaignId: "glow-lab",
            message,
            createdAt: day(offset),
          },
        });
      }
      await tx.activityLog.create({
        data: {
          id: "activity-aurum",
          organizationId,
          campaignId: "aurum-summer",
          message:
            "Aurum Sound of Summer moved into planning. DEMO DATA — no talent assigned yet.",
          createdAt: day(-1),
        },
      });
    },
    { timeout: 60_000, maxWait: 10_000 },
  );

  console.log(
    "Faymio DEMO DATA seeded: 24 fictional talent, 4 fictional campaigns, GlowLab 20 assigned / 16 confirmed / 11 published / 4 pending approvals / 2 overdue tasks / 3 payment follow-ups.",
  );
}
