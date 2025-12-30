"use client";

import { useState, useEffect, useRef } from "react";
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
  Video,
  Download,
  Save,
  Loader2,
  Play,
  Sparkles,
  PlayCircle,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface SceneData {
  sceneNumber: number;
  videoUrl: string;
  prompt: string;
  koreanText: string;
  englishPrompt: string;
  createdAt: string;
}

interface VideoCache {
  [key: string]: SceneData;
}

interface GalleryItem {
  id: number;
  title: string;
  url: string;
  prompt: string;
  koreanText?: string;
  englishPrompt?: string;
  date: string;
  sceneNumber?: number;
}

export default function VideoCreatePage() {
  const [koreanInput, setKoreanInput] = useState("");
  const [englishPrompt, setEnglishPrompt] = useState("");
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [currentVideoTitle, setCurrentVideoTitle] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  const [scenes, setScenes] = useState<VideoCache>({});
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 페이지 로드 시 저장된 장면들과 갤러리 불러오기
  useEffect(() => {
    loadScenes();
    loadGallery();
  }, []);

  // 알림 표시 함수
  const showNotification = (
    type: "success" | "error" | "info",
    message: string
  ) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadScenes = async () => {
    try {
      const response = await fetch("/api/video/scenes");
      if (response.ok) {
        const data = await response.json();
        setScenes(data.scenes || {});
        console.log("✅ [장면 로드] 저장된 장면 불러오기 완료", data);
      }
    } catch (error) {
      console.error("❌ [장면 로드] 오류:", error);
    }
  };

  const loadGallery = async () => {
    try {
      const response = await fetch("/api/gallery");
      if (response.ok) {
        const data = await response.json();
        setGallery(data || []);
        console.log("✅ [갤러리 로드] 저장된 영상 목록 불러오기 완료", data);
      }
    } catch (error) {
      console.error("❌ [갤러리 로드] 오류:", error);
    }
  };

  // 한글을 영어 프롬프트로 변환
  const handleTranslate = async () => {
    if (!koreanInput.trim()) {
      showNotification("error", "한글 아이디어를 입력해주세요.");
      return;
    }

    setIsTranslating(true);
    try {
      console.log("📝 [프롬프트 변환] 요청 시작", { koreanInput });
      const response = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ koreanText: koreanInput }),
      });

      const data = await response.json();

      if (data.error) {
        showNotification("error", "번역 오류: " + data.error);
        return;
      }

      setEnglishPrompt(data.englishPrompt);
      setCurrentVideoTitle(koreanInput);
      console.log("✅ [프롬프트 변환] 완료", { englishPrompt: data.englishPrompt });
      showNotification("success", "프롬프트 변환이 완료되었습니다!");
    } catch (error) {
      console.error("❌ [프롬프트 변환] 오류:", error);
      showNotification("error", "번역 중 오류가 발생했습니다.");
    } finally {
      setIsTranslating(false);
    }
  };

  // 영상 생성 (자동 변환 포함)
  const handleGenerateVideo = async (sceneNumber: number) => {
    // 프롬프트가 없으면 먼저 변환
    if (!englishPrompt.trim() && koreanInput.trim()) {
      await handleTranslate();
      // 변환 완료를 기다리기 위해 잠시 대기
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!englishPrompt.trim()) {
        showNotification("error", "프롬프트 변환에 실패했습니다.");
        return;
      }
    }

    if (!englishPrompt.trim()) {
      showNotification("error", "먼저 프롬프트를 변환해주세요.");
      return;
    }

    setIsGenerating(true);
    setSelectedScene(sceneNumber);
    setCurrentVideoUrl("");

    try {
      console.log("🎬 [영상 생성] 요청 시작", { englishPrompt, sceneNumber });

      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: englishPrompt,
          sceneNumber,
        }),
      });

      const data = await response.json();

      if (data.error) {
        showNotification("error", "영상 생성 오류: " + data.error);
        return;
      }

      setCurrentVideoUrl(data.url);
      console.log("✅ [영상 생성] 완료", { videoUrl: data.url, sceneNumber });
      showNotification("success", "영상 생성이 완료되었습니다!");
    } catch (error) {
      console.error("❌ [영상 생성] 오류:", error);
      showNotification("error", "영상 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 장면 저장
  const handleSaveScene = async (sceneNumber: number) => {
    if (!currentVideoUrl) {
      showNotification("error", "저장할 영상이 없습니다.");
      return;
    }

    try {
      console.log("💾 [장면 저장] 요청 시작", {
        sceneNumber,
        currentVideoUrl,
        englishPrompt,
      });

      const sceneData: SceneData = {
        sceneNumber,
        videoUrl: currentVideoUrl,
        prompt: englishPrompt,
        koreanText: koreanInput,
        englishPrompt: englishPrompt,
        createdAt: new Date().toISOString(),
      };

      const response = await fetch("/api/video/scenes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scene: sceneData }),
      });

      const data = await response.json();

      if (data.error) {
        showNotification("error", "저장 오류: " + data.error);
        return;
      }

      // 로컬 상태 업데이트
      setScenes((prev) => ({
        ...prev,
        [`scene${sceneNumber}`]: sceneData,
      }));

      console.log("✅ [장면 저장] 완료", { sceneNumber });
      showNotification("success", `장면 ${sceneNumber}이(가) 저장되었습니다!`);
    } catch (error) {
      console.error("❌ [장면 저장] 오류:", error);
      showNotification("error", "저장 중 오류가 발생했습니다.");
    }
  };

  // 갤러리에 저장
  const handleSaveToGallery = async () => {
    if (!currentVideoUrl || !currentVideoTitle) {
      showNotification("error", "저장할 영상 정보가 없습니다.");
      return;
    }

    try {
      console.log("💾 [갤러리 저장] 요청 시작", {
        title: currentVideoTitle,
        url: currentVideoUrl,
      });

      const galleryItem: GalleryItem = {
        id: Date.now(),
        title: currentVideoTitle,
        url: currentVideoUrl,
        prompt: englishPrompt,
        koreanText: koreanInput,
        englishPrompt: englishPrompt,
        date: new Date().toLocaleString("ko-KR"),
        sceneNumber: selectedScene || undefined,
      };

      const response = await fetch("/api/gallery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(galleryItem),
      });

      const data = await response.json();

      if (data.error) {
        showNotification("error", "갤러리 저장 오류: " + data.error);
        return;
      }

      // 로컬 상태 업데이트
      setGallery((prev) => [galleryItem, ...prev]);

      console.log("✅ [갤러리 저장] 완료", { id: galleryItem.id });
      showNotification("success", "갤러리에 저장되었습니다!");
    } catch (error) {
      console.error("❌ [갤러리 저장] 오류:", error);
      showNotification("error", "갤러리 저장 중 오류가 발생했습니다.");
    }
  };

  // 영상 다운로드
  const downloadVideo = async (url: string, filename: string) => {
    try {
      console.log("📥 [다운로드] 시작", { url, filename });
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || "ai-video.mp4";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      showNotification("success", "다운로드가 시작되었습니다!");
    } catch (error) {
      console.error("❌ [다운로드] 오류:", error);
      showNotification("error", "다운로드 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      {/* 알림 표시 */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-2 ${
            notification.type === "success"
              ? "bg-green-600"
              : notification.type === "error"
              ? "bg-red-600"
              : "bg-blue-600"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : notification.type === "error" ? (
            <AlertCircle className="h-5 w-5" />
          ) : (
            <PlayCircle className="h-5 w-5" />
          )}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 hover:opacity-70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Video className="text-indigo-500" />
            Mini Cinema - AI 영상 제작
          </h1>
          <p className="text-slate-400">
            한글 아이디어를 입력하면 AI가 멋진 영상을 만들어드립니다
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 메인 영상 제작 영역 */}
          <div className="lg:col-span-3 space-y-6">
            {/* 영상 미리보기 (중앙에 배치) */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle>영상 미리보기</CardTitle>
                <CardDescription>
                  생성된 영상을 확인하고 장면에 저장하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="aspect-video bg-slate-800 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mx-auto mb-4" />
                      <p className="text-slate-400">
                        AI가 영상을 그리는 중... (1~5분 소요)
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        허깅페이스 대기열에 따라 시간이 걸릴 수 있습니다
                      </p>
                    </div>
                  </div>
                ) : currentVideoUrl ? (
                  <div className="space-y-4">
                    <div className="aspect-video bg-slate-800 rounded-lg overflow-hidden">
                      <video
                        src={currentVideoUrl}
                        controls
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          downloadVideo(
                            currentVideoUrl,
                            `${currentVideoTitle || "ai-video"}.mp4`
                          )
                        }
                        variant="outline"
                        className="flex-1 border-slate-700 hover:bg-slate-800"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        다운로드
                      </Button>
                      {selectedScene && (
                        <Button
                          onClick={() => handleSaveScene(selectedScene)}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          장면 {selectedScene} 저장
                        </Button>
                      )}
                      <Button
                        onClick={handleSaveToGallery}
                        variant="outline"
                        className="flex-1 border-slate-700 hover:bg-slate-800"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        갤러리에 저장
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-slate-800 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-700">
                    <div className="text-center">
                      <Video className="h-12 w-12 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-500">영상을 생성해주세요</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 프롬프트 변환 결과 */}
            {englishPrompt && (
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Sparkles className="text-yellow-500 h-4 w-4" />
                    변환된 영어 프롬프트
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <p className="text-white text-sm">{englishPrompt}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 장면 슬롯 (1~6) */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle>장면 슬롯 (1분 영상용)</CardTitle>
                <CardDescription>
                  각 장면을 생성하고 저장하여 1분 영상을 완성하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((sceneNum) => {
                    const sceneData = scenes[`scene${sceneNum}`];
                    return (
                      <div
                        key={sceneNum}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedScene === sceneNum
                            ? "border-indigo-500 bg-indigo-500/10"
                            : sceneData
                            ? "border-green-500/50 bg-green-500/5"
                            : "border-slate-700 bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm">장면 {sceneNum}</span>
                          {sceneData && (
                            <span className="text-xs text-green-400">✓ 저장됨</span>
                          )}
                        </div>
                        {sceneData ? (
                          <div className="space-y-2">
                            <video
                              src={sceneData.videoUrl}
                              className="w-full aspect-video rounded object-cover"
                              controls
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCurrentVideoUrl(sceneData.videoUrl);
                                setEnglishPrompt(sceneData.englishPrompt);
                                setKoreanInput(sceneData.koreanText);
                                setCurrentVideoTitle(sceneData.koreanText);
                                setSelectedScene(sceneNum);
                              }}
                              className="w-full text-xs border-slate-700"
                            >
                              <Play className="mr-1 h-3 w-3" />
                              불러오기
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleGenerateVideo(sceneNum)}
                            disabled={isGenerating}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-xs disabled:opacity-50"
                          >
                            {isGenerating && selectedScene === sceneNum ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                생성 중...
                              </>
                            ) : (
                              "생성하기"
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 나만의 갤러리 섹션 */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="text-indigo-500" /> 나만의 영상 보관함
                </CardTitle>
                <CardDescription>
                  지금까지 만든 모든 영상들을 모아보세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                {gallery.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">
                    아직 저장된 영상이 없습니다
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gallery.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-indigo-500/50 transition-all"
                      >
                        <video
                          src={item.url}
                          className="w-full aspect-video object-cover"
                          controls
                        />
                        <div className="p-4">
                          <h3 className="font-bold text-slate-200 truncate mb-1">
                            {item.title}
                          </h3>
                          <p className="text-xs text-slate-500 mb-3">{item.date}</p>
                          {item.sceneNumber && (
                            <p className="text-xs text-indigo-400 mb-3">
                              장면 {item.sceneNumber}
                            </p>
                          )}
                          <Button
                            onClick={() =>
                              downloadVideo(item.url, `${item.title}.mp4`)
                            }
                            size="sm"
                            variant="outline"
                            className="w-full text-xs border-slate-700 hover:bg-slate-700"
                          >
                            <Download className="mr-2 h-3 w-3" />
                            PC에 저장하기
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 사이드바 - 저장된 장면 목록 */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-900 border-slate-800 sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">저장된 장면</CardTitle>
                <CardDescription>지금까지 만든 장면들</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {Object.keys(scenes).length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">
                      아직 저장된 장면이 없습니다
                    </p>
                  ) : (
                    Object.entries(scenes)
                      .sort(([a], [b]) => {
                        const numA = parseInt(a.replace("scene", ""));
                        const numB = parseInt(b.replace("scene", ""));
                        return numA - numB;
                      })
                      .map(([key, scene]) => (
                        <div
                          key={key}
                          className="p-3 bg-slate-800 rounded-lg border border-slate-700 cursor-pointer hover:border-indigo-500/50 transition-all"
                          onClick={() => {
                            setCurrentVideoUrl(scene.videoUrl);
                            setEnglishPrompt(scene.englishPrompt);
                            setKoreanInput(scene.koreanText);
                            setCurrentVideoTitle(scene.koreanText);
                            setSelectedScene(scene.sceneNumber);
                            // 스크롤을 맨 위로
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          <video
                            src={scene.videoUrl}
                            className="w-full aspect-video rounded object-cover mb-2"
                          />
                          <p className="text-xs font-semibold text-slate-300">
                            장면 {scene.sceneNumber}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {scene.koreanText}
                          </p>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 하단 고정 입력 바 (챗GPT 스타일) */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-4 z-40">
        <div className="container mx-auto max-w-4xl">
          <div className="flex gap-2 items-center">
            <Input
              ref={inputRef}
              value={koreanInput}
              onChange={(e) => setKoreanInput(e.target.value)}
              placeholder="예: 숲속에서 춤추는 요정, 에메랄드빛 바다..."
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleTranslate();
                }
              }}
            />
            <Button
              onClick={handleTranslate}
              disabled={isTranslating || !koreanInput.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  변환 중...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  변환
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Enter 키를 눌러 빠르게 변환할 수 있습니다
          </p>
        </div>
      </div>
    </div>
  );
}
