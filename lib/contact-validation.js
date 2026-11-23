// Validation rules for the general Contact form (used by the server).
const TOPICS = ['services', 'assessment', 'consultation', 'existing-provider', 'other'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+()\d\s.-]{7,40}$/;
const MIN_FILL_MS = 3000;

const str = (v) => (typeof v === 'string' ? v.trim() : '');

function validateContact(input, now = Date.now()) {
  const errors = {};
  const data = {
    fullName: str(input.fullName),
    email: str(input.email).toLowerCase(),
    businessName: str(input.businessName),
    phone: str(input.phone),
    topic: str(input.topic),
    message: str(input.message)
  };

  if (!data.fullName) errors.fullName = 'Enter your full name.';
  else if (data.fullName.length > 120) errors.fullName = 'Full name must be 120 characters or fewer.';

  if (!data.email) errors.email = 'Enter your email address.';
  else if (data.email.length > 254 || !EMAIL_RE.test(data.email))
    errors.email = 'Enter an email address in the format name@company.com.';

  if (data.businessName.length > 160) errors.businessName = 'Business name must be 160 characters or fewer.';

  if (data.phone && !PHONE_RE.test(data.phone)) errors.phone = 'Enter a valid phone number, or leave this field empty.';

  if (!TOPICS.includes(data.topic)) errors.topic = 'Select what your inquiry is about.';

  if (!data.message) errors.message = 'Enter a short message.';
  else if (data.message.length > 2000) errors.message = 'Message must be 2,000 characters or fewer.';

  let spam = false;
  if (str(input.companyFax)) spam = true;
  const started = Number(input.formStartedAt);
  if (!Number.isFinite(started) || now - started < MIN_FILL_MS || now - started > 24 * 60 * 60 * 1000) spam = true;

  return { valid: Object.keys(errors).length === 0, errors, data, spam };
}

module.exports = { validateContact, TOPICS };
