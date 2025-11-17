import { signupSchema } from "../../schemas/auth/signupSchema";
import { AppError } from "../../utils/appError";
import { AppResponse } from "../../utils/appResponse";
import { catchAsync } from "../../utils/catchAsync";

import { formatZodErrors } from "../../utils/formatZodErrors";
import { Request, Response } from "express";
import { hashPassword } from "../../utils/helpers";

import { prisma } from "../../database/prisma";
import { sendWelcomeEmail } from "../../utils/emails/emailHandlers";

export const signUp = catchAsync(async (req: Request, res: Response) => {
    const validationResult = signupSchema.safeParse(req.body);

    if (!validationResult.success) {
        const formattedErrors = formatZodErrors(validationResult.error);
        throw new AppError("Validation failed", 400, formattedErrors);
    }

    const { firstName, lastName, phoneNumber, email, password, username } = validationResult.data;
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
        throw new AppError(`User with email already exists`, 409, [
            {
                email: "User With this Email already exists",
            },
        ]);
    }

    const existingUserName = await prisma.user.findUnique({
        where: { userName: username },
    });

    if (existingUserName) {
        throw new AppError(`This username has been claimed`, 409, [
            {
                email: "This username has been claimed",
            },
        ]);
    }

    const existingPhoneNumber = await prisma.user.findUnique({
        where: {
            phoneNumber,
        },
    });

    if (existingPhoneNumber) {
        throw new AppError(`This Phone number is already in use`, 409, [
            {
                phoneNumber: "This phone number has been claimed",
            },
        ]);
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.user.create({
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
    sendWelcomeEmail(newUser);

    return AppResponse(
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
