// Shared site partials. Edit here, then run `npm run build`.

export const BRAND = 'AI Agents See Security';
export const BRAND_LINK = `<a class="brand" href="index.html"><img class="brand-mark" src="assets/images/security-logo.svg" width="28" height="28" alt="" /> ${BRAND}</a>`;

// Set this to the verified legal name of the contracting entity once supplied,
// e.g. 'Example Holdings LLC'. Until then a clear placeholder is shown.
export const LEGAL_ENTITY = null;

const legalLine = LEGAL_ENTITY
  ? `${BRAND} services are provided by ${LEGAL_ENTITY}.`
  : 'Contracting entity: [verified legal entity name to be confirmed]';

export const FOOTER = `<footer class="site-footer">
      <div class="container">
        <div class="footer-top">
          <div class="footer-brand">
            ${BRAND_LINK}
            <p class="footer-parent">An AI Agents See company</p>
            <a class="cta cta-primary cta-small" href="security-assessment.html">Request a Security Assessment</a>
          </div>
          <nav class="footer-col" aria-labelledby="footer-services">
            <h2 class="footer-heading" id="footer-services">Services</h2>
            <ul>
              <li><a href="services.html">All services</a></li>
              <li><a href="email-account-security.html">Email &amp; Account Security</a></li>
              <li><a href="endpoint-device-security.html">Endpoint &amp; Device Security</a></li>
              <li><a href="website-ecommerce-security.html">Website &amp; eCommerce Security</a></li>
              <li><a href="backup-recovery.html">Backup &amp; Recovery</a></li>
              <li><a href="employee-security-training.html">Employee Security Training</a></li>
              <li><a href="managed-security-monitoring.html">Managed Security Monitoring</a></li>
              <li><a href="security-assessment.html">Security Assessment</a></li>
            </ul>
          </nav>
          <nav class="footer-col" aria-labelledby="footer-company">
            <h2 class="footer-heading" id="footer-company">Company</h2>
            <ul>
              <li><a href="who-we-help.html">Who We Help</a></li>
              <li><a href="how-it-works.html">How It Works</a></li>
              <li><a href="resources.html">Resources</a></li>
              <li><a href="about.html">About</a></li>
              <li><a href="contact.html">Contact</a></li>
            </ul>
          </nav>
          <nav class="footer-col" aria-labelledby="footer-legal">
            <h2 class="footer-heading" id="footer-legal">Legal</h2>
            <ul>
              <li><a href="privacy-policy.html">Privacy Policy</a></li>
              <li><a href="terms-of-use.html">Terms of Use</a></li>
            </ul>
          </nav>
        </div>
        <div class="footer-bottom">
          <p>© <span data-year></span> ${BRAND}. All rights reserved.</p>
          <p>${legalLine}</p>
        </div>
      </div>
    </footer>`;
