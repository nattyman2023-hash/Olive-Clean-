import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Olive Clean'
const PRIMARY_COLOR = '#7a8a3a'
const ACCENT_COLOR = '#e88b6e'

interface Props {
  clientName?: string
  service?: string
  status?: string
  date?: string
}

const JobUpdateEmail = ({ clientName, service, status, date }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Job update from {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>🫒 {SITE_NAME}</Text>
        </Section>

        <Heading style={h1}>
          {clientName ? `Hi ${clientName},` : 'Job Update'}
        </Heading>

        <Text style={text}>
          {status === 'cancelled'
            ? `Your ${service || 'cleaning'} appointment${date ? ` on ${date}` : ''} has been cancelled. We apologize for any inconvenience.`
            : `There's been an update to your ${service || 'cleaning'} appointment${date ? ` — it's now scheduled for ${date}` : ''}.`
          }
        </Text>

        <Section style={highlightBox}>
          <Text style={highlightTitle}>Appointment Details</Text>
          {service && <Text style={highlightText}>🧹 Service: {service}</Text>}
          {date && <Text style={highlightText}>📅 Date: {date}</Text>}
          {status && <Text style={highlightText}>📋 Status: {status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</Text>}
        </Section>

        <Text style={text}>
          If you have any questions or need to make changes, please don't hesitate to reach out.
        </Text>

        <Hr style={divider} />

        <Text style={footer}>Best regards, The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: JobUpdateEmail,
  subject: (data: Record<string, any>) =>
    data.status === 'cancelled'
      ? 'Your appointment has been cancelled'
      : 'Your appointment has been updated',
  displayName: 'Job update',
  previewData: { clientName: 'Sarah', service: 'Signature Deep Clean', status: 'rescheduled', date: 'March 15, 2026 at 10:00 AM' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Poppins', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '480px' }
const logoBanner = { textAlign: 'center' as const, marginBottom: '20px' }
const logoText = { fontSize: '20px', fontWeight: 'bold' as const, color: PRIMARY_COLOR, margin: '0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2e2e2e', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#737373', lineHeight: '1.6', margin: '0 0 20px' }
const highlightBox = {
  backgroundColor: '#f8f7f4',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '0 0 24px',
  borderLeft: `4px solid ${ACCENT_COLOR}`,
}
const highlightTitle = { fontSize: '14px', fontWeight: 'bold' as const, color: '#2e2e2e', margin: '0 0 8px' }
const highlightText = { fontSize: '13px', color: '#737373', margin: '0 0 4px', lineHeight: '1.6' }
const divider = { borderColor: '#eaeaea', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 0 8px' }
