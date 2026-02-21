const { test, expect } = require('@playwright/test');
const { launchApp, cleanDatabase, closeApp } = require('./helpers');

test.describe('Gmail E2E', () => {
  let app;
  let page;
  const sidebar = () => page.getByRole('navigation');

  test.beforeEach(async () => {
    app = await launchApp();
    await cleanDatabase(app);
    page = app.testPage;
    await sidebar()
      .getByRole('link', { name: /E-mail/i })
      .click();
  });

  test.afterEach(async () => {
    await closeApp(app);
  });

  test('loads Gmail webview without login flow', async () => {
    const webview = page.locator('webview');
    await expect(webview.first()).toBeVisible();

    const loadedUrl = await page.evaluate(() => {
      const webviewEl = document.querySelector('webview');
      const iframeEl = document.querySelector('iframe');
      const el = webviewEl || iframeEl;
      if (!el) return '';

      if (typeof el.getURL === 'function') {
        const current = el.getURL();
        if (current) {
          return current;
        }
      }

      return el.getAttribute('src') || el.src || '';
    });

    expect(loadedUrl.startsWith('https://mail.google.com')).toBeTruthy();
  });
});
