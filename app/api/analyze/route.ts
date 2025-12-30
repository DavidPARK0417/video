import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface AnalyzeRequest {
  videoId: string;
  title: string;
  transcript?: string;
}

interface AnalyzeResponse {
  hook: string;
  format: string;
  recommendedTitles: string[];
  script: string;
  guide: string;
  aiVideoGuide: string;
}

/**
 * Gemini 2.5 Flash로 영상 분석
 */
async function analyzeVideo(
  title: string,
  transcript?: string
): Promise<AnalyzeResponse> {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY가 설정되지 않았습니다.");
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  console.log("Gemini API 초기화 중... 모델: gemini-2.5-flash");
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  // gemini-2.5-flash는 최신 Flash 모델로 빠른 응답 속도와 좋은 성능을 제공합니다
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // 자막이 있는 경우와 없는 경우에 따라 다른 프롬프트 사용
  const hasTranscript = transcript && transcript.trim().length > 0;
  const transcriptText = hasTranscript
    ? `${transcript.substring(0, 5000)} ${
        transcript.length > 5000 ? "(일부만 표시)" : ""
      }`
    : "자막 정보가 없습니다.";

  const prompt = `당신은 유튜브 쇼츠 전문 분석가입니다. ${
    hasTranscript
      ? "다음 영상의 제목과 자막을 분석하여"
      : "다음 영상의 제목을 기반으로"
  } 바이럴 가능성이 높은 쇼츠 기획서를 작성해주세요.

**영상 제목:** ${title}

${
  hasTranscript
    ? "**영상 자막:**"
    : "**참고:** 자막 정보가 없어 제목만을 기반으로 분석합니다."
}
${transcriptText}

다음 형식의 JSON으로 응답해주세요:
{
  "hook": "초반 3초의 특징 분석 (왜 시청자가 계속 볼 수밖에 없는지)${
    hasTranscript ? "" : " - 제목을 기반으로 추론"
  }",
  "format": "정보형/유머형/감동형/도전형 중 하나",
  "recommendedTitles": ["추천 제목 1", "추천 제목 2", "추천 제목 3"],
  "script": "영상 흐름에 맞춘 숏폼 대본 (간결하고 임팩트 있게)${
    hasTranscript ? "" : " - 제목을 기반으로 창의적으로 작성"
  }",
  "guide": "촬영 가이드 (구도, 조명, BGM 추천 등)",
  "aiVideoGuide": "AI 영상 제작 가이드 (Runway, Pika, Luma 등 AI 도구를 사용하여 영상을 제작할 때 필요한 구체적인 프롬프트, 장면 구성, 시각적 스타일, 전환 효과, 타이밍 등)"
}

중요: 반드시 유효한 JSON 형식으로만 응답하고, 다른 설명은 포함하지 마세요.`;

  try {
    console.log("Gemini 분석 요청 시작:", {
      title,
      hasTranscript: !!transcript,
    });
    console.log("프롬프트 길이:", prompt.length, "자");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log("Gemini 응답 수신 완료, 응답 길이:", text.length, "자");

    // JSON 파싱 (마크다운 코드 블록 제거)
    let jsonText = text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    const analysis: AnalyzeResponse = JSON.parse(jsonText);
    console.log("JSON 파싱 완료:", {
      hook: analysis.hook?.substring(0, 50) + "...",
      format: analysis.format,
      titlesCount: analysis.recommendedTitles?.length,
    });

    // 검증 및 기본값 설정
    // 객체나 배열인 경우 문자열로 변환
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const convertToString = (value: any): string => {
      if (typeof value === "string") return value;
      if (Array.isArray(value)) {
        return (
          value
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((item: any) => {
              if (typeof item === "string") return item;
              if (typeof item === "object" && item !== null) {
                // 객체 배열인 경우 각 객체를 읽기 쉬운 형식으로 변환
                return Object.entries(item)
                  .map(
                    ([key, val]) =>
                      `${key}: ${
                        typeof val === "object"
                          ? JSON.stringify(val)
                          : String(val)
                      }`
                  )
                  .join(" | ");
              }
              return String(item);
            })
            .join("\n\n")
        );
      }
      if (typeof value === "object" && value !== null) {
        return JSON.stringify(value, null, 2);
      }
      return String(value || "");
    };

    return {
      hook: convertToString(analysis.hook) || "분석 중...",
      format: typeof analysis.format === "string" ? analysis.format : "정보형",
      recommendedTitles: Array.isArray(analysis.recommendedTitles)
        ? analysis.recommendedTitles.slice(0, 3).map((title) => String(title))
        : ["제목 1", "제목 2", "제목 3"],
      script: convertToString(analysis.script) || "대본 생성 중...",
      guide: convertToString(analysis.guide) || "촬영 가이드 준비 중...",
      aiVideoGuide: convertToString(analysis.aiVideoGuide) || "AI 영상 제작 가이드 준비 중...",
    };
  } catch (error) {
    console.error("Gemini 분석 오류 발생:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      model: "gemini-2.5-flash",
    });
    throw new Error(
      `AI 분석 실패: ${
        error instanceof Error ? error.message : "알 수 없는 오류"
      }`
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { videoId, title, transcript } = body;

    if (!videoId || !title) {
      return NextResponse.json(
        { error: "videoId와 title이 필요합니다." },
        { status: 400 }
      );
    }

    console.log(
      `AI 분석 요청: ${title} (자막: ${transcript ? "있음" : "없음"})`
    );

    const analysis = await analyzeVideo(title, transcript);

    return NextResponse.json({
      videoId,
      analysis,
    });
  } catch (error) {
    console.error("분석 API 오류:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
