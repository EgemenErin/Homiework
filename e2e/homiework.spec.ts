import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const ARTIFACT_DIR =
  "C:/Users/egeme/.gemini/antigravity/brain/6f3d3830-0b65-437a-bf11-5d3b6ebb2702";
const GROUP_ID = "aaaaaaaa-0000-0000-0000-000000000001";

test.beforeEach(() => {
  const dbPath = path.join(process.cwd(), ".local-db.json");
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
});

test("Full Homiework loop: landing, sign-in, handout, check-in, RSVP, backlog, crew, close week, and assign next topic", async ({
  page,
  context,
}) => {
  // 1. Mobile viewport (390x844) - Landing page
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /One topic a week, picked by one of your friends\./i,
    })
  ).toBeVisible();
  await expect(
    page.getByText(/How does the Federal Reserve set interest rates\?/i)
  ).toBeVisible();
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "01-landing-mobile.png"),
    fullPage: true,
  });

  // Desktop viewport (1280x800) - Landing page
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "02-landing-desktop.png"),
    fullPage: false,
  });

  // Switch back to mobile-first viewport (390x844)
  await page.setViewportSize({ width: 390, height: 844 });

  // 2. Invite preview page (/join/homies2026)
  await page.goto("/join/homies2026");
  await expect(page.getByRole("heading", { name: "The Homies" })).toBeVisible();
  await expect(page.getByText(/5 homies in the rotation/i)).toBeVisible();
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "03-invite-preview.png"),
    fullPage: true,
  });

  // 3. Sign in as Selin (member) first to test homework check-in & RSVP
  await page.goto("/login");
  await page.getByLabel(/Email address/i).fill("selin@homiework.test");
  await page.getByRole("button", { name: /Email me a sign-in code/i }).click();
  await expect(page.getByLabel(/6-digit code/i)).toBeVisible();
  await page.getByLabel(/6-digit code/i).fill("000000");
  await page.getByRole("button", { name: /Sign in/i }).click();

  // Redirects to /home -> /g/aaaaaaaa-0000-0000-0000-000000000001
  await page.waitForURL(`**/g/${GROUP_ID}`);
  await expect(
    page.getByRole("heading", {
      name: /How does the Federal Reserve set interest rates\?/i,
    })
  ).toBeVisible();

  // Check in ("I did the homework")
  const checkinBtn = page.getByRole("button", {
    name: /I did the homework/i,
  });
  await expect(checkinBtn).toBeVisible();
  await checkinBtn.click();
  await expect(
    page.getByText(/You did this week's homework\./i)
  ).toBeVisible();

  // RSVP "Going"
  await page.getByRole("button", { name: /^Going/i }).click();

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "04-week-handout-mobile.png"),
    fullPage: true,
  });

  // Desktop screenshot of the week handout
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "05-week-handout-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });

  // 4. Backlog tab
  await page.getByRole("link", { name: "Backlog" }).click();
  await page.waitForURL(`**/g/${GROUP_ID}/backlog`);
  await expect(
    page.getByText(/How do vaccines train the immune system\?/i)
  ).toBeVisible();

  // Suggest a new topic
  await page
    .getByLabel(/Suggest a topic/i)
    .fill("How undersea fiber cables get spliced at 4,000 meters");
  await page
    .getByLabel(/Why should we study it\?/i)
    .fill("99% of intercontinental internet runs through cables as thin as a garden hose.");
  await page.getByRole("button", { name: /Add to backlog/i }).click();
  await expect(
    page.getByText(/How undersea fiber cables get spliced at 4,000 meters/i)
  ).toBeVisible();
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "06-backlog-mobile.png"),
    fullPage: true,
  });

  // 5. Crew tab
  await page.getByRole("link", { name: "Crew" }).click();
  await page.waitForURL(`**/g/${GROUP_ID}/crew`);
  await expect(page.getByText("Ege", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Kerem", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Invite a homie/i)).toBeVisible();
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "07-crew-mobile.png"),
    fullPage: true,
  });

  // 6. Switch to Kerem (this week's host) to close Week 3
  await context.clearCookies();
  await page.goto("/login");
  await page.getByLabel(/Email address/i).fill("kerem@homiework.test");
  await page.getByRole("button", { name: /Email me a sign-in code/i }).click();
  await page.getByLabel(/6-digit code/i).fill("000000");
  await page.getByRole("button", { name: /Sign in/i }).click();
  await page.waitForURL(`**/g/${GROUP_ID}`);

  // Navigate to Close Week page
  await page.getByRole("link", { name: /Close the week/i }).click();
  await page.waitForURL(`**/g/${GROUP_ID}/close`);
  await expect(
    page.getByRole("heading", {
      name: /Close “How does the Federal Reserve set interest rates\?”/i,
    })
  ).toBeVisible();
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "08-close-week-mobile.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: /^Close the week$/i }).click();
  await page.waitForURL(`**/g/${GROUP_ID}`);

  // Verify turn advanced to Aylin for Week 4
  await expect(
    page.getByRole("heading", {
      name: /Waiting on Aylin to set the topic\./i,
    })
  ).toBeVisible();
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "09-waiting-on-host-mobile.png"),
    fullPage: true,
  });

  // 7. Switch to Aylin (Week 4 host), view the assignment form, and publish Week 4
  await context.clearCookies();
  await page.goto("/login");
  await page.getByLabel(/Email address/i).fill("aylin@homiework.test");
  await page.getByRole("button", { name: /Email me a sign-in code/i }).click();
  await page.getByLabel(/6-digit code/i).fill("000000");
  await page.getByRole("button", { name: /Sign in/i }).click();
  await page.waitForURL(`**/g/${GROUP_ID}`);

  await expect(
    page.getByRole("heading", {
      name: /It's your turn to set the homework\./i,
    })
  ).toBeVisible();
  await page.getByRole("link", { name: /Set this week's topic/i }).click();
  await page.waitForURL(`**/g/${GROUP_ID}/assign`);
  await expect(page.getByRole("button", { name: /Use this idea/i })).toBeVisible();
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "10-assign-topic-mobile.png"),
    fullPage: true,
  });

  // Pick the top backlog suggestion and publish Week 4
  await page.getByRole("button", { name: /Use this idea/i }).click();
  await page.getByRole("button", { name: /Publish topic/i }).click();
  await page.waitForURL(`**/g/${GROUP_ID}`);
  await expect(
    page.getByRole("heading", {
      name: /How do vaccines train the immune system\?/i,
    })
  ).toBeVisible();
});
