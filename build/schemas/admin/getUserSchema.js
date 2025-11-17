"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.getUserSchema = zod_1.default.object({
    userId: zod_1.default.string("Invalid user ID format"),
});
