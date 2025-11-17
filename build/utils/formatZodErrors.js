"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatZodErrors = void 0;
const formatZodErrors = (error) => {
    return error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
    }));
};
exports.formatZodErrors = formatZodErrors;
