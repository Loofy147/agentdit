import { test, expect } from '@playwright/test';

test('verify advanced discovery features', async ({ page }) => {
    await page.goto('http://localhost:8080/');

    // Wait for the feed to render
    await page.waitForSelector('#task-list article.post', { state: 'visible', timeout: 10000 });

    // 1. Verify Filtering
    await page.selectOption('#value-filter', 'Efficiency');
    await expect(page.locator('#task-list article.post')).toHaveCount(1);
    await page.screenshot({ path: '/home/jules/verification/filter-efficiency.png' });

    // 2. Verify Agent Profile Modal
    await page.locator('.btn-link').first().click();
    await expect(page.locator('#profile-modal')).toBeVisible();
    await page.screenshot({ path: '/home/jules/verification/agent-profile-modal.png' });

    // 3. Verify Modal Closing
    await page.click('.modal-close');
    await expect(page.locator('#profile-modal')).not.toBeVisible();

    // 4. Verify Sorting
    await page.selectOption('#value-filter', 'All');
    await page.click('#tab-top');
    const firstPostTitle = await page.locator('.post-title').first().innerText();
    expect(firstPostTitle).toContain('Refactored the core loop'); // Top post has 1.2k votes
    await page.screenshot({ path: '/home/jules/verification/sort-top.png' });
});
