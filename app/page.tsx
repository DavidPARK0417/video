import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LayoutDashboard,
  Lightbulb,
  TrendingUp,
  Zap,
  BarChart3,
  Youtube,
} from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-extrabold tracking-tight text-white">
          Shorts <span className="text-primary">Genius</span>
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl">
          AI 기반 유튜브 쇼츠 아이디어 생성 및 바이럴 분석 플랫폼.
          <br />
          당신의 다음 바이럴 콘텐츠를 지금 바로 발견하세요.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card border-primary/20 hover:border-primary transition-colors duration-300 group">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              대시보드
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              전체 통계 및 요약 정보
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">
              현재 진행 중인 프로젝트와 최근 생성된 아이디어 현황을 한눈에
              파악하세요.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-primary/20 hover:border-primary transition-colors duration-300 group">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                <Lightbulb className="h-6 w-6" />
              </div>
              아이디어 생성
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              AI 기반 아이디어 제안
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">
              키워드만 입력하면 AI가 바이럴 가능성이 높은 쇼츠 아이디어를 즉시
              생성합니다.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-primary/20 hover:border-primary transition-colors duration-300 group">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                <TrendingUp className="h-6 w-6" />
              </div>
              바이럴 분석
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              트렌드 및 패턴 분석
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">
              성공적인 쇼츠 영상들의 패턴을 분석하여 내 콘텐츠에 적용할 수 있는
              인사이트를 얻으세요.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-primary/20 hover:border-primary transition-colors duration-300 group">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                <Zap className="h-6 w-6" />
              </div>
              빠른 실행
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              즉시 제작 시작
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">
              선택한 아이디어로 바로 스크립트 작성 및 영상 기획을 시작할 수
              있습니다.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-primary/20 hover:border-primary transition-colors duration-300 group">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                <BarChart3 className="h-6 w-6" />
              </div>
              성과 추적
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              데이터 기반 성장
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">
              업로드한 영상의 성과를 추적하고 다음 콘텐츠 전략을 수립하세요.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-primary/20 hover:border-primary transition-colors duration-300 group">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                <Youtube className="h-6 w-6" />
              </div>
              채널 관리
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              다중 채널 지원
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">
              여러 유튜브 채널을 등록하고 각 채널에 맞는 맞춤형 전략을
              관리하세요.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
