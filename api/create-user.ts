import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, email, role, invitedBy, tempPassword } = req.body

  try {
    // Create auth user with service role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true
    })

    if (authError) throw authError

    // Create app_users record
    const { error: dbError } = await supabase.from('app_users').insert({
      name,
      email,
      role,
      status: 'active',
      auth_id: authData.user.id,
      invited_by: invitedBy,
      invited_at: new Date().toISOString(),
      must_change_password: true
    })

    if (dbError) throw dbError

    return res.status(200).json({ success: true })
  } catch (error: any) {
    return res.status(400).json({ error: error.message })
  }
}