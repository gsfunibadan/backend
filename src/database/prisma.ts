import { logger } from "@/utils/logger";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
