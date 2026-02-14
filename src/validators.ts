import { z } from 'zod';
import { RESOURCE_CATEGORIES } from './types';

// ============================================================================
// Auth Schemas
// ============================================================================

export const RegisterSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters').max(32, 'Username too long').regex(/^[a-zA-Z0-9_]+$/, 'Username must be alphanumeric'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(100),
    token: z.string().optional() // Turnstile token
});

export const LoginSchema = z.object({
    username: z.string(),
    password: z.string(),
    token: z.string().optional()
});

export const UserUpdateSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters').max(32, 'Username too long').regex(/^[a-zA-Z0-9_]+$/, 'Username must be alphanumeric').optional(),
    avatar_url: z.string().optional(),
    token: z.string().optional()
});

// ============================================================================
// Resource Schemas
// ============================================================================

const LinkSchema = z.object({
    link_url: z.string(), // Allow relative URLs
    link_title: z.string().optional(),
    link_type: z.enum(['download', 'demo', 'documentation', 'general']).default('general'),
    display_order: z.number().int().optional()
});

export const ResourceSchema = z.object({
    title: z.string().min(3, 'Title too short').max(100, 'Title too long'),
    description: z.string().max(2000, 'Description too long').optional(),
    category: z.enum(RESOURCE_CATEGORIES),
    thumbnail_uuid: z.string().uuid('Invalid thumbnail UUID'),
    reference_image_uuid: z.string().uuid('Invalid reference image UUID').optional().nullable(),
    links: z.array(LinkSchema).optional(),
    media_files: z.array(z.string().uuid()).optional(),
    token: z.string().optional()
});

// ============================================================================
// Comment Schemas
// ============================================================================

export const CommentSchema = z.object({
    text: z.string().min(1, 'Comment cannot be empty').max(500, 'Comment too long'),
    token: z.string().optional()
});
