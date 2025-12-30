import { client } from "@gradio/client";
import { NextResponse } from "next/server";

// 허깅페이스에서 사용 가능한 무료 오픈소스 텍스트-투-비디오 모델 목록
// 모든 모델은 Apache 2.0 또는 MIT 라이선스로 상업적 이용 가능
const AVAILABLE_MODELS = {
  wan2_1: {
    name: "Wan-Video/Wan2.1-T2V-14B",
    description: "고품질 14B 파라미터 모델 (현재 사용 중)",
    params: (prompt: string, duration: number) => [
      prompt,
      "", // negative prompt
      "1280*720", // resolution
      duration, // duration in seconds
    ],
    endpoint: "/predict",
  },
  // 추가 모델 옵션들 (필요시 활성화)
  // stable_video: {
  //   name: "stabilityai/stable-video-diffusion-img2vid",
  //   description: "Stability AI의 Stable Video Diffusion (이미지 기반)",
  //   params: (prompt: string) => [prompt],
  //   endpoint: "/predict",
  // },
} as const;

export async function POST(request: Request) {
  try {
    console.log("🎬 [영상 생성] 프롬프트 수신 시작");
    // 1. 프론트엔드에서 보낸 영어 프롬프트(설명)를 받습니다.
    const { prompt, sceneNumber, modelType = "wan2_1" } = await request.json();

    if (!prompt) {
      console.error("❌ [영상 생성] 프롬프트가 없습니다.");
      return NextResponse.json({ error: "프롬프트가 없습니다." }, { status: 400 });
    }

    // 모델 선택 (기본값: wan2_1)
    const selectedModel = AVAILABLE_MODELS[modelType as keyof typeof AVAILABLE_MODELS] || AVAILABLE_MODELS.wan2_1;
    const videoDuration = 10; // 영상 길이 (초)

    console.log("🔗 [영상 생성] 허깅페이스 모델 연결 중...", { 
      prompt, 
      sceneNumber, 
      model: selectedModel.name,
      duration: videoDuration 
    });

    // 2. 허깅페이스의 특정 모델 공간(Space)에 연결합니다.
    const app = await client(selectedModel.name);

    console.log("⏳ [영상 생성] AI 모델에게 영상 생성 요청 중... (1~5분 소요 가능)");

    // 3. AI 모델에게 영상 생성을 요청합니다.
    // 모델마다 파라미터 순서가 다를 수 있으므로 모델별 설정 사용
    const params = selectedModel.params(prompt, videoDuration);
    const result = await app.predict(selectedModel.endpoint, params);

    console.log("📦 [영상 생성] 결과 수신 완료", { result });

    // 4. 결과값에서 영상의 URL 주소를 추출합니다.
    // 결과 데이터 구조는 모델마다 다르므로 콘솔로 확인이 필요합니다.
    const videoUrl = result.data[0]?.url || result.data[0];

    if (!videoUrl) {
      console.error("❌ [영상 생성] 영상 URL을 찾을 수 없습니다.", { result });
      return NextResponse.json(
        { error: "영상 URL을 찾을 수 없습니다." },
        { status: 500 }
      );
    }

    console.log("✅ [영상 생성] 영상 생성 완료", { videoUrl, sceneNumber, model: selectedModel.name });

    return NextResponse.json({ 
      url: videoUrl,
      sceneNumber,
      prompt,
      model: selectedModel.name,
      duration: videoDuration
    });

  } catch (error) {
    console.error("❌ [영상 생성] AI 영상 생성 오류:", error);
    
    // 더 구체적인 에러 메시지 제공
    let errorMessage = "영상 생성 중 오류가 발생했습니다.";
    if (error instanceof Error) {
      if (error.message.includes("queue") || error.message.includes("timeout")) {
        errorMessage = "대기열이 너무 길거나 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.";
      } else if (error.message.includes("rate limit")) {
        errorMessage = "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.";
      } else {
        errorMessage = `오류: ${error.message}`;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
