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
	...paginationFields('contact', 'getAll'),
];
