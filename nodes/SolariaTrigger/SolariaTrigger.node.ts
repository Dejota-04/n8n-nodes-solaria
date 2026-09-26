import { createHmac, timingSafeEqual } from 'crypto';
import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

import { solariaApiRequest } from '../Solaria/GenericFunctions';

interface TriggerStaticData {
	webhookId?: string;
	webhookSecret?: string;
}

/** Checks the X-Solaria-Signature header (sha256=HMAC of the body with the webhook secret). */
function validSignature(secret: string, rawBody: Buffer | undefined, header: string): boolean {
	if (!rawBody || !header.startsWith('sha256=')) return false;
	const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'));
	const received = Buffer.from(header.slice('sha256='.length));
	return expected.length === received.length && timingSafeEqual(expected, received);
}

/** Chatwoot message_type: "incoming" (or 0) = message from the customer. */
function isIncoming(data: IDataObject | undefined): boolean {
	const t = data?.message_type;
	return t === 'incoming' || t === 0;
}

export class SolariaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SOLAR.IA Trigger',
		name: 'solariaTrigger',
		icon: { light: 'file:solaria.svg', dark: 'file:solaria.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description:
			'Starts the workflow when something happens in SOLAR.IA (message, conversation or contact)',
		defaults: { name: 'SOLAR.IA Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'solariaApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: ['message.created'],
				options: [
					{
						name: 'Contact Created',
						value: 'contact.created',
					},
					{
						name: 'Contact Opted In',
						value: 'contact.opted_in',
						description: 'An opt-out was undone: the contact receives automated messages again',
					},
					{
						name: 'Contact Opted Out',
						value: 'contact.opted_out',
						description:
							'The contact asked (or was set by the team or the API) not to receive automated messages',
					},
					{
						name: 'Contact Updated',
						value: 'contact.updated',
					},
					{
						name: 'Conversation Created',
						value: 'conversation.created',
					},
					{
						name: 'Conversation Resolved',
						value: 'conversation.resolved',
					},
					{
						name: 'Conversation Updated',
						value: 'conversation.updated',
						description: 'Status, assignee or conversation data changed',
					},
					{
						name: 'Message Created',
						value: 'message.created',
						description: 'Message received from a customer or sent by the team',
					},
				],
			},
			{
				displayName: 'Only Customer Messages',
				name: 'onlyIncoming',
				type: 'boolean',
				default: true,
				displayOptions: { show: { events: ['message.created'] } },
				description:
					'Whether to ignore messages sent by the team, bots or this workflow (avoids loops when the workflow replies)',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node') as TriggerStaticData;
				if (!data.webhookId) return false;
				try {
					const hook = await solariaApiRequest.call(this, 'GET', `/webhooks/${data.webhookId}`);
					const events = (this.getNodeParameter('events') as string[]).slice().sort();
					const current = ((hook.events as string[]) ?? []).slice().sort();
					if (
						hook.url === this.getNodeWebhookUrl('default') &&
						events.join(',') === current.join(',')
					) {
						return true;
					}
					// URL or events changed: remove the old webhook so it is recreated
					await solariaApiRequest.call(this, 'DELETE', `/webhooks/${data.webhookId}`);
				} catch (error) {
					if ((error as NodeApiError).httpCode !== '404') {
						throw new NodeApiError(this.getNode(), error as JsonObject);
					}
				}
				delete data.webhookId;
				delete data.webhookSecret;
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const workflow = this.getWorkflow();
				const hook = await solariaApiRequest.call(this, 'POST', '/webhooks', {
					name: `n8n: ${workflow.name ?? workflow.id ?? 'workflow'}`,
					url: this.getNodeWebhookUrl('default'),
					events: this.getNodeParameter('events') as string[],
				});
				if (!hook.id) return false;
				const data = this.getWorkflowStaticData('node') as TriggerStaticData;
				data.webhookId = String(hook.id);
				data.webhookSecret = String(hook.secret ?? '');
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node') as TriggerStaticData;
				if (data.webhookId) {
					try {
						await solariaApiRequest.call(this, 'DELETE', `/webhooks/${data.webhookId}`);
					} catch (error) {
						if ((error as NodeApiError).httpCode !== '404') return false;
					}
				}
				delete data.webhookId;
				delete data.webhookSecret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const res = this.getResponseObject();
		const { webhookSecret } = this.getWorkflowStaticData('node') as TriggerStaticData;

		if (webhookSecret) {
			const signature = String(req.headers['x-solaria-signature'] ?? '');
			if (!validSignature(webhookSecret, req.rawBody, signature)) {
				res.status(401).json({ error: 'invalid signature' });
				return { noWebhookResponse: true };
			}
		}

		const body = this.getBodyData();
		const event = String(body.event ?? '');
		const events = this.getNodeParameter('events') as string[];
		if (!events.includes(event)) return {};
		if (
			event === 'message.created' &&
			(this.getNodeParameter('onlyIncoming', true) as boolean) &&
			!isIncoming(body.data as IDataObject)
		) {
			return {};
		}

		return { workflowData: [this.helpers.returnJsonArray(body)] };
	}
}
