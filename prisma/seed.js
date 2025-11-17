"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const helpers_1 = require("../src/utils/helpers");
const prisma = new client_1.PrismaClient();
async function seed() {
    try {
        const hashedPassword = await (0, helpers_1.hashPassword)("testing");
        const user = await prisma.user.create({
            data: {
                email: "your-email@example.com",
                userName: "yourUsername",
                firstName: "Your",
                lastName: "Name",
                password: hashedPassword,
                authProvider: "LOCAL",
                isVerified: true,
                bio: "Aga Dev Oko Omidan",
            },
        });
        console.log("✅ User created:", user.id);
        const admin = await prisma.admin.create({
            data: {
                userId: user.id,
                invitedBy: null, //Emi super admin
            },
        });
        console.log(" Admin created:", admin.id);
        // const author = await prisma.author.create({
        //   data: {
        //     userId: user.id,
        //     authorBio: 'Your author bio here',
        //     profilePicture: 'https:testing-this.com',
        //     status: 'APPROVED',
        //     approvedAt: new Date(),
        //     reviewedAt: new Date(),
        //   },
        // });
        // console.log('✅ Author created:', author.id);
        // console.log('🎉 Seed complete!');
    } catch (error) {
        console.error("❌ Seed failed:", error);
        throw error;
    }
}
seed()
    .catch((error) => {
        console.error(error);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
