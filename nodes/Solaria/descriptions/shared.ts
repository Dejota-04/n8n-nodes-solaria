import type { INodeProperties } from 'n8n-workflow';

export type TargetMode = 'contact' | 'conversation';

const targetLabels: Record<'phone' | TargetMode, { name: string; description: string }> = {
	phone: {
		name: 'Phone Number',
		description: 'Find the contact by phone number (created if it does not exist)',
	},
	contact: { name: 'Contact ID', description: 'A contact already registered in SOLAR.IA' },
	conversation: {
		name: 'Conversation ID',
		description: 'A specific conversation (e.g. the one that fired the trigger)',
	},
};

/** Destination fields (phone, contact or conversation) shared by messages, sequences and chatbots. */
export function targetFields(
	resource: string,
	operation: string,
	extraModes: TargetMode[],
): INodeProperties[] {
	const modes = ['phone' as const, ...extraModes];
	const show = { resource: [resource], operation: [operation] };
	return [
		{
			displayName: 'Send To',
			name: 'target',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show },
			options: modes.map((m) => ({ ...targetLabels[m], value: m })),
			// every destination list starts with "phone"
			default: 'phone',
		},
		{
			displayName: 'Phone Number',
			name: 'phoneNumber',
			type: 'string',
			required: true,
			default: '',
			placeholder: '5511999998888',
			displayOptions: { show: { ...show, target: ['phone'] } },
			description: 'With area code. Numbers without a country code get 55 (Brazil).',
		},
		{
			displayName: 'Contact Name',
			name: 'contactName',
			type: 'string',
			default: '',
			displayOptions: { show: { ...show, target: ['phone'] } },
			description: 'Only used when the contact does not exist yet',
		},
		{
			displayName: 'Contact ID',
			name: 'contactId',
			type: 'string',
			required: true,
			default: '',
			displayOptions: { show: { ...show, target: ['contact'] } },
		},
		{
			displayName: 'Conversation ID',
			name: 'conversationId',
			type: 'string',
			required: true,
			default: '',
			displayOptions: { show: { ...show, target: ['conversation'] } },
		},
	];
}

/** "Return All" + "Limit" for list operations. */
export function paginationFields(resource: string, operation: string): INodeProperties[] {
	const show = { resource: [resource], operation: [operation] };
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			displayOptions: { show },
			default: false,
			description: 'Whether to return all results or only up to a given limit',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			displayOptions: { show: { ...show, returnAll: [false] } },
			typeOptions: { minValue: 1 },
			default: 50,
			description: 'Max number of results to return',
		},
	];
}
