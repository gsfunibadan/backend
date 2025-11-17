"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthorSchema = void 0;
const zod_1 = require("zod");
exports.getAuthorSchema = zod_1.z.object({
    authorId: zod_1.z.string("Invalid author ID format").describe("ID of the author to retrieve"),
});
