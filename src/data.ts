export interface Resource {
    uuid: string;
    title: string;
    category: string;
    description: string;
    downloadUrl: string;
    backupUrls: string[];
    timestamp: string;
}

export interface Comment {
    uuid: string;
    resourceUuid: string;
    author: string;
    text: string;
    timestamp: string;
}

export const comments: Comment[] = [
    {
        uuid: 'c1',
        resourceUuid: '123e4567-e89b-12d3-a456-426614174000',
        author: 'CoolGuy123',
        text: 'This avatar is amazing! Thanks for sharing.',
        timestamp: '2023-10-27T12:00:00Z'
    },
    {
        uuid: 'c2',
        resourceUuid: '123e4567-e89b-12d3-a456-426614174000',
        author: 'VRC_Fan',
        text: 'Works great on Quest too.',
        timestamp: '2023-10-28T09:30:00Z'
    }
];

export interface User {
    username: string;
    password: string; // Plaintext for mock demo only
}

export const users: User[] = [
    { username: 'user', password: 'password' }
];

export const resources: Resource[] = [
    {
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Cool Avatar v1',
        category: 'avatars',
        description: 'A very cool avatar validation test.',
        downloadUrl: 'https://r2.example.com/avatar1.unitypackage',
        backupUrls: ['https://mega.nz/file1', 'https://drive.google.com/file1'],
        timestamp: '2023-10-27T10:00:00Z',
    },
    {
        uuid: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Stylized World',
        category: 'worlds',
        description: 'A low-poly world for hanging out.',
        downloadUrl: 'https://r2.example.com/world1.unitypackage',
        backupUrls: [],
        timestamp: '2023-10-26T15:30:00Z',
    },
    {
        uuid: '123e4567-e89b-12d3-a456-426614174002',
        title: 'Texture Pack A',
        category: 'assets',
        description: 'High resolution textures for your models.',
        downloadUrl: 'https://r2.example.com/textures.zip',
        backupUrls: ['https://dropbox.com/file2'],
        timestamp: '2023-10-25T09:15:00Z',
    },
    {
        uuid: '123e4567-e89b-12d3-a456-426614174003',
        title: 'Cyberpunk Jacket',
        category: 'clothes',
        description: 'A futuristic jacket for your avatar.',
        downloadUrl: 'https://r2.example.com/jacket.unitypackage',
        backupUrls: [],
        timestamp: '2023-10-28T12:00:00Z',
    },
    {
        uuid: '123e4567-e89b-12d3-a456-426614174004',
        title: 'Particle System',
        category: 'others',
        description: 'Beautiful particle effects.',
        downloadUrl: 'https://r2.example.com/particles.unitypackage',
        backupUrls: [],
        timestamp: '2023-10-29T14:20:00Z',
    },
];

export const categories = ['avatars', 'worlds', 'assets', 'clothes', 'others'];
