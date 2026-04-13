/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Olive Clean'

interface FeedbackRequestProps {
  clientName?: string
  service?: string
  feedbackUrl?: string
}

const FeedbackRequestEmail = ({ clientName, service, feedbackUrl }: FeedbackRequestProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We'd love your feedback on your recent cleaning</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>🫒 {SITE_NAME}</Text>
        </Section>
        <Heading style={h1}>
          {clientName ? `Hi ${clientName}, how did we do?` : 'How did we do?'}
        </Heading>
        <Text style={text}>
          Thank you for choosing {SITE_NAME}
          {service ? ` for your ${service}` : ''}. We'd love to hear about your experience — your feedback helps us improve and deliver the best possible service.
        </Text>
        {feedbackUrl && (
          <Button style={button} href={feedbackUrl}>
            Leave Your Feedback
          </Button>
        )}
        <Text style={footer}>
          Thank you for being a valued client!
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FeedbackRequestEmail,
  subject: "We'd love your feedback!",
  displayName: 'Feedback request',
  previewData: {
    clientName: 'Sarah',
    service: 'Essential Clean',
    feedbackUrl: 'https://oliveclean.co/feedback/example',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Poppins', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '480px' }
const logoBanner = { textAlign: 'center' as const, marginBottom: '20px' }
const logoText = { fontSize: '20px', fontWeight: 'bold' as const, color: '#7a8a3a', margin: '0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2e2e2e', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#737373', lineHeight: '1.6', margin: '0 0 20px' }
const button = {
  backgroundColor: '#7a8a3a',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '12px',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
