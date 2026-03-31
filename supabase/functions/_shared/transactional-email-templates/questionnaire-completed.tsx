import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Olive Clean'
const PRIMARY_COLOR = '#7a8a3a'

const QuestionnaireCompletedEmail = () => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Home details saved — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>🫒 {SITE_NAME}</Text>
        </Section>

        <Heading style={h1}>Home Details Saved ✓</Heading>

        <Text style={text}>
          We've saved your home details and our team will review them before your first clean. This helps us prepare the right supplies and give your home the attention it deserves.
        </Text>

        <Section style={highlightBox}>
          <Text style={highlightTitle}>What we'll use this for</Text>
          <Text style={highlightText}>🔑 Access codes for entry</Text>
          <Text style={highlightText}>🐾 Pet awareness for our team</Text>
          <Text style={highlightText}>✨ Custom product preferences</Text>
          <Text style={highlightText}>🏠 Room priority planning</Text>
        </Section>

        <Text style={text}>
          You can update your preferences anytime through your client portal or by filling out the questionnaire again.
        </Text>

        <Hr style={divider} />

        <Text style={footer}>Best regards, The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: QuestionnaireCompletedEmail,
  subject: 'Home details saved! 🫒',
  displayName: 'Questionnaire completed',
  previewData: {},
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
