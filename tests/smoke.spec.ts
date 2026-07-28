import { test, expect } from "@playwright/test";

test("login to role home and open export", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("district@pulse.zw");
  await page.getByLabel("Password").fill("Zim2026!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Chinhoyi district pulse" })).toBeVisible({
    timeout: 15000,
  });
  await page.goto("/workflow");
  await expect(page.getByRole("heading", { name: "Workflow" })).toBeVisible();
});

test("citizen submits and tracks a service report", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("citizen@pulse.zw");
  await page.getByLabel("Password").fill("Zim2026!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Citizen services" })).toBeVisible({
    timeout: 15000,
  });
  const submitButton = page.getByRole("button", { name: "Submit service report" });
  await expect
    .poll(() =>
      submitButton.evaluate((element) =>
        Object.keys(element).some((key) => key.startsWith("__reactProps")),
      ),
    )
    .toBe(true);
  await page.getByLabel("What is happening?").fill(
    "There has been no water supply in our neighbourhood since yesterday morning.",
  );
  await page.getByLabel("Location detail").fill("Near the community clinic");
  const submission = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/citizen-reports") &&
      response.request().method() === "POST",
  );
  await submitButton.click();
  const submissionResponse = await submission;
  const submissionBody = await submissionResponse.text();
  expect(submissionResponse.status(), submissionBody).toBe(201);
  await expect(page.getByText(/^ZSP-/).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("submitted", { exact: true }).first()).toBeVisible();
});

test("municipal coverage opens a specialized operational view", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("district@pulse.zw");
  await page.getByLabel("Password").fill("Zim2026!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Chinhoyi district pulse" })).toBeVisible({
    timeout: 15000,
  });
  await page.goto("/services/roads");
  await expect(
    page.getByRole("heading", { name: "Road & infrastructure inspections" }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Operational", { exact: true }).first()).toBeVisible();
});
