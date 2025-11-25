import { test, expect } from '@playwright/test'

// Intercept API calls and provide controlled fixtures so tests are deterministic.
const collectionsFixture = [
  { id: 1, name: 'office', cidr: '192.168.1.0/24' },
  { id: 2, name: 'net16', cidr: '192.168.0.0/16' }
];
const nodesFixture = [];

test.describe('Mini IPAM E2E basics', () => {
  test.beforeEach(async ({ page }) => {
    // Mock collections and nodes endpoints
    await page.route('**/api/collections', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: collectionsFixture }) });
      } else {
        // pass through other methods
        route.continue();
      }
    });

    await page.route('**/api/nodes', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: nodesFixture }) });
      } else {
        route.continue();
      }
    });
  });

  test('navigation works and IP blur auto-selects collection', async ({ page }) => {
    await page.goto('/');
    // Ensure we are on My Nodes
    await expect(page.locator('h1')).toHaveText('Mini IPAM');

    // Navigate to Edit Nodes
    await page.click('text=Edit Nodes');
    // Ensure the Add/Edit Node heading is present (there are multiple h3 on the page)
    await expect(page.getByRole('heading', { name: /Add New Node|Edit Node/ })).toBeVisible();

    // Fill IP that belongs to collection id=1 (/24) and blur to trigger autofill
    const ipInput = page.locator('input[name="ip_address"]');
    await ipInput.fill('192.168.1.55');
    await ipInput.blur();

    // The select should update to the matching collection (most specific -> id 1)
    const select = page.locator('select[name="collection_id"]');
    await expect(select).toHaveValue(String(1));
  });
});
