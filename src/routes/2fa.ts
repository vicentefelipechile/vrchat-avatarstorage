import { Hono } from 'hono';
import { getAuthUser, verifyPassword, getUserWith2FA, getDecrypted2FASecret, createSession, deleteSession } from '../auth';
import { TwoFactorSetupSchema, TwoFactorVerifySchema, TwoFactorDisableSchema } from '../validators';
import {
	generateTwoFactorSecret,
	verifyTwoFactorCode,
	encryptSecret,
	hashBackupCodes,
	verifyBackupCode,
	useBackupCode,
	generateBackupCodes,
} from '../auth/2fa';

const twoFactorRouter = new Hono<{ Bindings: Env }>();

const SETUP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

twoFactorRouter.post('/setup', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const body = await c.req.json();
	const parsed = TwoFactorSetupSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400);
	}

	const { password } = parsed.data;

	const user = await getUserWith2FA(c, authUser.username);
	if (!user) {
		return c.json({ error: 'User not found' }, 404);
	}

	const isValidPassword = verifyPassword(password, user.password_hash);
	if (!isValidPassword) {
		return c.json({ error: 'Invalid password' }, 401);
	}

	if (user.two_factor_enabled === 1) {
		return c.json({ error: '2FA is already enabled' }, 400);
	}

	const setup = generateTwoFactorSecret(user.username, 'VRCStorage');

	const encryptedSecret = await encryptSecret(setup.secret, c.env.JWT_SECRET);

	await c.env.DB.prepare('UPDATE users SET two_factor_secret = ?, two_factor_backup_codes = ? WHERE uuid = ?')
		.bind(encryptedSecret, await hashBackupCodes(setup.backupCodes), user.uuid)
		.run();

	return c.json({
		secret: setup.secret,
		otpauthUrl: setup.otpauthUrl,
	});
});

twoFactorRouter.post('/verify', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const body = await c.req.json();
	const parsed = TwoFactorVerifySchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400);
	}

	const { code } = parsed.data;

	const user = await getUserWith2FA(c, authUser.username);
	if (!user) {
		return c.json({ error: 'User not found' }, 404);
	}

	if (!user.two_factor_secret) {
		return c.json({ error: '2FA not set up' }, 400);
	}

	const secret = await getDecrypted2FASecret(c, user);
	if (!secret) {
		return c.json({ error: 'Failed to decrypt 2FA secret' }, 500);
	}

	const isValid = verifyTwoFactorCode(secret, code);
	if (!isValid) {
		return c.json({ error: 'Invalid code' }, 401);
	}

	const backupCodes = generateBackupCodes(8);
	const hashedBackupCodes = await hashBackupCodes(backupCodes);

	await c.env.DB.prepare('UPDATE users SET two_factor_enabled = 1, two_factor_backup_codes = ? WHERE uuid = ?')
		.bind(hashedBackupCodes, user.uuid)
		.run();

	await c.env.VRCSTORAGE_KV.delete(`user:${user.username}`);

	return c.json({
		message: '2FA enabled successfully',
		backupCodes: backupCodes,
	});
});

twoFactorRouter.post('/disable', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const body = await c.req.json();
	const parsed = TwoFactorDisableSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400);
	}

	const { password, code } = parsed.data;

	const user = await getUserWith2FA(c, authUser.username);
	if (!user) {
		return c.json({ error: 'User not found' }, 404);
	}

	if (user.two_factor_enabled !== 1) {
		return c.json({ error: '2FA is not enabled' }, 400);
	}

	const isValidPassword = verifyPassword(password, user.password_hash);
	if (!isValidPassword) {
		return c.json({ error: 'Invalid password' }, 401);
	}

	if (code) {
		const secret = await getDecrypted2FASecret(c, user);
		if (!secret) {
			return c.json({ error: 'Failed to decrypt 2FA secret' }, 500);
		}

		const isValidCode = verifyTwoFactorCode(secret, code);
		if (!isValidCode) {
			if (user.two_factor_backup_codes) {
				const isBackupCode = await verifyBackupCode(user.two_factor_backup_codes, code);
				if (!isBackupCode) {
					return c.json({ error: 'Invalid code' }, 401);
				}
			} else {
				return c.json({ error: 'Invalid code' }, 401);
			}
		}
	}

	await c.env.DB.prepare('UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL, two_factor_backup_codes = NULL WHERE uuid = ?')
		.bind(user.uuid)
		.run();

	await c.env.VRCSTORAGE_KV.delete(`user:${user.username}`);

	return c.json({ message: '2FA disabled successfully' });
});

twoFactorRouter.get('/status', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const user = await getUserWith2FA(c, authUser.username);
	if (!user) {
		return c.json({ error: 'User not found' }, 404);
	}

	return c.json({
		enabled: user.two_factor_enabled === 1,
	});
});

export default twoFactorRouter;
