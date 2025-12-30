import { NextRequest, NextResponse } from "next/server"
import { getCachedKeyword, updateCache, type CachedVideo } from "@/lib/cache"
import { YoutubeTranscript } from "youtube-transcript"

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

// 인기 키워드 목록 (트렌드 분석용)
const TREND_KEYWORDS = [
  "쇼츠",
  "브이로그",
  "요리",
  "운동",
  "일상",
  "여행",
  "반려동물",
  "뷰티",
  "패션",
  "게임",
  "음악",
  "드라마",
  "영화",
  "책",
  "공부",
]

interface YouTubeSearchResponse {
  items: Array<{
    id: { videoId: string }
    snippet: {
      title: string
      channelId: string
      publishedAt: string
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
async function searchVideos(keyword: string, maxResults: number = 10) {
  if (!YOUTUBE_API_KEY) {
    console.error("YOUTUBE_API_KEY가 설정되지 않았습니다.")
    throw new Error("YOUTUBE_API_KEY가 설정되지 않았습니다.")
  }

        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(keyword)}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}&videoDuration=short&order=viewCount`
  
  console.log("트렌드 검색 요청:", keyword)
  try {
    const searchResponse = await fetch(searchUrl)
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error(`트렌드 검색 실패 (${keyword}):`, searchResponse.status)
      console.error("에러 응답:", errorText)
      try {
        const errorData = JSON.parse(errorText)
        console.error("에러 상세:", JSON.stringify(errorData, null, 2))
        // 할당량 초과 감지
        if (errorData.error?.reason === "quotaExceeded" || errorText.includes("quota")) {
          console.error("⚠️ YouTube API 할당량 초과 감지!")
          throw new Error("QUOTA_EXCEEDED")
        }
      } catch (e) {
        if (e instanceof Error && e.message === "QUOTA_EXCEEDED") {
          throw e
        }
        console.error("에러 응답 파싱 실패")
      }
      return []
    }

    const searchData: YouTubeSearchResponse = await searchResponse.json()
    console.log(`트렌드 검색 성공 (${keyword}): ${searchData.items?.length || 0}개 영상 발견`)
    return searchData.items || []
  } catch (error) {
    console.error(`트렌드 검색 예외 발생 (${keyword}):`, error)
    return []
  }
}

/**
 * 영상의 조회수 가져오기
 */
async function getVideoStats(videoId: string) {
  if (!YOUTUBE_API_KEY) {
    throw new Error("YOUTUBE_API_KEY가 설정되지 않았습니다.")
  }

  const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`
  try {
    const statsResponse = await fetch(statsUrl)
    
    if (!statsResponse.ok) {
      const errorText = await statsResponse.text()
      console.error(`영상 통계 조회 실패 (${videoId}):`, statsResponse.status)
      try {
        const errorData = JSON.parse(errorText)
        console.error("에러 상세:", JSON.stringify(errorData, null, 2))
        if (errorData.error?.reason === "quotaExceeded") {
          console.error("⚠️ YouTube API 할당량 초과!")
        }
      } catch (e) {
        console.error("에러 응답:", errorText)
      }
      return null
    }

    const statsData: YouTubeVideoStatsResponse = await statsResponse.json()
    if (!statsData.items || statsData.items.length === 0) {
      console.warn(`영상 통계 데이터 없음 (${videoId})`)
      return null
    }
    return statsData.items[0]?.statistics || null
  } catch (error) {
    console.error(`영상 통계 조회 예외 (${videoId}):`, error)
    return null
  }
}

/**
 * 채널의 구독자 수 가져오기
 */
async function getChannelSubscribers(channelId: string) {
  if (!YOUTUBE_API_KEY) {
    throw new Error("YOUTUBE_API_KEY가 설정되지 않았습니다.")
  }

  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`
  try {
    const channelResponse = await fetch(channelUrl)
    
    if (!channelResponse.ok) {
      const errorText = await channelResponse.text()
      console.error(`채널 정보 조회 실패 (${channelId}):`, channelResponse.status)
      try {
        const errorData = JSON.parse(errorText)
        console.error("에러 상세:", JSON.stringify(errorData, null, 2))
        if (errorData.error?.reason === "quotaExceeded") {
          console.error("⚠️ YouTube API 할당량 초과!")
        }
      } catch (e) {
        console.error("에러 응답:", errorText)
      }
      return null
    }

    const channelData: YouTubeChannelResponse = await channelResponse.json()
    if (!channelData.items || channelData.items.length === 0) {
      console.warn(`채널 통계 데이터 없음 (${channelId})`)
      return null
    }
    return channelData.items[0]?.statistics || null
  } catch (error) {
    console.error(`채널 정보 조회 예외 (${channelId}):`, error)
    return null
  }
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
    console.log("=== 트렌드 분석 API 요청 시작 ===")
    console.log("YOUTUBE_API_KEY 존재 여부:", !!YOUTUBE_API_KEY)

    if (!YOUTUBE_API_KEY) {
      console.error("YOUTUBE_API_KEY가 설정되지 않았습니다.")
      return NextResponse.json(
        { error: "YOUTUBE_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      )
    }

    const allVideos: CachedVideo[] = []
    const unfilteredVideos: CachedVideo[] = []  // 필터링되지 않은 모든 영상 저장
    const minSubs = 10  // 필터링 조건 더 완화: 50 -> 10
    const maxSubs = 10000  // 필터링 조건 더 완화: 5000 -> 10000
    let quotaExceeded = false  // 할당량 초과 플래그

    console.log("=== 트렌드 키워드 목록:", TREND_KEYWORDS.length, "개 ===")

    // 인기 키워드들을 순회하며 바이럴 영상 수집
    for (const keyword of TREND_KEYWORDS) {
      try {
        console.log(`키워드 처리 시작: ${keyword}`)
        // 캐시 확인 (할당량 초과 시 더 오래된 캐시도 사용)
        try {
          const cached = getCachedKeyword(keyword)
          if (cached && cached.videos.length > 0) {
            const cacheDate = new Date(cached.lastUpdated)
            const daysDiff = (Date.now() - cacheDate.getTime()) / (1000 * 60 * 60 * 24)
            
            // 캐시 기간을 7일로 늘림 (할당량 절약)
            if (daysDiff < 7) {
              console.log(`캐시에서 트렌드 데이터 사용: ${keyword} (${daysDiff.toFixed(1)}일 전 데이터)`)
              allVideos.push(...cached.videos.slice(0, 3))
              unfilteredVideos.push(...cached.videos.slice(0, 3))
              continue
            } else {
              console.log(`캐시 데이터가 오래됨 (${daysDiff.toFixed(1)}일), 새로 조회 시도: ${keyword}`)
            }
          }
        } catch (cacheError) {
          console.error(`캐시 확인 중 오류 (계속 진행): ${keyword}`, cacheError)
          // 캐시 오류는 무시하고 계속 진행
        }

        // 할당량 초과가 감지되면 즉시 중단
        if (quotaExceeded) {
          console.log(`할당량 초과 감지됨, 캐시된 데이터 사용: ${keyword}`)
          const cached = getCachedKeyword(keyword)
          if (cached && cached.videos.length > 0) {
            allVideos.push(...cached.videos.slice(0, 3))
            unfilteredVideos.push(...cached.videos.slice(0, 3))
          }
          continue
        }

        // YouTube API로 영상 검색
        let searchResults: any[] = []
        try {
          searchResults = await searchVideos(keyword, 10)
        } catch (error) {
          if (error instanceof Error && error.message === "QUOTA_EXCEEDED") {
            console.error("⚠️ 할당량 초과로 인해 API 호출 중단, 캐시된 데이터 사용")
            quotaExceeded = true
            // 할당량 초과 시 캐시된 데이터 사용
            const cached = getCachedKeyword(keyword)
            if (cached && cached.videos.length > 0) {
              console.log(`할당량 초과 - 캐시된 데이터 사용: ${keyword}`)
              allVideos.push(...cached.videos.slice(0, 3))
              unfilteredVideos.push(...cached.videos.slice(0, 3))
            }
            continue
          }
          throw error
        }
        
        if (searchResults.length === 0) {
          console.log(`키워드 "${keyword}" 검색 결과 없음 - 다음 키워드로 이동`)
          continue
        }

        // 각 영상의 통계 정보 수집 (최대 3개만)
        console.log(`키워드 "${keyword}" 검색 결과: ${searchResults.length}개 영상 발견, 통계 정보 수집 시작`)
        let processedCount = 0
        let successCount = 0
        let failedCount = 0
        
        for (const item of searchResults.slice(0, 3)) {
          try {
            processedCount++
            const videoId = item.id.videoId
            const title = item.snippet.title
            const channelId = item.snippet.channelId

            console.log(`[${processedCount}/3] 영상 처리 시작: ${title} (ID: ${videoId})`)

            // 영상 조회수 가져오기
            const videoStats = await getVideoStats(videoId)
            if (!videoStats) {
              console.log(`❌ 영상 통계 조회 실패: ${title} (${videoId})`)
              failedCount++
              // 할당량 초과인지 확인
              // (getVideoStats 내부에서 이미 로그로 출력됨)
              continue
            }
            
            const views = parseInt(videoStats?.viewCount || "0", 10)
            console.log(`  ✓ 조회수: ${views.toLocaleString()}`)

            // 채널 구독자 수 가져오기
            const channelStats = await getChannelSubscribers(channelId)
            if (!channelStats) {
              console.log(`❌ 채널 통계 조회 실패: ${title} (채널ID: ${channelId})`)
              failedCount++
              // 할당량 초과인 경우 플래그 설정
              // (getChannelSubscribers 내부에서 이미 로그로 출력됨)
              continue
            }
            
            const subs = parseInt(channelStats?.subscriberCount || "0", 10)
            console.log(`  ✓ 구독자: ${subs.toLocaleString()}`)

            // 바이럴 점수 계산 (조회수 / 구독자 수)
            const viralScore = subs > 0 ? views / subs : 0
            console.log(`  ✓ 바이럴점수: ${viralScore.toFixed(2)}배`)
            console.log(`영상 분석 완료: ${title} - 조회수: ${views.toLocaleString()}, 구독자: ${subs.toLocaleString()}, 바이럴점수: ${viralScore.toFixed(2)}`)

            // 자막 추출 (실패해도 계속 진행)
            let transcript: string | null = null
            try {
              transcript = await getTranscript(videoId)
              if (transcript) {
                console.log(`  ✓ 자막 추출 성공 (${transcript.length}자)`)
              }
            } catch (transcriptError) {
              console.warn(`  ⚠️ 자막 추출 실패 (계속 진행): ${videoId}`, transcriptError)
              // 자막 추출 실패해도 계속 진행
            }

            const videoData: CachedVideo = {
              videoId,
              title,
              stats: { views, subs },
              viralScore: Math.round(viralScore * 100) / 100,
              transcript: transcript || undefined,
            }

            // 모든 영상을 unfilteredVideos에 저장 (최소한의 결과를 보장하기 위해)
            unfilteredVideos.push(videoData)
            successCount++
            console.log(`✅ 영상 데이터 저장 완료: ${title}`)

            // 필터링 조건:
            // 1. 바이럴 점수 2배 이상 (더 완화: 5 -> 2)
            // 2. 구독자 수 필터링 (기본: 10~10000명) 또는 바이럴 점수가 매우 높은 경우 (20배 이상, 더 완화: 50 -> 20)
            const isViralScoreHigh = viralScore >= 2  // 더 완화: 5 -> 2
            const isInSubsRange = subs >= minSubs && subs <= maxSubs
            const isVeryViral = viralScore >= 20  // 더 완화: 50 -> 20

            console.log(`영상 필터링 체크: ${title} - 바이럴점수: ${viralScore.toFixed(2)}, 구독자: ${subs}, 조건만족: ${isViralScoreHigh && (isInSubsRange || isVeryViral)}`)

            if (isViralScoreHigh && (isInSubsRange || isVeryViral)) {
              allVideos.push(videoData)
              console.log(`트렌드 바이럴 영상 발견: ${title} (점수: ${viralScore.toFixed(2)}, 키워드: ${keyword})`)
            } else {
              console.log(`영상 필터링 제외: ${title} - 바이럴점수: ${viralScore.toFixed(2)}, 구독자: ${subs}`)
            }

            // API 쿼터 보호를 위한 딜레이
            await new Promise((resolve) => setTimeout(resolve, 100))
          } catch (error) {
            failedCount++
            console.error(`❌ 영상 처리 오류 (${keyword}):`, error)
            console.error("에러 상세:", error instanceof Error ? error.stack : String(error))
            continue
          }
        }

        console.log(`키워드 "${keyword}" 처리 완료: 성공 ${successCount}개, 실패 ${failedCount}개, 총 처리 ${processedCount}개`)
        console.log(`현재까지 수집된 영상: 필터링됨 ${allVideos.length}개, 전체 ${unfilteredVideos.length}개`)

        // 키워드 간 딜레이
        await new Promise((resolve) => setTimeout(resolve, 200))
      } catch (error) {
        console.error(`키워드 처리 오류 (${keyword}):`, error)
        continue
      }
    }

    console.log(`=== 모든 키워드 처리 완료 ===`)
    console.log(`필터링된 영상: ${allVideos.length}개`)
    console.log(`전체 수집 영상: ${unfilteredVideos.length}개`)

    // 바이럴 점수 순으로 정렬
    allVideos.sort((a, b) => b.viralScore - a.viralScore)
    unfilteredVideos.sort((a, b) => b.viralScore - a.viralScore)

    // 필터링된 영상이 있으면 사용, 없으면 필터링되지 않은 영상 중 상위 20개 사용
    let topVideos: CachedVideo[]
    if (allVideos.length > 0) {
      topVideos = allVideos.slice(0, 20)
      console.log(`✅ 트렌드 분석 완료: 필터링된 ${allVideos.length}개 중 상위 ${topVideos.length}개 반환`)
    } else if (unfilteredVideos.length > 0) {
      // 필터링된 영상이 없으면 필터링되지 않은 영상 중 상위 20개 반환
      topVideos = unfilteredVideos.slice(0, 20)
      console.log(`⚠️ 필터링된 영상 없음, 전체 ${unfilteredVideos.length}개 중 상위 ${topVideos.length}개 반환`)
    } else {
      topVideos = []
      console.error("❌ 트렌드 영상을 전혀 찾지 못했습니다.")
      console.error("가능한 원인:")
      console.error("1. YouTube API 검색 결과가 없음")
      console.error("2. 영상 통계 조회 실패 (API 할당량 초과 가능)")
      console.error("3. 채널 통계 조회 실패 (API 할당량 초과 가능)")
      console.error("4. 모든 영상이 필터링 조건을 통과하지 못함")
    }

    const result = {
      keyword: "트렌드",
      lastUpdated: new Date().toISOString().split("T")[0],
      videos: topVideos,
      fromCache: quotaExceeded || topVideos.length > 0 && unfilteredVideos.length > 0 && allVideos.length === 0,
      quotaExceeded: quotaExceeded,
    }

    if (quotaExceeded && topVideos.length > 0) {
      console.log("⚠️ 할당량 초과로 인해 캐시된 데이터를 반환합니다.")
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("=== 트렌드 분석 API 오류 ===")
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

