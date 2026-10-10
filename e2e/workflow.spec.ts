import { expect, test, type Page } from "@playwright/test";

// The core journey from the brief, end to end, against a real local Supabase.
// Each run creates two fresh accounts with unique names.

const run = Date.now().toString(36);
const author = { name: "E2E Author", username: `author_${run}`, email: `author_${run}@example.test`, password: "correct horse battery" };
const reader = { name: "E2E Reader", username: `reader_${run}`, email: `reader_${run}@example.test`, password: "correct horse battery" };

async function signUp(page: Page, user: typeof author) {
  await page.goto("/signup");
  await page.getByLabel("Display name").fill(user.name);
  await page.getByLabel("Username").fill(user.username);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}

async function logIn(page: Page, user: typeof author) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/home$/);
}

async function logOut(page: Page) {
  await page.goto("/home");
  await page.getByLabel("Account menu").click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function writeEntry(page: Page, title: string, body: string): Promise<string> {
  await page.goto("/write");
  await page.getByLabel("Title (optional)").fill(title);
  await page.getByRole("textbox", { name: "Entry body" }).click();
  await page.keyboard.type(body);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/write\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop()!;
}

test("write privately, publish, interact, unpublish", async ({ page }) => {
  let privateId = "";
  let publicId = "";

  await test.step("1. register", async () => {
    await signUp(page, author);
    await page.getByRole("button", { name: "Take me home" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(author.name);
  });

  await test.step("2–4. create a private entry, reload, edit", async () => {
    privateId = await writeEntry(page, "Only mine", "A thought I am keeping.");
    await page.reload();
    await expect(page.getByLabel("Title (optional)")).toHaveValue("Only mine");
    await expect(page.getByRole("textbox", { name: "Entry body" })).toContainText("A thought I am keeping.");
    await expect(page.getByText("Private draft. Only you can see this.")).toBeVisible();

    await page.getByRole("textbox", { name: "Entry body" }).click();
    await page.keyboard.press("End");
    await page.keyboard.type(" Still keeping it.");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Entry body" })).toContainText("Still keeping it.");
  });

  await test.step("5. publish a second entry", async () => {
    publicId = await writeEntry(page, "", `A short public thought ${run}.`);
    await page.getByRole("button", { name: "Publish" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Topics").fill("e2e");
    await dialog.getByRole("button", { name: "Publish" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Public. Anyone can read this.")).toBeVisible();
  });

  await test.step("6. it appears on Discover and the profile, the private one doesn't", async () => {
    await page.goto("/discover");
    await expect(page.getByText(`A short public thought ${run}.`)).toBeVisible();
    await expect(page.getByText("A thought I am keeping.")).toHaveCount(0);
    await page.goto(`/u/${author.username}`);
    await expect(page.getByText(`A short public thought ${run}.`)).toBeVisible();
    await expect(page.getByText("Only mine")).toHaveCount(0);
  });

  await test.step("7. second user signs up", async () => {
    await logOut(page);
    await signUp(page, reader);
  });

  await test.step("8. like and comment", async () => {
    await page.goto(`/post/${publicId}`);
    const like = page.getByRole("button", { name: "Like" });
    await like.click();
    await expect(page.getByRole("button", { name: "Unlike" })).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(page.getByRole("button", { name: "Unlike" })).toContainText("1");

    await page.getByPlaceholder("Leave a kind word…").fill("This stayed with me.");
    await page.getByRole("button", { name: "Respond" }).click();
    await expect(page.getByText("This stayed with me.")).toBeVisible();
  });

  await test.step("9. follow the author", async () => {
    await page.goto(`/u/${author.username}`);
    await page.getByRole("button", { name: "Follow" }).click();
    await expect(page.getByRole("button", { name: "Following" })).toBeVisible();
    await page.goto("/discover?mode=following");
    await expect(page.getByText(`A short public thought ${run}.`)).toBeVisible();
  });

  await test.step("10. the private entry stays inaccessible", async () => {
    for (const path of [`/post/${privateId}`, `/write/${privateId}`]) {
      await page.goto(path);
      await expect(page.getByText("This page isn't here.")).toBeVisible();
      await expect(page.getByText("A thought I am keeping.")).toHaveCount(0);
    }
  });

  await test.step("11. unpublishing removes public access", async () => {
    await logOut(page);
    await logIn(page, author);
    await page.goto(`/write/${publicId}`);
    await page.getByRole("button", { name: "Published" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("radio", { name: /Private/ }).check();
    await dialog.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByText("Unpublished. Only you can see this.")).toBeVisible();

    await logOut(page);
    await page.goto(`/post/${publicId}`);
    await expect(page.getByText("This page isn't here.")).toBeVisible();
    await page.goto("/discover");
    await expect(page.getByText(`A short public thought ${run}.`)).toHaveCount(0);
  });

  await test.step("12. protected pages redirect when logged out", async () => {
    for (const path of ["/home", "/journal", "/library", "/saved", "/settings", "/write"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login\?next=/);
    }
  });
});
