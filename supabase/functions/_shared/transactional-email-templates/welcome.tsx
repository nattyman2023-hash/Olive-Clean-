import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Olive Clean'
const PRIMARY_COLOR = '#7a8a3a'
const ACCENT_COLOR = '#e88b6e'

interface WelcomeProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME} — your home's new best friend 🫒</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>🫒 {SITE_NAME}</Text>
        </Section>

        <Heading style={h1}>
          {name ? `Welcome, ${name}!` : 'Welcome to Olive Clean!'}
        </Heading>

        <Text style={text}>
          We're thrilled to have you. Your client portal is ready — view upcoming appointments, check invoices, and manage your account all in one place.
        </Text>

        <Section style={highlightBox}>
          <Text style={highlightTitle}>What we offer</Text>
          <Text style={highlightText}>✨ Standard & Deep Cleaning</Text>
          <Text style={highlightText}>🏠 Move In/Out Cleaning</Text>
          <Text style={highlightText}>🏢 Commercial Cleaning</Text>
          <Text style={highlightText}>🧹 Post-Construction Cleanup</Text>
        </Section>

        <Button style={button} href="https://oliveclean.co/book">
          Book Your First Clean
        </Button>

        <Hr style={divider} />

        <Text style={footer}>
          Questions? Just reply to this email — we're always happy to help.
        </Text>
        <Text style={footer}>
          Best regards, The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Welcome to Olive Clean! 🫒',
  displayName: 'Welcome email',
  previewData: { name: 'Sarah' },
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
const button = {
  backgroundColor: PRIMARY_COLOR,
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '12px',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const divider = { borderColor: '#eaeaea', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 0 8px' }
