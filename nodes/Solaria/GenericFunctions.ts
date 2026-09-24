import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

type SolariaContext =
	| IExecuteFunctions
	| ILoadOptionsFunctions
	| IHookFunctions
	| IWebhookFunctions;

/** Public API base URL, accepting the value with or without the trailing /integrations/v1. */
export function apiBaseUrl(url: string): string {
	return `${url
		.trim()
		.replace(/\/+$/, '')
		.replace(/\/integrations\/v1$/, '')}/integrations/v1`;
}

/** Calls the SOLAR.IA public API (/integrations/v1) with the credential token. */
export async function solariaApiRequest(
	this: SolariaContext,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('solariaApi');
	const options: IHttpRequestOptions = {
		method,
		baseURL: apiBaseUrl(credentials.url as string),
		url: path,
		json: true,
	};
	if (body !== undefined) options.body = body;
	if (qs !== undefined) options.qs = qs;
	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'solariaApi',
			options,
		)) as IDataObject;
	} catch (error) {
		const apiError = new NodeApiError(this.getNode(), error as JsonObject);
		// n8n replaces 4xx messages with a generic text; the API's { "error": "..." } has the real reason
		const reason = apiErrorReason(error) ?? apiError.description;
		if (reason && reason !== apiError.message) {
			apiError.description = apiError.message;
			apiError.message = reason;
		}
		throw apiError;
	}
}

function apiErrorReason(error: unknown): string | undefined {
	const e = error as {
		cause?: { response?: { data?: unknown } };
		response?: { data?: unknown; body?: unknown };
	};
	const data = e.cause?.response?.data ?? e.response?.data ?? e.response?.body;
	const reason = (data as { error?: unknown } | undefined)?.error;
	return typeof reason === 'string' && reason ? reason : undefined;
}

/**
 * Fetches every page of a listing (`?page=`) until the limit or the total is reached.
 * The API returns `{ [key]: [...], total, page }`.
 */
export async function solariaApiRequestAllItems(
	this: IExecuteFunctions,
	path: string,
	key: string,
	qs: IDataObject,
	limit?: number,
): Promise<IDataObject[]> {
	const out: IDataObject[] = [];
	for (let page = 1; page <= 1000; page++) {
		const res = await solariaApiRequest.call(this, 'GET', path, undefined, { ...qs, page });
		const items = (res[key] as IDataObject[] | undefined) ?? [];
		out.push(...items);
		const total = Number(res.total ?? 0);
		if (items.length === 0 || (total > 0 && out.length >= total)) break;
		if (limit !== undefined && out.length >= limit) break;
	}
	return limit !== undefined ? out.slice(0, limit) : out;
}

/** Parses a numeric id (contact/conversation) coming from a field or an expression. */
export function toId(
	this: IExecuteFunctions,
	value: unknown,
	field: string,
	itemIndex: number,
): number {
	const id = Number(String(value ?? '').trim());
	if (!Number.isInteger(id) || id <= 0) {
		throw new NodeOperationError(this.getNode(), `Invalid ${field}: "${String(value)}"`, {
			itemIndex,
		});
	}
	return id;
}

/** Field options from an API listing (`{ [key]: [{ id, name }] }`). */
export async function loadOptionsFrom(
	this: ILoadOptionsFunctions,
	path: string,
	key: string,
	describe?: (item: IDataObject) => string | undefined,
): Promise<INodePropertyOptions[]> {
	const res = await solariaApiRequest.call(this, 'GET', path);
	const items = (res[key] as IDataObject[] | undefined) ?? [];
	return items.map((item) => ({
		name: String(item.name ?? item.id),
		value: String(item.id),
		description: describe?.(item),
	}));
}
