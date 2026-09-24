import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SolariaApi implements ICredentialType {
	name = 'solariaApi';

	displayName = 'SOLAR.IA API';

	icon: Icon = {
		light: 'file:../nodes/Solaria/solaria.svg',
		dark: 'file:../nodes/Solaria/solaria.dark.svg',
	};

	documentationUrl =
		'https://github.com/Dejota-04/n8n-nodes-solaria#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API URL',
			name: 'url',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://api.seudominio.com.br',
			description:
				'Base URL shown in SOLAR.IA under Ajustes › Integrações › API (with or without the trailing /integrations/v1)',
		},
		{
			displayName: 'API Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'sk_...',
			description:
				'Permanent token created in SOLAR.IA under Ajustes › Integrações › N8N (starts with sk_)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.token}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{$credentials.url.trim().replace(/\\/+$/, "").replace(/\\/integrations\\/v1$/, "")}}/integrations/v1',
			url: '/me',
			method: 'GET',
		},
	};
}
