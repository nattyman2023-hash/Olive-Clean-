import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Olive Clean'
const PRIMARY_COLOR = '#7a8a3a'

interface JobReminderProps {
  name?: string
  service?: string
  date?: string
  time?: string
  technicianName?: string
}

const JobReminderEmail = ({ name, service, date, time, technicianName }: JobReminderProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reminder: your cleaning is tomorrow — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>🫒 {SITE_NAME}</Text>
        </Section>
        <Heading style={h1}>
          {name ? `Hi ${name}, just a heads up!` : 'Cleaning Reminder'}
        </Heading>
        <Text style={text}>
          Your {service || 'cleaning'} appointment is scheduled for tomorrow.
        </Text>
        <Section style={detailBox}>
          {date && (
            <>
              <Text style={detailLabel}>Date</Text>
              <Text style={detailValue}>{date}</Text>
            </>
          )}
          {time && (
            <>
              <Text style={detailLabel}>Time</Text>
              <Text style={detailValue}>{time}</Text>
            </>
          )}
          {service && (
            <>
              <Text style={detailLabel}>Service</Text>
              <Text style={detailValue}>{service}</Text>
            </>
          )}
          {technicianName && (
            <>
              <Text style={detailLabel}>Your Technician</Text>
              <Text style={detailValue}>{technicianName}</Text>
            </>
          )}
        </Section>
        <Text style={text}>
          Please make sure the home is accessible. If you need to reschedule, reply to this email or contact us as soon as possible.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} · Professional home cleaning</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: JobReminderEmail,
  subject: 'Reminder: your cleaning is tomorrow',
  displayName: 'Job reminder (24h)',
  previewData: { name: 'Jane', service: 'General Clean', date: 'Friday, March 28', time: '10:00 AM', technicianName: 'Carlos' },
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
