// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Talent Registration tests for https://etalente.co.za/sign-up
 *
 * Observed behaviour (2026-11-10):
 *  - The page is an Angular SPA. The Talent tab (value="CANDIDATE") is selected
 *    by default.
 *  - Required fields: name, surname, gender (mat-select), race (mat-select),
 *    hasDisability (mat-select), email, contactNumber, username, password,
 *    confirmPassword.
 *  - alternativeContactNumber is optional (no validation error on empty submit).
 *  - mat-error messages appear after clicking "Create Account" with invalid data.
 *  - Password field is type="password"; clicking the eye-button (aria-label
 *    "Hide password") makes the icon change to "visibility" and the input
 *    type changes to "text".
 *  - Mismatched passwords produce: "Password does not match".
 *  - Invalid email produces: "Please enter a valid E-Mail address".
 *  - Switching to the Employer tab renders a different field set (no surname,
 *    gender, race, hasDisability, alternativeContactNumber).
 *  - The "Terms" link href is /terms-and-conditions.
 *  - The "Privacy Policy" link href is /privacy.
 *  - "Already have an account? Log In" link opens the login dialog on the
 *    sign-up page.
 *  - Six platform statistics (h3 elements) are visible, sourced from
 *    /api/v1/lookup/stats.
 */

const SIGNUP_URL = '/sign-up';

// Selectors derived from observed formcontrolname attributes and element types.
const sel = {
  talentTab: '#mat-button-toggle-1-button',
  employerTab: '#mat-button-toggle-2-button',
  talentTabToggle: 'mat-button-toggle[value="CANDIDATE"]',
  employerTabToggle: 'mat-button-toggle[value="EMPLOYER"]',

  // Talent form inputs
  firstName: 'input[formcontrolname="name"]',
  lastName: 'input[formcontrolname="surname"]',
  genderSelect: 'mat-select[formcontrolname="gender"]',
  raceSelect: 'mat-select[formcontrolname="race"]',
  disabilitySelect: 'mat-select[formcontrolname="hasDisability"]',
  email: 'input[formcontrolname="email"]',
  contactNumber: 'input[formcontrolname="contactNumber"]',
  altContact: 'input[formcontrolname="alternativeContactNumber"]',
  username: 'input[formcontrolname="username"]',
  password: 'input[formcontrolname="password"]',
  confirmPassword: 'input[formcontrolname="confirmPassword"]',
  passwordToggle: 'button[aria-label="Hide password"]',
  submitButton: 'button.et-full-width',

  // Links
  termsLink: 'form a[href="/terms-and-conditions"]',
  privacyLink: 'form a[href="/privacy"]',
  loginLink: 'a.font-weight-bold.et-text-primary',

  // Errors
  errors: 'mat-error',

  // Stats
  statsHeadings: 'h3',
};

/** Fill all required Talent fields with valid synthetic data. */
async function fillAllRequiredTalentFields(page) {
  await page.fill(sel.firstName, 'QATest');
  await page.fill(sel.lastName, 'Automation');
  await page.fill(sel.email, 'qa.talent.test@example.invalid');
  await page.fill(sel.contactNumber, '0821234567');
  await page.fill(sel.username, 'qa_talent_auto');
  await page.fill(sel.password, 'P@ssword123!');
  await page.fill(sel.confirmPassword, 'P@ssword123!');

  // Open gender dropdown and pick the first option
  await page.click(sel.genderSelect);
  await page.locator('mat-option').first().click();

  // Open race dropdown and pick the first option
  await page.click(sel.raceSelect);
  await page.locator('mat-option').first().click();

  // Open disability dropdown and pick the second option ("No")
  await page.click(sel.disabilitySelect);
  await page.locator('mat-option').nth(1).click();
}

// ---------------------------------------------------------------------------
// TC-TAL-001: Form renders with correct fields on page load
// ---------------------------------------------------------------------------
test('TC-TAL-001: talent tab is selected by default and all required fields are present', async ({ page }) => {
  await page.goto(SIGNUP_URL);

  // The Talent tab must be checked
  const talentToggle = page.locator(sel.talentTabToggle);
  await expect(talentToggle).toHaveClass(/mat-button-toggle-checked/);

  // Required input fields
  await expect(page.locator(sel.firstName)).toBeVisible();
  await expect(page.locator(sel.lastName)).toBeVisible();
  await expect(page.locator(sel.genderSelect)).toBeVisible();
  await expect(page.locator(sel.raceSelect)).toBeVisible();
  await expect(page.locator(sel.disabilitySelect)).toBeVisible();
  await expect(page.locator(sel.email)).toBeVisible();
  await expect(page.locator(sel.contactNumber)).toBeVisible();
  await expect(page.locator(sel.altContact)).toBeVisible();
  await expect(page.locator(sel.username)).toBeVisible();
  await expect(page.locator(sel.password)).toBeVisible();
  await expect(page.locator(sel.confirmPassword)).toBeVisible();

  // Submit button
  await expect(page.locator(sel.submitButton)).toBeVisible();
  await expect(page.locator(sel.submitButton)).toHaveText(/Create Account/i);
});

// ---------------------------------------------------------------------------
// TC-TAL-002: Empty-submit shows all required-field validation errors
// ---------------------------------------------------------------------------
test('TC-TAL-002: submitting empty form shows all required-field errors', async ({ page }) => {
  await page.goto(SIGNUP_URL);
  await page.click(sel.submitButton);

  const errors = page.locator(sel.errors);
  await expect(errors).toHaveCount(10);

  const rawErrorTexts = await errors.allTextContents();
  const errorTexts = rawErrorTexts.map(t => t.trim());
  expect(errorTexts).toContain('First Name is required');
  expect(errorTexts).toContain('Last Name is required');
  expect(errorTexts).toContain('Gender is required');
  expect(errorTexts).toContain('Race is required');
  expect(errorTexts).toContain('Field is required');       // hasDisability
  expect(errorTexts).toContain('E-Mail is required');
  expect(errorTexts).toContain('Contact Number is required');
  expect(errorTexts).toContain('Username is required');
  expect(errorTexts).toContain('Password is required');
  expect(errorTexts).toContain('Confirm Password is required');
});

// ---------------------------------------------------------------------------
// TC-TAL-003: Alternative Contact Number does not produce a validation error
// ---------------------------------------------------------------------------
test('TC-TAL-003: alternative contact number is optional — no error when left empty', async ({ page }) => {
  await page.goto(SIGNUP_URL);
  await fillAllRequiredTalentFields(page);
  // Explicitly clear the optional field
  await page.fill(sel.altContact, '');
  await page.click(sel.submitButton);

  const errorTexts = await page.locator(sel.errors).allTextContents();
  // The only errors that may appear relate to the backend rejecting the
  // request (e.g., username already exists); but no error specific to
  // alternativeContactNumber should be present.
  const altError = errorTexts.find(t => /alternative/i.test(t));
  expect(altError).toBeUndefined();
});

// ---------------------------------------------------------------------------
// TC-TAL-004 / TC-TAL-005: Password visibility toggle
// ---------------------------------------------------------------------------
test('TC-TAL-004: password visibility toggle changes input type and icon', async ({ page }) => {
  await page.goto(SIGNUP_URL);

  // Password starts hidden
  await expect(page.locator(sel.password)).toHaveAttribute('type', 'password');

  // The icon inside the first toggle button should be "visibility_off"
  const firstToggle = page.locator(sel.passwordToggle).first();
  await expect(firstToggle.locator('mat-icon')).toHaveText('visibility_off');

  // Click the toggle — password becomes visible
  await firstToggle.click();
  await expect(page.locator(sel.password)).toHaveAttribute('type', 'text');
  await expect(firstToggle.locator('mat-icon')).toHaveText('visibility');

  // Click again — password becomes hidden
  await firstToggle.click();
  await expect(page.locator(sel.password)).toHaveAttribute('type', 'password');
  await expect(firstToggle.locator('mat-icon')).toHaveText('visibility_off');
});

// ---------------------------------------------------------------------------
// TC-TAL-002-NEG: Mismatched passwords show "Password does not match"
// ---------------------------------------------------------------------------
test('TC-TAL-NEG-001: mismatched passwords produce "Password does not match" error', async ({ page }) => {
  await page.goto(SIGNUP_URL);

  await page.fill(sel.firstName, 'QATest');
  await page.fill(sel.lastName, 'Automation');
  await page.fill(sel.email, 'qa.mismatch@example.invalid');
  await page.fill(sel.contactNumber, '0821234567');
  await page.fill(sel.username, 'qa_mismatch_user');
  await page.fill(sel.password, 'Password123!');
  await page.fill(sel.confirmPassword, 'DifferentPassword!');

  await page.click(sel.genderSelect);
  await page.locator('mat-option').first().click();

  await page.click(sel.raceSelect);
  await page.locator('mat-option').first().click();

  await page.click(sel.disabilitySelect);
  await page.locator('mat-option').nth(1).click();

  await page.click(sel.submitButton);

  const errorTexts = (await page.locator(sel.errors).allTextContents()).map(t => t.trim());
  expect(errorTexts).toContain('Password does not match');
});

// ---------------------------------------------------------------------------
// TC-TAL-NEG-002: Invalid email format shows validation error
// ---------------------------------------------------------------------------
test('TC-TAL-NEG-002: invalid email address format shows validation error', async ({ page }) => {
  await page.goto(SIGNUP_URL);

  await page.fill(sel.firstName, 'QATest');
  await page.fill(sel.lastName, 'Automation');
  await page.fill(sel.email, 'not-a-valid-email');
  await page.fill(sel.contactNumber, '0821234567');
  await page.fill(sel.username, 'qa_invalidemail_user');
  await page.fill(sel.password, 'Password123!');
  await page.fill(sel.confirmPassword, 'Password123!');

  await page.click(sel.genderSelect);
  await page.locator('mat-option').first().click();

  await page.click(sel.raceSelect);
  await page.locator('mat-option').first().click();

  await page.click(sel.disabilitySelect);
  await page.locator('mat-option').nth(1).click();

  await page.click(sel.submitButton);

  const errorTexts = (await page.locator(sel.errors).allTextContents()).map(t => t.trim());
  expect(errorTexts).toContain('Please enter a valid E-Mail address');
});

// ---------------------------------------------------------------------------
// TC-TAL-006: Terms link href is /terms-and-conditions
// TC-TAL-007: Privacy Policy link href is /privacy
// ---------------------------------------------------------------------------
test('TC-TAL-006/007: Terms and Privacy Policy links have correct hrefs', async ({ page }) => {
  await page.goto(SIGNUP_URL);

  await expect(page.locator(sel.termsLink)).toBeVisible();
  await expect(page.locator(sel.termsLink)).toHaveAttribute('href', '/terms-and-conditions');

  await expect(page.locator(sel.privacyLink)).toBeVisible();
  await expect(page.locator(sel.privacyLink)).toHaveAttribute('href', '/privacy');
});

// ---------------------------------------------------------------------------
// TC-TAL-008: Switching to Employer tab hides Talent-specific fields
// ---------------------------------------------------------------------------
test('TC-TAL-008: switching to Employer tab hides talent-only fields', async ({ page }) => {
  await page.goto(SIGNUP_URL);

  // Switch to Employer
  await page.click(sel.employerTab);

  // Employer tab should now be checked
  await expect(page.locator(sel.employerTabToggle)).toHaveClass(/mat-button-toggle-checked/);

  // Talent-only fields must not be present
  await expect(page.locator(sel.lastName)).not.toBeAttached();
  await expect(page.locator(sel.genderSelect)).not.toBeAttached();
  await expect(page.locator(sel.raceSelect)).not.toBeAttached();
  await expect(page.locator(sel.disabilitySelect)).not.toBeAttached();
  await expect(page.locator(sel.altContact)).not.toBeAttached();

  // Switching back to Talent restores those fields
  await page.click(sel.talentTab);
  await expect(page.locator(sel.talentTabToggle)).toHaveClass(/mat-button-toggle-checked/);
  await expect(page.locator(sel.lastName)).toBeVisible();
  await expect(page.locator(sel.genderSelect)).toBeVisible();
});

// ---------------------------------------------------------------------------
// TC-TAL-009/010: Platform statistics are displayed and sourced from the API
// ---------------------------------------------------------------------------
test('TC-TAL-009/010: platform statistics are visible and match /api/v1/lookup/stats', async ({ page, request }) => {
  // Fetch the stats API directly
  const resp = await request.get('https://etalente.co.za/api/v1/lookup/stats');
  expect(resp.status()).toBe(200);
  const stats = await resp.json();

  // The API must return all six fields as numbers
  expect(typeof stats.skillsCovered).toBe('number');
  expect(typeof stats.employersCovered).toBe('number');
  expect(typeof stats.talentsCovered).toBe('number');
  expect(typeof stats.jobPosted).toBe('number');
  expect(typeof stats.offersMade).toBe('number');
  expect(typeof stats.totalHires).toBe('number');

  // Load the page and check the displayed statistics
  await page.goto(SIGNUP_URL);

  // Wait for stats to load from the API (they come from /api/v1/lookup/stats)
  const statsLocator = page.locator('.stat-item h3');
  await expect(statsLocator).toHaveCount(6);

  // Wait until the first stat item has non-empty text (API data loaded)
  await expect(statsLocator.first()).not.toBeEmpty();

  // Each h3 text should end with "+" and contain a numeric portion
  const texts = await statsLocator.allTextContents();
  for (const text of texts) {
    expect(text.trim()).toMatch(/^\d+\+$/);
  }

  // The skills-covered value should match the API response
  const expectedSkills = `${stats.skillsCovered}+`;
  expect(texts.map(t => t.trim())).toContain(expectedSkills);
});

// ---------------------------------------------------------------------------
// TC-TAL-EDGE-001: "Log In" link on sign-up page opens the login dialog
// ---------------------------------------------------------------------------
test('TC-TAL-EDGE-001: "Log In" link on sign-up page opens the login dialog', async ({ page }) => {
  await page.goto(SIGNUP_URL);

  // Click the "Log In" anchor at the bottom of the form
  await page.locator(sel.loginLink).click();

  // The login dialog should appear
  const dialog = page.locator('mat-dialog-container');
  await expect(dialog).toBeVisible();

  // The dialog should contain the login form fields
  await expect(dialog.locator('input[formcontrolname="username"]')).toBeVisible();
  await expect(dialog.locator('input[type="password"]')).toBeVisible();
});

// ---------------------------------------------------------------------------
// TC-TAL-EDGE-002: Gender dropdown options match observed values
// ---------------------------------------------------------------------------
test('TC-TAL-EDGE-002: gender dropdown contains the four expected options', async ({ page }) => {
  await page.goto(SIGNUP_URL);
  await page.click(sel.genderSelect);

  const options = page.locator('mat-option');
  const optionTexts = await options.allTextContents();
  expect(optionTexts.map(t => t.trim())).toEqual([
    'Male',
    'Female',
    'Other',
    'Prefer Not To Disclose info',
  ]);
});

// ---------------------------------------------------------------------------
// TC-TAL-EDGE-003: Disability dropdown contains the three expected options
// ---------------------------------------------------------------------------
test('TC-TAL-EDGE-003: disability dropdown contains Yes, No, and Prefer Not To Disclose info', async ({ page }) => {
  await page.goto(SIGNUP_URL);
  await page.click(sel.disabilitySelect);

  const optionTexts = await page.locator('mat-option').allTextContents();
  expect(optionTexts.map(t => t.trim())).toEqual([
    'Yes',
    'No',
    'Prefer Not To Disclose info',
  ]);
});
