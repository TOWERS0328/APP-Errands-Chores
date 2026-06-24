// supabase/functions/connect-google-calendar/index.ts
// Deploy: supabase functions deploy connect-google-calendar

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
    console.log('=== REQUEST RECEIVED ===')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    console.log('=== BODY ===', JSON.stringify(body))

    const { user_id, server_auth_code } = body
    console.log('=== PARAMS ===', { user_id: !!user_id, server_auth_code: !!server_auth_code, code_length: server_auth_code?.length })

    if (!user_id || !server_auth_code) {
      throw new Error('user_id y server_auth_code son requeridos')
    }

    // ✅ LOGS DE DEBUG PARA VERIFICAR SECRETS
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')


    

    // ✅ PROBAR CON redirect_uri VACÍO (para serverAuthCode de Capacitor)
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: server_auth_code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: '', // ✅ CAMBIO: vacío para serverAuthCode de Capacitor
        grant_type: 'authorization_code'
      })
    })

    // Leer el body como texto primero para ver el error real
    const responseText = await tokenResponse.text()
    let tokenData: any = {}
    try {
      tokenData = JSON.parse(responseText)
    } catch {
      tokenData = { raw: responseText }
    }

    console.log('=== GOOGLE TOKEN STATUS ===', tokenResponse.status)
    console.log('=== GOOGLE TOKEN BODY ===', JSON.stringify(tokenData))

    if (!tokenResponse.ok) {
      // ✅ SI FALLA CON redirect_uri vacío, PROBAR CON 'postmessage'
      if (tokenData.error === 'invalid_client' || tokenData.error === 'redirect_uri_mismatch') {
        console.log('=== RETRYING WITH postmessage ===')

        const retryResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code: server_auth_code,
            client_id: clientId!,
            client_secret: clientSecret!,
            redirect_uri: 'postmessage', // ✅ RETRY con postmessage
            grant_type: 'authorization_code'
          })
        })

        const retryText = await retryResponse.text()
        let retryData: any = {}
        try {
          retryData = JSON.parse(retryText)
        } catch {
          retryData = { raw: retryText }
        }

        console.log('=== RETRY STATUS ===', retryResponse.status)
        console.log('=== RETRY BODY ===', JSON.stringify(retryData))

        if (!retryResponse.ok) {
          throw new Error(
            retryData.error_description ||
            retryData.error ||
            `HTTP ${retryResponse.status}: ${retryText}`
          )
        }

        // ✅ ÉXITO EN RETRY
        const { access_token, refresh_token, expires_in } = retryData
        console.log('=== TOKENS RECEIVED (RETRY) ===', {
          has_access_token: !!access_token,
          has_refresh_token: !!refresh_token,
          expires_in
        })

        const expiresAt = new Date(Date.now() + expires_in * 1000)

        const { error: dbError } = await supabase
          .from('google_calendar_tokens')
          .upsert({
            user_id,
            access_token,
            refresh_token,
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })

        if (dbError) throw dbError

        console.log('=== SUCCESS (RETRY) ===')
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      throw new Error(
        tokenData.error_description ||
        tokenData.error ||
        `HTTP ${tokenResponse.status}: ${responseText}`
      )
    }

    // ✅ ÉXITO AL PRIMER INTENTO
    const { access_token, refresh_token, expires_in } = tokenData
    console.log('=== TOKENS RECEIVED ===', {
      has_access_token: !!access_token,
      has_refresh_token: !!refresh_token,
      expires_in
    })

    const expiresAt = new Date(Date.now() + expires_in * 1000)

    console.log('=== SAVING TO DATABASE ===')
    const { error: dbError } = await supabase
      .from('google_calendar_tokens')
      .upsert({
        user_id,
        access_token,
        refresh_token,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (dbError) {
      console.log('=== DATABASE ERROR ===', dbError)
      throw dbError
    }

    console.log('=== SUCCESS ===')
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.log('=== FINAL ERROR ===', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
