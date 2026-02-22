import { Router, Request, Response, NextFunction } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db } from "../../db";
import { instructions, watchLogs } from "../../db/schema";
import { authenticate, requireUser } from "../../middleware/auth";
import { AppError } from "../../middleware/errorHandler";

export const instructionRoutes = Router();

/** Returns 1-12, cycling by calendar day */
function getTodayInstructionIndex(): number {
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return (daysSinceEpoch % 12) + 1;
}

// GET /api/instructions — return today's single instruction with watch status
instructionRoutes.get(
  "/",
  authenticate,
  requireUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const todayIndex = getTodayInstructionIndex();
      const todayStr = new Date().toISOString().split("T")[0];

      const [instruction] = await db
        .select()
        .from(instructions)
        .where(eq(instructions.orderIndex, todayIndex));

      if (!instruction) throw new AppError(404, "Today's instruction not found");

      const [log] = await db
        .select()
        .from(watchLogs)
        .where(
          and(
            eq(watchLogs.userId, req.auth!.id),
            eq(watchLogs.instructionId, instruction.id),
            eq(watchLogs.date, todayStr)
          )
        );

      res.json({
        todayIndex,
        instruction: {
          id: instruction.id,
          title: instruction.title,
          description: instruction.description,
          orderIndex: instruction.orderIndex,
          watchedFully: log?.watchedFully ?? false,
          accepted: log?.accepted ?? false,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/instructions/:id — time-gated, must be today's instruction
instructionRoutes.get(
  "/:id",
  authenticate,
  requireUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // TODO: re-enable for production
      // const now = new Date();
      // const hour = now.getHours();
      // if (hour < 9 || hour >= 10) {
      //   throw new AppError(403, "Instructions are only accessible between 9:00 AM and 10:00 AM");
      // }
      // const todayIndex = getTodayInstructionIndex();
      // if (instruction.orderIndex !== todayIndex) {
      //   throw new AppError(403, "This is not today's instruction");
      // }

      const [instruction] = await db
        .select()
        .from(instructions)
        .where(eq(instructions.id, req.params.id as string));

      if (!instruction) throw new AppError(404, "Instruction not found");

      res.json(instruction);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/instructions/:id/complete — must be today's instruction
instructionRoutes.post(
  "/:id/complete",
  authenticate,
  requireUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // TODO: re-enable for production
      // const todayIndex = getTodayInstructionIndex();
      // if (instruction.orderIndex !== todayIndex) {
      //   throw new AppError(403, "This is not today's instruction");
      // }

      const [instruction] = await db
        .select()
        .from(instructions)
        .where(eq(instructions.id, req.params.id as string));

      if (!instruction) throw new AppError(404, "Instruction not found");

      const todayStr = new Date().toISOString().split("T")[0];

      const [existing] = await db
        .select()
        .from(watchLogs)
        .where(
          and(
            eq(watchLogs.userId, req.auth!.id),
            eq(watchLogs.instructionId, instruction.id),
            eq(watchLogs.date, todayStr)
          )
        );

      let log;
      if (existing) {
        [log] = await db
          .update(watchLogs)
          .set({ watchedFully: true, accepted: true, watchedAt: new Date() })
          .where(eq(watchLogs.id, existing.id))
          .returning();
      } else {
        [log] = await db
          .insert(watchLogs)
          .values({
            userId: req.auth!.id,
            instructionId: instruction.id,
            watchedFully: true,
            accepted: true,
            date: todayStr,
          })
          .returning();
      }

      res.json(log);
    } catch (err) {
      next(err);
    }
  }
);
