import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Olive Clean'
const PRIMARY_COLOR = '#7a8a3a'

interface TimeOffApprovedProps {
  employeeName?: string
  startDate?: string
  endDate?: string
  status?: 'approved' | 'denied'
}

const TimeOffApprovedEmail = ({ employeeName, startDate, endDate, status = 'approved' }: TimeOffApprovedProps) => {
  const isApproved = status === 'approved'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Time-off request {isApproved ? 'approved' : 'denied'} — {SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoBanner}>
            <Text style={logoText}>🫒 {SITE_NAME}</Text>
          </Section>
          <Heading style={h1}>
            {employeeName ? `Hi ${employeeName},` : 'Hello,'} your time-off request has been {isApproved ? 'approved ✅' : 'denied'}
          </Heading>
          <Section style={detailBox}>
            {startDate && (
              <>
                <Text style={detailLabel}>From</Text>
                <Text style={detailValue}>{startDate}</Text>
              </>
            )}
            {endDate && (
              <>
                <Text style={detailLabel}>To</Text>
                <Text style={detailValue}>{endDate}</Text>
              </>
            )}
            <Text style={detailLabel}>Status</Text>
            <Text style={{
              ...detailValue,
              color: isApproved ? PRIMARY_COLOR : '#dc2626',
              fontWeight: '700',
            }}>
              {isApproved ? 'Approved' : 'Denied'}
            </Text>
          </Section>
          <Text style={text}>
            {isApproved
              ? 'Enjoy your time off! Your schedule has been updated accordingly.'
              : 'If you have questions about this decision, please reach out to your manager.'}
          </Text>
          <Hr style={hr} />
          <Text style={footer}>{SITE_NAME} · Professional home cleaning</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: TimeOffApprovedEmail,
  subject: (data) => `Time-off request ${data.status === 'denied' ? 'denied' : 'approved'}`,
  displayName: 'Time-off decision',
  previewData: { employeeName: 'Maria', startDate: 'April 10, 2026', endDate: 'April 12, 2026', status: 'approved' },
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
