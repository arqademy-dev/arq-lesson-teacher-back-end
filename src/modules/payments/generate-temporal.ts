import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../config/db.js";
import { users, students, payments } from "../../db/schema.js";
import { generateTemporalAccount } from "./gafiapay.js"; // adjust path

export async function initiateGafiaPayment(req: Request, res: Response) {
  try {
    // After authenticate middleware: req.user!.id is users.id
    const userId = req.user!.id;

    const { amount, reference, learningPlanId: bodyPlanId } = req.body;
    if (!amount || !reference) {
      return res
        .status(400)
        .json({ message: "Amount and reference are required" });
    }

    const [currentUser] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const [student] = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.userId, currentUser.id))
      .limit(1);

    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const learningPlanId =
      (typeof bodyPlanId === "string" && bodyPlanId) ||
      (typeof reference === "string" ? reference : null);

    if (!learningPlanId) {
      return res.status(400).json({ message: "learningPlanId is required" });
    }

    const displayName =
      [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ") ||
      "Student";

    const gafiaResponse = await generateTemporalAccount({
      email: currentUser.email,
      name: displayName,
      amount: Number(amount),
      reference,
      bvn: process.env.PREFERED_BVN!,
    });

    const accountNumber =
      gafiaResponse.data?.accountNumber ?? String(reference);

    const [payment] = await db
      .insert(payments)
      .values({
        studentId: student.id,
        learningPlanId,
        amountNaira: Number(amount),
        status: "pending",
        provider: "gafiapay",
        providerReference: accountNumber,
        gafiaAccountNumber: gafiaResponse.data?.accountNumber ?? null,
      })
      .returning();

    return res.status(200).json({
      success: true,
      paymentId: payment.id,
      account: {
        accountNumber: gafiaResponse.data?.accountNumber,
        accountName: gafiaResponse.data?.accountName,
        bankName: "GafiaPay Virtual",
        expiresInMinutes: 20,
      },
      message: "Temporal account generated successfully",
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      message: error.message || "Failed to generate account",
    });
  }
}