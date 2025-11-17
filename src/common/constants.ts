import { Request } from "express";
import { Admin, Author, User } from "@prisma/client";

export interface AuthRequest extends Request {
    user?: User;
    author?: Author | null; // null if user isn't an author
    admin?: Admin | null; // null if user isn't an admin
    isAuthor: boolean;
    isAdmin: boolean;
    sessionId: string;
}

export interface Multer {
    File: {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
    };
}
