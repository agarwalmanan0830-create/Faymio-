import type { Workspace, Campaign, Assignment } from "@/types";
import { date, money } from "@/lib/utils";
export type SupportingRecord = {
  id: string;
  name: string;
  detail: string;
  campaignId: string;
  campaignName: string;
};
export type AssistantAnswer = {
  text: string;
  records: SupportingRecord[];
  campaigns: { id: string; name: string }[];
  suggestions: string[];
  draft?: string;
  mode: "demo" | "live";
  operation: string;
  notice?: string;
};
export type Operation =
  | "approvals"
  | "payments"
  | "overdue"
  | "summary"
  | "reminders"
  | "unsupported";
export function classifyOperation(message: string): Operation {
  if (/remind|draft.*(?:follow|message)|follow.?up.*draft/i.test(message))
    return "reminders";
  if (/approv/i.test(message)) return "approvals";
  if (/payment|invoice|outstanding.*money/i.test(message)) return "payments";
  if (/overdue|delay|late|behind/i.test(message)) return "overdue";
  if (
    /summary|summari[sz]e|progress|brand report|status report|status summary/i.test(
      message,
    )
  )
    return "summary";
  return "unsupported";
}
function scopeCampaigns(message: string, campaigns: Campaign[]) {
  const generic = new Set([
    "launch",
    "campaign",
    "creator",
    "creators",
    "stories",
    "brand",
    "the",
    "and",
    "new",
  ]);
  const mentioned = campaigns.filter((c) =>
    [c.name, c.brand.name].some((name) =>
      name
        .toLowerCase()
        .split(/[\s-]+/)
        .filter((p) => p.length > 3 && !generic.has(p))
        .some((p) => message.toLowerCase().includes(p)),
    ),
  );
  return mentioned.length ? mentioned : campaigns;
}
export function answerOperation(
  message: string,
  workspace: Workspace,
  operation = classifyOperation(message),
  now = new Date(),
): AssistantAnswer {
  const campaigns = scopeCampaigns(message, workspace.campaigns);
  const explicitScope = message
    .match(
      /\b(?:for|in|about)\s+(?:the\s+)?([^?.!]{2,80}?)(?:\s+campaign)?[?.!]?$/i,
    )?.[1]
    ?.trim();
  const genericScope =
    /^(?:brand|brands|campaigns?|all campaigns|workspace|this week|this week's campaign progress|overdue creators|creators|talent|overdue work)$/i;
  const unmatchedScope =
    explicitScope &&
    campaigns.length === workspace.campaigns.length &&
    !workspace.campaigns.some((c) =>
      [c.name, c.brand.name].some((n) =>
        n
          .toLowerCase()
          .split(/[\s-]+/)
          .filter((p) => p.length > 3)
          .some((p) => explicitScope.toLowerCase().includes(p)),
      ),
    ) &&
    !genericScope.test(explicitScope) &&
    !/(?:who|which|that)\s/i.test(explicitScope);
  if (unmatchedScope)
    return {
      text: `I couldn’t match “${explicitScope}” to a stored campaign. Please use a campaign or brand name from this workspace, or ask for a workspace-wide view.`,
      records: [],
      campaigns: [],
      suggestions: workspace.campaigns
        .slice(0, 3)
        .map((c) => `Show ${c.brand.name} pending approvals`),
      mode: "demo",
      operation: "unsupported",
    };
  const assignments = campaigns.flatMap((c) =>
    c.assignments.map((a) => ({ a, c })),
  );
  const record = (
    a: Assignment,
    c: Campaign,
    detail: string,
  ): SupportingRecord => ({
    id: a.id,
    name: a.talent.fullName,
    detail,
    campaignId: c.id,
    campaignName: c.name,
  });
  const base = {
    mode: "demo" as const,
    operation,
    records: [] as SupportingRecord[],
    campaigns: [] as { id: string; name: string }[],
    suggestions: [
      "Show pending approvals",
      "Which payments need follow-up?",
      "Summarize this week’s campaign progress",
    ],
  };
  const references = (records: SupportingRecord[]) => [
    ...new Map(
      records.map((r) => [
        r.campaignId,
        { id: r.campaignId, name: r.campaignName },
      ]),
    ).values(),
  ];
  if (operation === "approvals") {
    const records = assignments
      .filter(({ a }) => a.approval?.status === "PENDING")
      .map(({ a, c }) =>
        record(
          a,
          c,
          `${a.task} · Submitted for review · Due ${date(a.dueDate)}`,
        ),
      );
    return {
      ...base,
      records,
      campaigns: references(records),
      text: records.length
        ? `${records.length} content ${records.length === 1 ? "approval needs" : "approvals need"} your attention. Review the submitted links in the tracker before approving or requesting changes.`
        : "There are no pending content approvals in the selected campaigns.",
      suggestions: [
        "Draft reminders for overdue creators",
        "Prepare a summary for the brand",
      ],
    };
  }
  if (operation === "payments") {
    const records = assignments
      .filter(({ a }) => a.payment?.followUp && a.payment.status !== "PAID")
      .map(({ a, c }) =>
        record(
          a,
          c,
          `${money(a.payment!.amountPaise)} · ${a.payment!.status.toLowerCase().replace(/_/g, " ")} · Follow-up flagged`,
        ),
      );
    return {
      ...base,
      records,
      campaigns: references(records),
      text: records.length
        ? `${records.length} payment ${records.length === 1 ? "record requires" : "records require"} follow-up. These are bookkeeping flags; no payment or message has been sent.`
        : "No unpaid payment records are currently flagged for follow-up.",
    };
  }
  if (operation === "overdue" || operation === "reminders") {
    const overdue = campaigns.flatMap((c) =>
      c.tasks
        .filter((t) => t.status !== "COMPLETED" && new Date(t.dueDate) < now)
        .map((t) => ({
          t,
          c,
          a: c.assignments.find((a) => a.id === t.assignmentId),
        })),
    );
    const records = overdue.map(({ t, c, a }) => ({
      id: t.id,
      name: a?.talent.fullName || t.title,
      detail: `${t.title} · Due ${date(t.dueDate)}`,
      campaignId: c.id,
      campaignName: c.name,
    }));
    const draft =
      operation === "reminders" && overdue.length
        ? overdue
            .map(
              ({ t, c, a }) =>
                `Hi ${a?.talent.fullName.split(" ")[0] || "team"}, a quick follow-up on ${t.title.toLowerCase()} for ${c.name}, due ${date(t.dueDate)}. Could you share an update and your expected completion time? Please let us know if you need anything from our team. Thank you!`,
            )
            .join("\n\n")
        : undefined;
    return {
      ...base,
      records,
      campaigns: references(records),
      draft,
      text: records.length
        ? operation === "reminders"
          ? `I prepared ${records.length} reminder ${records.length === 1 ? "draft" : "drafts"} from open overdue tasks. Review and copy the text when ready. Nothing has been sent.`
          : `${records.length} operational ${records.length === 1 ? "task is" : "tasks are"} overdue. These records identify delayed work, not a judgment about a creator’s reliability.`
        : "There are no open overdue tasks in the selected campaigns.",
      suggestions: [
        "Show pending approvals",
        "Prepare a summary for the brand",
      ],
    };
  }
  if (operation === "summary") {
    const published = assignments.filter(
      ({ a }) => a.deliverable?.status === "PUBLISHED",
    ).length;
    const confirmed = assignments.filter(
      ({ a }) => a.status === "CONFIRMED",
    ).length;
    const pending = assignments.filter(
      ({ a }) => a.approval?.status === "PENDING",
    ).length;
    const overdue = campaigns
      .flatMap((c) => c.tasks)
      .filter(
        (t) => t.status !== "COMPLETED" && new Date(t.dueDate) < now,
      ).length;
    const weekly = /week/i.test(message);
    const weekStart = new Date(now);
    weekStart.setUTCDate(weekStart.getUTCDate() - 7);
    const recent = workspace.activity.filter(
      (a) =>
        new Date(a.createdAt) >= weekStart &&
        (!a.campaignId || campaigns.some((c) => c.id === a.campaignId)),
    );
    const text = `${campaigns.length} ${campaigns.length === 1 ? "campaign" : "campaigns"} in scope. ${confirmed} of ${assignments.length} assignments are confirmed, and ${published} deliverables are published. ${pending} approvals are pending and ${overdue} operational tasks are overdue.${weekly ? ` The activity log contains ${recent.length} updates over the past seven days. These figures describe the current stored state; historical completion trends are not available.` : ""} ${pending ? "Prioritize content reviews, then resolve overdue tasks." : "Keep upcoming deadlines and talent confirmations on track."}`;
    const records = campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      detail: `${c.assignments.filter((a) => a.deliverable?.status === "PUBLISHED").length}/${c.assignments.length} published · ${money(c.budgetPaise)} budget · ${date(c.endDate)} end date`,
      campaignId: c.id,
      campaignName: c.name,
    }));
    return {
      ...base,
      text,
      records,
      campaigns: campaigns.map((c) => ({ id: c.id, name: c.name })),
      draft: /brand|report/i.test(message)
        ? `Campaign update\n\n${text}\n\nPrepared from the Faymio demo workspace. Please review before sharing.`
        : undefined,
    };
  }
  return {
    ...base,
    text: "I can answer questions about stored campaign progress, pending approvals, overdue tasks, and payment follow-ups, or prepare reminder drafts. I cannot answer that request from the available records. Try one of the suggested questions.",
    suggestions: [
      "Show pending approvals",
      "Which creators are overdue?",
      "Prepare a summary for the brand",
    ],
  };
}
