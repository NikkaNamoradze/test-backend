import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "../../db";
import { admins, users, watchLogs, instructions } from "../../db/schema";
import { authenticate, requireAdmin, signToken } from "../../middleware/auth";
import { AppError } from "../../middleware/errorHandler";

export const adminRoutes = Router();

// Admin login
adminRoutes.post(
  "/login",
  body("email").isEmail(),
  body("password").isString().notEmpty(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(400, "Invalid input");
      }

      const { email, password } = req.body;
      const [admin] = await db.select().from(admins).where(eq(admins.email, email));
      if (!admin) throw new AppError(401, "Invalid credentials");

      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) throw new AppError(401, "Invalid credentials");

      const token = signToken({ id: admin.id, role: "admin" });
      res.json({ token, admin: { id: admin.id, email: admin.email } });
    } catch (err) {
      next(err);
    }
  }
);

function generateCode(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 6);
}

// Get all users
adminRoutes.get(
  "/users",
  authenticate,
  requireAdmin,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await db
        .select()
        .from(users)
        .where(isNull(users.deletedAt))
        .orderBy(desc(users.createdAt));
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Create user
adminRoutes.post(
  "/users",
  authenticate,
  requireAdmin,
  body("name").isString().notEmpty(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(400, "Name is required");
      }

      let entryCode = generateCode();
      while ((await db.select().from(users).where(eq(users.entryCode, entryCode))).length > 0) {
        entryCode = generateCode();
      }

      const [user] = await db
        .insert(users)
        .values({ name: req.body.name, entryCode })
        .returning();
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  }
);

// Delete user (soft)
adminRoutes.delete(
  "/users/:id",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await db
        .update(users)
        .set({ deletedAt: new Date() })
        .where(eq(users.id, req.params.id as string));
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

// User progress
adminRoutes.get(
  "/users/:id/progress",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, req.params.id as string), isNull(users.deletedAt)));

      if (!user) throw new AppError(404, "User not found");

      const logs = await db
        .select({
          id: watchLogs.id,
          watchedAt: watchLogs.watchedAt,
          watchedFully: watchLogs.watchedFully,
          accepted: watchLogs.accepted,
          date: watchLogs.date,
          instructionId: watchLogs.instructionId,
          instructionTitle: instructions.title,
          orderIndex: instructions.orderIndex,
        })
        .from(watchLogs)
        .innerJoin(instructions, eq(watchLogs.instructionId, instructions.id))
        .where(eq(watchLogs.userId, req.params.id as string))
        .orderBy(desc(watchLogs.watchedAt));

      res.json({ ...user, watchLogs: logs });
    } catch (err) {
      next(err);
    }
  }
);

function getTodayInstructionIndex(): number {
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return (daysSinceEpoch % 12) + 1;
}

// Dashboard
adminRoutes.get(
  "/dashboard",
  authenticate,
  requireAdmin,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const todayIndex = getTodayInstructionIndex();
      const todayStr = new Date().toISOString().split("T")[0];

      const allUsers = await db
        .select()
        .from(users)
        .where(isNull(users.deletedAt))
        .orderBy(desc(users.createdAt));

      const [todayInstruction] = await db
        .select()
        .from(instructions)
        .where(eq(instructions.orderIndex, todayIndex));

      // Get today's logs only for today's instruction
      const todayLogs = todayInstruction
        ? await db
            .select()
            .from(watchLogs)
            .where(
              and(
                eq(watchLogs.instructionId, todayInstruction.id),
                eq(watchLogs.date, todayStr)
              )
            )
        : [];

      const dashboard = allUsers.map((user) => {
        const userLog = todayLogs.find((l) => l.userId === user.id);
        return {
          id: user.id,
          name: user.name,
          entryCode: user.entryCode,
          completedToday: userLog?.watchedFully && userLog?.accepted ? true : false,
        };
      });

      res.json({
        users: dashboard,
        todayIndex,
        todayInstruction: todayInstruction ?? null,
      });
    } catch (err) {
      next(err);
    }
  }
);
