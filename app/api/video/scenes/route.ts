import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const SCENES_FILE = path.join(process.cwd(), "data", "video-scenes.json");

interface SceneData {
  sceneNumber: number;
  videoUrl: string;
  prompt: string;
  koreanText: string;
  englishPrompt: string;
  createdAt: string;
}

interface ScenesCache {
  [key: string]: SceneData;
}

// 저장된 장면들 가져오기
export async function GET() {
  try {
    console.log("📖 [장면 조회] 저장된 장면 불러오기 시작");
    
    if (!(await fs.access(SCENES_FILE).then(() => true).catch(() => false))) {
      console.log("📝 [장면 조회] 파일이 없어서 빈 객체 반환");
      return NextResponse.json({ scenes: {} });
    }

    const fileContents = await fs.readFile(SCENES_FILE, "utf8");
    const scenes = JSON.parse(fileContents || "{}");
    
    console.log("✅ [장면 조회] 완료", { count: Object.keys(scenes).length });
    return NextResponse.json({ scenes });
  } catch (error) {
    console.error("❌ [장면 조회] 오류:", error);
    return NextResponse.json({ scenes: {} });
  }
}

// 새로운 장면 저장
export async function POST(request: Request) {
  try {
    console.log("💾 [장면 저장] 요청 수신");
    const { scene } = await request.json();

    if (!scene || !scene.sceneNumber) {
      console.error("❌ [장면 저장] 잘못된 데이터");
      return NextResponse.json(
        { error: "장면 데이터가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    // data 폴더가 없으면 생성
    const dataDir = path.dirname(SCENES_FILE);
    if (!(await fs.access(dataDir).then(() => true).catch(() => false))) {
      await fs.mkdir(dataDir, { recursive: true });
      console.log("📁 [장면 저장] data 폴더 생성");
    }

    // 기존 장면들 불러오기
    let scenes: ScenesCache = {};
    if (await fs.access(SCENES_FILE).then(() => true).catch(() => false)) {
      try {
        const fileContents = await fs.readFile(SCENES_FILE, "utf8");
        scenes = JSON.parse(fileContents || "{}");
      } catch (error) {
        console.warn("⚠️ [장면 저장] 기존 파일 읽기 실패, 새로 시작", error);
      }
    }

    // 새 장면 추가
    const sceneKey = `scene${scene.sceneNumber}`;
    scenes[sceneKey] = scene;

    // 파일에 저장
    await fs.writeFile(SCENES_FILE, JSON.stringify(scenes, null, 2), "utf8");
    
    console.log("✅ [장면 저장] 완료", { sceneKey, sceneNumber: scene.sceneNumber });
    return NextResponse.json({ success: true, sceneKey });
  } catch (error) {
    console.error("❌ [장면 저장] 오류:", error);
    return NextResponse.json(
      { error: "저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

