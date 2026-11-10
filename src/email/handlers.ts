// =========================================================================================================
// EMAIL WORKER HANDLERS
// =========================================================================================================
// Worker bindings stay at this boundary; the service receives explicit collaborators.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { ValidationError } from '../domain/errors';
import { hashEmailValue } from './message';
import { EmailService } from './service';
import type { EmailCollaborators, EmailQueueMessage } from './types';

// =========================================================================================================
// Helpers
// =========================================================================================================

function collaborators(env: Env): EmailCollaborators {
	return { bucket: env.EMAIL_BUCKET, queue: env.EMAIL_QUEUE, adminEmail: env.EMAIL_ADMIN, apiKey: env.RESEND_API_KEY };
}

// =========================================================================================================
// Handlers
// =========================================================================================================

export async function handleIncomingEmail(message: ForwardableEmailMessage, env: Env): Promise<void> {
	try {
		const key = await hashEmailValue(message.from.toLowerCase());
		if (!(await env.RL_LOGIN.limit({ key: `email:${key}` })).success) throw new ValidationError('Contact sender rate limit exceeded');
		await new EmailService(env.DB).receive(message, collaborators(env));
	} catch (error) {
		if (error instanceof ValidationError) {
			message.setReject(error.message);
			return;
		}
		console.error('[EMAIL] Durable admission failed');
		throw error;
	}
}

export async function handleEmailQueue(batch: MessageBatch<EmailQueueMessage>, env: Env): Promise<void> {
	const service = new EmailService(env.DB);
	for (const message of batch.messages) {
		try {
			const delay = await service.deliver(message.body.delivery_uuid, collaborators(env));
			if (delay === null) message.ack();
			else message.retry({ delaySeconds: delay });
		} catch {
			console.error(`[EMAIL] Delivery infrastructure failure for ${message.body.delivery_uuid}`);
			message.retry({ delaySeconds: 300 });
		}
	}
}

export async function handleEmailMaintenance(env: Env): Promise<void> {
	await new EmailService(env.DB).maintain(collaborators(env));
}
