(() => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const panel = document.getElementById('contact-panel');
  const success = document.getElementById('contact-success');
  const summary = document.getElementById('contact-error-summary');
  const status = document.getElementById('contact-status');
  const submitBtn = document.getElementById('contact-submit');
  document.getElementById('c-formStartedAt').value = String(Date.now());

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_RE = /^[+()\d\s.-]{7,40}$/;
  const labels = {
    fullName: 'Full name',
    email: 'Email',
    businessName: 'Business name',
    phone: 'Phone number',
    topic: 'Inquiry topic',
    message: 'Message'
  };
  const fieldId = (name) => `c-${name}`;

  function collect() {
    const fd = new FormData(form);
    const get = (k) => String(fd.get(k) || '').trim();
    return {
      fullName: get('fullName'),
      email: get('email'),
      businessName: get('businessName'),
      phone: get('phone'),
      topic: get('topic'),
      message: get('message'),
      companyFax: get('companyFax'),
      formStartedAt: get('formStartedAt')
    };
  }

  function validate(d) {
    const e = {};
    if (!d.fullName) e.fullName = 'Enter your full name.';
    if (!d.email) e.email = 'Enter your email address.';
    else if (!EMAIL_RE.test(d.email)) e.email = 'Enter an email address in the format name@company.com.';
    if (d.phone && !PHONE_RE.test(d.phone)) e.phone = 'Enter a valid phone number, or leave this field empty.';
    if (!d.topic) e.topic = 'Select what your inquiry is about.';
    if (!d.message) e.message = 'Enter a short message.';
    else if (d.message.length > 2000) e.message = 'Message must be 2,000 characters or fewer.';
    return e;
  }

  function clearErrors() {
    form.querySelectorAll('.field-error').forEach((el) => {
      el.hidden = true;
      el.textContent = '';
    });
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    form.querySelectorAll('.field.has-error').forEach((el) => el.classList.remove('has-error'));
    summary.hidden = true;
    summary.querySelector('ul').replaceChildren();
    status.classList.remove('is-error');
    status.textContent = '';
  }

  function showErrors(errors) {
    const list = summary.querySelector('ul');
    for (const [name, msg] of Object.entries(errors)) {
      const input = document.getElementById(fieldId(name));
      const errEl = document.getElementById(`${fieldId(name)}-error`);
      if (errEl) {
        errEl.textContent = msg;
        errEl.hidden = false;
        errEl.closest('.field')?.classList.add('has-error');
      }
      input?.setAttribute('aria-invalid', 'true');

      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${fieldId(name)}`;
      a.textContent = `${labels[name] || name}: ${msg}`;
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        input?.focus();
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
    submitBtn.textContent = busy ? 'Sending…' : 'Send Inquiry';
    status.textContent = busy ? 'Sending your inquiry…' : '';
  }

  form.addEventListener('input', (ev) => {
    const name = ev.target.name;
    if (!labels[name]) return;
    const errEl = document.getElementById(`${fieldId(name)}-error`);
    if (errEl && !errEl.hidden && !validate(collect())[name]) {
      errEl.hidden = true;
      errEl.textContent = '';
      errEl.closest('.field')?.classList.remove('has-error');
      ev.target.removeAttribute('aria-invalid');
    }
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    clearErrors();
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
        return;
      }

      setBusy(false);
      if (res.status === 422 && body.errors) {
        showErrors(body.errors);
      } else {
        status.classList.add('is-error');
        status.textContent = body.message || 'Sorry, your inquiry could not be sent. Please try again in a few minutes.';
      }
    } catch {
      setBusy(false);
      status.classList.add('is-error');
      status.textContent = 'Sorry, we could not connect. Please check your connection and try again.';
    }
  });
})();
