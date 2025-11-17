"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signUp = void 0;
const signupSchema_1 = require("../../schemas/auth/signupSchema");
const appError_1 = require("../../utils/appError");
const appResponse_1 = require("../../utils/appResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const formatZodErrors_1 = require("../../utils/formatZodErrors");
const helpers_1 = require("../../utils/helpers");
const prisma_1 = require("../../database/prisma");
const emailHandlers_1 = require("../../utils/emails/emailHandlers");
exports.signUp = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const validationResult = signupSchema_1.signupSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formattedErrors = (0, formatZodErrors_1.formatZodErrors)(validationResult.error);
        throw new appError_1.AppError("Validation failed", 400, formattedErrors);
    }
    const { firstName, lastName, phoneNumber, email, password, username } = validationResult.data;
    const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new appError_1.AppError(`User with email already exists`, 409, [
            {
                email: "User With this Email already exists",
            },
        ]);
    }
    const existingUserName = await prisma_1.prisma.user.findUnique({
        where: { userName: username },
    });
    if (existingUserName) {
        throw new appError_1.AppError(`This username has been claimed`, 409, [
            {
                email: "This username has been claimed",
            },
        ]);
    }
    const existingPhoneNumber = await prisma_1.prisma.user.findUnique({
        where: {
            phoneNumber,
        },
    });
    if (existingPhoneNumber) {
        throw new appError_1.AppError(`This Phone number is already in use`, 409, [
            {
                phoneNumber: "This phone number has been claimed",
            },
        ]);
    }
    const hashedPassword = await (0, helpers_1.hashPassword)(password);
    const newUser = await prisma_1.prisma.user.create({
        data: {
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phoneNumber,
            userName: username,
            authProvider: "LOCAL",
        },
    });
    (0, emailHandlers_1.sendWelcomeEmail)(newUser);
    return (0, appResponse_1.AppResponse)(
        res,
        201,
        {
            user: {
                userName: newUser.userName,
                email: newUser.email,
                firstName: newUser.firstName,
                isVerified: newUser.isVerified,
            },
        },
        "Account created successfully"
    );
});
