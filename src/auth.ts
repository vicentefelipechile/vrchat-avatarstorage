import { hashSync, compareSync } from 'bcryptjs';

export async function hashPassword(password: string): Promise<{ hash: string; salt?: string }> {
    // bcryptjs generates the salt automatically and includes it in the hash
    const hash = hashSync(password, 10);
    return { hash };
}

export async function verifyPassword(password: string, storedHash: string, _storedSalt?: string): Promise<boolean> {
    return compareSync(password, storedHash);
}
