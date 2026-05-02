const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.GACHA_ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ticket = body.ticket;

    if (!ticket) {
      return Response.json({
        ok: false,
        error: 'missing_ticket'
      }, {
        status: 400,
        headers: corsHeaders
      });
    }

    const gasUrl = process.env.GAS_GACHA_URL;
    const secret = process.env.GAS_GACHA_SECRET;

    if (!gasUrl || !secret) {
      return Response.json({
        ok: false,
        error: 'missing_env'
      }, {
        status: 500,
        headers: corsHeaders
      });
    }

    const gasRes = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify({
        secret,
        action: 'usePoint',
        ticket
      })
    });

    const data = await gasRes.json();

    return Response.json(data, {
      headers: corsHeaders
    });

  } catch (err) {
    return Response.json({
      ok: false,
      error: 'server_error',
      message: String(err)
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}
