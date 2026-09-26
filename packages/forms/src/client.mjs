// Progressive enhancement for every <form data-lead-form>. One submission per click stream.
import { attribution, trackLead } from '@shared/tracking/client';

export function enhanceLeadForms(root = document) {
  root.querySelectorAll('form[data-lead-form]').forEach((form) => {
    const status = form.querySelector('[data-lead-status]');
    const button = form.querySelector('button[type="submit"]');
    let inFlight = false;
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (inFlight) return;
      inFlight = true;
      if (button) button.disabled = true;
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        const res = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...data, formKey: form.dataset.formKey, attribution: attribution() }),
        });
        const receipt = await res.json();
        if (!res.ok || !receipt.ok) throw new Error(receipt.error || 'The request was not accepted.');
        trackLead(receipt, receipt.conversion || 'lead');
        form.dataset.state = 'sent';
        if (status) status.textContent = form.dataset.success || 'Thanks. We will be in touch within one business day.';
        window.dispatchEvent(new CustomEvent('bp:lead', { detail: receipt }));
      } catch (e) {
        form.dataset.state = 'error';
        if (status) status.textContent = e.message;
        if (button) button.disabled = false;
        inFlight = false;
      }
    });
  });
}
