import { Injectable } from '@angular/core';

// Sends website form messages (Contact, Book a Demo, Newsletter) to info@vishvadigitaltechnologies.com.
//
// ===== TURN ON WEB3FORMS (3 steps, 2 minutes, free) =====
//  1. Open https://web3forms.com  ->  enter  info@vishvadigitaltechnologies.com  ->  "Create Access Key".
//  2. The access key arrives in that mailbox (check Spam). Copy it.
//  3. Paste it between the quotes of WEB3FORMS_KEY below, save, rebuild and upload the site.
// Optional: in the Web3Forms dashboard add your website domain so the key only works on your site.
// The key is meant to be public (it can only send mail to your address), so it is safe in front-end code.
//
// While WEB3FORMS_KEY is empty the service falls back to FormSubmit.co, which only delivers after you click
// the "Activate Form" e-mail it sends to the mailbox on the first submission.
//
// If sending fails for any reason, the reason is printed in the browser console ("[vSuite mail]"),
// and the forms open the visitor's e-mail app with the message ready, so no enquiry is lost.
const RECIPIENT = 'info@vishvadigitaltechnologies.com';
const WEB3FORMS_KEY = ''; // <- paste your Web3Forms access key here, e.g. '1a2b3c4d-5e6f-....'
const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
const FORMSUBMIT_ENDPOINT = 'https://formsubmit.co/ajax/' + RECIPIENT;

@Injectable({ providedIn: 'root' })
export class MailService {
  /**
   * Last resort when the form service is not reachable / not activated yet:
   * opens the visitor's e-mail app with the message already written, addressed to the company mailbox.
   */
  openMailClient(subject: string, fields: Record<string, string | null | undefined>): void {
    const lines = Object.entries(fields)
      .filter(([, v]) => !!v)
      .map(([k, v]) => `${k}: ${v}`);
    const href = `mailto:${RECIPIENT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
    window.location.href = href;
  }

  /** Why the last send failed (for debugging; also logged to the console). */
  lastError = '';

  /** Resolves true when the message was accepted for delivery. */
  async send(subject: string, fields: Record<string, string | null | undefined>): Promise<boolean> {
    this.lastError = '';
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields)) if (v) clean[k] = String(v);

    const useWeb3 = WEB3FORMS_KEY.trim().length > 0;
    const body: Record<string, string | boolean> = useWeb3
      ? {
          access_key: WEB3FORMS_KEY.trim(),
          subject,
          from_name: clean['Name'] ?? 'vSuite website',
          ...clean,
          // Web3Forms shows "message" as the main text of the e-mail
          message:
            clean['Message'] ??
            clean['Details / requirements'] ??
            Object.entries(clean)
              .map(([k, v]) => `${k}: ${v}`)
              .join('\n'),
          botcheck: '',
        }
      : { _subject: subject, _template: 'table', _captcha: 'false', _honey: '', ...clean };
    if (clean['Email']) {
      if (useWeb3) body['email'] = clean['Email'];
      else body['_replyto'] = clean['Email'];
    }

    try {
      const res = await fetch(useWeb3 ? WEB3FORMS_ENDPOINT : FORMSUBMIT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      const ok = res.ok && String(data.success) === 'true';
      if (!ok) {
        this.lastError = String(data.message || 'HTTP ' + res.status);
        console.error('[vSuite mail] message was not sent:', this.lastError, data);
      }
      return ok;
    } catch (err) {
      this.lastError = 'Network error: ' + (err instanceof Error ? err.message : String(err));
      console.error('[vSuite mail]', this.lastError);
      return false;
    }
  }
}