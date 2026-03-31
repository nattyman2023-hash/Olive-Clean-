import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Olive Clean'
const PRIMARY_COLOR = '#7a8a3a'

interface JobAssignedProps {
  employeeName?: string
  clientName?: string
  service?: string
  date?: string
  address?: string
  notes?: string
}

const JobAssignedEmail = ({ employeeName, clientName, service, date, address, notes }: JobAssignedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New job assigned — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>🫒 {SITE_NAME}</Text>
        </Section>
        <Heading style={h1}>
          {employeeName ? `Hi ${employeeName}, you have a new job!` : 'New job assigned!'}
        </Heading>
        <Section style={detailBox}>
          {clientName && (
            <>
              <Text style={detailLabel}>Client</Text>
              <Text style={detailValue}>{clientName}</Text>
            </>
          )}
          {service && (
            <>
              <Text style={detailLabel}>Service</Text>
              <Text style={detailValue}>{service}</Text>
            </>
          )}
          {date && (
            <>
              <Text style={detailLabel}>Scheduled</Text>
              <Text style={detailValue}>{date}</Text>
            </>
          )}
          {address && (
            <>
              <Text style={detailLabel}>Address</Text>
              <Text style={detailValue}>{address}</Text>
            </>
          )}
        </Section>
        {notes && (
          <Text style={text}>
            <strong>Notes:</strong> {notes}
          </Text>
        )}
        <Text style={text}>
          Log into the On-Site Assistant to view your full schedule and job details.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} · Professional home cleaning</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: JobAssignedEmail,
  subject: 'New job assigned to you',
  displayName: 'Job assigned',
  previewData: {
    employeeName: 'Maria',
    clientName: 'Jane Smith',
    service: 'Signature Deep Clean',
    date: 'April 5, 2026 at 9:00 AM',
    address: '123 Belle Meade Blvd, Nashville, TN',
    notes: 'Please use the side entrance.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Poppins', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '520px', margin: '0 auto' }
const logoBanner = { textAlign: 'center' as const, marginBottom: '24px' }
const logoText = { fontSize: '20px', fontWeight: '700', color: PRIMARY_COLOR, margin: '0' }
const h1 = { fontSize: '22px', fontWeight: '600', color: '#2e2e2e', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const detailBox = { backgroundColor: '#f7f6f3', borderRadius: '12px', padding: '16px 20px', margin: '0 0 20px' }
const detailLabel = { fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 2px' }
const detailValue = { fontSize: '14px', fontWeight: '500', color: '#2e2e2e', margin: '0 0 12px' }
const hr = { borderColor: '#e8e5e0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '0', textAlign: 'center' as const }
