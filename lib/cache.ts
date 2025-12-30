import fs from "fs"
import path from "path"

const CACHE_FILE = path.join(process.cwd(), "data", "cache.json")

export interface CachedVideo {
  videoId: string
  title: string
  stats: {
    views: number
    subs: number
  }
  viralScore: number
  transcript?: string
  analysis?: {
    hook: string
    format: string
    recommendedTitles: string[]
    script: string
    guide: string
  }
}

export interface CacheData {
  [keyword: string]: {
    keyword: string
    lastUpdated: string
    videos: CachedVideo[]
  }
}

/**
 * 캐시에서 데이터 읽기
 */
export function readCache(): CacheData {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, "utf-8")
      if (!data || data.trim() === "") {
        console.warn("캐시 파일이 비어있습니다.")
        return {}
      }
      return JSON.parse(data)
    }
  } catch (error) {
    console.error("캐시 읽기 오류:", error)
    if (error instanceof Error) {
      console.error("에러 상세:", {
        message: error.message,
        stack: error.stack,
        cacheFile: CACHE_FILE
      })
    }
  }
  return {}
}

/**
 * 캐시에 데이터 저장
 */
export function writeCache(data: CacheData): void {
  try {
    // data 폴더가 없으면 생성
    const dataDir = path.dirname(CACHE_FILE)
    if (!fs.existsSync(dataDir)) {
      console.log("data 폴더 생성:", dataDir)
      fs.mkdirSync(dataDir, { recursive: true })
    }
    
    const jsonData = JSON.stringify(data, null, 2)
    fs.writeFileSync(CACHE_FILE, jsonData, "utf-8")
    console.log("캐시 저장 완료:", CACHE_FILE)
  } catch (error) {
    console.error("캐시 저장 오류:", error)
    if (error instanceof Error) {
      console.error("에러 상세:", {
        message: error.message,
        stack: error.stack,
        cacheFile: CACHE_FILE,
        dataDir: path.dirname(CACHE_FILE)
      })
    }
    // 에러를 다시 throw하지 않고 로그만 남김 (호출자가 처리)
    throw error
  }
}

/**
 * 특정 키워드의 캐시된 데이터 가져오기
 */
export function getCachedKeyword(keyword: string): {
  keyword: string
  lastUpdated: string
  videos: CachedVideo[]
} | null {
  const cache = readCache()
  return cache[keyword] || null
}

/**
 * 특정 키워드의 캐시 업데이트
 */
export function updateCache(keyword: string, videos: CachedVideo[]): void {
  const cache = readCache()
  cache[keyword] = {
    keyword,
    lastUpdated: new Date().toISOString().split("T")[0],
    videos,
  }
  writeCache(cache)
}

