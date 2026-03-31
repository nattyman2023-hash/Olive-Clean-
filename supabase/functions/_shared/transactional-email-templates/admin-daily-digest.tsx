import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Olive Clean'
const PRIMARY_COLOR = '#7a8a3a'

interface AdminDailyDigestProps {
  date?: string
  newBookings?: number
  jobsCompleted?: number
  revenueCollected?: number
  pendingBookings?: number
  pendingInvoices?: number
}

const AdminDailyDigestEmail = ({
  date = 'Today',
  newBookings = 0,
  jobsCompleted = 0,
  revenueCollected = 0,
  pendingBookings = 0,
  pendingInvoices = 0,
}: AdminDailyDigestProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Daily digest for {date} — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>🫒 {SITE_NAME}</Text>
        </Section>
        <Heading style={h1}>Daily Digest — {date}</Heading>
        <Text style={text}>Here's a snapshot of what happened in the last 24 hours.</Text>

        <Section style={statsGrid}>
          <Section style={statBox}>
            <Text style={statValue}>{newBookings}</Text>
            <Text style={statLabel}>New Bookings</Text>
          </Section>
          <Section style={statBox}>
            <Text style={statValue}>{jobsCompleted}</Text>
            <Text style={statLabel}>Jobs Completed</Text>
          </Section>
          <Section style={statBox}>
            <Text style={statValue}>${revenueCollected.toLocaleString()}</Text>
            <Text style={statLabel}>Revenue Collected</Text>
          </Section>
        </Section>

        {(pendingBookings > 0 || pendingInvoices > 0) && (
          <Section style={detailBox}>
            <Text style={detailHeading}>Needs Attention</Text>
            {pendingBookings > 0 && (
              <Text style={detailItem}>📋 {pendingBookings} booking{pendingBookings > 1 ? 's' : ''} awaiting confirmation</Text>
            )}
            {pendingInvoices > 0 && (
              <Text style={detailItem}>💰 {pendingInvoices} unpaid invoice{pendingInvoices > 1 ? 's' : ''}</Text>
            )}
          </Section>
        )}

        <Text style={text}>
          Log in to your admin dashboard to review details and take action.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} · Daily Admin Digest</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminDailyDigestEmail,
  subject: (data: Record<string, any>) => `Daily Digest — ${data.date || 'Today'}`,
  displayName: 'Admin daily digest',
  previewData: {
    date: 'Mar 30, 2026',
    newBookings: 5,
    jobsCompleted: 12,
    revenueCollected: 2340,
    pendingBookings: 3,
    pendingInvoices: 2,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Poppins', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '520px', margin: '0 auto' }
const logoBanner = { textAlign: 'center' as const, marginBottom: '24px' }
const logoText = { fontSize: '20px', fontWeight: '700', color: PRIMARY_COLOR, margin: '0' }
const h1 = { fontSize: '22px', fontWeight: '600', color: '#2e2e2e', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const statsGrid = { margin: '0 0 20px' }
const statBox = { backgroundColor: '#f7f6f3', borderRadius: '12px', padding: '16px 20px', marginBottom: '8px', textAlign: 'center' as const }
const statValue = { fontSize: '24px', fontWeight: '700', color: PRIMARY_COLOR, margin: '0' }
const statLabel = { fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '4px 0 0' }
const detailBox = { backgroundColor: '#fef9f0', borderRadius: '12px', padding: '16px 20px', margin: '0 0 20px', borderLeft: `3px solid #e88b6e` }
const detailHeading = { fontSize: '13px', fontWeight: '600', color: '#2e2e2e', margin: '0 0 8px' }
const detailItem = { fontSize: '13px', color: '#55575d', margin: '0 0 4px' }
const hr = { borderColor: '#e8e5e0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '0', textAlign: 'center' as const }
