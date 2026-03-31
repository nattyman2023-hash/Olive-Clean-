/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as bookingConfirmation } from './booking-confirmation.tsx'
import { template as jobCompleted } from './job-completed.tsx'
import { template as jobReminder } from './job-reminder.tsx'
import { template as invoiceIssued } from './invoice-issued.tsx'
import { template as welcome } from './welcome.tsx'
import { template as jobAssigned } from './job-assigned.tsx'
import { template as timeOffApproved } from './time-off-approved.tsx'
import { template as adminDailyDigest } from './admin-daily-digest.tsx'
import { template as employeeWelcome } from './employee-welcome.tsx'
import { template as clientAdded } from './client-added.tsx'
import { template as timeOffDenied } from './time-off-denied.tsx'
import { template as estimateSent } from './estimate-sent.tsx'
import { template as bookingRequestReceived } from './booking-request-received.tsx'
import { template as applicationReceived } from './application-received.tsx'
import { template as applicantHired } from './applicant-hired.tsx'
import { template as feedbackThankYou } from './feedback-thank-you.tsx'
import { template as questionnaireCompleted } from './questionnaire-completed.tsx'
import { template as passwordChanged } from './password-changed.tsx'
import { template as jobUpdate } from './job-update.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'booking-confirmation': bookingConfirmation,
  'job-completed': jobCompleted,
  'job-reminder': jobReminder,
  'invoice-issued': invoiceIssued,
  'welcome': welcome,
  'job-assigned': jobAssigned,
  'time-off-approved': timeOffApproved,
  'admin-daily-digest': adminDailyDigest,
  'employee-welcome': employeeWelcome,
  'client-added': clientAdded,
  'time-off-denied': timeOffDenied,
  'estimate-sent': estimateSent,
  'booking-request-received': bookingRequestReceived,
  'application-received': applicationReceived,
  'applicant-hired': applicantHired,
  'feedback-thank-you': feedbackThankYou,
  'questionnaire-completed': questionnaireCompleted,
  'password-changed': passwordChanged,
  'job-update': jobUpdate,
}
