# Changelog

## 0.2.0

- Contact: **Opt Out** and **Opt In** operations (by contact ID or phone number) and the **Opted Out Only**
  filter on Get Many. Contacts now include `opted_out`.
- Trigger: **Contact Opted Out** and **Contact Opted In** events.
- Contact: opting in again resumes the sequences the opt-out interrupted, from the step where they stopped
  (`resumed_sequences` in the response). Listed contacts that opted out include `opted_out_at` and
  `opted_out_source`.
- Conversation: **Update Status** to Resolved now works like the Conclude button in the app (chatbot and AI
  agent stop, satisfaction survey, the assignee's close preference) and takes **Resolve Options**: After
  Resolving (keep for 12h / archive now) and Classification with an optional note.

## 0.1.1

- First release published from GitHub Actions with npm provenance.

## 0.1.0

- SOLAR.IA node: contacts (create, get, get many, update, add/remove tag), messages (text or template to a
  phone number, contact or conversation), conversations (get many, update status), sequences (add contact),
  chatbots (start) and channels (get many).
- SOLAR.IA Trigger node: message, conversation and contact events with signed deliveries; the webhook is
  registered on activation and removed on deactivation.
