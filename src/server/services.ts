import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, getContext } from "./context";
import {
  assignmentSchema,
  assignmentUpdateSchema,
  campaignSchema,
  talentSchema,
  taskSchema,
} from "./validation";
const audit = (
  tx: Prisma.TransactionClient,
  organizationId: string,
  message: string,
  campaignId?: string,
) => tx.activityLog.create({ data: { organizationId, message, campaignId } });
export async function requireCampaign(id: string, organizationId: string) {
  const c = await db.campaign.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!c) throw new AppError("Campaign not found.", 404);
  return c;
}
export async function createTalent(input: unknown) {
  const { organizationId } = await getContext(),
    data = talentSchema.parse(input);
  return db.$transaction(async (tx) => {
    const talent = await tx.talent.create({
      data: { ...data, organizationId },
    });
    await audit(
      tx,
      organizationId,
      `${talent.fullName} was added to the talent workspace.`,
    );
    return talent;
  });
}
export async function updateTalent(id: string, input: unknown) {
  const { organizationId } = await getContext();
  const old = await db.talent.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!old) throw new AppError("Talent not found.", 404);
  const data = talentSchema.parse({ ...old, ...(input as object) });
  return db.$transaction(async (tx) => {
    const talent = await tx.talent.update({
      where: { id, organizationId },
      data,
    });
    await audit(
      tx,
      organizationId,
      `${talent.fullName}'s talent profile was updated${!old.verified && talent.verified ? " and manually marked verified" : ""}.`,
    );
    return talent;
  });
}
export async function deleteTalent(id: string) {
  const { organizationId } = await getContext();
  const old = await db.talent.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!old) throw new AppError("Talent not found.", 404);
  await db.$transaction(async (tx) => {
    await tx.talent.update({
      where: { id, organizationId },
      data: { deletedAt: new Date() },
    });
    await audit(
      tx,
      organizationId,
      `${old.fullName} was archived. Campaign history was retained.`,
    );
  });
  return { success: true };
}
export async function createCampaign(input: unknown) {
  const { organizationId } = await getContext();
  const { brandName, ...data } = campaignSchema.parse(input);
  return db.$transaction(async (tx) => {
    const brand = await tx.brand.upsert({
      where: { organizationId_name: { organizationId, name: brandName } },
      create: { organizationId, name: brandName },
      update: {},
    });
    const c = await tx.campaign.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        organizationId,
        brandId: brand.id,
      },
    });
    await audit(tx, organizationId, `${c.name} was created.`, c.id);
    return c;
  });
}
export async function updateCampaign(id: string, input: unknown) {
  const { organizationId } = await getContext();
  const old = await requireCampaign(id, organizationId),
    brand = await db.brand.findFirstOrThrow({
      where: { id: old.brandId, organizationId },
    });
  const { brandName, ...data } = campaignSchema.parse({
    ...old,
    brandName: brand.name,
    startDate: old.startDate.toISOString(),
    endDate: old.endDate.toISOString(),
    ...(input as object),
  });
  if (
    data.approvalRequired !== old.approvalRequired &&
    (await db.campaignAssignment.count({
      where: { campaignId: id, organizationId },
    }))
  )
    throw new AppError(
      "Approval requirements are locked after talent is assigned.",
    );
  return db.$transaction(async (tx) => {
    const b = await tx.brand.upsert({
      where: { organizationId_name: { organizationId, name: brandName } },
      create: { organizationId, name: brandName },
      update: {},
    });
    const c = await tx.campaign.update({
      where: { id, organizationId },
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        brandId: b.id,
      },
    });
    await audit(
      tx,
      organizationId,
      `${c.name} campaign details were updated.`,
      id,
    );
    return c;
  });
}
export async function deleteCampaign(id: string) {
  const { organizationId } = await getContext();
  const old = await requireCampaign(id, organizationId);
  await db.$transaction(async (tx) => {
    await tx.campaign.update({
      where: { id, organizationId },
      data: { deletedAt: new Date() },
    });
    await audit(
      tx,
      organizationId,
      `${old.name} was archived. Assignment and financial history were retained.`,
      id,
    );
  });
  return { success: true };
}
export async function assignTalent(campaignId: string, input: unknown) {
  const { organizationId } = await getContext();
  const c = await requireCampaign(campaignId, organizationId);
  if (["COMPLETED", "CANCELLED"].includes(c.status))
    throw new AppError("Reopen the campaign before assigning talent.");
  const data = assignmentSchema.parse(input);
  const talent = await db.talent.findFirst({
    where: { id: data.talentId, organizationId, deletedAt: null },
  });
  if (!talent) throw new AppError("Talent not found.", 404);
  return db.$transaction(async (tx) => {
    const a = await tx.campaignAssignment.create({
      data: {
        ...data,
        dueDate: new Date(data.dueDate),
        campaignId,
        organizationId,
        deliverable: { create: { organizationId, status: "NOT_STARTED" } },
        ...(c.approvalRequired
          ? {}
          : {
              approval: { create: { organizationId, status: "NOT_REQUIRED" } },
            }),
        payment: {
          create: {
            organizationId,
            status: "NOT_INVOICED",
            amountPaise: 0,
            followUp: false,
          },
        },
      },
    });
    await audit(
      tx,
      organizationId,
      `${talent.fullName} was invited to ${c.name}.`,
      campaignId,
    );
    return a;
  });
}
export async function updateAssignment(id: string, input: unknown) {
  const { organizationId } = await getContext(),
    data = assignmentUpdateSchema.parse(input);
  const old = await db.campaignAssignment.findFirst({
    where: {
      id,
      organizationId,
      campaign: { organizationId, deletedAt: null },
    },
    include: {
      campaign: true,
      talent: true,
      deliverable: true,
      approval: true,
      payment: true,
    },
  });
  if (!old) throw new AppError("Assignment not found.", 404);
  const nextStatus = data.status ?? old.status;
  if (
    data.url &&
    data.url !== old.deliverable?.url &&
    ["APPROVED", "PUBLISHED"].includes(old.deliverable?.status ?? "")
  )
    throw new AppError(
      "Approved or published submission links are locked to preserve the review history.",
    );
  if (data.status && data.status !== old.status) {
    const transitions: Record<string, string[]> = {
      INVITED: ["CONFIRMED", "DECLINED", "CANCELLED"],
      CONFIRMED: ["CANCELLED"],
      DECLINED: ["INVITED"],
      CANCELLED: ["INVITED"],
    };
    if (!transitions[old.status]?.includes(data.status))
      throw new AppError(
        `Cannot move ${old.status.toLowerCase()} assignment to ${data.status.toLowerCase()}.`,
      );
    if (
      data.status === "CANCELLED" &&
      ["SUBMITTED", "APPROVED", "PUBLISHED"].includes(
        old.deliverable?.status ?? "",
      )
    )
      throw new AppError(
        "Submitted work must retain its confirmed assignment.",
      );
  }
  let deliverableStatus =
    data.deliverableStatus ?? old.deliverable?.status ?? "NOT_STARTED";
  let approvalStatus = old.approval?.status ?? "NOT_REQUIRED";
  const url = data.url ?? old.deliverable?.url ?? null;
  if (
    ((data.deliverableStatus &&
      data.deliverableStatus !== old.deliverable?.status) ||
      (data.approvalStatus && data.approvalStatus !== old.approval?.status)) &&
    nextStatus !== "CONFIRMED"
  )
    throw new AppError(
      "Confirm talent before changing their deliverable or approval.",
    );
  if (
    data.deliverableStatus &&
    data.deliverableStatus !== (old.deliverable?.status ?? "NOT_STARTED")
  ) {
    const transitions: Record<string, string[]> = {
      NOT_STARTED: ["IN_PROGRESS", "SUBMITTED"],
      IN_PROGRESS: ["SUBMITTED"],
      SUBMITTED: old.campaign.approvalRequired ? [] : ["PUBLISHED"],
      APPROVED: ["PUBLISHED"],
      PUBLISHED: [],
    };
    if (
      !transitions[old.deliverable?.status ?? "NOT_STARTED"].includes(
        data.deliverableStatus,
      )
    )
      throw new AppError(
        "This deliverable transition is not allowed. Submit, review, then publish.",
      );
    if (["SUBMITTED", "PUBLISHED"].includes(data.deliverableStatus) && !url)
      throw new AppError(
        "Add an HTTP(S) deliverable URL before submitting or publishing.",
      );
    if (data.deliverableStatus === "SUBMITTED")
      approvalStatus = old.campaign.approvalRequired
        ? "PENDING"
        : "NOT_REQUIRED";
    if (
      data.deliverableStatus === "PUBLISHED" &&
      old.campaign.approvalRequired &&
      old.approval?.status !== "APPROVED"
    )
      throw new AppError("Approval is required before publishing.");
  }
  if (data.approvalStatus === "NOT_REQUIRED" && old.campaign.approvalRequired)
    throw new AppError("Content approval is required by this campaign.");
  if (data.approvalStatus && data.approvalStatus !== approvalStatus) {
    if (!old.campaign.approvalRequired)
      throw new AppError("This campaign does not require content approval.");
    if (
      !["APPROVED", "CHANGES_REQUESTED"].includes(data.approvalStatus) ||
      old.deliverable?.status !== "SUBMITTED" ||
      deliverableStatus !== "SUBMITTED" ||
      approvalStatus !== "PENDING"
    )
      throw new AppError(
        "Only a submitted deliverable with pending approval can be reviewed.",
      );
    approvalStatus = data.approvalStatus;
    deliverableStatus =
      data.approvalStatus === "APPROVED" ? "APPROVED" : "IN_PROGRESS";
  }
  // Approval is the only path to APPROVED. Non-approval campaigns publish from submitted.
  if (
    !old.campaign.approvalRequired &&
    data.deliverableStatus === "PUBLISHED" &&
    old.deliverable?.status === "SUBMITTED"
  )
    deliverableStatus = "PUBLISHED";
  const paymentStatus =
    data.paymentStatus ?? old.payment?.status ?? "NOT_INVOICED";
  const followUp =
    paymentStatus === "PAID"
      ? false
      : (data.followUp ?? old.payment?.followUp ?? false);
  if (paymentStatus === "PAID" && data.followUp === true)
    throw new AppError("Paid invoices cannot require payment follow-up.");
  if (
    paymentStatus === "PAID" &&
    (data.amountPaise ?? old.payment?.amountPaise ?? 0) <= 0
  )
    throw new AppError("Record an invoice amount before marking payment paid.");
  const changed = Object.entries(data).some(([k, v]) => {
    if (k === "deliverableStatus") return v !== old.deliverable?.status;
    if (k === "approvalStatus") return v !== old.approval?.status;
    if (k === "paymentStatus") return v !== old.payment?.status;
    if (k === "amountPaise") return v !== old.payment?.amountPaise;
    if (k === "followUp") return v !== old.payment?.followUp;
    if (k === "url") return v !== old.deliverable?.url;
    if (k === "dueDate")
      return new Date(v as string).getTime() !== old.dueDate.getTime();
    return v !== old[k as keyof typeof old];
  });
  if (!changed) return old;
  return db.$transaction(async (tx) => {
    const updated = await tx.campaignAssignment.updateMany({
      where: { id, organizationId, updatedAt: old.updatedAt },
      data: {
        status: nextStatus,
        ...(data.task !== undefined ? { task: data.task } : {}),
        ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
      },
    });
    if (updated.count !== 1)
      throw new AppError(
        "This assignment changed while you were editing. Refresh and try again.",
        409,
      );
    const a = await tx.campaignAssignment.findFirstOrThrow({
      where: { id, organizationId },
    });
    await tx.deliverable.upsert({
      where: { assignmentId: id, organizationId },
      create: {
        assignmentId: id,
        organizationId,
        status: deliverableStatus,
        url,
      },
      update: { status: deliverableStatus, url },
    });
    if (
      old.approval ||
      !old.campaign.approvalRequired ||
      deliverableStatus === "SUBMITTED" ||
      data.approvalStatus
    )
      await tx.approval.upsert({
        where: { assignmentId: id, organizationId },
        create: { assignmentId: id, organizationId, status: approvalStatus },
        update: {
          status: approvalStatus,
          ...(data.approvalStatus ? { reviewedAt: new Date() } : {}),
        },
      });
    await tx.paymentRecord.upsert({
      where: { assignmentId: id, organizationId },
      create: {
        assignmentId: id,
        organizationId,
        status: paymentStatus,
        amountPaise: data.amountPaise ?? 0,
        followUp,
      },
      update: {
        status: paymentStatus,
        ...(data.amountPaise !== undefined
          ? { amountPaise: data.amountPaise }
          : {}),
        followUp,
      },
    });
    const changes = [
      data.status ? `assignment ${nextStatus.toLowerCase()}` : "",
      data.deliverableStatus
        ? `deliverable ${deliverableStatus.toLowerCase().replaceAll("_", " ")}`
        : "",
      data.approvalStatus
        ? `review ${approvalStatus.toLowerCase().replaceAll("_", " ")}`
        : "",
      data.paymentStatus
        ? `payment recorded as ${paymentStatus.toLowerCase().replaceAll("_", " ")}`
        : "",
      data.followUp !== undefined ? "follow-up flag updated" : "",
      data.amountPaise !== undefined ? "invoice amount updated" : "",
      data.dueDate ? "deadline updated" : "",
      data.task ? "task updated" : "",
    ]
      .filter(Boolean)
      .join(", ");
    await audit(
      tx,
      organizationId,
      `${old.talent.fullName}: ${changes || "submission link updated"}.`,
      old.campaignId,
    );
    return a;
  });
}
export async function createTask(campaignId: string, input: unknown) {
  const { organizationId } = await getContext();
  await requireCampaign(campaignId, organizationId);
  const data = taskSchema.parse(input);
  if (
    data.assignmentId &&
    !(await db.campaignAssignment.findFirst({
      where: { id: data.assignmentId, campaignId, organizationId },
    }))
  )
    throw new AppError("Assignment not found in this campaign.", 404);
  return db.$transaction(async (tx) => {
    const t = await tx.task.create({
      data: {
        ...data,
        organizationId,
        campaignId,
        dueDate: new Date(data.dueDate),
      },
    });
    await audit(tx, organizationId, `Task created: ${t.title}`, campaignId);
    return t;
  });
}
export async function updateTask(id: string, status: string) {
  const { organizationId } = await getContext();
  if (!["OPEN", "COMPLETED"].includes(status))
    throw new AppError("Invalid task status.");
  const old = await db.task.findFirst({
    where: {
      id,
      organizationId,
      campaign: { organizationId, deletedAt: null },
    },
  });
  if (!old) throw new AppError("Task not found.", 404);
  if (old.status === status) return old;
  return db.$transaction(async (tx) => {
    const t = await tx.task.update({
      where: { id, organizationId },
      data: { status },
    });
    await audit(
      tx,
      organizationId,
      `${status === "COMPLETED" ? "Completed" : "Reopened"} task: ${t.title}`,
      old.campaignId,
    );
    return t;
  });
}
export async function addNote(campaignId: string, note: unknown) {
  const { organizationId } = await getContext();
  await requireCampaign(campaignId, organizationId);
  if (typeof note !== "string" || !note.trim() || note.length > 5000)
    throw new AppError("Enter a note between 1 and 5,000 characters.");
  return db.activityLog.create({
    data: {
      organizationId,
      campaignId,
      message: `Internal note: ${note.trim()}`,
    },
  });
}
export function csvCell(value: unknown) {
  const s = String(value ?? "");
  return (
    '"' +
    (/^(?:\s*[=+\-@]|[\t\r\n])/.test(s) ? "'" : "") +
    s.replaceAll('"', '""') +
    '"'
  );
}
export async function exportCampaign(id: string) {
  const { organizationId } = await getContext();
  await requireCampaign(id, organizationId);
  const assignments = await db.campaignAssignment.findMany({
    where: { campaignId: id, organizationId },
    include: { talent: true, deliverable: true, approval: true, payment: true },
  });
  const rows = [
    [
      "Talent",
      "Category",
      "Task",
      "Due date",
      "Assignment",
      "Deliverable",
      "Approval",
      "Invoice paise",
      "Payment",
      "Follow-up",
      "Submission URL",
    ],
    ...assignments.map((a) => [
      a.talent.fullName,
      a.talent.category,
      a.task,
      a.dueDate.toISOString(),
      a.status,
      a.deliverable?.status,
      a.approval?.status,
      a.payment?.amountPaise,
      a.payment?.status,
      a.payment?.followUp,
      a.deliverable?.url,
    ]),
  ];
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
