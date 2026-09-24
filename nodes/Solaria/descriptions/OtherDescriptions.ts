import type { INodeProperties } from 'n8n-workflow';
import { paginationFields, targetFields } from './shared';

const channelField = (resource: string, operation: string): INodeProperties => ({
	displayName: 'Channel Name or ID',
	name: 'channelId',
	type: 'options',
	typeOptions: { loadOptionsMethod: 'getChannels' },
	default: '',
	displayOptions: {
		show: { resource: [resource], operation: [operation] },
		hide: { target: ['conversation'] },
	},
	description:
		'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	hint: '"Automatic" uses the contact\'s latest conversation or opens one on the main channel',
});

// ─── Message ─────────────────────────────────────────────────────────────────

export const messageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['message'] } },
		options: [
			{
				name: 'Send',
				value: 'send',
				description: 'Send a text or a message template over WhatsApp',
				action: 'Send a message',
			},
		],
		default: 'send',
	},
];

export const messageFields: INodeProperties[] = [
	...targetFields('message', 'send', ['contact', 'conversation']),
	{
		displayName: 'Message Type',
		name: 'messageType',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['message'], operation: ['send'] } },
		options: [
			{ name: 'Text', value: 'text' },
			{
				name: 'Template',
				value: 'template',
				description:
					'Sent as an approved template on the official WhatsApp API (required outside the 24h window)',
			},
		],
		default: 'text',
	},
	{
		displayName: 'Text',
		name: 'content',
		type: 'string',
		required: true,
		typeOptions: { rows: 4 },
		default: '',
		displayOptions: { show: { resource: ['message'], operation: ['send'], messageType: ['text'] } },
		description: 'Up to 4096 characters. WhatsApp formatting (*bold*, _italic_) works.',
	},
	{
		displayName: 'Template Name or ID',
		name: 'templateId',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getTemplates' },
		default: '',
		displayOptions: {
			show: { resource: ['message'], operation: ['send'], messageType: ['template'] },
		},
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		hint: '{{nome}}, {{primeiro_nome}} and {{telefone}} in the template are filled with the contact data',
	},
	channelField('message', 'send'),
];

// ─── Conversation ────────────────────────────────────────────────────────────

export const conversationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['conversation'] } },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List conversations by status',
				action: 'Get many conversations',
			},
			{
				name: 'Update Status',
				value: 'updateStatus',
				description: 'Open, set as pending or resolve a conversation',
				action: 'Update a conversation status',
			},
		],
		default: 'getAll',
	},
];

export const conversationFields: INodeProperties[] = [
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		displayOptions: { show: { resource: ['conversation'], operation: ['getAll'] } },
		options: [
			{ name: 'All', value: 'all' },
			{ name: 'Open', value: 'open' },
			{ name: 'Pending', value: 'pending' },
			{ name: 'Resolved', value: 'resolved' },
		],
		default: 'open',
	},
	...paginationFields('conversation', 'getAll'),
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['conversation'], operation: ['updateStatus'] } },
	},
	{
		displayName: 'New Status',
		name: 'newStatus',
		type: 'options',
		displayOptions: { show: { resource: ['conversation'], operation: ['updateStatus'] } },
		options: [
			{ name: 'Open', value: 'open' },
			{ name: 'Pending', value: 'pending' },
			{ name: 'Resolved', value: 'resolved' },
		],
		default: 'resolved',
	},
];

// ─── Sequence ────────────────────────────────────────────────────────────────

export const sequenceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['sequence'] } },
		options: [
			{
				name: 'Add Contact',
				value: 'enroll',
				description: 'Enroll a contact in a message sequence',
				action: 'Add a contact to a sequence',
			},
		],
		default: 'enroll',
	},
];

export const sequenceFields: INodeProperties[] = [
	{
		displayName: 'Sequence Name or ID',
		name: 'sequenceId',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getSequences' },
		default: '',
		displayOptions: { show: { resource: ['sequence'], operation: ['enroll'] } },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	...targetFields('sequence', 'enroll', ['contact']),
];

// ─── Chatbot ─────────────────────────────────────────────────────────────────

export const chatbotOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['chatbot'] } },
		options: [
			{
				name: 'Start',
				value: 'start',
				description: "Start an automation chatbot in the contact's conversation",
				action: 'Start a chatbot',
			},
		],
		default: 'start',
	},
];

export const chatbotFields: INodeProperties[] = [
	{
		displayName: 'Chatbot Name or ID',
		name: 'chatbotId',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getChatbots' },
		default: '',
		displayOptions: { show: { resource: ['chatbot'], operation: ['start'] } },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		hint: 'Only published automation chatbots available for "API" are listed',
	},
	...targetFields('chatbot', 'start', ['contact', 'conversation']),
	channelField('chatbot', 'start'),
];

// ─── Channel ─────────────────────────────────────────────────────────────────

export const channelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['channel'] } },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List the WhatsApp channels of the account',
				action: 'Get many channels',
			},
		],
		default: 'getAll',
	},
];
