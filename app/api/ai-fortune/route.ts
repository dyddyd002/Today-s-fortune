import { NextResponse } from "next/server";

// 심화실습②: OpenRouter로 AI가 그때그때 새로 운세를 생성한다.
// 이 라우트는 서버에서만 실행되므로 OPENROUTER_API_KEY가 브라우저로 노출되지 않는다.
export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENROUTER_API_KEY가 설정되어 있지 않습니다. .env.local(로컬)과 Vercel 프로젝트의 Environment Variables(배포)에 키를 추가해주세요.",
      },
      { status: 500 }
    );
  }

  // 새 기능: 생년월일을 받아 운세에 반영한다 (없으면 그냥 생년월일 없이 진행)
  let birthDate: string | undefined;
  try {
    const body = await request.json();
    if (typeof body?.birthDate === "string" && body.birthDate.trim()) {
      birthDate = body.birthDate.trim();
    }
  } catch {
    // 바디가 없거나 JSON이 아니면 무시
  }

  // 모델은 환경변수로 바꿔치기 가능 (지급받은 팀 Key가 지원하는 모델로 자유롭게 교체)
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

  const systemPrompt =
    "너는 한국어로 오늘의 운세를 지어주는 재미있는 운세 앱이다. " +
    "매번 완전히 새로운 운세를 만든다. " +
    "사용자가 생년월일을 알려주면, 태어난 요일·계절·띠 같은 소재를 살짝 활용해서 " +
    "그 사람만을 위한 운세처럼 느껴지게 반영한다. 다만 진지한 사주풀이는 하지 않는다. " +
    "생년월일이 없으면 그냥 일반적인 오늘의 운세를 만든다. " +
    "형식: 반드시 정확히 세 줄로 쓴다. 각 줄은 \\n으로 구분한다(줄 수를 늘리거나 줄이지 않는다). " +
    "말투: 다정한 반말(예: ~해, ~야, ~해줘)을 쓰고, 듣는 사람을 다독여주는 따뜻한 느낌으로 쓴다. " +
    "뻔한 덕담(예: '건강 조심하세요', '좋은 일이 생길 거예요' 같은 상투적 표현)은 절대 쓰지 않고, " +
    "구체적인 장면이나 행동을 담아 위트 있게 쓴다. " +
    "운세 세 줄을 다 쓴 뒤, 오늘의 행운 아이템을 딱 하나만 골라 알려준다 " +
    "(운세 내용과 자연스럽게 어울리는 걸로, 뻔한 네잎클로버 같은 건 피한다). " +
    '반드시 아래 JSON 형식으로만 답한다: {"fortune": "첫째 줄\\n둘째 줄\\n셋째 줄", "item": "오늘의 행운 아이템"}';

  const userContent = birthDate
    ? `내 생년월일은 ${birthDate}야. 이 정보를 살짝 반영해서 오늘의 운세를 지어줘.`
    : "오늘의 운세를 지어줘.";

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          temperature: 1,
        }),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: `OpenRouter 호출 실패 (${response.status})`, detail },
        { status: response.status }
      );
    }

    const data = await response.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";

    let fortune = raw.trim();
    let item = "";
    try {
      const parsed = JSON.parse(raw);
      fortune = parsed.fortune ?? fortune;
      item = parsed.item ?? "";
    } catch {
      // 모델이 JSON이 아닌 일반 텍스트로 답했을 경우, 받은 텍스트를 그대로 운세로 사용
    }

    return NextResponse.json({ fortune, item, model });
  } catch (err) {
    return NextResponse.json(
      { error: "OpenRouter 요청 중 오류가 발생했습니다.", detail: String(err) },
      { status: 500 }
    );
  }
}
