import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Olive Clean'
const PRIMARY_COLOR = '#7a8a3a' // olive-moss
const ACCENT_COLOR = '#e88b6e' // coral-sunset

interface BookingConfirmationProps {
  name?: string
  service?: string
  frequency?: string
  homeType?: string
  bedrooms?: number
  bathrooms?: number
}

const BookingConfirmationEmail = ({
  name, service, frequency, homeType, bedrooms, bathrooms,
}: BookingConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your booking request has been received — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>🫒 {SITE_NAME}</Text>
        </Section>
        <Heading style={h1}>
          {name ? `Thanks, ${name}!` : 'Booking Received!'}
        </Heading>
        <Text style={text}>
          We've received your cleaning request and will confirm the details shortly.
        </Text>
        {service && (
          <Section style={detailBox}>
            <Text style={detailLabel}>Service</Text>
            <Text style={detailValue}>{service}</Text>
            {frequency && (
              <>
                <Text style={detailLabel}>Frequency</Text>
                <Text style={detailValue}>{frequency}</Text>
              </>
            )}
            {homeType && (
              <>
                <Text style={detailLabel}>Home</Text>
                <Text style={detailValue}>
                  {homeType}{bedrooms ? ` · ${bedrooms} bed` : ''}{bathrooms ? ` · ${bathrooms} bath` : ''}
                </Text>
              </>
            )}
          </Section>
        )}
        <Text style={text}>
          Our team will reach out to confirm your preferred date and time. If you have questions, just reply to this email.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          {SITE_NAME} · Professional home cleaning
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingConfirmationEmail,
  subject: 'Your booking request has been received',
  displayName: 'Booking confirmation',
  previewData: { name: 'Jane', service: 'Signature Deep Clean', frequency: 'bi-weekly', homeType: 'house', bedrooms: 3, bathrooms: 2 },
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
