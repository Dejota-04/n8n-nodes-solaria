import type {
	IDataObject,
	JsonObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { contactFields, contactOperations } from './descriptions/ContactDescription';
import {
	channelOperations,
	chatbotFields,
	chatbotOperations,
	conversationFields,
	conversationOperations,
	messageFields,
	messageOperations,
	sequenceFields,
	sequenceOperations,
} from './descriptions/OtherDescriptions';
import {
	loadOptionsFrom,
	solariaApiRequest,
	solariaApiRequestAllItems,
	toId,
} from './GenericFunctions';

// Programmatic style: the destination of messages/sequences/chatbots changes the request
// body (phone, contact or conversation) and list operations page until the total.

export class Solaria implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SOLAR.IA',
		name: 'solaria',
		icon: { light: 'file:solaria.svg', dark: 'file:solaria.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Contacts, WhatsApp messages, conversations, sequences and chatbots in SOLAR.IA',
		defaults: { name: 'SOLAR.IA' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'solariaApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Channel', value: 'channel' },
					{ name: 'Chatbot', value: 'chatbot' },
					{ name: 'Contact', value: 'contact' },
					{ name: 'Conversation', value: 'conversation' },
					{ name: 'Message', value: 'message' },
					{ name: 'Sequence', value: 'sequence' },
				],
				default: 'message',
			},
			...channelOperations,
			...chatbotOperations,
			...chatbotFields,
			...contactOperations,
			...contactFields,
			...conversationOperations,
			...conversationFields,
			...messageOperations,
			...messageFields,
			...sequenceOperations,
			...sequenceFields,
		],
	};

	methods = {
		loadOptions: {
			async getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const channels = await loadOptionsFrom.call(this, '/channels', 'channels', (c) =>
					[c.phone_number, c.type === 'whatsapp_official' ? 'official API' : 'QR code', c.status]
						.filter(Boolean)
						.join(' · '),
				);
				return [{ name: 'Automatic', value: '' }, ...channels];
			},
			async getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await loadOptionsFrom.call(this, '/templates', 'templates', (t) =>
					String(t.body ?? '').slice(0, 120),
				);
			},
			async getSequences(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await loadOptionsFrom.call(this, '/sequences', 'sequences', (s) =>
					s.enabled ? undefined : 'Disabled',
				);
			},
			async getChatbots(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await loadOptionsFrom.call(this, '/chatbots', 'chatbots');
			},
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await loadOptionsFrom.call(this, '/tags', 'tags');
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const result = await run.call(this, resource, operation, i);
				const list = Array.isArray(result) ? result : [result];
				returnData.push(...list.map((json) => ({ json, pairedItem: { item: i } })));
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				if (error instanceof NodeApiError) {
					error.context.itemIndex = i;
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject);
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

/** Destination body: { phone_number, name } | { contact_id } | { conversation_id }. */
function target(this: IExecuteFunctions, i: number): IDataObject {
	const mode = this.getNodeParameter('target', i) as string;
	if (mode === 'conversation') {
		return {
			conversation_id: toId.call(
				this,
				this.getNodeParameter('conversationId', i),
				'Conversation ID',
				i,
			),
		};
	}
	if (mode === 'contact') {
		return { contact_id: toId.call(this, this.getNodeParameter('contactId', i), 'Contact ID', i) };
	}
	const phone = String(this.getNodeParameter('phoneNumber', i)).trim();
	if (!phone)
		throw new NodeOperationError(this.getNode(), 'Phone number is required', { itemIndex: i });
	const body: IDataObject = { phone_number: phone };
	const name = String(this.getNodeParameter('contactName', i, '')).trim();
	if (name) body.name = name;
	return body;
}

function withChannel(this: IExecuteFunctions, i: number, body: IDataObject): IDataObject {
	if (body.conversation_id === undefined) {
		const channel = this.getNodeParameter('channelId', i, '') as string;
		if (channel) body.channel_id = channel;
	}
	return body;
}

async function listing(
	this: IExecuteFunctions,
	i: number,
	path: string,
	key: string,
	qs: IDataObject,
): Promise<IDataObject[]> {
	const returnAll = this.getNodeParameter('returnAll', i) as boolean;
	const limit = returnAll ? undefined : (this.getNodeParameter('limit', i) as number);
	return await solariaApiRequestAllItems.call(this, path, key, qs, limit);
}

async function run(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const contactId = () => toId.call(this, this.getNodeParameter('contactId', i), 'Contact ID', i);

	switch (`${resource}.${operation}`) {
		case 'contact.create': {
			const body: IDataObject = {};
			for (const [param, field] of [
				['phoneNumber', 'phone_number'],
				['name', 'name'],
				['email', 'email'],
			]) {
				const v = String(this.getNodeParameter(param, i, '')).trim();
				if (v) body[field] = v;
			}
			if (!body.phone_number && !body.name) {
				throw new NodeOperationError(this.getNode(), 'Provide a phone number or a name', {
					itemIndex: i,
				});
			}
			const res = await solariaApiRequest.call(this, 'POST', '/contacts', body);
			return { ...(res.contact as IDataObject), created: res.created };
		}
		case 'contact.get':
			return await solariaApiRequest.call(this, 'GET', `/contacts/${contactId()}`);
		case 'contact.getAll':
			return await listing.call(this, i, '/contacts', 'contacts', {
				q: this.getNodeParameter('query', i, '') as string,
				...(this.getNodeParameter('optedOutOnly', i, false) ? { opted_out: 'true' } : {}),
			});
		case 'contact.update': {
			const fields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
			const body: IDataObject = {};
			if (fields.name !== undefined) body.name = fields.name;
			if (fields.email !== undefined) body.email = fields.email;
			if (fields.phoneNumber !== undefined) body.phone_number = fields.phoneNumber;
			if (Object.keys(body).length === 0) {
				throw new NodeOperationError(this.getNode(), 'Choose at least one field to update', {
					itemIndex: i,
				});
			}
			return await solariaApiRequest.call(this, 'PATCH', `/contacts/${contactId()}`, body);
		}
		case 'contact.optOut':
		case 'contact.optIn': {
			const method = operation === 'optOut' ? 'POST' : 'DELETE';
			if (this.getNodeParameter('findBy', i, 'id') === 'phone') {
				const phone = String(this.getNodeParameter('phoneNumber', i, '')).trim();
				if (!phone) {
					throw new NodeOperationError(this.getNode(), 'Provide a phone number', { itemIndex: i });
				}
				return await solariaApiRequest.call(
					this,
					method,
					'/contacts/opt-out',
					method === 'POST' ? { phone_number: phone } : undefined,
					method === 'DELETE' ? { phone_number: phone } : undefined,
				);
			}
			return await solariaApiRequest.call(this, method, `/contacts/${contactId()}/opt-out`);
		}
		case 'contact.addTag':
			return await solariaApiRequest.call(this, 'POST', `/contacts/${contactId()}/tags`, {
				tag_id: this.getNodeParameter('tagId', i) as string,
			});
		case 'contact.removeTag': {
			const tag = encodeURIComponent(this.getNodeParameter('tagId', i) as string);
			return await solariaApiRequest.call(this, 'DELETE', `/contacts/${contactId()}/tags/${tag}`);
		}

		case 'message.send': {
			const body = withChannel.call(this, i, target.call(this, i));
			if (this.getNodeParameter('messageType', i) === 'template') {
				body.template_id = this.getNodeParameter('templateId', i) as string;
			} else {
				body.content = this.getNodeParameter('content', i) as string;
			}
			return await solariaApiRequest.call(this, 'POST', '/messages', body);
		}

		case 'conversation.getAll':
			return await listing.call(this, i, '/conversations', 'conversations', {
				status: this.getNodeParameter('status', i) as string,
			});
		case 'conversation.updateStatus': {
			const id = toId.call(this, this.getNodeParameter('conversationId', i), 'Conversation ID', i);
			return await solariaApiRequest.call(this, 'PATCH', `/conversations/${id}`, {
				status: this.getNodeParameter('newStatus', i) as string,
			});
		}

		case 'sequence.enroll': {
			const id = encodeURIComponent(this.getNodeParameter('sequenceId', i) as string);
			return await solariaApiRequest.call(
				this,
				'POST',
				`/sequences/${id}/contacts`,
				target.call(this, i),
			);
		}

		case 'chatbot.start': {
			const id = encodeURIComponent(this.getNodeParameter('chatbotId', i) as string);
			const body = withChannel.call(this, i, target.call(this, i));
			return await solariaApiRequest.call(this, 'POST', `/chatbots/${id}/start`, body);
		}

		case 'channel.getAll': {
			const res = await solariaApiRequest.call(this, 'GET', '/channels');
			return (res.channels as IDataObject[]) ?? [];
		}
	}
	throw new NodeOperationError(this.getNode(), `Unsupported operation: ${resource}.${operation}`, {
		itemIndex: i,
	});
}
