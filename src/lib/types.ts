export type User = {
    $id?: string;
    userId: string;
    name: string;
    email: string;
    password: string;
    bio: string;
    posts?: Post[];
    saves?: Save[];
    imageId?: string;
}

export type Post = {
    $id: string;
    postId?: string;
    title: string;
    images: string[];
    hashtags: string | string[];
    userId: string;
    createdAt: string;
}

export type Save = {
    user: string;
    post: string;
}