import { test, expect } from "@playwright/test";

const viewports = {
    desktop: { width: 1200, height: 800 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 667 },
};

async function debugHorizontalOverflow(page: any) {
    const overflowingElements = await page.evaluate(() => {
        const viewportWidth = window.innerWidth;
        return Array.from(document.querySelectorAll("*"))
            .filter((element) => {
                const rect = element.getBoundingClientRect();
                return rect.right > viewportWidth + 1 || rect.left < -1;
            })
            .map((element) => {
                const rect = element.getBoundingClientRect();
                return {
                    tag: element.tagName,
                    className: element.className,
                    id: element.id,
                    left: Math.round(rect.left),
                    right: Math.round(rect.right),
                    width: Math.round(rect.width),
                    viewportWidth,
                    text: (element.textContent || "").trim().slice(0, 80),
                };
            })
            .slice(0, 20);
    });

    if (overflowingElements.length > 0) {
        console.log("Overflowing elements found:");
        console.table(overflowingElements);
    }
}

async function expectNoHorizontalOverflow(page: any) {
    await debugHorizontalOverflow(page);
    const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasOverflow).toBe(false);
}

async function selectRequester(page: any) {
    const myTicketsTab = page.getByRole("button", { name: "My Tickets" });
    if (await myTicketsTab.isVisible({ timeout: 1000 }).catch(() => false)) {
        return;
    }

    const requesterSelect = page.locator("#dev-requester-select");
    await expect(requesterSelect).toBeVisible({ timeout: 10000 });

    const options = await requesterSelect.locator("option").count();
    expect(options).toBeGreaterThan(1);

    await requesterSelect.selectOption({ index: 1 });

    const continueButton = page.getByRole("button", {
        name: /continue/i,
    });

    await expect(continueButton).toBeEnabled();
    await continueButton.click();

    await expect(myTicketsTab).toBeVisible({ timeout: 10000 });
}

test.describe("Lab 2 - Responsive and Visual QA", () => {
    test("Create Ticket - Desktop", async ({ page }) => {
        await page.setViewportSize(viewports.desktop);
        await page.goto("/");

        await selectRequester(page);

        await expect(
            page.getByRole("heading", { name: "Create Support Ticket" })
        ).toBeVisible();

        await debugHorizontalOverflow(page);
        await expectNoHorizontalOverflow(page);

        await expect(
            page.getByRole("button", { name: /submit ticket/i })
        ).toBeVisible();

        await page.screenshot({
            path: "artifacts/lab-02/screenshots/create-ticket/desktop.png",
            fullPage: true,
        });
    });

    test("Create Ticket - Tablet", async ({ page }) => {
        await page.setViewportSize(viewports.tablet);
        await page.goto("/");

        await selectRequester(page);

        await expect(
            page.getByRole("heading", { name: "Create Support Ticket" })
        ).toBeVisible();

        await expectNoHorizontalOverflow(page);

        await expect(page.getByLabel("Category")).toBeVisible();
        await expect(page.getByLabel("Related System")).toBeVisible();
        await expect(page.getByLabel("Summary")).toBeVisible();
        await expect(page.getByLabel("Description")).toBeVisible();

        await page.screenshot({
            path: "artifacts/lab-02/screenshots/create-ticket/tablet.png",
            fullPage: true,
        });
    });

    test("Create Ticket - Mobile", async ({ page }) => {
        await page.setViewportSize(viewports.mobile);
        await page.goto("/");

        await selectRequester(page);

        await expect(
            page.getByRole("heading", { name: "Create Support Ticket" })
        ).toBeVisible();

        await expectNoHorizontalOverflow(page);

        await expect(page.getByLabel("Category")).toBeVisible();
        await expect(page.getByLabel("Related System")).toBeVisible();
        await expect(page.getByLabel("Summary")).toBeVisible();
        await expect(page.getByLabel("Description")).toBeVisible();

        await expect(
            page.getByRole("button", { name: /submit ticket/i })
        ).toBeVisible();

        await page.screenshot({
            path: "artifacts/lab-02/screenshots/create-ticket/mobile.png",
            fullPage: true,
        });
    });

    test("My Tickets - Desktop, Tablet and Mobile", async ({ page }) => {
        for (const [device, viewport] of Object.entries(viewports)) {
            await page.setViewportSize(viewport);
            await page.goto("/");

            await selectRequester(page);

            await page.getByRole("button", { name: "My Tickets" }).click();

            await expect(
                page.getByRole("heading", { name: "My Tickets" })
            ).toBeVisible();

            await expectNoHorizontalOverflow(page);

            await expect(page.getByLabel("Search tickets")).toBeVisible();
            await expect(page.getByLabel("Category")).toBeVisible();
            await expect(page.getByLabel("Sort")).toBeVisible();

            await page.screenshot({
                path: `artifacts/lab-02/screenshots/my-tickets/${device}.png`,
                fullPage: true,
            });
        }
    });

    test("Ticket Detail - Desktop, Tablet and Mobile", async ({ page }) => {
        await page.setViewportSize(viewports.desktop);
        await page.goto("/");

        await selectRequester(page);

        await expect(
            page.getByRole("heading", { name: "Create Support Ticket" })
        ).toBeVisible();

        const uniqueSummary = `Issue 9 Visual QA ${Date.now()}`;

        await page.getByLabel("Category").selectOption({ index: 1 });
        await page.getByLabel("Related System").selectOption({ index: 1 });
        await page.getByLabel("Requested Priority").selectOption("MEDIUM");
        await page.getByLabel("Summary").fill(uniqueSummary);
        await page
            .getByLabel("Description")
            .fill("Ticket created for Lab 2 responsive visual QA.");

        await page
            .getByRole("button", { name: /submit ticket/i })
            .click();

        const successMessage = page.getByRole("alert").filter({
            hasText: "Your ticket number is",
        });

        await expect(successMessage).toBeVisible();

        const ticketNumberText = await successMessage.textContent();
        const ticketNumberMatch = ticketNumberText?.match(/TKT-\d{4}-\d+/);

        expect(ticketNumberMatch).not.toBeNull();

        const ticketNumber = ticketNumberMatch![0];

        await page.getByRole("button", { name: "My Tickets" }).click();

        await expect(
            page.getByRole("cell", { name: ticketNumber })
        ).toBeVisible();

        await page.getByRole("cell", { name: ticketNumber }).click();

        await expect(
            page.getByText(uniqueSummary)
        ).toBeVisible();

        for (const [device, viewport] of Object.entries(viewports)) {
            await page.setViewportSize(viewport);

            await expect(
                page.getByText(uniqueSummary)
            ).toBeVisible();

            await expectNoHorizontalOverflow(page);

            await page.screenshot({
                path: `artifacts/lab-02/screenshots/ticket-detail/${device}.png`,
                fullPage: true,
            });
        }
    });

    test("Zen Green visual tokens", async ({ page }) => {
        await page.setViewportSize(viewports.desktop);
        await page.goto("/");

        await selectRequester(page);

        const submitButton = page.getByRole("button", {
            name: /submit ticket/i,
        });

        await expect(submitButton).toHaveCSS(
            "background-color",
            "rgb(0, 107, 60)"
        );

        await page.screenshot({
            path: "artifacts/lab-02/screenshots/create-ticket/zen-green.png",
            fullPage: true,
        });
    });
});