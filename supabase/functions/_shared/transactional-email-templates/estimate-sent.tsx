import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Olive Clean'
const PRIMARY_COLOR = '#7a8a3a'
const ACCENT_COLOR = '#e88b6e'

interface EstimateSentProps {
  clientName?: string
  estimateNumber?: string
  total?: string
  validUntil?: string
  approvalToken?: string
  quoteUrl?: string
}

const EstimateSentEmail = ({ clientName, estimateNumber, total, validUntil, approvalToken, quoteUrl }: EstimateSentProps) => {
  const viewUrl = quoteUrl || (approvalToken ? `https://oliveclean.co/quote/${approvalToken}` : 'https://oliveclean.co/client/login')

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>You have a new quote from {SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoBanner}>
            <Text style={logoText}>🫒 {SITE_NAME}</Text>
          </Section>

          <Heading style={h1}>
            {clientName ? `Hi ${clientName},` : 'New Quote'}
          </Heading>

          <Text style={text}>
            We've prepared a quote for you. Here are the details:
          </Text>

          <Section style={highlightBox}>
            {estimateNumber && <Text style={highlightText}>📄 Quote: <strong>{estimateNumber}</strong></Text>}
            {total && <Text style={highlightText}>💰 Total: <strong>${total}</strong></Text>}
            {validUntil && <Text style={highlightText}>📅 Valid until: <strong>{validUntil}</strong></Text>}
          </Section>

          <Text style={text}>
            Review your quote and approve it with one click when you're ready to proceed.
          </Text>

          <Section style={buttonRow}>
            <Button style={approveButton} href={viewUrl}>
              ✅ View & Approve Quote
            </Button>
          </Section>

          <Text style={smallText}>
            Or copy this link: {viewUrl}
          </Text>

          <Hr style={divider} />

          <Text style={footer}>
            Questions? Just reply to this email or give us a call.
          </Text>
          <Text style={footer}>
            Best regards, The {SITE_NAME} Team
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: EstimateSentEmail,
  subject: 'You have a new quote from Olive Clean',
  displayName: 'Quote sent',
  previewData: {
    clientName: 'Sarah',
    estimateNumber: 'EST-001',
    total: '350.00',
    validUntil: 'August 1, 2025',
    approvalToken: 'preview-token',
    quoteUrl: 'https://oliveclean.co/quote/preview-token',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Poppins', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '480px' }
const logoBanner = { textAlign: 'center' as const, marginBottom: '20px' }
const logoText = { fontSize: '20px', fontWeight: 'bold' as const, color: PRIMARY_COLOR, margin: '0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2e2e2e', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#737373', lineHeight: '1.6', margin: '0 0 20px' }
const smallText = { fontSize: '11px', color: '#999999', lineHeight: '1.6', margin: '0 0 20px', wordBreak: 'break-all' as const }
const highlightBox = {
  backgroundColor: '#f8f7f4',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '0 0 24px',
  borderLeft: `4px solid ${ACCENT_COLOR}`,
}
const highlightText = { fontSize: '13px', color: '#737373', margin: '0 0 4px', lineHeight: '1.6' }
const buttonRow = { textAlign: 'center' as const, margin: '0 0 16px' }
const approveButton = {
  backgroundColor: PRIMARY_COLOR,
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 32px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const divider = { borderColor: '#eaeaea', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 0 8px' }
