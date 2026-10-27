export type OutgoingMail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type GuardianTarget = {
  name: string;
  email: string;
};

// Data for the "student was added" mail.
export type EnrolmentData = {
  studentName: string;
  studentFirstName: string;
  arqId: string;
  loginEmail: string;
  programmeTitle: string | null;
  // null when the admin/educator typed the password themselves — we never invent one to show.
  temporaryPassword: string | null;
  loginUrl: string;
};

// Data for the "learning plan assigned" mail.
export type PlanAssignedData = {
  studentName: string;
  studentFirstName: string;
  programmeTitle: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  weeks: number | null;
  topicCount: number;
  quizDay: string | null;
  quizSize: number | null;
  quizDurationMinutes: number | null;
  amountDueNaira: number | null; // null once already paid
  planUrl: string;
};

// Data for the "payment received" mail.
export type PaymentSuccessData = {
  studentName: string;
  studentFirstName: string;
  programmeTitle: string | null;
  amountNaira: number;
  paidAt: Date | null;
  reference: string;
  startDate: string | null;
  planUrl: string;
};