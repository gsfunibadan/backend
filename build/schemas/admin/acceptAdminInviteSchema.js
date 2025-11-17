"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptAdminInviteSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.acceptAdminInviteSchema = zod_1.default.object({
    token: zod_1.default.string().min(5, "Please use a valid invite token"),
});
