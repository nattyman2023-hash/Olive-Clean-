import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Olive Clean'
const PRIMARY_COLOR = '#7a8a3a'
const ACCENT_COLOR = '#e88b6e'

interface TimeOffDeniedProps {
  employeeName?: string
  startDate?: string
  endDate?: string
  reason?: string
}

const TimeOffDeniedEmail = ({ employeeName, startDate, endDate, reason }: TimeOffDeniedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Time-off request update from {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>🫒 {SITE_NAME}</Text>
        </Section>

        <Heading style={h1}>Time-Off Request Update</Heading>

        <Text style={text}>
          {employeeName ? `Hi ${employeeName},` : 'Hi,'}
        </Text>

        <Text style={text}>
          Unfortunately, your time-off request{startDate && endDate ? ` for ${startDate} – ${endDate}` : ''} was not approved at this time.
        </Text>

        {reason && (
          <Section style={highlightBox}>
            <Text style={highlightTitle}>Note from management</Text>
            <Text style={highlightText}>{reason}</Text>
          </Section>
        )}

        <Text style={text}>
          If you have questions or would like to discuss alternative dates, please reach out to your team lead.
        </Text>

        <Hr style={divider} />

        <Text style={footer}>
          Best regards, The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TimeOffDeniedEmail,
  subject: 'Time-off request update',
  displayName: 'Time-off denied',
  previewData: { employeeName: 'Maria', startDate: 'July 10, 2025', endDate: 'July 14, 2025' },
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
