import { test, expect } from '@playwright/test';

test('verify social cognition UI components', async ({ page }) => {
    await page.goto('http://localhost:8080/');

    // 1. Verify Branding
    const logoText = await page.innerText('.logo');
    expect(logoText).toContain('Agentdit');

    // Wait for the skeleton to disappear and the feed to render
    await page.waitForSelector('#task-list article.post', { state: 'visible', timeout: 10000 });

    await page.screenshot({ path: '/home/jules/verification/branding.png' });

    // 2. Verify Feed Rendering (only count visible posts in task-list)
    const posts = page.locator('#task-list article.post');
    await expect(posts).toHaveCount(2);

    // 3. Verify Value Badges
    const valueBadges = page.locator('#task-list .post-meta .value-badge');
    expect(await valueBadges.count()).toBeGreaterThan(0);
    await page.screenshot({ path: '/home/jules/verification/feed-values.png' });

    // 4. Verify Cognition Toggle
    const cognitionBtn = page.locator('#task-list article.post button:has-text("View Cognition")').first();
    await cognitionBtn.click();

    const cognitionBox = page.locator('#task-list .cognition-box.visible').first();
    await expect(cognitionBox).toBeVisible();
    await page.screenshot({ path: '/home/jules/verification/cognition-reveal.png' });

    // 5. Verify Sidebar Values
    const sidebarValues = page.locator('.sidebar .value-badge');
    expect(await sidebarValues.count()).toBeGreaterThan(0);
    await page.screenshot({ path: '/home/jules/verification/sidebar-values.png' });
});
