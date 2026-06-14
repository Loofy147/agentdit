import { test, expect } from '@playwright/test';

test('verify social cognition UI components', async ({ page }) => {
    await page.goto('http://localhost:8080/');

    // 1. Verify Branding
    const logoText = await page.innerText('.logo');
    expect(logoText).toContain('Agentdit');

    // Wait for the skeleton to disappear and the feed to render
    await page.waitForSelector('#task-list article.post', { state: 'visible', timeout: 60000 });

    await page.screenshot({ path: '/home/jules/verification/branding.png' });

    // 2. Verify Feed Rendering (only count visible posts in task-list)
    const posts = page.locator('#task-list article.post');
    expect(await posts.count()).toBeGreaterThan(0);

    // 3. Verify Value Badges
    const valueBadges = page.locator('#task-list .post-meta .value-badge');
    expect(await valueBadges.count()).toBeGreaterThan(0);
    await page.screenshot({ path: '/home/jules/verification/feed-values.png' });

    // 4. Verify Cognition Toggle
    const cognitionBtn = page.locator('#task-list article.post button:has-text("View Cognition")').first();
    const btnText = await cognitionBtn.innerText();
    expect(btnText).toContain('View Cognition');
    expect(btnText).toContain('% Match');
    await cognitionBtn.click();

    const cognitionBox = page.locator('#task-list .cognition-box.visible').first();
    await expect(cognitionBox).toBeVisible();
    await page.screenshot({ path: '/home/jules/verification/cognition-reveal.png' });

    // 4b. Verify Share Button
    const shareBtn = page.locator('#task-list article.post .share-btn').first();
    await expect(shareBtn).toBeVisible();

    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    await shareBtn.click();
    await expect(shareBtn).toHaveText('Copied!');

    // Verify ARIA announcer
    const announcer = page.locator('#a11y-announcer');
    await expect(announcer).not.toBeEmpty();

    await page.screenshot({ path: '/home/jules/verification/share-clicked.png' });

    // 5. Verify Sidebar Values
    const sidebarValues = page.locator('.sidebar .value-badge');
    expect(await sidebarValues.count()).toBeGreaterThan(0);
    await page.screenshot({ path: '/home/jules/verification/sidebar-values.png' });

    // 6. Verify Filtering
    const valueBadge = page.locator('#task-list .post-meta .value-badge').first();
    const value = await valueBadge.innerText();
    await valueBadge.click();

    // Verify filter header
    await expect(page.locator(`text=Filtering by: ${value}`)).toBeVisible();
    const count = await page.locator('#task-list article.post').count();
    expect(count).toBeGreaterThan(0);

    // Verify announcer
    await expect(announcer).toHaveText(`Filtering posts by ${value}`);
    await page.screenshot({ path: '/home/jules/verification/filtered-feed.png' });

    // Clear filter
    await page.locator('text=Clear Filter').click();
    expect(await page.locator('#task-list article.post').count()).toBeGreaterThan(0);
    await expect(announcer).toHaveText('Showing all posts');
});
