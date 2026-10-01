import { test, expect, type Page } from "@playwright/test";

// Freeze motion so screenshots are deterministic.
const STABILISE_CSS = `
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .reveal { opacity: 1 !important; transform: none !important; }
  img { transform: none !important; }
  html { scroll-behavior: auto !important; }
`;

async function preparePage(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.addStyleTag({ content: STABILISE_CSS });
  await page.evaluate(() => document.fonts.ready);
  // Load every lazy image so the full-page capture is complete.
  await page.evaluate(async () => {
    document.querySelectorAll<HTMLImageElement>("img[loading=lazy]").forEach((img) => (img.loading = "eager"));
    await Promise.all(
      Array.from(document.images).map((img) =>
        img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }),
      ),
    );
    window.scrollTo(0, 0);
  });
}

test("home page matches reference", async ({ page }) => {
  await preparePage(page);
  await expect(page).toHaveScreenshot("home-hero.png");
  await expect(page).toHaveScreenshot("home-full.png", { fullPage: true });
});

test("gallery photo viewer matches reference", async ({ page }) => {
  await preparePage(page);
  await page.locator("#gallery").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /^Open image:/ }).first().click();
  const viewer = page.getByRole("dialog", { name: "Image viewer" });
  await expect(viewer).toBeVisible();
  await expect(page).toHaveScreenshot("viewer-open.png");

  await viewer.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveScreenshot("viewer-next.png");

  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
});
