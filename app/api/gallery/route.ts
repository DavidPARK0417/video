import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const GALLERY_FILE = path.join(process.cwd(), "data", "gallery.json");

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

// 저장된 갤러리 목록 가져오기
export async function GET() {
  try {
    console.log("📖 [갤러리 조회] 저장된 영상 목록 불러오기 시작");
    
    if (!(await fs.access(GALLERY_FILE).then(() => true).catch(() => false))) {
      console.log("📝 [갤러리 조회] 파일이 없어서 빈 배열 반환");
      return NextResponse.json([]);
    }

    const fileContents = await fs.readFile(GALLERY_FILE, "utf8");
    const gallery = JSON.parse(fileContents || "[]");
    
    console.log("✅ [갤러리 조회] 완료", { count: gallery.length });
    return NextResponse.json(gallery);
  } catch (error) {
    console.error("❌ [갤러리 조회] 오류:", error);
    return NextResponse.json([]);
  }
}

// 새로운 영상 정보 추가하기
export async function POST(request: Request) {
  try {
    console.log("💾 [갤러리 저장] 요청 수신");
    const newItem: GalleryItem = await request.json();

    if (!newItem.url || !newItem.title) {
      console.error("❌ [갤러리 저장] 필수 데이터 누락");
      return NextResponse.json(
        { error: "영상 URL과 제목은 필수입니다." },
        { status: 400 }
      );
    }

    // data 폴더가 없으면 생성
    const dataDir = path.dirname(GALLERY_FILE);
    if (!(await fs.access(dataDir).then(() => true).catch(() => false))) {
      await fs.mkdir(dataDir, { recursive: true });
      console.log("📁 [갤러리 저장] data 폴더 생성");
    }

    // 기존 갤러리 불러오기
    let gallery: GalleryItem[] = [];
    if (await fs.access(GALLERY_FILE).then(() => true).catch(() => false)) {
      try {
        const fileContents = await fs.readFile(GALLERY_FILE, "utf8");
        gallery = JSON.parse(fileContents || "[]");
      } catch (error) {
        console.warn("⚠️ [갤러리 저장] 기존 파일 읽기 실패, 새로 시작", error);
      }
    }

    // ID가 없으면 생성
    if (!newItem.id) {
      newItem.id = Date.now();
    }

    // 날짜가 없으면 생성
    if (!newItem.date) {
      newItem.date = new Date().toLocaleString("ko-KR");
    }

    // 새로운 아이템을 맨 앞에 추가
    gallery.unshift(newItem);

    // 파일에 저장
    await fs.writeFile(GALLERY_FILE, JSON.stringify(gallery, null, 2), "utf8");
    
    console.log("✅ [갤러리 저장] 완료", { id: newItem.id, title: newItem.title });
    return NextResponse.json({ success: true, item: newItem });
  } catch (error) {
    console.error("❌ [갤러리 저장] 오류:", error);
    return NextResponse.json(
      { error: "저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

