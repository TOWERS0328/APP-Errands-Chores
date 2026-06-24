// supabase/functions/sync-google-calendar/index.ts
// Deploy: supabase functions deploy sync-google-calendar

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ✅ CORRECTO: usar variables de entorno, NO valores hardcodeados
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { user_id } = await req.json()
    if (!user_id) throw new Error('user_id requerido')

    const { data: tokenData, error: tokenError } = await supabase
      .from('google_calendar_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user_id)
      .single()

    if (tokenError || !tokenData) {
      throw new Error('Token de Google no encontrado')
    }

    let accessToken = tokenData.access_token

    if (new Date(tokenData.expires_at) < new Date()) {
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token'
        })
      })

      const refreshData = await refreshResponse.json()
      if (refreshData.error) throw new Error('No se pudo refrescar el token de Google')

      accessToken = refreshData.access_token
      const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000)

      await supabase
        .from('google_calendar_tokens')
        .update({ access_token: accessToken, expires_at: expiresAt.toISOString() })
        .eq('user_id', user_id)
    }

    const timeMin = new Date().toISOString()
    const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const calResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}` +
      `&singleEvents=true&orderBy=startTime&maxResults=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    const calData = await calResponse.json()
    if (calData.error) throw new Error(calData.error.message)

    return new Response(
      JSON.stringify({ events: calData.items || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
