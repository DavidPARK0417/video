### 1. 사전 준비 (설치 및 키 발급)

1. **라이브러리 설치:** 터미널에 아래 명령어를 입력하세요.Bash
    
    `npm install @google/generative-ai`
    
2. **API 키 발급:** [Google AI Studio](https://aistudio.google.com/)에서 무료 API 키를 발급받으세요.
3. **환경변수 설정:** 프로젝트 폴더의 `.env.local` 파일에 키를 저장합니다.Plaintext
    
    `GOOGLE_GENERIC_AI_KEY=여러분의_구글_API_키`
    

---

### 2. Gemini 번역 API 코드 (`app/api/translate/route.ts`)

이 코드는 사용자의 한글을 받아서 "시네마틱한 영상용 영어 설명"으로 가공해줍니다.

TypeScript

`import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// 1. Gemini 초기화
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERIC_AI_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(request: Request) {
  try {
    const { koreanText } = await request.json();

    if (!koreanText) {
      return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
    }

    // 2. Gemini에게 줄 명령(프롬프트) 설계
    // AI 영상 모델이 좋아하는 '단어 나열형' 영어로 바꾸라고 지시합니다.
    const prompt = `
      사용자의 한글 아이디어를 AI 영상 생성 모델(Wan2.1)을 위한 상세한 영어 프롬프트로 변환해줘.
      
      규칙:
      1. 문장 형태보다는 '단어, 단어, 단어' 형태의 묘사를 선호함.
      2. 빛(Lighting), 질감(Texture), 카메라 앵글(Camera Angle) 정보를 추가해줘.
      3. 결과는 반드시 영어로만 출력해줘.
      
      사용자 아이디어: "${koreanText}"
    `;

    // 3. Gemini 실행
    const result = await model.generateContent(prompt);
    const englishPrompt = result.response.text();

    return NextResponse.json({ englishPrompt: englishPrompt.trim() });

  } catch (error) {
    console.error("Gemini 에러:", error);
    return NextResponse.json({ error: "번역 중 오류가 발생했습니다." }, { status: 500 });
  }
}`

---

### 3. 화면에서 사용하는 방법 (코드 통합 예시)

기존에 만들었던 영상 생성 화면(`VideoMaker.tsx`)에 이 번역 기능을 합치면 이런 흐름이 됩니다.

TypeScript

`// 주요 로직 부분만 요약했습니다.
const handleMakeVideo = async () => {
  setIsLoading(true);
  try {
    // [1단계] 한글 -> 영어 번역 요청
    const transRes = await fetch("/api/translate", {
      method: "POST",
      body: JSON.stringify({ koreanText: userKoreanInput }),
    });
    const { englishPrompt } = await transRes.json();

    // [2단계] 번역된 영어로 영상 생성 요청
    const videoRes = await fetch("/api/generate-video", {
      method: "POST",
      body: JSON.stringify({ prompt: englishPrompt }),
    });
    const { url } = await videoRes.json();
    
    setVideoUrl(url);
  } catch (err) {
    console.error(err);
  } finally {
    setIsLoading(false);
  }
};`

---

### 💡 초보자를 위한 핵심 포인트

- **왜 Gemini를 쓰나요?**: 그냥 "바다"라고 치는 것보다 "에메랄드빛 바다, 부서지는 파도, 4k, 시네마틱 룩"이라고 치는 게 훨씬 고퀄리티 영상이 나옵니다. Gemini는 이 **수식어를 붙여주는 역할**을 아주 잘합니다.
- **비용 걱정 제로**: Gemini 2.5 Flash는 무료 티어 제공량이 매우 넉넉해서 개인 프로젝트용으로는 사실상 돈이 들지 않습니다.
- **프롬프트 엔지니어링**: 제가 코드 안에 넣어둔 `const prompt = ...` 부분이 일종의 가이드라인입니다. 나중에 애니메이션 스타일을 원하시면 저 문구에 "애니메이션 스타일로 만들어줘"라고 한 줄만 추가하면 됩니다.