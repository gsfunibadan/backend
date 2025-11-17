import multer from "multer";
import { Response, NextFunction, Request } from "express";
import { AppError } from "../utils/appError";
import { AuthRequest, Multer } from "../common/constants";

const storage = multer.memoryStorage();

const imageFilter = (req: AuthRequest, file: Multer["File"], cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new AppError(
                "Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.",
                400,
                [{ profilePic: "Invalid image format" }]
            )
        );
    }
};

const uploadImage = multer({
    storage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB max
    },
});

//My goal is simple let the middleware handle middleware problems bro, don't even be passing that shit to the controller man
export const uploadImageMiddleware = (fieldName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const upload = uploadImage.single(fieldName);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        upload(req, res, (err: any) => {
            if (err instanceof multer.MulterError) {
                if (err.code === "LIMIT_FILE_SIZE") {
                    throw new AppError("File too large. Maximum size is 2MB", 400, [
                        { [fieldName]: "File exceeds 2MB limit" },
                    ]);
                }

                throw new AppError(`Upload error: ${err.message}`, 400, [
                    { [fieldName]: err.message },
                ]);
            } else if (err) {
                throw new AppError("An Unexpected Error Occured, Please try again later", 500);
            }

            next();
        });
    };
};
