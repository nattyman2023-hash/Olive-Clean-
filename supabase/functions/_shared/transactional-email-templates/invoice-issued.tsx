import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Olive Clean'
const PRIMARY_COLOR = '#7a8a3a'

interface InvoiceIssuedProps {
  name?: string
  invoiceNumber?: string
  total?: string
  dueDate?: string
}

const InvoiceIssuedEmail = ({ name, invoiceNumber, total, dueDate }: InvoiceIssuedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Invoice {invoiceNumber || ''} from {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>🫒 {SITE_NAME}</Text>
        </Section>
        <Heading style={h1}>
          {name ? `Hi ${name}, here's your invoice` : 'Your Invoice'}
        </Heading>
        <Section style={detailBox}>
          {invoiceNumber && (
            <>
              <Text style={detailLabel}>Invoice #</Text>
              <Text style={detailValue}>{invoiceNumber}</Text>
            </>
          )}
          {total && (
            <>
              <Text style={detailLabel}>Amount Due</Text>
              <Text style={{ ...detailValue, fontSize: '20px', fontWeight: '700', color: PRIMARY_COLOR }}>{total}</Text>
            </>
          )}
          {dueDate && (
            <>
              <Text style={detailLabel}>Due Date</Text>
              <Text style={detailValue}>{dueDate}</Text>
            </>
          )}
        </Section>
        <Text style={text}>
          If you have any questions about this invoice, please reply to this email. Thank you for choosing {SITE_NAME}!
        </Text>
        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} · Professional home cleaning</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InvoiceIssuedEmail,
  subject: (data) => `Invoice ${data.invoiceNumber || ''} from ${SITE_NAME}`,
  displayName: 'Invoice issued',
  previewData: { name: 'Jane', invoiceNumber: 'INV-001', total: '$280.00', dueDate: 'April 15, 2026' },
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
