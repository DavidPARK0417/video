"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Lightbulb,
  Sparkles,
  TrendingUp,
  ArrowRight,
  BarChart3,
  Play,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Idea {
  id: string;
  title: string;
  description: string;
  viralScore: number;
  keyword: string;
}

interface VideoData {
  videoId: string;
  title: string;
  viralScore: number;
  stats?: {
    views: number;
    subs: number;
  };
  transcript?: string;
}

interface Video {
  videoId: string;
  title: string;
  stats: {
    views: number;
    subs: number;
  };
  viralScore: number;
  transcript?: string;
  analysis?: {
    hook: string;
    format: string;
    recommendedTitles: string[];
    script: string | unknown[];
    guide: string | unknown[];
    aiVideoGuide?: string | unknown[];
  };
}

export default function IdeasPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [analyzingIdeas, setAnalyzingIdeas] = useState<Record<string, boolean>>(
    {}
  );
  const [analysisResults, setAnalysisResults] = useState<
    Record<string, Video[]>
  >({});
  const [expandedIdeas, setExpandedIdeas] = useState<Record<string, boolean>>(
    {}
  );

  const handleGenerate = async () => {
    if (!keyword.trim()) return;

    setLoading(true);
    setIdeas([]);
    try {
      console.log("트렌드 스카우트 요청:", keyword);

      // 바이럴 영상 검색
      const response = await fetch(
        `/api/youtube/search?keyword=${encodeURIComponent(keyword)}`
      );

      // 응답이 성공이든 실패든 JSON 파싱 시도 (할당량 초과 시 캐시된 데이터가 올 수 있음)
      let data: any;
      try {
        data = await response.json();
      } catch (parseError) {
        // JSON 파싱 실패 시 에러 처리
        if (!response.ok) {
          throw new Error(
            `서버 오류 (${response.status}): 응답을 파싱할 수 없습니다.`
          );
        }
        throw parseError;
      }

      // 할당량 초과 시 캐시된 데이터가 반환되었는지 확인
      if (data.quotaExceeded) {
        console.warn(
          "⚠️ YouTube API 할당량 초과 - 캐시된 데이터를 사용합니다."
        );
        if (data.videos && data.videos.length > 0) {
          alert(
            "YouTube API 할당량이 초과되어 캐시된 데이터를 표시합니다.\n\n" +
              "새로운 데이터를 보려면 내일 다시 시도해주세요."
          );
          // 캐시된 데이터가 있으면 계속 진행
        } else {
          alert(
            "YouTube API 할당량이 초과되었습니다.\n\n" +
              "해결 방법:\n" +
              "1. 내일 다시 시도해주세요 (할당량은 매일 자정에 초기화됩니다)\n" +
              "2. Google Cloud Console에서 할당량을 확인하세요\n" +
              "3. 필요시 할당량 증가를 요청하세요"
          );
          return;
        }
      }

      if (!response.ok) {
        const errorMessage = data.error || "검색 실패";

        // 403 에러인 경우 추가 안내
        if (response.status === 403) {
          console.error("YouTube API 403 오류:", errorMessage);
          throw new Error(
            `${errorMessage}\n\n` +
              `해결 방법:\n` +
              `1. .env.local 파일에 YOUTUBE_API_KEY가 설정되어 있는지 확인\n` +
              `2. Google Cloud Console에서 YouTube Data API v3가 활성화되어 있는지 확인\n` +
              `3. API 키가 올바른지 확인\n` +
              `4. API 할당량이 초과되지 않았는지 확인`
          );
        }

        throw new Error(errorMessage);
      }

      const videos = data.videos || [];

      // 검색 결과를 sessionStorage에 저장 (분석 페이지에서 사용)
      const searchVideos = videos.map((video: VideoData) => ({
        videoId: video.videoId,
        title: video.title,
        stats: video.stats || { views: 0, subs: 0 },
        viralScore: video.viralScore,
        transcript: video.transcript,
      }));
      sessionStorage.setItem(
        "ideaSearchResults",
        JSON.stringify({ keyword, videos: searchVideos })
      );
      console.log("검색 결과 저장 완료:", searchVideos.length, "개");

      // 상위 5개 영상을 아이디어로 변환
      const generatedIdeas: Idea[] = videos
        .slice(0, 5)
        .map((video: VideoData) => ({
          id: video.videoId,
          title: video.title,
          description: data.fromCache
            ? `바이럴 점수 ${video.viralScore.toFixed(
                2
              )}배 - 캐시된 데이터입니다`
            : `바이럴 점수 ${video.viralScore.toFixed(
                2
              )}배 - 이 주제로 쇼츠를 만들어보세요!`,
          viralScore: video.viralScore,
          keyword: keyword,
        }));

      setIdeas(generatedIdeas);
      console.log("아이디어 생성 완료:", generatedIdeas.length, "개");
    } catch (error) {
      console.error("아이디어 생성 오류:", error);
      alert(
        error instanceof Error
          ? error.message
          : "아이디어 생성 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTrendAnalysis = async () => {
    console.log("트렌드 분석 버튼 클릭됨 - 함수 시작");
    setTrendLoading(true);
    setIdeas([]);
    setKeyword("");
    try {
      console.log("트렌드 분석 요청 시작");

      // 트렌드 영상 검색
      const response = await fetch(`/api/youtube/trends`);
      console.log("트렌드 분석 API 응답 받음:", response.status);

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || "트렌드 분석 실패";

        // 403 에러인 경우 추가 안내
        if (response.status === 403) {
          console.error("YouTube API 403 오류:", errorMessage);
          throw new Error(
            `${errorMessage}\n\n` +
              `해결 방법:\n` +
              `1. .env.local 파일에 YOUTUBE_API_KEY가 설정되어 있는지 확인\n` +
              `2. Google Cloud Console에서 YouTube Data API v3가 활성화되어 있는지 확인\n` +
              `3. API 키가 올바른지 확인\n` +
              `4. API 할당량이 초과되지 않았는지 확인`
          );
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("트렌드 분석 API 응답 데이터:", data);
      console.log("응답 데이터 타입:", typeof data);
      console.log("videos 키 존재 여부:", "videos" in data);
      console.log("전체 데이터 키:", Object.keys(data));

      const videos = data.videos || [];
      console.log("추출된 videos 배열:", videos);
      console.log("videos 배열 길이:", videos.length);

      // 할당량 초과 시 사용자에게 알림
      if (data.quotaExceeded) {
        console.warn(
          "⚠️ YouTube API 할당량 초과 - 캐시된 데이터를 사용합니다."
        );
        if (videos.length > 0) {
          alert(
            "YouTube API 할당량이 초과되어 캐시된 데이터를 표시합니다.\n\n" +
              "새로운 데이터를 보려면 내일 다시 시도해주세요."
          );
        }
      }

      // 상위 5개 영상을 아이디어로 변환
      const generatedIdeas: Idea[] = videos
        .slice(0, 5)
        .map((video: VideoData) => ({
          id: video.videoId,
          title: video.title,
          description: data.fromCache
            ? `바이럴 점수 ${video.viralScore.toFixed(
                2
              )}배 - 캐시된 트렌드 데이터입니다`
            : `바이럴 점수 ${video.viralScore.toFixed(
                2
              )}배 - 요즘 뜨는 트렌드입니다!`,
          viralScore: video.viralScore,
          keyword: "트렌드",
        }));

      setIdeas(generatedIdeas);
      console.log("트렌드 분석 완료:", generatedIdeas.length, "개");

      if (videos.length === 0 && data.quotaExceeded) {
        alert(
          "YouTube API 할당량이 초과되었습니다.\n\n" +
            "해결 방법:\n" +
            "1. 내일 다시 시도해주세요 (할당량은 매일 자정에 초기화됩니다)\n" +
            "2. Google Cloud Console에서 할당량을 확인하세요\n" +
            "3. 필요시 할당량 증가를 요청하세요"
        );
      }

      // 트렌드 분석 결과를 sessionStorage에 저장 (상세 분석 페이지에서 사용)
      const trendVideos = videos.map((video: VideoData) => ({
        videoId: video.videoId,
        title: video.title,
        stats: video.stats || { views: 0, subs: 0 },
        viralScore: video.viralScore,
        transcript: video.transcript,
      }));
      sessionStorage.setItem(
        "trendAnalysisResults",
        JSON.stringify(trendVideos)
      );
      console.log("트렌드 분석 결과 저장 완료:", trendVideos.length, "개");
    } catch (error) {
      console.error("트렌드 분석 오류:", error);
      alert(
        error instanceof Error
          ? error.message
          : "트렌드 분석 중 오류가 발생했습니다."
      );
    } finally {
      setTrendLoading(false);
    }
  };

  const handleAnalyzeIdea = async (idea: Idea) => {
    console.log("아이디어 분석하기 버튼 클릭:", idea.keyword);
    setAnalyzingIdeas((prev) => ({ ...prev, [idea.id]: true }));

    try {
      // 바이럴 영상 검색
      const response = await fetch(
        `/api/youtube/search?keyword=${encodeURIComponent(idea.keyword)}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "검색 실패");
      }

      const data = await response.json();
      const videos: Video[] = (data.videos || []).map((video: VideoData) => ({
        videoId: video.videoId,
        title: video.title,
        stats: video.stats || { views: 0, subs: 0 },
        viralScore: video.viralScore,
        transcript: video.transcript,
      }));

      // 검색 결과를 sessionStorage에 저장 (분석 페이지에서 사용)
      sessionStorage.setItem(
        "ideaSearchResults",
        JSON.stringify({ keyword: idea.keyword, videos })
      );
      console.log("아이디어 분석 결과 저장 완료:", videos.length, "개");

      // 분석 페이지로 이동
      router.push(
        `/analysis?source=idea&keyword=${encodeURIComponent(idea.keyword)}`
      );
    } catch (error) {
      console.error("아이디어 분석 오류:", error);
      alert(
        error instanceof Error
          ? error.message
          : "아이디어 분석 중 오류가 발생했습니다."
      );
      setAnalyzingIdeas((prev) => ({ ...prev, [idea.id]: false }));
    }
  };

  const handleAnalyzeVideo = async (video: Video, ideaId: string) => {
    const analyzingKey = `${ideaId}-${video.videoId}`;
    setAnalyzingIdeas((prev) => ({ ...prev, [analyzingKey]: true }));

    try {
      console.log("AI 분석 요청:", video.videoId);
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoId: video.videoId,
          title: video.title,
          transcript: video.transcript || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "분석 실패");
      }

      const data = await response.json();

      // 분석 결과 업데이트
      setAnalysisResults((prev) => ({
        ...prev,
        [ideaId]: (prev[ideaId] || []).map((v) =>
          v.videoId === video.videoId ? { ...v, analysis: data.analysis } : v
        ),
      }));

      console.log("분석 완료:", video.videoId);
    } catch (error) {
      console.error("분석 오류:", error);
      alert(
        error instanceof Error ? error.message : "분석 중 오류가 발생했습니다."
      );
    } finally {
      setAnalyzingIdeas((prev) => {
        const newState = { ...prev };
        delete newState[analyzingKey];
        return newState;
      });
    }
  };

  const toggleExpanded = (ideaId: string) => {
    setExpandedIdeas((prev) => ({
      ...prev,
      [ideaId]: !prev[ideaId],
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">아이디어 생성</h2>
        <p className="text-muted-foreground">
          키워드를 입력하면 AI가 바이럴 가능성이 높은 쇼츠 아이디어를
          제안합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            트렌드 스카우트
          </CardTitle>
          <CardDescription>요즘 뜨는 주제를 찾아보세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="예: 강아지 브이로그, 요리 레시피..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
            <Button
              onClick={handleGenerate}
              disabled={loading || trendLoading || !keyword.trim()}
            >
              {loading ? "생성 중..." : "생성하기"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 border-t"></div>
            <span className="text-sm text-muted-foreground">또는</span>
            <div className="flex-1 border-t"></div>
          </div>
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("트렌드 분석 버튼 클릭 이벤트 발생");
              handleTrendAnalysis();
            }}
            disabled={loading || trendLoading}
            variant="outline"
            className="w-full"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {trendLoading ? "트렌드 분석 중..." : "트렌드 분석하기"}
          </Button>
        </CardContent>
      </Card>

      {ideas.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">
              발견된 아이디어 {ideas.length}개
            </h3>
            <Link href="/analysis?source=trend">
              <Button variant="outline" size="sm">
                트렌드 상세분석
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ideas.map((idea) => (
              <Card key={idea.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    {idea.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-2">
                    <TrendingUp className="h-4 w-4" />
                    {idea.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={analyzingIdeas[idea.id]}
                    onClick={() => handleAnalyzeIdea(idea)}
                  >
                    {analyzingIdeas[idea.id]
                      ? "분석 중..."
                      : "이 아이디어 분석하기"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 분석 결과 섹션 */}
          {Object.entries(analysisResults).map(([ideaId, videos]) => {
            const idea = ideas.find((i) => i.id === ideaId);
            if (!idea) return null;

            const isExpanded = expandedIdeas[ideaId];

            return (
              <div
                key={`analysis-${ideaId}`}
                id={`analysis-${ideaId}`}
                className="mt-6 space-y-4"
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        {idea.keyword} 분석 결과
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(ideaId)}
                      >
                        {isExpanded ? (
                          <>
                            접기
                            <ChevronUp className="h-4 w-4 ml-1" />
                          </>
                        ) : (
                          <>
                            펼치기
                            <ChevronDown className="h-4 w-4 ml-1" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="space-y-4">
                      {videos.length > 0 ? (
                        videos.map((video) => (
                          <Card key={video.videoId} className="overflow-hidden">
                            <CardHeader>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <CardTitle className="text-lg mb-2">
                                    {video.title}
                                  </CardTitle>
                                  <CardDescription className="flex flex-wrap gap-4">
                                    <span>
                                      조회수:{" "}
                                      {video.stats?.views?.toLocaleString()}
                                    </span>
                                    <span>
                                      구독자:{" "}
                                      {video.stats?.subs?.toLocaleString()}
                                    </span>
                                    <span className="font-semibold text-primary">
                                      바이럴 점수: {video.viralScore.toFixed(2)}
                                      배
                                    </span>
                                  </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" asChild>
                                    <a
                                      href={`https://www.youtube.com/watch?v=${video.videoId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <ExternalLink className="h-4 w-4 mr-1" />
                                      보기
                                    </a>
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleAnalyzeVideo(video, ideaId)
                                    }
                                    disabled={
                                      analyzingIdeas[
                                        `${ideaId}-${video.videoId}`
                                      ] || !!video.analysis
                                    }
                                    title={
                                      !video.transcript
                                        ? "자막이 없어 제목만으로 분석합니다"
                                        : ""
                                    }
                                  >
                                    {analyzingIdeas[
                                      `${ideaId}-${video.videoId}`
                                    ] ? (
                                      "분석 중..."
                                    ) : video.analysis ? (
                                      "분석 완료"
                                    ) : (
                                      <>
                                        <Play className="h-4 w-4 mr-1" />
                                        AI 분석{" "}
                                        {!video.transcript && "(제목만)"}
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            {video.analysis && (
                              <CardContent className="space-y-4 pt-0">
                                <div className="border-t pt-4 space-y-4">
                                  <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                      <TrendingUp className="h-4 w-4" />
                                      후킹 포인트 (3초 룰)
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {typeof video.analysis.hook === "string"
                                        ? video.analysis.hook
                                        : JSON.stringify(video.analysis.hook)}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold mb-2">포맷</h4>
                                    <span className="inline-block px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                                      {video.analysis.format}
                                    </span>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold mb-2">
                                      추천 제목
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                      {video.analysis.recommendedTitles.map(
                                        (title, idx) => (
                                          <li key={idx}>{title}</li>
                                        )
                                      )}
                                    </ul>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold mb-2">
                                      숏폼 대본
                                    </h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                                      {typeof video.analysis.script === "string"
                                        ? video.analysis.script
                                        : Array.isArray(video.analysis.script)
                                        ? video.analysis.script
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            .map((item: any) => {
                                              if (typeof item === "string")
                                                return item;
                                              if (
                                                typeof item === "object" &&
                                                item !== null
                                              ) {
                                                return Object.entries(item)
                                                  .map(
                                                    ([key, value]) =>
                                                      `${key}: ${
                                                        typeof value ===
                                                        "object"
                                                          ? JSON.stringify(
                                                              value
                                                            )
                                                          : String(value)
                                                      }`
                                                  )
                                                  .join("\n");
                                              }
                                              return String(item);
                                            })
                                            .join("\n\n")
                                        : JSON.stringify(video.analysis.script)}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold mb-2">
                                      촬영 가이드
                                    </h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                                      {typeof video.analysis.guide === "string"
                                        ? video.analysis.guide
                                        : Array.isArray(video.analysis.guide)
                                        ? video.analysis.guide
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            .map((item: any) => {
                                              if (typeof item === "string")
                                                return item;
                                              if (
                                                typeof item === "object" &&
                                                item !== null
                                              ) {
                                                return Object.entries(item)
                                                  .map(
                                                    ([key, value]) =>
                                                      `${key}: ${
                                                        typeof value ===
                                                        "object"
                                                          ? JSON.stringify(
                                                              value
                                                            )
                                                          : String(value)
                                                      }`
                                                  )
                                                  .join("\n");
                                              }
                                              return String(item);
                                            })
                                            .join("\n\n")
                                        : JSON.stringify(video.analysis.guide)}
                                    </p>
                                  </div>
                                  {video.analysis.aiVideoGuide && (
                                    <div>
                                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        <Wand2 className="h-4 w-4" />
                                        AI 영상 제작 가이드
                                      </h4>
                                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                                        {typeof video.analysis.aiVideoGuide ===
                                        "string"
                                          ? video.analysis.aiVideoGuide
                                          : Array.isArray(
                                              video.analysis.aiVideoGuide
                                            )
                                          ? video.analysis.aiVideoGuide
                                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                              .map((item: any) => {
                                                if (typeof item === "string")
                                                  return item;
                                                if (
                                                  typeof item === "object" &&
                                                  item !== null
                                                ) {
                                                  return Object.entries(item)
                                                    .map(
                                                      ([key, value]) =>
                                                        `${key}: ${
                                                          typeof value ===
                                                          "object"
                                                            ? JSON.stringify(
                                                                value
                                                              )
                                                            : String(value)
                                                        }`
                                                    )
                                                    .join("\n");
                                                }
                                                return String(item);
                                              })
                                              .join("\n\n")
                                          : JSON.stringify(
                                              video.analysis.aiVideoGuide
                                            )}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-4">
                          분석 결과가 없습니다.
                        </p>
                      )}
                    </CardContent>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {!loading && ideas.length === 0 && keyword && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              바이럴 가능성이 높은 영상을 찾지 못했습니다. 다른 키워드로
              시도해보세요.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
