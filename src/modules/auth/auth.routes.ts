import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";
import { signToken } from "../../middleware/auth";
import { AppError } from "../../middleware/errorHandler";

export const authRoutes = Router();

authRoutes.post(
  "/mobile-login",
  body("code").isString().isLength({ min: 6, max: 6 }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(400, "Invalid code format");
      }

      const { code } = req.body;
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.entryCode, code), isNull(users.deletedAt)));

      if (!user) {
        throw new AppError(401, "Invalid entry code");
      }

      const token = signToken({ id: user.id, role: "user" });
      res.json({ token, user: { id: user.id, name: user.name } });
    } catch (err) {
      next(err);
    }
  }
);
