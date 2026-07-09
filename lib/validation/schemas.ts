import { z } from "zod";

export const studentLoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, "Enter your Student ID or phone number.")
    .max(50, "That doesn't look like a valid Student ID or phone number."),
});

export type StudentLoginInput = z.infer<typeof studentLoginSchema>;

export const adminLoginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const examConfigSchema = z
  .object({
    startAt: z.number().int(),
    endAt: z.number().int(),
    durationMinutes: z.number().int().positive().max(300),
    questionCount: z.number().int().positive().max(500),
    isOpen: z.boolean(),
    resultsVisibleToStudents: z.boolean(),
  })
  .refine((data) => data.endAt > data.startAt, {
    message: "End time must be after the start time.",
    path: ["endAt"],
  });

export type ExamConfigInput = z.infer<typeof examConfigSchema>;

export const studentRowSchema = z.object({
  studentId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  district: z.string().trim().min(1),
  division: z.string().trim().min(1),
});
export const studentsUploadSchema = z.array(studentRowSchema).min(1).max(2000);
export type StudentRowInput = z.infer<typeof studentRowSchema>;

export const questionRowSchema = z.object({
  text: z.string().trim().min(1),
  optionA: z.string().trim().min(1),
  optionB: z.string().trim().min(1),
  optionC: z.string().trim().min(1),
  optionD: z.string().trim().min(1),
  correctOption: z.enum(["A", "B", "C", "D"]),
  category: z.string().trim().optional(),
});
export const questionsUploadSchema = z.array(questionRowSchema).min(1).max(2000);
export type QuestionRowInput = z.infer<typeof questionRowSchema>;
