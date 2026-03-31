import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Olive Clean'
const PRIMARY_COLOR = '#7a8a3a'

interface JobCompletedProps {
  name?: string
  service?: string
  date?: string
  feedbackUrl?: string
}

const JobCompletedEmail = ({ name, service, date, feedbackUrl }: JobCompletedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your cleaning is complete — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>🫒 {SITE_NAME}</Text>
        </Section>
        <Heading style={h1}>
          {name ? `Hi ${name}, your home is sparkling!` : 'Your cleaning is complete!'}
        </Heading>
        <Text style={text}>
          {service ? `Your ${service} has been completed` : 'Your cleaning has been completed'}
          {date ? ` on ${date}` : ''}.
          We hope everything looks great!
        </Text>
        {feedbackUrl && (
          <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
            <Button href={feedbackUrl} style={button}>
              Leave a Review ⭐
            </Button>
          </Section>
        )}
        <Text style={text}>
          Your feedback helps us improve and lets our team know they're doing a great job.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} · Professional home cleaning</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: JobCompletedEmail,
  subject: 'Your cleaning is complete!',
  displayName: 'Job completed',
  previewData: { name: 'Jane', service: 'Signature Deep Clean', date: 'March 28, 2026', feedbackUrl: 'https://oliveclean.co/feedback/abc123' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Poppins', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '520px', margin: '0 auto' }
const logoBanner = { textAlign: 'center' as const, marginBottom: '24px' }
const logoText = { fontSize: '20px', fontWeight: '700', color: PRIMARY_COLOR, margin: '0' }
const h1 = { fontSize: '22px', fontWeight: '600', color: '#2e2e2e', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: PRIMARY_COLOR, color: '#ffffff', fontSize: '14px', fontWeight: '600', padding: '12px 28px', borderRadius: '24px', textDecoration: 'none' }
const hr = { borderColor: '#e8e5e0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '0', textAlign: 'center' as const }
