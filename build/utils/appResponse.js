"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppResponse = AppResponse;
function AppResponse(res, statusCode = 200, data, message) {
    res.status(statusCode).json({
        status: "success",
        data: data ?? null,
        message: message ?? "Success",
    });
}
