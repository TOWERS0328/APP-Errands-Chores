// supabase/functions/sync-task-to-calendar/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('No se pudo refrescar el token')
  return data.access_token
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user_id, task } = await req.json()
    // task: { title, description, date, time, status }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Obtener tokens del usuario
    const { data: tokenRow, error } = await supabase
      .from('google_calendar_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user_id)
      .single()

    if (error || !tokenRow) throw new Error('Usuario no conectado a Google Calendar')

    // 2. Refrescar token si está vencido
    let accessToken = tokenRow.access_token
    if (new Date(tokenRow.expires_at) <= new Date()) {
      accessToken = await refreshAccessToken(tokenRow.refresh_token)
      await supabase
        .from('google_calendar_tokens')
        .update({ access_token: accessToken, expires_at: new Date(Date.now() + 3600 * 1000).toISOString() })
        .eq('user_id', user_id)
    }

    // 3. Construir el evento
    const startDateTime = `${task.date}T${task.time || '08:00'}:00`
    const endDateTime = `${task.date}T${task.time || '09:00'}:00` // 1 hora después

    const event = {
      summary: task.title,
      description: task.description || '',
      start: { dateTime: startDateTime, timeZone: 'America/Bogota' },
      end: { dateTime: endDateTime, timeZone: 'America/Bogota' },
    }

    // 4. Crear evento en Google Calendar
    const calRes = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )

    const calData = await calRes.json()
    console.log('Google Calendar response:', JSON.stringify(calData))

    if (!calRes.ok) throw new Error(calData.error?.message || 'Error al crear evento')

    return new Response(
      JSON.stringify({ success: true, event_id: calData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
