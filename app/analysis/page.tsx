"use client";

import { useState, useEffect, use } from "react";
import { useSearchParams } from "next/navigation";
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
  TrendingUp,
  Search,
  BarChart3,
  Play,
  ExternalLink,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Suspense } from "react";

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

function AnalysisContent() {
  const searchParamsRaw = useSearchParams();
  // React.use()를 사용하여 searchParams unwrap (Next.js 15 호환)
  const searchParams = searchParamsRaw instanceof Promise 
    ? use(searchParamsRaw) 
    : searchParamsRaw;
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);

  // URL 쿼리 파라미터에서 키워드 가져오기 또는 트렌드 분석 결과 로드
  useEffect(() => {
    // 페이지 로드 시 스크롤을 맨 위로 이동
    window.scrollTo({ top: 0, behavior: "smooth" });

    const keywordParam = searchParams.get("keyword");
    const sourceParam = searchParams.get("source");

    // 트렌드 분석 결과에서 온 경우
    if (sourceParam === "trend") {
      console.log("트렌드 분석 결과 로드 중...");
      const storedResults = sessionStorage.getItem("trendAnalysisResults");
      if (storedResults) {
        try {
          const trendVideos = JSON.parse(storedResults);
          setVideos(trendVideos);
          setKeyword("트렌드");
          console.log("트렌드 분석 결과 로드 완료:", trendVideos.length, "개");
          // 사용 후 삭제
          sessionStorage.removeItem("trendAnalysisResults");
        } catch (error) {
          console.error("트렌드 분석 결과 파싱 오류:", error);
        }
      }
    } else if (sourceParam === "idea") {
      // 아이디어 검색 결과에서 온 경우
      console.log("아이디어 검색 결과 로드 중...");
      const storedResults = sessionStorage.getItem("ideaSearchResults");
      if (storedResults) {
        try {
          const { keyword: storedKeyword, videos: ideaVideos } =
            JSON.parse(storedResults);
          setVideos(ideaVideos);
          setKeyword(storedKeyword || keywordParam || "");
          console.log(
            "아이디어 검색 결과 로드 완료:",
            ideaVideos.length,
            "개"
          );
          // 사용 후 삭제
          sessionStorage.removeItem("ideaSearchResults");
        } catch (error) {
          console.error("아이디어 검색 결과 파싱 오류:", error);
          // 파싱 실패 시 기존 방식으로 검색
          if (keywordParam) {
            setKeyword(keywordParam);
            setTimeout(() => {
              handleSearch(keywordParam);
            }, 100);
          }
        }
      } else if (keywordParam) {
        // 저장된 결과가 없으면 기존 방식으로 검색
        setKeyword(keywordParam);
        setTimeout(() => {
          handleSearch(keywordParam);
        }, 100);
      }
    } else if (keywordParam) {
      setKeyword(keywordParam);
      // 자동으로 검색 실행
      setTimeout(() => {
        handleSearch(keywordParam);
      }, 100);
    }
  }, [searchParams]);

  const handleSearch = async (searchKeyword?: string | null) => {
    const finalKeyword = String(searchKeyword || keyword || "").trim();
    if (!finalKeyword) return;

    setLoading(true);
    setVideos([]);
    try {
      console.log("바이럴 분석 요청:", finalKeyword);
      const response = await fetch(
        `/api/youtube/search?keyword=${encodeURIComponent(finalKeyword)}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "검색 실패");
      }

      const data = await response.json();
      setVideos(data.videos || []);
      console.log("검색 결과:", data.videos?.length, "개 영상 발견");
    } catch (error) {
      console.error("분석 오류:", error);
      alert(
        error instanceof Error ? error.message : "검색 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTrendAnalysis = async () => {
    setTrendLoading(true);
    setVideos([]);
    setKeyword("");
    try {
      console.log("트렌드 분석 요청");
      const response = await fetch(`/api/youtube/trends`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "트렌드 분석 실패");
      }

      const data = await response.json();
      setVideos(data.videos || []);
      console.log("트렌드 분석 결과:", data.videos?.length, "개 영상 발견");
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

  const handleAnalyze = async (video: Video) => {
    setAnalyzing(video.videoId);
    try {
      console.log(
        "AI 분석 요청:",
        video.videoId,
        "자막:",
        video.transcript ? "있음" : "없음 (제목만으로 분석)"
      );
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

      // 영상 목록 업데이트
      setVideos((prev) =>
        prev.map((v) =>
          v.videoId === video.videoId ? { ...v, analysis: data.analysis } : v
        )
      );

      console.log("분석 완료:", video.videoId);
    } catch (error) {
      console.error("분석 오류:", error);
      alert(
        error instanceof Error ? error.message : "분석 중 오류가 발생했습니다."
      );
    } finally {
      setAnalyzing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">바이럴 분석</h2>
        <p className="text-muted-foreground">
          키워드로 검색하여 조회수 대비 구독자 비율이 높은 바이럴 영상을
          분석합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            바이럴 벤치마킹
          </CardTitle>
          <CardDescription>
            특정 키워드에서 대박 친 영상의 공식을 분석합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="분석할 키워드를 입력하세요..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button
              onClick={() => handleSearch()}
              disabled={loading || trendLoading || !keyword.trim()}
            >
              {loading ? "분석 중..." : "분석하기"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 border-t"></div>
            <span className="text-sm text-muted-foreground">또는</span>
            <div className="flex-1 border-t"></div>
          </div>
          <Button
            onClick={handleTrendAnalysis}
            disabled={loading || trendLoading}
            variant="outline"
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {trendLoading ? "트렌드 분석 중..." : "트렌드 분석하기"}
          </Button>
        </CardContent>
      </Card>

      {videos.length > 0 ? (
        <div className="space-y-4">
          {videos.map((video) => (
            <Card key={video.videoId} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">
                      {video.title}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap gap-4">
                      <span>
                        조회수: {video.stats?.views?.toLocaleString()}
                      </span>
                      <span>구독자: {video.stats?.subs?.toLocaleString()}</span>
                      <span className="font-semibold text-primary">
                        바이럴 점수: {video.viralScore.toFixed(2)}배
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
                      onClick={() => handleAnalyze(video)}
                      disabled={analyzing === video.videoId}
                      title={
                        !video.transcript
                          ? "자막이 없어 제목만으로 분석합니다"
                          : ""
                      }
                    >
                      {analyzing === video.videoId ? (
                        "분석 중..."
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          AI 분석 {!video.transcript && "(제목만)"}
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
                      <h4 className="font-semibold mb-2">추천 제목</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {video.analysis.recommendedTitles.map((title, idx) => (
                          <li key={idx}>{title}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">숏폼 대본</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {typeof video.analysis.script === "string"
                          ? video.analysis.script
                          : Array.isArray(video.analysis.script)
                          ? video.analysis.script
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              .map((item: any) => {
                                if (typeof item === "string") return item;
                                if (typeof item === "object" && item !== null) {
                                  // 객체인 경우 키-값 쌍으로 표시
                                  return Object.entries(item)
                                    .map(
                                      ([key, value]) =>
                                        `${key}: ${
                                          typeof value === "object"
                                            ? JSON.stringify(value)
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
                      <h4 className="font-semibold mb-2">촬영 가이드</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {typeof video.analysis.guide === "string"
                          ? video.analysis.guide
                          : Array.isArray(video.analysis.guide)
                          ? video.analysis.guide
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              .map((item: any) => {
                                if (typeof item === "string") return item;
                                if (typeof item === "object" && item !== null) {
                                  // 객체인 경우 키-값 쌍으로 표시
                                  return Object.entries(item)
                                    .map(
                                      ([key, value]) =>
                                        `${key}: ${
                                          typeof value === "object"
                                            ? JSON.stringify(value)
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
                          {typeof video.analysis.aiVideoGuide === "string"
                            ? video.analysis.aiVideoGuide
                            : Array.isArray(video.analysis.aiVideoGuide)
                            ? video.analysis.aiVideoGuide
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                .map((item: any) => {
                                  if (typeof item === "string") return item;
                                  if (typeof item === "object" && item !== null) {
                                    // 객체인 경우 키-값 쌍으로 표시
                                    return Object.entries(item)
                                      .map(
                                        ([key, value]) =>
                                          `${key}: ${
                                            typeof value === "object"
                                              ? JSON.stringify(value)
                                              : String(value)
                                          }`
                                      )
                                      .join("\n");
                                  }
                                  return String(item);
                                })
                                .join("\n\n")
                            : JSON.stringify(video.analysis.aiVideoGuide)}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {loading ? "검색 중..." : "키워드를 입력하고 분석을 시작하세요."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AnalysisContent />
    </Suspense>
  );
}
