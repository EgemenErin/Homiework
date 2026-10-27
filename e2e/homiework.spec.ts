import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const ARTIFACT_DIR =
  "C:/Users/egeme/.gemini/antigravity/brain/3cb6ac42-7ad4-463b-b131-0267d0900853";
const GROUP_ID = "aaaaaaaa-0000-0000-0000-000000000001";

test.beforeEach(() => {
  const dbPath = path.join(process.cwd(), ".local-db.json");
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
});

test("Phone sign-in with SMS code, account creation survey, and optional contact group discovery", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  // 1. Go to /login?next=/onboarding and sign in with a new phone number
  await page.goto("/login?next=/onboarding");
  await expect(
    page.getByRole("heading", { name: /Sign in to Homiework/i }),
  ).toBeVisible();

  await page.getByLabel(/Phone number/i).fill("+1 555 010 9999");
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "phone-01-login.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: /Text me a sign-in code/i }).click();

  // 2. Confirm SMS message preview + 6-digit code step appears
  await expect(
    page.getByText(/We texted a 6-digit code to/i),
  ).toBeVisible();
  await expect(page.getByText(/Delivered text message/i)).toBeVisible();
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "phone-02-sms-code.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: /Fill 123456/i }).click();
  await page.getByRole("button", { name: /^Sign in$/i }).click();

  // 3. Account creation: Name, ink color, and study survey
  await page.waitForURL("**/onboarding");
  await expect(
    page.getByRole("heading", { name: /First, your name/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /A quick note on how you study/i }),
  ).toBeVisible();

  await page.getByLabel(/What do your friends call you\?/i).fill("Deniz");
  await page.getByText("History", { exact: true }).click();
  await page.getByText("Tech & AI", { exact: true }).click();
  await page.getByText("Deep dives (45 min)", { exact: true }).click();
  await page.getByText("Weeknights", { exact: true }).click();
  await page
    .getByLabel(/What do you study or do during the week\?/i)
    .fill("CS student at TU Berlin");
  await page.getByText("A friend", { exact: true }).click();

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "phone-03-onboarding-survey.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: /Save and continue/i }).click();

  // 4. Optional contacts discovery step
  await expect(
    page.getByRole("heading", { name: /Find your friends' study groups/i }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: /Fill sample contacts \(Mert & Aylin\)/i })
    .click();
  await page
    .getByRole("button", { name: /Find study groups from contacts/i })
    .click();

  await expect(
    page.getByText(/Study groups with people you know/i),
  ).toBeVisible();
  await expect(page.getByText("With Aylin, Mert")).toBeVisible();

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "phone-04-contacts-matches.png"),
    fullPage: true,
  });

  // 5. Join the matched group directly from contacts
  await page.getByRole("button", { name: /Join The Homies/i }).click();
  await page.waitForURL(`**/g/${GROUP_ID}`);
  await expect(
    page.getByRole("heading", {
      name: /How does the Federal Reserve set interest rates\?/i,
    }),
  ).toBeVisible();
});

test("Full Homiework loop: landing, email sign-in, handout, check-in, RSVP, backlog, crew, close week, and assign next topic", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /One topic a week, picked by one of your friends\./i,
    }),
  ).toBeVisible();

  // Sign in as Selin via Email tab
  await page.goto("/login");
  await page.getByText("Email", { exact: true }).click();
  await page.getByLabel(/Email address/i).fill("selin@homiework.test");
  await page.getByRole("button", { name: /Email me a sign-in code/i }).click();
  await expect(page.getByLabel(/6-digit code/i)).toBeVisible();
  await page.getByLabel(/6-digit code/i).fill("123456");
  await page.getByRole("button", { name: /^Sign in$/i }).click();

  await page.waitForURL(`**/g/${GROUP_ID}`);
  await expect(
    page.getByRole("heading", {
      name: /How does the Federal Reserve set interest rates\?/i,
    }),
  ).toBeVisible();

  const checkinBtn = page.getByRole("button", {
    name: /I did the homework/i,
  });
  await expect(checkinBtn).toBeVisible();
  await checkinBtn.click();
  await expect(
    page.getByText(/You did this week's homework\./i),
  ).toBeVisible();

  await page.getByRole("button", { name: /^Going/i }).click();

  await page.getByRole("link", { name: "Backlog" }).click();
  await page.waitForURL(`**/g/${GROUP_ID}/backlog`);
  await expect(
    page.getByText(/How do vaccines train the immune system\?/i),
  ).toBeVisible();

  await page
    .getByLabel(/Suggest a topic/i)
    .fill("How undersea fiber cables get spliced at 4,000 meters");
  await page
    .getByLabel(/Why should we study it\?/i)
    .fill("99% of intercontinental internet runs through cables as thin as a garden hose.");
  await page.getByRole("button", { name: /Add to backlog/i }).click();
  await expect(
    page.getByText(/How undersea fiber cables get spliced at 4,000 meters/i),
  ).toBeVisible();

  await page.getByRole("link", { name: "Crew" }).click();
  await page.waitForURL(`**/g/${GROUP_ID}/crew`);
  await expect(page.getByText("Ege", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Kerem", { exact: true }).first()).toBeVisible();

  // Switch to Kerem (this week's host) to close Week 3
  await context.clearCookies();
  await page.goto("/login");
  await page.getByText("Email", { exact: true }).click();
  await page.getByLabel(/Email address/i).fill("kerem@homiework.test");
  await page.getByRole("button", { name: /Email me a sign-in code/i }).click();
  await page.getByLabel(/6-digit code/i).fill("123456");
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page.waitForURL(`**/g/${GROUP_ID}`);

  await page.getByRole("link", { name: /Close the week/i }).click();
  await page.waitForURL(`**/g/${GROUP_ID}/close`);
  await page.getByRole("button", { name: /^Close the week$/i }).click();
  await page.waitForURL(`**/g/${GROUP_ID}`);

  await expect(
    page.getByRole("heading", {
      name: /Waiting on Aylin to set the topic\./i,
    }),
  ).toBeVisible();

  // Switch to Aylin (Week 4 host) via Phone sign-in (+15550101004)
  await context.clearCookies();
  await page.goto("/login");
  await page.getByLabel(/Phone number/i).fill("+15550101004");
  await page.getByRole("button", { name: /Text me a sign-in code/i }).click();
  await page.getByLabel(/6-digit code/i).fill("123456");
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page.waitForURL(`**/g/${GROUP_ID}`);

  await expect(
    page.getByRole("heading", {
      name: /It's your turn to set the homework\./i,
    }),
  ).toBeVisible();
});
