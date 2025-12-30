import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// 1. Gemini 초기화
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERIC_AI_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(request: Request) {
  try {
    console.log("📝 [프롬프트 변환] 한글 텍스트 수신 시작");
    const { koreanText } = await request.json();

    if (!koreanText) {
      console.error("❌ [프롬프트 변환] 내용이 없습니다.");
      return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
    }

    console.log("🔄 [프롬프트 변환] Gemini API 호출 중...", { koreanText });

    // 2. Gemini에게 줄 명령(프롬프트) 설계
    // AI 영상 모델이 좋아하는 '단어 나열형' 영어로 바꾸라고 지시합니다.
    const prompt = `
      사용자의 한글 아이디어를 AI 영상 생성 모델(Wan2.1)을 위한 상세한 영어 프롬프트로 변환해줘.
      
      규칙:
      1. 문장 형태보다는 '단어, 단어, 단어' 형태의 묘사를 선호함.
      2. 빛(Lighting), 질감(Texture), 카메라 앵글(Camera Angle) 정보를 추가해줘.
      3. 결과는 반드시 영어로만 출력해줘.
      4. 시네마틱하고 고품질 영상을 위한 상세한 묘사를 포함해줘.
      
      사용자 아이디어: "${koreanText}"
    `;

    // 3. Gemini 실행
    const result = await model.generateContent(prompt);
    const englishPrompt = result.response.text();

    console.log("✅ [프롬프트 변환] 변환 완료", { englishPrompt });

    return NextResponse.json({ englishPrompt: englishPrompt.trim() });

  } catch (error) {
    console.error("❌ [프롬프트 변환] Gemini 에러:", error);
    return NextResponse.json({ error: "번역 중 오류가 발생했습니다." }, { status: 500 });
  }
}

