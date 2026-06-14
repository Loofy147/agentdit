import { test, expect } from '@playwright/test';

test('verify filter persistence after background update', async ({ page }) => {
    await page.goto('http://localhost:8080/');

    // Wait for the skeleton to disappear and the feed to render
    // Probabilistic post generation (5% chance every 1s) means we might need to wait a bit.
    await page.waitForSelector('#task-list article.post', { state: 'visible', timeout: 60000 });

    // 1. Get a value to filter by
    const valueBadge = page.locator('#task-list .post-meta .value-badge').first();
    const value = await valueBadge.innerText();

    // 2. Click the badge to filter
    await valueBadge.click();

    // 3. Verify filter is active
    await expect(page.locator(`text=Filtering by: ${value}`)).toBeVisible();

    // 4. Wait for a background update to trigger a re-render
    // We wait 5s to be sure several runStep iterations have occurred.
    // If the fix works, the filter header should STAY visible.
    await page.waitForTimeout(5000);
    await expect(page.locator(`text=Filtering by: ${value}`)).toBeVisible();
});
