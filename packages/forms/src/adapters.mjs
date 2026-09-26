// One interface for both email tools. These adapters are illustrative: they show the shape of a
// provider request (list names stand in for list and group IDs, field names for field IDs) and
// are not verified provider contracts. Nothing is sent: the handler returns a sanitised copy.

function redactEmail(email) {
  const [u, d] = String(email).split('@');
  return `${u.slice(0, 1)}***@${d ?? ''}`;
}

export const adapters = {
  activecampaign: {
    label: 'ActiveCampaign',
    build({ contact, list }) {
      return {
        method: 'POST',
        url: 'https://<account>.api-us1.com/api/3/contact/sync',
        headers: { 'Api-Token': '<not in this demo>' },
        body: {
          contact: {
            email: contact.email,
            firstName: contact.firstName,
            fieldValues: Object.entries(contact.attribution ?? {}).map(([field, value]) => ({ field, value })),
          },
          then: { contactList: { list, status: 1 } },
        },
      };
    },
  },
  mailerlite: {
    label: 'MailerLite',
    build({ contact, list }) {
      return {
        method: 'POST',
        url: 'https://connect.mailerlite.com/api/subscribers',
        headers: { Authorization: 'Bearer <not in this demo>' },
        body: {
          email: contact.email,
          fields: { name: contact.firstName, ...(contact.attribution ?? {}) },
          groups: [list],
        },
      };
    },
  },
};

export function sanitizedRequest(req) {
  const copy = JSON.parse(JSON.stringify(req));
  if (copy.body?.contact?.email) copy.body.contact.email = redactEmail(copy.body.contact.email);
  if (copy.body?.email) copy.body.email = redactEmail(copy.body.email);
  return copy;
}
