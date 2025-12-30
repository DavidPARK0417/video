import { NextRequest, NextResponse } from "next/server"
import { getCachedKeyword, updateCache, type CachedVideo } from "@/lib/cache"
import { YoutubeTranscript } from "youtube-transcript"

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

interface YouTubeSearchResponse {
  items: Array<{
    id: { videoId: string }
    snippet: {
      title: string
      channelId: string
      publishedAt: string
    }
    statistics?: {
      viewCount: string
    }
  }>
}

interface YouTubeChannelResponse {
  items: Array<{
    statistics: {
      subscriberCount: string
      viewCount: string
    }
  }>
}

interface YouTubeVideoStatsResponse {
  items: Array<{
    statistics: {
      viewCount: string
      likeCount?: string
    }
  }>
}

/**
 * YouTube Data API v3로 영상 검색
 */
async function searchVideos(keyword: string, maxResults: number = 20) {
  if (!YOUTUBE_API_KEY) {
    console.error("YOUTUBE_API_KEY가 설정되지 않았습니다.")
    throw new Error("YOUTUBE_API_KEY가 설정되지 않았습니다. .env 파일에 YOUTUBE_API_KEY를 추가해주세요.")
  }

  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(keyword)}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
  
  console.log("유튜브 검색 요청:", keyword)
  const searchResponse = await fetch(searchUrl)
  
  if (!searchResponse.ok) {
    let errorMessage = `YouTube API 오류: ${searchResponse.status}`
    try {
      const errorData = await searchResponse.json()
      console.error("유튜브 검색 오류 상세:", JSON.stringify(errorData, null, 2))
      
      if (errorData.error) {
        const { message, reason } = errorData.error
        errorMessage = `YouTube API 오류 (${searchResponse.status}): ${message || reason || "알 수 없는 오류"}`
        
        // 403 에러의 일반적인 원인 안내
        if (searchResponse.status === 403) {
          if (reason === "quotaExceeded") {
            errorMessage = "YouTube API 할당량이 초과되었습니다. 내일 다시 시도해주세요."
          } else if (reason === "accessNotConfigured") {
            errorMessage = "YouTube Data API v3가 활성화되지 않았습니다. Google Cloud Console에서 API를 활성화해주세요."
          } else if (reason === "forbidden") {
            errorMessage = "API 키에 권한이 없거나 잘못되었습니다. API 키를 확인해주세요."
          } else {
            errorMessage = `YouTube API 접근 거부 (${reason || "알 수 없는 이유"}): ${message || "API 키를 확인하거나 Google Cloud Console에서 설정을 확인해주세요."}`
          }
        }
      }
    } catch (parseError) {
      const errorText = await searchResponse.text()
      console.error("유튜브 검색 오류 (텍스트):", errorText)
      errorMessage = `YouTube API 오류 (${searchResponse.status}): 응답을 파싱할 수 없습니다.`
    }
    throw new Error(errorMessage)
  }

  const searchData: YouTubeSearchResponse = await searchResponse.json()
  return searchData.items || []
}

/**
 * 영상의 조회수 가져오기
 */
async function getVideoStats(videoId: string) {
  if (!YOUTUBE_API_KEY) {
    throw new Error("YOUTUBE_API_KEY가 설정되지 않았습니다.")
  }

  const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`
  const statsResponse = await fetch(statsUrl)
  
  if (!statsResponse.ok) {
    console.error(`영상 통계 조회 실패 (${videoId}):`, statsResponse.status)
    // 403 에러인 경우 상세 정보 로깅
    if (statsResponse.status === 403) {
      try {
        const errorData = await statsResponse.json()
        console.error("영상 통계 조회 오류 상세:", JSON.stringify(errorData, null, 2))
      } catch (e) {
        // 무시
      }
    }
    throw new Error(`영상 통계 조회 실패: ${statsResponse.status}`)
  }

  const statsData: YouTubeVideoStatsResponse = await statsResponse.json()
  return statsData.items[0]?.statistics || null
}

/**
 * 채널의 구독자 수 가져오기
 */
async function getChannelSubscribers(channelId: string) {
  if (!YOUTUBE_API_KEY) {
    throw new Error("YOUTUBE_API_KEY가 설정되지 않았습니다.")
  }

  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`
  const channelResponse = await fetch(channelUrl)
  
  if (!channelResponse.ok) {
    console.error(`채널 정보 조회 실패 (${channelId}):`, channelResponse.status)
    // 403 에러인 경우 상세 정보 로깅
    if (channelResponse.status === 403) {
      try {
        const errorData = await channelResponse.json()
        console.error("채널 정보 조회 오류 상세:", JSON.stringify(errorData, null, 2))
      } catch (e) {
        // 무시
      }
    }
    throw new Error(`채널 정보 조회 실패: ${channelResponse.status}`)
  }

  const channelData: YouTubeChannelResponse = await channelResponse.json()
  return channelData.items[0]?.statistics || null
}

/**
 * 자막 추출
 */
async function getTranscript(videoId: string): Promise<string | null> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId)
    return transcript.map((item) => item.text).join(" ")
  } catch (error) {
    console.error(`자막 추출 실패 (${videoId}):`, error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("=== YouTube 검색 API 요청 시작 ===")
    const searchParams = request.nextUrl.searchParams
    const keyword = searchParams.get("keyword")
    const minSubs = searchParams.get("minSubs") ? parseInt(searchParams.get("minSubs")!) : 100
    const maxSubs = searchParams.get("maxSubs") ? parseInt(searchParams.get("maxSubs")!) : 1000

    console.log("요청 파라미터:", { keyword, minSubs, maxSubs })
    console.log("YOUTUBE_API_KEY 존재 여부:", !!YOUTUBE_API_KEY)

    if (!keyword) {
      console.error("키워드가 제공되지 않았습니다.")
      return NextResponse.json(
        { error: "키워드가 필요합니다." },
        { status: 400 }
      )
    }

    // 캐시 확인 (7일 이내 데이터면 재사용)
    let cachedData: any = null
    try {
      const cached = getCachedKeyword(keyword)
      if (cached) {
        const cacheDate = new Date(cached.lastUpdated)
        const daysDiff = (Date.now() - cacheDate.getTime()) / (1000 * 60 * 60 * 24)
        
        if (daysDiff < 7) {
          console.log("캐시에서 데이터 반환:", keyword)
          return NextResponse.json(cached)
        } else {
          // 오래된 캐시도 백업으로 저장 (할당량 초과 시 사용)
          cachedData = cached
          console.log(`캐시 데이터가 오래됨 (${daysDiff.toFixed(1)}일), 새로 조회 시도: ${keyword}`)
        }
      }
    } catch (cacheError) {
      console.error("캐시 확인 중 오류 (계속 진행):", cacheError)
      // 캐시 오류는 무시하고 계속 진행
    }

    // YouTube API로 영상 검색
    let searchResults: any[] = []
    let quotaExceeded = false
    try {
      searchResults = await searchVideos(keyword, 20)
    } catch (error) {
      // 할당량 초과 시 캐시된 데이터 반환
      if (error instanceof Error) {
        const errorLower = error.message.toLowerCase()
        if (
          errorLower.includes("quota") || 
          errorLower.includes("할당량") ||
          errorLower.includes("exceeded")
        ) {
          quotaExceeded = true
          console.error("⚠️ 할당량 초과로 인해 캐시된 데이터 반환:", keyword)
          if (cachedData) {
            return NextResponse.json({
              ...cachedData,
              fromCache: true,
              quotaExceeded: true,
            })
          }
        }
      }
      throw error
    }
    
    if (searchResults.length === 0) {
      return NextResponse.json({
        keyword,
        lastUpdated: new Date().toISOString().split("T")[0],
        videos: [],
      })
    }

    // 각 영상의 통계 정보 수집
    const videos: CachedVideo[] = []
    console.log(`검색 결과 ${searchResults.length}개 영상 처리 시작`)

    for (const item of searchResults) {
      try {
        const videoId = item.id.videoId
        const title = item.snippet.title
        const channelId = item.snippet.channelId

        console.log(`영상 처리 중: ${title} (${videoId})`)

        // 영상 조회수 가져오기
        const videoStats = await getVideoStats(videoId)
        if (!videoStats) {
          console.warn(`영상 통계를 가져올 수 없음: ${videoId}`)
          // 할당량 초과 가능성 체크
          if (!quotaExceeded && cachedData) {
            console.warn("⚠️ 통계 조회 실패 - 할당량 초과 가능성, 캐시된 데이터 반환")
            quotaExceeded = true
            return NextResponse.json({
              ...cachedData,
              fromCache: true,
              quotaExceeded: true,
            })
          }
          continue
        }
        const views = parseInt(videoStats?.viewCount || "0", 10)

        // 채널 구독자 수 가져오기
        const channelStats = await getChannelSubscribers(channelId)
        if (!channelStats) {
          console.warn(`채널 통계를 가져올 수 없음: ${channelId}`)
          // 할당량 초과 가능성 체크
          if (!quotaExceeded && cachedData) {
            console.warn("⚠️ 통계 조회 실패 - 할당량 초과 가능성, 캐시된 데이터 반환")
            quotaExceeded = true
            return NextResponse.json({
              ...cachedData,
              fromCache: true,
              quotaExceeded: true,
            })
          }
          continue
        }
        const subs = parseInt(channelStats?.subscriberCount || "0", 10)

        // 바이럴 점수 계산 (조회수 / 구독자 수)
        const viralScore = subs > 0 ? views / subs : 0

        // 필터링 조건:
        // 1. 바이럴 점수 10배 이상
        // 2. 구독자 수 필터링 (기본: 100~1000명) 또는 바이럴 점수가 매우 높은 경우 (100배 이상)
        const isViralScoreHigh = viralScore >= 10
        const isInSubsRange = subs >= minSubs && subs <= maxSubs
        const isVeryViral = viralScore >= 100

        if (isViralScoreHigh && (isInSubsRange || isVeryViral)) {
          // 자막 추출
          let transcript: string | null = null
          try {
            transcript = await getTranscript(videoId)
          } catch (transcriptError) {
            console.warn(`자막 추출 실패 (계속 진행): ${videoId}`, transcriptError)
            // 자막 추출 실패해도 계속 진행
          }

          videos.push({
            videoId,
            title,
            stats: { views, subs },
            viralScore: Math.round(viralScore * 100) / 100,
            transcript: transcript || undefined,
          })

          console.log(`바이럴 영상 발견: ${title} (점수: ${viralScore.toFixed(2)})`)
        }

        // API 쿼터 보호를 위한 딜레이
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        console.error("영상 처리 오류:", error)
        continue
      }
    }

    // 바이럴 점수 순으로 정렬
    videos.sort((a, b) => b.viralScore - a.viralScore)

    const result = {
      keyword,
      lastUpdated: new Date().toISOString().split("T")[0],
      videos,
    }

    // 캐시에 저장
    try {
      updateCache(keyword, videos)
    } catch (cacheError) {
      console.error("캐시 저장 중 오류 (응답은 정상 반환):", cacheError)
      // 캐시 저장 실패해도 응답은 정상 반환
    }

    console.log(`=== YouTube 검색 API 완료: ${videos.length}개 영상 발견 ===`)
    return NextResponse.json(result)
  } catch (error) {
    console.error("=== YouTube 검색 API 오류 ===")
    console.error("에러 타입:", error instanceof Error ? error.constructor.name : typeof error)
    console.error("에러 메시지:", error instanceof Error ? error.message : String(error))
    console.error("에러 스택:", error instanceof Error ? error.stack : "스택 없음")
    console.error("전체 에러 객체:", error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
        details: process.env.NODE_ENV === "development" 
          ? (error instanceof Error ? error.stack : String(error))
          : undefined
      },
      { status: 500 }
    )
  }
}

