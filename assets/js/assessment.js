(() => {
  const form = document.getElementById('assessment-form');
  if (!form) return;

  const panel = document.getElementById('form-panel');
  const success = document.getElementById('form-success');
  const summary = document.getElementById('error-summary');
  const status = document.getElementById('form-status');
  const submitBtn = document.getElementById('submit-btn');
  const startedAt = document.getElementById('formStartedAt');
  startedAt.value = String(Date.now());

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_RE = /^[+()\d\s.-]{7,40}$/;
  const WEBSITE_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i;

  const labels = {
    fullName: 'Full name',
    businessName: 'Business name',
    workEmail: 'Work email',
    phone: 'Phone number',
    website: 'Company website',
    employeeCount: 'Employee count',
    concerns: 'Areas of concern',
    message: 'Short message'
  };

  function collect() {
    const fd = new FormData(form);
    return {
      fullName: (fd.get('fullName') || '').trim(),
      businessName: (fd.get('businessName') || '').trim(),
      workEmail: (fd.get('workEmail') || '').trim(),
      phone: (fd.get('phone') || '').trim(),
      website: (fd.get('website') || '').trim(),
      employeeCount: fd.get('employeeCount') || '',
      concerns: fd.getAll('concerns'),
      message: (fd.get('message') || '').trim(),
      marketingConsent: fd.get('marketingConsent') === 'yes',
      companyFax: fd.get('companyFax') || '',
      formStartedAt: fd.get('formStartedAt') || ''
    };
  }

  function validate(d) {
    const e = {};
    if (!d.fullName) e.fullName = 'Enter your full name.';
    if (!d.businessName) e.businessName = 'Enter your business name.';
    if (!d.workEmail) e.workEmail = 'Enter your work email address.';
    else if (!EMAIL_RE.test(d.workEmail)) e.workEmail = 'Enter an email address in the format name@company.com.';
    if (d.phone && !PHONE_RE.test(d.phone)) e.phone = 'Enter a valid phone number, or leave this field empty.';
    if (d.website && !WEBSITE_RE.test(d.website)) e.website = 'Enter a website address such as example.com, or leave this field empty.';
    if (!d.employeeCount) e.employeeCount = 'Select your employee count.';
    if (d.concerns.length === 0) e.concerns = 'Select at least one area of concern.';
    if (d.message.length > 1000) e.message = 'Message must be 1,000 characters or fewer.';
    return e;
  }

  function focusTarget(name) {
    return name === 'concerns' ? form.querySelector('input[name="concerns"]') : document.getElementById(name);
  }

  function clearErrors() {
    form.querySelectorAll('.field-error').forEach((el) => {
      el.hidden = true;
      el.textContent = '';
    });
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    form.querySelectorAll('.field.has-error').forEach((el) => el.classList.remove('has-error'));
    summary.hidden = true;
    summary.querySelector('ul').innerHTML = '';
  }

  function showErrors(errors) {
    const list = summary.querySelector('ul');
    for (const [name, msg] of Object.entries(errors)) {
      const errEl = document.getElementById(`${name}-error`);
      if (errEl) {
        errEl.textContent = msg;
        errEl.hidden = false;
        errEl.closest('.field')?.classList.add('has-error');
      }
      if (name === 'concerns') document.getElementById('concerns').setAttribute('aria-invalid', 'true');
      else document.getElementById(name)?.setAttribute('aria-invalid', 'true');

      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${name}`;
      a.textContent = `${labels[name] || name}: ${msg}`;
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        focusTarget(name)?.focus();
      });
      li.appendChild(a);
      list.appendChild(li);
    }
    summary.hidden = false;
    summary.focus();
  }

  function setBusy(busy) {
    submitBtn.disabled = busy;
    submitBtn.setAttribute('aria-busy', String(busy));
    submitBtn.textContent = busy ? 'Sending…' : 'Request an Assessment';
    status.textContent = busy ? 'Sending your request…' : '';
  }

  // Clear a field's error once the user corrects it.
  form.addEventListener('input', (ev) => {
    const name = ev.target.name;
    if (!name || !labels[name]) return;
    const d = collect();
    const e = validate(d);
    const errEl = document.getElementById(`${name}-error`);
    if (errEl && !errEl.hidden && !e[name]) {
      errEl.hidden = true;
      errEl.textContent = '';
      errEl.closest('.field')?.classList.remove('has-error');
      (name === 'concerns' ? document.getElementById('concerns') : ev.target).removeAttribute('aria-invalid');
    }
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    clearErrors();
    status.classList.remove('is-error');

    const data = collect();
    const errors = validate(data);
    if (Object.keys(errors).length) {
      showErrors(errors);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      });
      const body = await res.json().catch(() => ({}));

      if (res.ok && body.ok === true) {
        panel.hidden = true;
        success.hidden = false;
        success.focus();
        success.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        return;
      }

      setBusy(false);
      if (res.status === 422 && body.errors) {
        showErrors(body.errors);
      } else {
        status.classList.add('is-error');
        status.textContent =
          body.message || 'Sorry, your request could not be sent. Please try again in a few minutes, or use our contact page.';
      }
    } catch {
      setBusy(false);
      status.classList.add('is-error');
      status.textContent = 'Sorry, we could not connect. Please check your connection and try again.';
    }
  });
})();
