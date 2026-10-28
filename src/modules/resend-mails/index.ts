// The only import the rest of the backend needs:
//   import { notifyStudentEnrolled } from '../resend-mails/index.js';
export { notifyStudentEnrolled, notifyPlanAssigned, notifyPaymentSuccess, sendPasswordResetLink,sendPasswordOtp } from './resend-mails.service.js';