// =========================================================================================================
// EMAIL CONVERSATION REPOSITORY
// =========================================================================================================
// Permanent correspondence between a contact author and their chosen Reply-To address.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { queryOne, type DB } from '../db/client';
import type { EmailConversation } from './types';

// =========================================================================================================
// Repository
// =========================================================================================================

export class EmailConversationRepository {
	constructor(private readonly db: DB) {}

	find(uuid: string): Promise<EmailConversation | null> {
		return queryOne(this.db, 'SELECT * FROM email_conversations WHERE uuid = ?', [uuid]);
	}

	buildInsert(row: EmailConversation): D1PreparedStatement {
		return this.db.prepare('INSERT INTO email_conversations (uuid, author_email, reply_email, created_at) VALUES (?, ?, ?, ?)').bind(row.uuid, row.author_email, row.reply_email, row.created_at);
	}
}
