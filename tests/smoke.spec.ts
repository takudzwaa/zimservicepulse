import { test, expect } from "@playwright/test";

test("login to role home and open export", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("district@pulse.zw");
  await page.getByLabel("PIN").fill("Zim2026!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/district pulse|Chinhoyi/i)).toBeVisible({
    timeout: 15000,
  });
  await page.goto("/workflow");
  await expect(page.getByRole("heading", { name: "Workflow" })).toBeVisible();
});
