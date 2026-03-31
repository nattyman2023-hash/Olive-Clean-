import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Olive Clean'
const PRIMARY_COLOR = '#7a8a3a'

interface Props {
  name?: string
  position?: string
}

const ApplicationReceivedEmail = ({ name, position }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We received your application — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>🫒 {SITE_NAME}</Text>
        </Section>

        <Heading style={h1}>
          {name ? `Thanks for applying, ${name}!` : 'Application Received!'}
        </Heading>

        <Text style={text}>
          We've received your application{position ? ` for the ${position} position` : ''} and our hiring team will review it carefully.
        </Text>

        <Section style={highlightBox}>
          <Text style={highlightTitle}>What to expect</Text>
          <Text style={highlightText}>📋 Application review (1–3 business days)</Text>
          <Text style={highlightText}>📞 Phone screening if selected</Text>
          <Text style={highlightText}>🤝 In-person or virtual interview</Text>
        </Section>

        <Text style={text}>
          We appreciate your interest in joining the {SITE_NAME} team. We'll be in touch soon!
        </Text>

        <Hr style={divider} />

        <Text style={footer}>Best regards, The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ApplicationReceivedEmail,
  subject: 'We received your application! 🫒',
  displayName: 'Application received',
  previewData: { name: 'Alex', position: 'House Cleaner' },
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
  borderLeft: `4px solid ${PRIMARY_COLOR}`,
}
const highlightTitle = { fontSize: '14px', fontWeight: 'bold' as const, color: '#2e2e2e', margin: '0 0 8px' }
const highlightText = { fontSize: '13px', color: '#737373', margin: '0 0 4px', lineHeight: '1.6' }
const divider = { borderColor: '#eaeaea', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 0 8px' }
