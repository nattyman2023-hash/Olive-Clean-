import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Olive Clean'
const PRIMARY_COLOR = '#7a8a3a'

interface Props {
  rating?: number
  service?: string
}

const FeedbackThankYouEmail = ({ rating, service }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Thanks for your feedback — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>🫒 {SITE_NAME}</Text>
        </Section>

        <Heading style={h1}>Thank you for your feedback!</Heading>

        <Text style={text}>
          We appreciate you taking the time to rate your recent {service ? service : 'cleaning'} experience
          {rating ? ` — ${rating} out of 5 stars` : ''}. Your feedback helps us improve and deliver the best service possible.
        </Text>

        <Section style={highlightBox}>
          <Text style={highlightTitle}>Your input matters</Text>
          <Text style={highlightText}>Every review is read by our team and helps us maintain the highest standards of quality and care for your home.</Text>
        </Section>

        <Hr style={divider} />

        <Text style={footer}>Best regards, The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FeedbackThankYouEmail,
  subject: 'Thanks for your feedback! 🫒',
  displayName: 'Feedback thank you',
  previewData: { rating: 5, service: 'Signature Deep Clean' },
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
