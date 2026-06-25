const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("Navigating to https://www.toolbase.io/submit-tool ...");
    const response = await page.goto('https://www.toolbase.io/submit-tool', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    console.log("Status:", response.status());
    console.log("URL:", page.url());

    // Wait a bit for client-side rendering
    await page.waitForTimeout(2000);

    // Get page content
    const content = await page.content();
    console.log("Page title:", await page.title());

    // Look for forms
    const forms = await page.$$('form');
    console.log("Number of forms found:", forms.length);

    for (let i = 0; i < forms.length; i++) {
      const form = forms[i];
      const action = await form.getAttribute('action');
      const method = await form.getAttribute('method');
      console.log(`Form ${i}: action="${action}" method="${method}"`);
      
      // Get all input fields
      const inputs = await form.$$('input, textarea, select');
      for (const input of inputs) {
        const name = await input.getAttribute('name');
        const id = await input.getAttribute('id');
        const type = await input.getAttribute('type');
        const placeholder = await input.getAttribute('placeholder');
        console.log(`  Field: name="${name}" id="${id}" type="${type}" placeholder="${placeholder}"`);
      }
    }

    // Try to find any submit button
    const buttons = await page.$$('button[type="submit"], button:has-text("Submit"), button:has-text("submission")');
    console.log("Submit buttons found:", buttons.length);

    // Check for input fields even outside forms
    const allInputs = await page.$$('input[name], textarea[name], select[name]');
    console.log("All named input fields:", allInputs.length);
    for (const input of allInputs) {
      const name = await input.getAttribute('name');
      const id = await input.getAttribute('id');
      const type = await input.getAttribute('type');
      console.log(`  Input: name="${name}" id="${id}" type="${type}"`);
    }

    // Print a snippet of HTML to understand structure
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
    console.log("--- Body text ---");
    console.log(bodyText);

  } catch (e) {
    console.error("Error:", e.message);
  }

  await browser.close();
})();
