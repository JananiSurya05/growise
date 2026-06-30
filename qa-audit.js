/**
 * GroWise End-to-End QA Audit Script
 * Runs in HEADED mode so browser is visible.
 * Usage: node qa-audit.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const SHOTS_DIR = path.join(__dirname, 'qa-screenshots');
if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

const report = { passed: [], failed: [], warnings: [], consoleErrors: {} };
let browser, context, page;
let shotCount = 0;

async function screenshot(label) {
  const file = path.join(SHOTS_DIR, `${String(++shotCount).padStart(3, '0')}-${label.replace(/[^a-z0-9]/gi, '_')}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function visit(url, label) {
  const errors = [];
  const handler = msg => { if (msg.type() === 'error') errors.push(msg.text()); };
  page.on('console', handler);
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    const status = resp?.status() ?? 0;
    const file = await screenshot(label);
    report.consoleErrors[label] = errors;
    if (status >= 400) {
      report.failed.push({ label, url, status, screenshot: file, errors });
      console.log(`  ❌ ${label} → HTTP ${status}`);
    } else {
      report.passed.push({ label, url, status, screenshot: file });
      console.log(`  ✅ ${label} → HTTP ${status}`);
    }
    return { ok: status < 400, status };
  } catch (e) {
    const file = await screenshot(label + '-error').catch(() => 'n/a');
    report.failed.push({ label, url, error: e.message, screenshot: file, errors });
    console.log(`  ❌ ${label} → ${e.message.slice(0, 80)}`);
    return { ok: false, error: e.message };
  } finally {
    page.off('console', handler);
  }
}

async function checkText(label, selectors) {
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        const txt = (await el.textContent() || '').trim().slice(0, 100);
        console.log(`    📋 ${sel}: "${txt}"`);
        report.passed.push({ label: `${label} – ${sel}`, text: txt });
        return { found: true, text: txt };
      }
    } catch { /* skip */ }
  }
  report.warnings.push(`${label}: none of [${selectors.join(', ')}] found`);
  return { found: false };
}

async function tryClick(label, selectors) {
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el && await el.isVisible()) {
        await el.click();
        await page.waitForTimeout(800);
        console.log(`    🖱️  Clicked: ${sel}`);
        return true;
      }
    } catch { /* skip */ }
  }
  console.log(`    ⚠️  Could not click any of: ${selectors.join(', ')}`);
  return false;
}

async function checkForms(context) {
  const inputs = await page.$$('input:visible, textarea:visible, select:visible');
  console.log(`    📝 Found ${inputs.length} form fields`);
  report.passed.push({ label: `${context} – form fields`, count: inputs.length });
}

async function checkNavLinks() {
  const links = await page.$$('a[href]');
  const hrefs = [];
  for (const link of links) {
    try { hrefs.push(await link.getAttribute('href')); } catch { /* skip */ }
  }
  return hrefs.filter(Boolean);
}

async function main() {
  console.log('🚀 GroWise QA Audit — headed browser, keep watching!\n');

  browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  page = await context.newPage();

  // ── 1. Root / Home ─────────────────────────────────────────────────────
  console.log('\n── 1. Root page ──');
  await visit(BASE + '/', 'home-root');
  await checkText('home', ['h1', 'h2', '[class*="title"]', 'main']);
  const homeLinks = await checkNavLinks();
  console.log(`    🔗 Nav links: ${homeLinks.slice(0, 8).join(', ')}`);

  // ── 2. Login page ──────────────────────────────────────────────────────
  console.log('\n── 2. Login page ──');
  await visit(BASE + '/login', 'login-page');
  await checkForms('login');
  await checkText('login', ['h1', 'h2', 'form', '[class*="login"]', '[class*="auth"]']);

  // Try filling login form
  const emailInput = await page.$('input[type="email"], input[name="email"]');
  const passInput  = await page.$('input[type="password"]');
  if (emailInput && passInput) {
    await emailInput.fill('test@example.com');
    await passInput.fill('wrongpassword123');
    await screenshot('login-filled');
    const submitBtn = await page.$('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
      await screenshot('login-after-submit');
      const errEl = await page.$('[class*="error"], [class*="alert"], [role="alert"]');
      if (errEl) {
        const errTxt = await errEl.textContent();
        console.log(`    ℹ️  Login error shown: "${errTxt?.trim().slice(0, 80)}"`);
        report.passed.push({ label: 'login – error feedback shown', text: errTxt });
      }
    }
  } else {
    report.warnings.push('login: email/password inputs not found');
    console.log('    ⚠️  Email/password inputs not detected');
  }

  // ── 3. Auth Complete ───────────────────────────────────────────────────
  console.log('\n── 3. Auth complete page ──');
  await visit(BASE + '/auth/complete', 'auth-complete');
  await checkText('auth-complete', ['h1', 'h2', 'p', 'main']);

  // ── 4. Farmer Dashboard ────────────────────────────────────────────────
  console.log('\n── 4. Farmer dashboard ──');
  await visit(BASE + '/farmer', 'farmer-dashboard');
  await checkText('farmer-dashboard', ['h1', 'h2', 'h3', '[class*="dashboard"]']);
  const farmLinks = await checkNavLinks();
  console.log(`    🔗 Links: ${farmLinks.slice(0, 8).join(', ')}`);

  // ── 5. Farmer – Crops ─────────────────────────────────────────────────
  console.log('\n── 5. Farmer crops ──');
  await visit(BASE + '/farmer/crops', 'farmer-crops');
  await checkText('farmer-crops', ['h1', 'h2', 'table', '[class*="crop"]']);
  await checkForms('farmer-crops');
  await tryClick('farmer-crops add', ['button:has-text("Add"), button:has-text("New"), button:has-text("+")'.split(', ')].flat());
  await screenshot('farmer-crops-after-add-click');

  // ── 6. Farmer – Weather ───────────────────────────────────────────────
  console.log('\n── 6. Farmer weather ──');
  await visit(BASE + '/farmer/weather', 'farmer-weather');
  await checkText('farmer-weather', ['h1', 'h2', '[class*="weather"]', '[class*="temperature"]']);
  await page.waitForTimeout(2000); // wait for weather API
  await screenshot('farmer-weather-loaded');

  // ── 7. Farmer – Sales ─────────────────────────────────────────────────
  console.log('\n── 7. Farmer sales ──');
  await visit(BASE + '/farmer/sales', 'farmer-sales');
  await checkText('farmer-sales', ['h1', 'h2', 'table', '[class*="sales"]', '[class*="revenue"]']);

  // ── 8. Farmer – Advisor (AI) ──────────────────────────────────────────
  console.log('\n── 8. Farmer AI advisor ──');
  await visit(BASE + '/farmer/advisor', 'farmer-advisor');
  await checkForms('farmer-advisor');
  await checkText('farmer-advisor', ['h1', 'h2', '[class*="advisor"]', '[class*="chat"]']);

  // ── 9. Farmer – Disease Scanner ───────────────────────────────────────
  console.log('\n── 9. Farmer disease scanner ──');
  await visit(BASE + '/farmer/disease', 'farmer-disease');
  await checkText('farmer-disease', ['h1', 'h2', '[class*="disease"]', '[class*="scan"]']);
  await checkForms('farmer-disease');

  // ── 10. Farmer – Income ───────────────────────────────────────────────
  console.log('\n── 10. Farmer income ──');
  await visit(BASE + '/farmer/income', 'farmer-income');
  await checkText('farmer-income', ['h1', 'h2', '[class*="income"]', 'table', 'canvas']);

  // ── 11. Consumer Dashboard ────────────────────────────────────────────
  console.log('\n── 11. Consumer dashboard ──');
  await visit(BASE + '/consumer', 'consumer-dashboard');
  await checkText('consumer-dashboard', ['h1', 'h2', '[class*="consumer"]', '[class*="dashboard"]']);
  const consLinks = await checkNavLinks();
  console.log(`    🔗 Links: ${consLinks.slice(0, 8).join(', ')}`);

  // ── 12. Consumer – Shop ───────────────────────────────────────────────
  console.log('\n── 12. Consumer shop ──');
  await visit(BASE + '/consumer/shop', 'consumer-shop');
  await checkText('consumer-shop', ['h1', 'h2', '[class*="shop"]', '[class*="product"]', '[class*="card"]']);
  // Try clicking first product card
  await tryClick('consumer-shop product', ['[class*="card"]:first-child', '[class*="product"]:first-child', 'article:first-child']);
  await screenshot('consumer-shop-after-product-click');

  // ── 13. Consumer – Orders ─────────────────────────────────────────────
  console.log('\n── 13. Consumer orders ──');
  await visit(BASE + '/consumer/orders', 'consumer-orders');
  await checkText('consumer-orders', ['h1', 'h2', 'table', '[class*="order"]']);

  // ── 14. Consumer – Order (single) ─────────────────────────────────────
  console.log('\n── 14. Consumer order detail ──');
  await visit(BASE + '/consumer/order', 'consumer-order-detail');
  await checkText('consumer-order', ['h1', 'h2', '[class*="order"]']);

  // ── 15. Consumer – QR ─────────────────────────────────────────────────
  console.log('\n── 15. Consumer QR ──');
  await visit(BASE + '/consumer/qr', 'consumer-qr');
  await checkText('consumer-qr', ['h1', 'h2', 'canvas', 'svg', '[class*="qr"]']);
  await page.waitForTimeout(1000);
  await screenshot('consumer-qr-loaded');

  // ── 16. Consumer – Nutrition ──────────────────────────────────────────
  console.log('\n── 16. Consumer nutrition ──');
  await visit(BASE + '/consumer/nutrition', 'consumer-nutrition');
  await checkText('consumer-nutrition', ['h1', 'h2', '[class*="nutrition"]']);

  // ── 17. Government Dashboard ──────────────────────────────────────────
  console.log('\n── 17. Government dashboard ──');
  await visit(BASE + '/government', 'government-dashboard');
  await checkText('government-dashboard', ['h1', 'h2', '[class*="gov"]', '[class*="dashboard"]', 'table']);
  const govLinks = await checkNavLinks();
  console.log(`    🔗 Links: ${govLinks.slice(0, 8).join(', ')}`);
  await page.waitForTimeout(2000); // wait for analytics data
  await screenshot('government-dashboard-loaded');

  // ── 18. 404 Page ──────────────────────────────────────────────────────
  console.log('\n── 18. 404 handling ──');
  await visit(BASE + '/nonexistent-route-xyz', '404-page');
  await checkText('404', ['h1', 'h2', '[class*="404"]', '[class*="not-found"]']);

  // ── 19. API Health Checks ─────────────────────────────────────────────
  console.log('\n── 19. API routes ──');
  const apis = [
    ['/api/weather', 'api-weather'],
    ['/api/advisor', 'api-advisor'],
    ['/api/disease', 'api-disease'],
    ['/api/insights', 'api-insights'],
    ['/api/market-intelligence', 'api-market-intelligence'],
    ['/api/ml', 'api-ml'],
    ['/api/consumer', 'api-consumer'],
  ];
  for (const [url, label] of apis) {
    try {
      const resp = await page.request.get(BASE + url);
      const status = resp.status();
      const text = await resp.text().catch(() => '');
      if (status < 500) {
        report.passed.push({ label, url, status });
        console.log(`  ✅ ${label} → ${status}`);
      } else {
        report.failed.push({ label, url, status, body: text.slice(0, 200) });
        console.log(`  ❌ ${label} → ${status}: ${text.slice(0, 80)}`);
      }
    } catch (e) {
      report.failed.push({ label, url, error: e.message });
      console.log(`  ❌ ${label} → ${e.message.slice(0, 80)}`);
    }
  }

  // ── 20. Mobile viewport check ─────────────────────────────────────────
  console.log('\n── 20. Mobile responsive check ──');
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14
  await visit(BASE + '/farmer', 'farmer-mobile-390');
  await visit(BASE + '/consumer', 'consumer-mobile-390');
  await visit(BASE + '/login', 'login-mobile-390');
  await page.setViewportSize({ width: 1280, height: 900 });

  // ── Final ──────────────────────────────────────────────────────────────
  await screenshot('final-state');
  await page.waitForTimeout(3000); // let user see the final state

  // Write JSON report
  const reportPath = path.join(__dirname, 'qa-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 JSON report: ${reportPath}`);
  console.log(`🖼️  Screenshots: ${SHOTS_DIR}`);

  const passCount = report.passed.length;
  const failCount = report.failed.length;
  const warnCount = report.warnings.length;
  console.log(`\n═══════════════════════════════════`);
  console.log(`✅ Passed:   ${passCount}`);
  console.log(`❌ Failed:   ${failCount}`);
  console.log(`⚠️  Warnings: ${warnCount}`);
  console.log(`═══════════════════════════════════\n`);

  if (report.failed.length) {
    console.log('Failed items:');
    for (const f of report.failed) {
      console.log(`  ❌ ${f.label} (${f.url}) → status:${f.status ?? 'err'} ${f.error ?? ''}`);
    }
  }
  if (report.warnings.length) {
    console.log('\nWarnings:');
    for (const w of report.warnings) console.log(`  ⚠️  ${w}`);
  }

  // Console errors summary
  const pagesWithErrors = Object.entries(report.consoleErrors).filter(([, errs]) => errs.length > 0);
  if (pagesWithErrors.length) {
    console.log('\nConsole errors by page:');
    for (const [pg, errs] of pagesWithErrors) {
      console.log(`  📛 ${pg}:`);
      for (const e of errs.slice(0, 3)) console.log(`     ${e.slice(0, 120)}`);
    }
  }

  await browser.close();
  return { passCount, failCount, warnCount };
}

main().catch(e => {
  console.error('Audit crashed:', e);
  if (browser) browser.close().catch(() => {});
  process.exit(1);
});
