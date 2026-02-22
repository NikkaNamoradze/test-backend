import { Router, Request, Response, NextFunction } from "express";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "../../db";
import { users, watchLogs, instructions } from "../../db/schema";
import { authenticate, requireUser } from "../../middleware/auth";
import { AppError } from "../../middleware/errorHandler";

export const userRoutes = Router();

userRoutes.get(
  "/progress",
  authenticate,
  requireUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, req.auth!.id), isNull(users.deletedAt)));

      if (!user) throw new AppError(404, "User not found");

      const logs = await db
        .select({
          id: watchLogs.id,
          watchedAt: watchLogs.watchedAt,
          watchedFully: watchLogs.watchedFully,
          accepted: watchLogs.accepted,
          date: watchLogs.date,
          instructionTitle: instructions.title,
          orderIndex: instructions.orderIndex,
        })
        .from(watchLogs)
        .innerJoin(instructions, eq(watchLogs.instructionId, instructions.id))
        .where(eq(watchLogs.userId, req.auth!.id))
        .orderBy(desc(watchLogs.watchedAt));

      res.json({ id: user.id, name: user.name, logs });
    } catch (err) {
      next(err);
    }
  }
);
