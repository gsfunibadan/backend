"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImageMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const appError_1 = require("../utils/appError");
const storage = multer_1.default.memoryStorage();
const imageFilter = (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new appError_1.AppError(
                "Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.",
                400,
                [{ profilePic: "Invalid image format" }]
            )
        );
    }
};
const uploadImage = (0, multer_1.default)({
    storage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB max
    },
});
//My goal is simple let the middleware handle middleware problems bro, don't even be passing that shit to the controller man
const uploadImageMiddleware = (fieldName) => {
    return (req, res, next) => {
        const upload = uploadImage.single(fieldName);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        upload(req, res, (err) => {
            if (err instanceof multer_1.default.MulterError) {
                if (err.code === "LIMIT_FILE_SIZE") {
                    throw new appError_1.AppError("File too large. Maximum size is 2MB", 400, [
                        { [fieldName]: "File exceeds 2MB limit" },
                    ]);
                }
                throw new appError_1.AppError(`Upload error: ${err.message}`, 400, [
                    { [fieldName]: err.message },
                ]);
            } else if (err) {
                throw new appError_1.AppError(
                    "An Unexpected Error Occured, Please try again later",
                    500
                );
            }
            next();
        });
    };
};
exports.uploadImageMiddleware = uploadImageMiddleware;
