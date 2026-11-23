// Shared validation rules for the Security Assessment form (used by the server).
const EMPLOYEE_COUNTS = ['1-10', '11-25', '26-50', '51-100', '101-250', '251+'];
const CONCERNS = [
  'email-accounts',
  'devices',
  'website-hosting',
  'backups',
  'employee-access',
  'third-party-apps',
  'procedures',
  'not-sure'
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+()\d\s.-]{7,40}$/;
const WEBSITE_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i;
const MIN_FILL_MS = 3000;

const str = (v) => (typeof v === 'string' ? v.trim() : '');

function validateAssessment(input, now = Date.now()) {
  const errors = {};
  const data = {
    fullName: str(input.fullName),
    businessName: str(input.businessName),
    workEmail: str(input.workEmail).toLowerCase(),
    phone: str(input.phone),
    website: str(input.website),
    employeeCount: str(input.employeeCount),
    concerns: Array.isArray(input.concerns) ? input.concerns.map(str) : input.concerns ? [str(input.concerns)] : [],
    message: str(input.message),
    marketingConsent: input.marketingConsent === true || input.marketingConsent === 'yes'
  };

  if (!data.fullName) errors.fullName = 'Enter your full name.';
  else if (data.fullName.length > 120) errors.fullName = 'Full name must be 120 characters or fewer.';

  if (!data.businessName) errors.businessName = 'Enter your business name.';
  else if (data.businessName.length > 160) errors.businessName = 'Business name must be 160 characters or fewer.';

  if (!data.workEmail) errors.workEmail = 'Enter your work email address.';
  else if (data.workEmail.length > 254 || !EMAIL_RE.test(data.workEmail))
    errors.workEmail = 'Enter an email address in the format name@company.com.';

  if (data.phone && !PHONE_RE.test(data.phone)) errors.phone = 'Enter a valid phone number, or leave this field empty.';

  if (data.website && (data.website.length > 255 || !WEBSITE_RE.test(data.website)))
    errors.website = 'Enter a website address such as example.com, or leave this field empty.';

  if (!EMPLOYEE_COUNTS.includes(data.employeeCount)) errors.employeeCount = 'Select your employee count.';

  if (data.concerns.length === 0) errors.concerns = 'Select at least one area of concern.';
  else if (data.concerns.some((c) => !CONCERNS.includes(c))) errors.concerns = 'Select areas of concern from the list.';

  if (data.message.length > 1000) errors.message = 'Message must be 1,000 characters or fewer.';

  // Spam signals (not shown as field errors)
  let spam = false;
  if (str(input.companyFax)) spam = true;
  const started = Number(input.formStartedAt);
  if (!Number.isFinite(started) || now - started < MIN_FILL_MS || now - started > 24 * 60 * 60 * 1000) spam = true;

  return { valid: Object.keys(errors).length === 0, errors, data, spam };
}

module.exports = { validateAssessment, EMPLOYEE_COUNTS, CONCERNS };
