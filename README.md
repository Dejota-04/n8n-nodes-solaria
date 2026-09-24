# n8n-nodes-solaria

n8n community nodes for SOLAR.IA, the WhatsApp CRM: manage contacts,
send WhatsApp messages and templates, move conversations, add contacts to sequences, start chatbots
and react to events in real time.

- **SOLAR.IA** node: actions (contacts, messages, conversations, sequences, chatbots, channels)
- **SOLAR.IA Trigger** node: starts a workflow when a message, conversation or contact event happens

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) ·
[Trigger](#trigger) · [Development](#development)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/):
in n8n go to **Settings › Community nodes › Install** and enter `n8n-nodes-solaria`.

## Credentials

Create a **SOLAR.IA API** credential with:

| Field | Where to find it |
|---|---|
| API URL | In SOLAR.IA, **Ajustes › Integrações › API** ("Endereço base"), e.g. `https://api.yourdomain.com.br`. The `/integrations/v1` suffix is optional. |
| API Token | In SOLAR.IA, **Ajustes › Integrações › N8N › Novo** (admins only). It starts with `sk_` and is shown only once. |

n8n tests the credential against `GET /integrations/v1/me`.

## Operations

| Resource | Operations |
|---|---|
| Contact | Create (returns the existing contact when the phone number is already registered), Get, Get Many (search by name, phone or email), Update, Add Tag, Remove Tag |
| Message | Send a text or a message template to a phone number, a contact or a conversation |
| Conversation | Get Many (by status), Update Status (open, pending, resolved) |
| Sequence | Add Contact |
| Chatbot | Start an automation chatbot (published and available for "API") |
| Channel | Get Many |

Notes:

- Sending to a **phone number** finds the contact (or creates it) and uses its latest conversation, or opens
  one on the chosen channel (or on the main channel).
- On the **official WhatsApp API**, outside the 24-hour window you must send a **Template**: it goes out as the
  approved template. On QR-code channels the template text is sent. `{{nome}}`, `{{primeiro_nome}}` and
  `{{telefone}}` in the template are filled with the contact data.
- Errors carry the reason returned by SOLAR.IA (e.g. no connected channel, contact not found). Enable
  **Settings › On Error › Continue** on the node to handle them in the workflow.
- The API allows 120 requests per minute per IP.

## Trigger

The **SOLAR.IA Trigger** registers a webhook in SOLAR.IA when the workflow is activated and removes it when
the workflow is deactivated (it shows up under **Ajustes › Integrações › Webhooks** as `n8n: <workflow>`).

| Event | When |
|---|---|
| Message Created | A message is received from a customer or sent by the team (internal notes are never sent) |
| Conversation Created / Updated / Resolved | A conversation is opened, changes (status, assignee) or is resolved |
| Contact Created / Updated | A contact is created or changed |

- **Only Customer Messages** (on by default) ignores messages sent by the team, bots or the workflow itself,
  so a workflow that replies does not trigger itself.
- Every delivery is signed (`X-Solaria-Signature: sha256=<HMAC-SHA256 of the body>`) and the node rejects
  requests with an invalid signature.
- SOLAR.IA only delivers to **public** addresses: n8n must be reachable from the internet (n8n Cloud always is;
  for self-hosted n8n set `WEBHOOK_URL` to the public URL).

The output is the event envelope:

```json
{
  "id": "delivery id",
  "event": "message.created",
  "workspace_id": "…",
  "webhook_id": "…",
  "timestamp": "2026-09-24T18:00:00Z",
  "data": { "content": "Hi!", "message_type": "incoming", "conversation": { "id": 10 }, "sender": { "id": 35 } }
}
```

Use `{{ $json.data.conversation.id }}` in **Message › Send › Conversation ID** to reply in the same conversation.

## Development

```bash
npm install
npm run dev     # n8n with this package loaded, hot reload (http://localhost:5678)
npm run lint
npm run build
```

### Release

Publishing runs on GitHub Actions with npm provenance (required by n8n for verified nodes):

1. On npmjs.com, add this repository as a **Trusted Publisher** for the package (workflow `publish.yml`),
   or set an `NPM_TOKEN` secret.
2. Run `npm run release`: it lints, builds, bumps the version, updates the changelog, tags and pushes.
   The tag triggers `.github/workflows/publish.yml`, which publishes to npm.

## License

[MIT](LICENSE.md)
