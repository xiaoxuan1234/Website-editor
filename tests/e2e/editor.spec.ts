import { expect, test, type Locator, type Page } from "@playwright/test";

const login = async (page: Page) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/login");

  await page.getByTestId("login-username").fill("admin");
  await page.getByTestId("login-password").fill("admin123");
  await page.getByTestId("login-submit").click();

  await expect(page).toHaveURL(/\/editor/);
  await expect(page.getByTestId("canvas-root")).toBeVisible();
};

const dragPaletteTo = async (
  page: Page,
  nodeType: string,
  target: Locator,
  yRatio = 0.25
) => {
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());

  await page.getByTestId(`palette-item-${nodeType}`).dispatchEvent("dragstart", {
    dataTransfer,
  });

  const box = await target.boundingBox();
  if (!box) {
    throw new Error("Drop target is not visible");
  }

  const clientX = box.x + box.width / 2;
  const clientY = box.y + Math.max(6, Math.min(box.height - 6, box.height * yRatio));

  await target.dispatchEvent("dragover", {
    dataTransfer,
    clientX,
    clientY,
  });
  await target.dispatchEvent("drop", {
    dataTransfer,
    clientX,
    clientY,
  });
};

const clickByTestId = async (page: Page, testId: string) => {
  const target = page.getByTestId(testId);
  await expect(target).toBeVisible();
  await target.evaluate((element) => {
    (element as HTMLElement).click();
  });
};

test("drag root/container + duplicate/delete + undo/redo", async ({ page }) => {
  await login(page);

  const rootItems = page.locator("[data-testid^='root-item-']");
  const rootCountBefore = await rootItems.count();

  await dragPaletteTo(page, "container", page.getByTestId("canvas-root"));
  await expect(rootItems).toHaveCount(rootCountBefore + 1);

  const containerNode = page.locator("[data-node-type='container']").first();
  await expect(containerNode).toBeVisible();

  const containerDropzone = containerNode.locator("[data-testid^='container-dropzone-']").first();
  await dragPaletteTo(page, "text", containerDropzone);
  await expect(containerNode.locator("[data-node-type='text']")).toHaveCount(1);

  const titleNode = page.locator("[data-node-type='title']").first();
  await titleNode.click();

  await clickByTestId(page, "topbar-duplicate");
  await expect(rootItems).toHaveCount(rootCountBefore + 2);

  await clickByTestId(page, "topbar-delete");
  await expect(rootItems).toHaveCount(rootCountBefore + 1);

  await clickByTestId(page, "topbar-undo");
  await expect(rootItems).toHaveCount(rootCountBefore + 2);

  await clickByTestId(page, "topbar-redo");
  await expect(rootItems).toHaveCount(rootCountBefore + 1);
});

test("toolbar drag handle should reorder root nodes", async ({ page }) => {
  await login(page);

  const rootItems = page.locator("[data-testid^='root-item-']");
  await expect(rootItems).toHaveCount(2);

  const firstRoot = rootItems.nth(0);
  const secondRoot = rootItems.nth(1);

  await firstRoot.click();
  const firstHandle = firstRoot.locator(".node-toolbar .tool-btn.drag").first();
  await expect(firstHandle).toBeVisible();

  await firstHandle.dragTo(secondRoot, {
    targetPosition: { x: 20, y: 40 },
  });

  const firstType = await rootItems.nth(0).locator("[data-node-type]").first().getAttribute(
    "data-node-type"
  );
  const secondType = await rootItems.nth(1).locator("[data-node-type]").first().getAttribute(
    "data-node-type"
  );

  expect(firstType).toBe("paragraph");
  expect(secondType).toBe("title");
});

test("publish preview + export json", async ({ page }) => {
  await login(page);

  const publishResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/pages/") &&
      response.url().includes("/publish")
  );
  await clickByTestId(page, "topbar-publish");
  const publishResponse = await publishResponsePromise;
  const publishStatus = publishResponse.status();
  const publishText = await publishResponse.text();
  expect(publishStatus, publishText).toBe(200);
  const publishPayload = JSON.parse(publishText) as { slug?: string };
  expect(publishPayload.slug).toBeTruthy();

  const downloadPromise = page.waitForEvent("download");
  await clickByTestId(page, "topbar-export-json");
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/);

  await page.goto(`/preview/${publishPayload.slug}`);
  await expect(page).toHaveURL(/\/preview\//);
  await expect(page.locator(".preview-page")).toBeVisible();
});

test("preview should match latest draft and back to editor", async ({ page }) => {
  await login(page);

  const canvas = page.getByTestId("canvas-root");
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) {
    throw new Error("Canvas root is not visible");
  }
  await page.mouse.click(canvasBox.x + 16, canvasBox.y + canvasBox.height - 16);

  await expect(page.getByText("页面背景色")).toBeVisible();
  const pageBgInput = page.getByPlaceholder("例如 #ffffff / rgba(...)");
  const draftSavePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      response.url().includes("/pages/") &&
      response.url().includes("/draft") &&
      response.status() === 200
  );
  await pageBgInput.fill("rgb(1, 2, 3)");
  await pageBgInput.blur();
  await draftSavePromise;

  const previewResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().endsWith("/preview") &&
      response.status() === 200
  );
  await clickByTestId(page, "topbar-create-preview");
  const previewResponse = await previewResponsePromise;
  const previewPayload = (await previewResponse.json()) as { slug: string };

  await page.goto(`/preview/${previewPayload.slug}`);
  await expect(page.locator(".canvas")).toHaveCSS("background-color", "rgb(1, 2, 3)");

  await clickByTestId(page, "preview-back-editor");
  await expect(page).toHaveURL(/\/editor/);
});
