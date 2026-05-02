export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 本来はログイン中ユーザーから取得するのが理想
    // まずは既存のuserIdをbodyから受け取る最小構成
    const userId = body.userId;

    if (!userId) {
      return Response.json({
        ok: false,
        error: 'missing_userId'
      }, { status: 400 });
    }

    const gasUrl = process.env.GAS_GACHA_URL;
    const secret = process.env.GAS_GACHA_SECRET;

    if (!gasUrl || !secret) {
      return Response.json({
        ok: false,
        error: 'missing_env'
      }, { status: 500 });
    }

    const gasRes = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify({
        secret,
        action: 'createTicket',
        userId
      })
    });

    const data = await gasRes.json();

    return Response.json(data);

  } catch (err) {
    return Response.json({
      ok: false,
      error: 'server_error',
      message: String(err)
    }, { status: 500 });
  }
}
