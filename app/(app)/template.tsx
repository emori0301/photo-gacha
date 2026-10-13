/** 画面を移るたびに作り直されるので、そのたびに中身をふわっと出す（ヘッダーと下のタブは動かさない） */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
