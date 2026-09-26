import type { INodeProperties } from 'n8n-workflow';
import { paginationFields } from './shared';

const show = (operation: string[]) => ({ show: { resource: ['contact'], operation } });

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['contact'] } },
		options: [
			{
				name: 'Add Tag',
				value: 'addTag',
				description: 'Add a tag to a contact',
				action: 'Add a tag to a contact',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a contact. If the phone number already exists, returns that contact.',
				action: 'Create a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a contact by ID',
				action: 'Get a contact',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List contacts, optionally searching by name, phone or email',
				action: 'Get many contacts',
			},
			{
				name: 'Opt In',
				value: 'optIn',
				description:
					'Undo an opt-out: the contact receives campaigns and sequences again. Only when the contact asked for it.',
				action: 'Opt in a contact',
			},
			{
				name: 'Opt Out',
				value: 'optOut',
				description:
					'Stop automated messages to the contact (campaigns, sequences and automated chatbots). Conversations with the team are not affected.',
				action: 'Opt out a contact',
			},
			{
				name: 'Remove Tag',
				value: 'removeTag',
				description: 'Remove a tag from a contact',
				action: 'Remove a tag from a contact',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Change name, phone number or email',
				action: 'Update a contact',
			},
		],
		default: 'create',
	},
];

export const contactFields: INodeProperties[] = [
	// ─── create ───
	{
		displayName: 'Phone Number',
		name: 'phoneNumber',
		type: 'string',
		default: '',
		placeholder: '5511999998888',
		displayOptions: show(['create']),
		description: 'With area code. Required when no name is given.',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: show(['create']),
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		displayOptions: show(['create']),
	},

	// ─── opt out / opt in ───
	{
		displayName: 'Find Contact By',
		name: 'findBy',
		type: 'options',
		options: [
			{ name: 'Contact ID', value: 'id' },
			{ name: 'Phone Number', value: 'phone' },
		],
		default: 'id',
		displayOptions: show(['optOut', 'optIn']),
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['contact'], operation: ['optOut', 'optIn'], findBy: ['id'] } },
	},
	{
		displayName: 'Phone Number',
		name: 'phoneNumber',
		type: 'string',
		required: true,
		default: '',
		placeholder: '5511999998888',
		displayOptions: { show: { resource: ['contact'], operation: ['optOut', 'optIn'], findBy: ['phone'] } },
		description: 'Any format. No contact is created when the number is not found.',
	},

	// ─── get / update / tags ───
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: show(['get', 'update', 'addTag', 'removeTag']),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{ displayName: 'Phone Number', name: 'phoneNumber', type: 'string', default: '' },
		],
	},
	{
		displayName: 'Tag Name or ID',
		name: 'tagId',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getTags' },
		default: '',
		displayOptions: show(['addTag', 'removeTag']),
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},

	// ─── get many ───
	{
		displayName: 'Search',
		name: 'query',
		type: 'string',
		default: '',
		displayOptions: show(['getAll']),
		description: 'Name, phone number or email. Leave empty to list all contacts.',
	},
	{
		displayName: 'Opted Out Only',
		name: 'optedOutOnly',
		type: 'boolean',
		default: false,
		displayOptions: show(['getAll']),
		description:
			'Whether to list only contacts that opted out of automated messages (most recent first; the search then matches the name only)',
	},
	...paginationFields('contact', 'getAll'),
];
