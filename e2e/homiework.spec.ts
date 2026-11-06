import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const GROUP_ID = "aaaaaaaa-0000-0000-0000-000000000001";

// 1x1 valid PNG buffer for testing profile picture upload
const TINY_PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.beforeEach(() => {
  const dbPath = path.join(process.cwd(), ".local-db.json");
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
});

test("Profile picture upload and fetching number from the Phone app in onboarding and profile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  // Mock the device's native Phone / Contacts app picker on the phone itself
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "contacts", {
      configurable: true,
      value: {
        select: async (_props: string[], opts?: { multiple?: boolean }) => {
          if (opts?.multiple) {
            return [
              {
                name: ["Mert"],
                tel: ["+1 555 010 1002"],
                email: ["mert@homiework.test"],
              },
              {
                name: ["Aylin"],
                tel: ["+1 555 010 1004"],
                email: ["aylin@homiework.test"],
              },
            ];
          }
          return [
            {
              name: ["Deniz (My Card)"],
              tel: ["+1 555 010 9999"],
              email: [],
            },
          ];
        },
      },
    });
  });

  // 1. Go to /login?next=/onboarding and fetch number from the Phone app
  await page.goto("/login?next=/onboarding");
  await expect(
    page.getByRole("heading", { name: /Welcome to Homiework/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Fetch number from Phone app/i }).click();
  await expect(
    page.getByText(/Use your Phone app to fetch your number\?/i),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Allow access$/i }).click();

  await expect(page.getByLabel(/Phone number or email/i)).toHaveValue(
    "+1 555 010 9999",
  );

  await page.getByRole("button", { name: /^Continue$/i }).click();

  // 2. Confirm SMS code step
  await expect(
    page.getByRole("heading", { name: /Enter code sent to your phone/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Tap to fill/i }).click();

  // 3. Onboarding: skip intro, upload profile picture, fetch number from Phone app
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: /Skip intro/i }).click();

  await expect(
    page.getByRole("heading", { name: /What do your friends call you\?/i }),
  ).toBeVisible();

  // Upload profile picture
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: TINY_PNG_BUFFER,
  });
  await expect(
    page.getByRole("button", { name: /Change photo/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Remove photo/i }),
  ).toBeVisible();

  // Phone is already connected from Phone sign-in; test disconnecting and re-fetching from Phone app
  await expect(page.getByText("+15550109999")).toBeVisible();
  await page.getByRole("button", { name: /^Disconnect$/i }).click();

  await page.getByRole("button", { name: /Fetch number from Phone app/i }).click();
  await expect(
    page.getByText(/Use your Phone app to fetch your number\?/i),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Allow access$/i }).click();
  await expect(page.getByText("+15550109999")).toBeVisible();
  await expect(page.getByText(/\(from Phone app\)/i)).toBeVisible();

  await page.getByLabel(/Your name/i).fill("Deniz");
  await page.getByRole("button", { name: /^Continue$/i }).first().click();

  // Study step (multi-select topics + multi-select weekly homework style)
  await expect(
    page.getByRole("heading", { name: /What are you curious about\?/i }),
  ).toBeVisible();
  await page.getByText("History", { exact: true }).click();
  await page.getByText("Science", { exact: true }).click();
  await page.getByText("Quick reads (15 min)", { exact: true }).click();
  await page.getByText("Deep dives (45 min)", { exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Quick reads (15 min)" }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Deep dives (45 min)" }),
  ).toBeChecked();
  await page.getByRole("button", { name: /^Continue$/i }).first().click();

  // Schedule step (multi-select meetup times)
  await expect(
    page.getByRole("heading", { name: /When are you usually free\?/i }),
  ).toBeVisible();
  await page.getByText("Weekend afternoons", { exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Weeknights" }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Weekend afternoons" }),
  ).toBeChecked();
  await page.getByRole("button", { name: /Save and continue/i }).click();

  // 4. Switch to Join with invite and fetch friends' groups from Phone app
  await expect(
    page.getByRole("heading", { name: /Start a group/i }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Have an invite from a friend\?/i })
    .click();

  await page.getByRole("button", { name: /Fetch number from Phone app/i }).click();
  await expect(
    page.getByText(/Use your Phone app to fetch your number & contacts\?/i),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Allow access$/i }).click();

  await expect(page.getByText(/Fetched from Phone app/i).first()).toBeVisible();
  await expect(
    page.getByText(/Study groups with people you know/i),
  ).toBeVisible();
  await expect(page.getByText("With Aylin, Mert")).toBeVisible();

  await page.getByRole("button", { name: /Join The Homies/i }).click();
  await page.waitForURL(`**/g/${GROUP_ID}`);
  await expect(
    page.getByRole("heading", {
      name: /How does the Federal Reserve set interest rates\?/i,
    }),
  ).toBeVisible();

  // 5. Open /me and verify profile photo & Phone app number persist, and study survey is NOT shown on /me
  await page.getByRole("link", { name: "Me" }).click();
  await page.waitForURL("**/me**");
  await expect(
    page.getByRole("button", { name: /Change photo/i }),
  ).toBeVisible();
  await expect(page.getByText(/Fetched from Phone app/i).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /A quick note on how you study/i }),
  ).toHaveCount(0);
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

  // Sign in as Selin via unified login input
  await page.goto("/login");
  await page.getByLabel(/Phone number or email/i).fill("selin@homiework.test");
  await page.getByRole("button", { name: /^Continue$/i }).click();
  await expect(
    page.getByRole("heading", { name: /Enter code sent to your email/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Tap to fill/i }).click();

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
  await page.getByLabel(/Phone number or email/i).fill("kerem@homiework.test");
  await page.getByRole("button", { name: /^Continue$/i }).click();
  await page.getByRole("button", { name: /Tap to fill/i }).click();
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
  await page.getByLabel(/Phone number or email/i).fill("+15550101004");
  await page.getByRole("button", { name: /^Continue$/i }).click();
  await page.getByRole("button", { name: /Tap to fill/i }).click();
  await page.waitForURL(`**/g/${GROUP_ID}`);

  await expect(
    page.getByRole("heading", {
      name: /It's your turn to set the homework\./i,
    }),
  ).toBeVisible();
});
