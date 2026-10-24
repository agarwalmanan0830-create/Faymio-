import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/*
 * Runs against an isolated demonstration database, never prisma/dev.db.
 * npm run build && npm run test:e2e
 * Global setup recreates /tmp/faymio-e2e.db with checked-in migration SQL
 * and seedDemo. The developer demonstration DB is untouched.
 */
const creator = "QA Demo Creator";
const screenshots = "work/screenshots";
const waitWorkspace = async (page: Page) =>
  expect(page.getByRole("heading", { level: 1 })).toBeVisible();
const tomorrow = () =>
  new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
const yesterday = () =>
  new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

test("seeded dashboard, talent persistence, reviewed brief, assignment, approval and task journey", async ({
  page,
  request,
}) => {
  mkdirSync(screenshots, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const initial = await (await request.get("/api/workspace")).json();
  const glow = initial.campaigns.find((c: any) => c.id === "glow-lab");
  expect(glow.assignments).toHaveLength(20);
  expect(
    glow.assignments.filter((a: any) => a.status === "CONFIRMED"),
  ).toHaveLength(16);
  expect(
    glow.assignments.filter((a: any) => a.deliverable?.status === "PUBLISHED"),
  ).toHaveLength(11);
  expect(
    glow.assignments.filter((a: any) => a.approval?.status === "PENDING"),
  ).toHaveLength(4);
  expect(
    glow.tasks.filter(
      (t: any) => t.status !== "COMPLETED" && new Date(t.dueDate) < new Date(),
    ),
  ).toHaveLength(2);
  expect(
    glow.assignments.filter(
      (a: any) => a.payment?.followUp && a.payment.status !== "PAID",
    ),
  ).toHaveLength(3);
  await page.goto("/dashboard");
  await waitWorkspace(page);
  await expect(
    page
      .locator(".kpi-card")
      .filter({ hasText: "Assigned talent" })
      .locator(".kpi-number"),
  ).toContainText("20");
  await expect(
    page
      .locator(".kpi-card")
      .filter({ hasText: "Published deliverables" })
      .locator(".kpi-number"),
  ).toContainText("11");
  await page.screenshot({
    path: `${screenshots}/dashboard-desktop.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Switch to dark mode", exact: true })
    .click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await waitWorkspace(page);
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({
    path: `${screenshots}/dashboard-dark.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Switch to light mode", exact: true })
    .click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.goto("/campaigns/glow-lab");
  await expect(
    page.getByRole("heading", {
      name: "GlowLab Vitamin C Launch",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: `${screenshots}/campaign-desktop.png`,
    fullPage: true,
  });

  await page.goto("/talent");
  await waitWorkspace(page);
  await page.screenshot({
    path: `${screenshots}/talent-desktop.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Add talent", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Add talent to your roster" });
  await dialog.getByLabel("Full name *", { exact: true }).fill(creator);
  await dialog
    .getByLabel("Email address *", { exact: true })
    .fill("qa.demo@creator.example");
  await dialog.getByLabel("City *", { exact: true }).fill("Mumbai");
  await dialog
    .getByLabel("Primary content category", { exact: true })
    .fill("Beauty & lifestyle");
  await dialog.getByRole("button", { name: "Add talent", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page
    .getByRole("textbox", { name: "Search talent", exact: true })
    .fill(creator);
  await page
    .getByRole("button", { name: `View ${creator}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Edit talent profile" });
  await dialog.getByLabel("City *", { exact: true }).fill("Pune");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await waitWorkspace(page);
  await page
    .getByRole("textbox", { name: "Search talent", exact: true })
    .fill(creator);
  await expect(page.locator(".talent-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".talent-table tbody tr")).toContainText("Pune");

  await page.goto("/briefs");
  await waitWorkspace(page);
  await page
    .getByRole("textbox", { name: "Brand brief", exact: true })
    .fill(
      "Luma Skincare is launching a new vitamin C serum. We need 2 beauty creators. Budget ₹25,000. Campaign duration 10 days. Each creator should publish one Instagram reel. Brand approval is required before publishing.",
    );
  await page
    .getByRole("button", { name: "Structure this brief", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review campaign details", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Brand name", { exact: true }).fill("QA Luma Skincare");
  await page
    .getByLabel("Campaign name", { exact: true })
    .fill("QA Reviewed Campaign");
  await page.getByLabel("Campaign budget (₹)", { exact: true }).fill("25000");
  await page.getByLabel("Number of creators", { exact: true }).fill("2");
  await page.getByLabel("Duration (days)", { exact: true }).fill("10");
  await page.getByLabel("Start date", { exact: true }).fill(tomorrow());
  await page
    .getByRole("textbox", { name: "Campaign objective", exact: true })
    .fill("Introduce the vitamin C serum with a creator-led routine.");
  await page
    .getByRole("textbox", { name: "Deliverables", exact: true })
    .fill("One Instagram reel per creator.");
  await expect(
    page.getByRole("button", { name: "Create campaign", exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: `${screenshots}/brief-review-desktop.png`,
    fullPage: true,
  });
  await page
    .getByRole("checkbox", { name: /I’ve reviewed these details/ })
    .check();
  await page
    .getByRole("button", { name: "Create campaign", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "QA Reviewed Campaign", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "QA Reviewed Campaign", exact: true }),
  ).toBeVisible();

  await page.goto("/campaigns/glow-lab");
  await waitWorkspace(page);
  await page
    .getByRole("button", { name: "Assign talent", exact: true })
    .click();
  dialog = page.getByRole("dialog", { name: "Assign talent", exact: true });
  const updated = await (await request.get("/api/workspace")).json();
  const talent = updated.talent.find((t: any) => t.fullName === creator);
  await dialog
    .getByRole("combobox", { name: "Talent", exact: true })
    .selectOption(talent.id);
  await dialog
    .getByLabel("Assigned deliverable", { exact: true })
    .fill("QA Instagram reel");
  await dialog.getByLabel("Due date", { exact: true }).fill(tomorrow());
  await dialog
    .getByRole("button", { name: "Assign talent", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await page
    .getByRole("button", { name: `Manage ${creator}`, exact: true })
    .click();
  dialog = page.getByRole("dialog", { name: creator, exact: true });
  await dialog
    .getByRole("combobox", { name: "Assignment status", exact: true })
    .selectOption("CONFIRMED");
  await dialog
    .getByRole("button", { name: "Save assignment", exact: true })
    .click();
  await expect(dialog.locator(".wf-assignment-banner .badge")).toHaveText(
    "Confirmed",
  );
  await dialog
    .getByLabel("Submission URL", { exact: false })
    .fill("https://example.com/faymio/qa/reel");
  await dialog
    .getByRole("combobox", { name: "Deliverable status", exact: true })
    .selectOption("SUBMITTED");
  await dialog
    .getByRole("button", { name: "Save deliverable", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Approve", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(
    dialog.getByText("Approved for publication", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("combobox", { name: "Deliverable status", exact: true })
    .selectOption("PUBLISHED");
  await dialog
    .getByRole("button", { name: "Save deliverable", exact: true })
    .click();
  await expect(
    dialog.getByRole("combobox", { name: "Deliverable status", exact: true }),
  ).toHaveValue("PUBLISHED");
  await expect(
    dialog.getByRole("button", { name: "Save deliverable", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();
  await waitWorkspace(page);
  const row = page
    .locator(".wf-tracker-table tbody tr")
    .filter({ hasText: creator });
  await expect(row).toContainText("Published");
  const afterPublish = await (await request.get("/api/workspace")).json();
  expect(
    afterPublish.campaigns
      .find((c: any) => c.id === "glow-lab")
      .assignments.filter((a: any) => a.deliverable?.status === "PUBLISHED"),
  ).toHaveLength(12);

  await page.getByRole("tab", { name: /^Tasks/ }).click();
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  dialog = page.getByRole("dialog", {
    name: "Create operational task",
    exact: true,
  });
  await dialog.getByLabel("Task", { exact: true }).fill("QA overdue follow-up");
  await dialog.getByLabel("Due date", { exact: true }).fill(yesterday());
  await dialog
    .getByRole("button", { name: "Create task", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    page.locator(".wf-task-row").filter({ hasText: "QA overdue follow-up" }),
  ).toContainText("Overdue");
  await page.goto("/dashboard");
  await waitWorkspace(page);
  await expect(
    page.getByText("3 operational tasks are overdue", { exact: true }),
  ).toBeVisible();

  await page.goto("/assistant");
  await waitWorkspace(page);
  await page
    .getByRole("textbox", {
      name: "Ask your operations assistant",
      exact: true,
    })
    .fill("Show pending approvals.");
  await page
    .getByRole("button", { name: "Send question", exact: true })
    .click();
  await expect(
    page
      .locator(".message-text")
      .filter({ hasText: "4 content approvals need your attention" }),
  ).toBeVisible();
  await expect(page.locator(".answer-record")).toHaveCount(4);
  await expect(page.locator(".answer-record").first()).toContainText(
    "GlowLab Vitamin C Launch",
  );
  await page.screenshot({
    path: `${screenshots}/assistant-desktop.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("mobile navigation, forms and tracker remain usable without page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await waitWorkspace(page);
  await expect(
    page.getByRole("button", { name: "Open navigation", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `${screenshots}/dashboard-mobile.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Switch to dark mode", exact: true })
    .click();
  await page.reload();
  await waitWorkspace(page);
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({
    path: `${screenshots}/dashboard-mobile-dark.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Switch to light mode", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Talent", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Talent workspace/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add talent", exact: true }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Add talent to your roster" })
      .getByLabel("Full name *", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: `${screenshots}/talent-mobile.png`,
    fullPage: true,
  });
  await page.goto("/campaigns/glow-lab");
  await waitWorkspace(page);
  await page.screenshot({
    path: `${screenshots}/campaign-mobile.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "Assign talent", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Assign talent", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  for (const [route, screenshot] of [
    ["/briefs", "briefs-mobile.png"],
    ["/assistant", "assistant-mobile.png"],
  ]) {
    await page.goto(route);
    await waitWorkspace(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `${screenshots}/${screenshot}`,
      fullPage: true,
    });
  }
});
