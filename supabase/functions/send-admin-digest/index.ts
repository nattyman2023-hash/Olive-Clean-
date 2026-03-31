import { createClient } from 'npm:@supabase/supabase-js@2'
import { format, subHours } from 'npm:date-fns@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const now = new Date()
  const yesterday = subHours(now, 24)
  const dateLabel = format(now, 'MMM d, yyyy')
  const since = yesterday.toISOString()

  // Gather stats
  const [bookingsRes, jobsRes, invoicesRes, pendingBookingsRes, pendingInvoicesRes] = await Promise.all([
    supabase.from('booking_requests').select('id', { count: 'exact', head: true }).gte('created_at', since),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_at', since),
    supabase.from('invoices').select('total').eq('status', 'paid').gte('paid_at', since),
    supabase.from('booking_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).in('status', ['issued', 'overdue']),
  ])

  const newBookings = bookingsRes.count || 0
  const jobsCompleted = jobsRes.count || 0
  const revenueCollected = (invoicesRes.data || []).reduce((sum, inv) => sum + (inv.total || 0), 0)
  const pendingBookings = pendingBookingsRes.count || 0
  const pendingInvoices = pendingInvoicesRes.count || 0

  // Find admin users
  const { data: adminRoles } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin')

  if (!adminRoles || adminRoles.length === 0) {
    return new Response(JSON.stringify({ message: 'No admins found' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Get admin emails from auth
  const results: Array<{ user_id: string; status: string }> = []

  for (const role of adminRoles) {
    const { data: { user } } = await supabase.auth.admin.getUserById(role.user_id)
    if (!user?.email) continue

    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'admin-daily-digest',
        recipientEmail: user.email,
        idempotencyKey: `admin-digest-${role.user_id}-${format(now, 'yyyy-MM-dd')}`,
        templateData: {
          date: dateLabel,
          newBookings,
          jobsCompleted,
          revenueCollected,
          pendingBookings,
          pendingInvoices,
        },
      },
    })

    results.push({ user_id: role.user_id, status: error ? 'failed' : 'sent' })
  }

  return new Response(JSON.stringify({ success: true, results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
