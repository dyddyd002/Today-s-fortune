"use client";

import { useEffect, useState } from "react";
import { fortunes, luckyItems, luckyColors, pickRandom } from "./fortunes";
import { supabase } from "./lib/supabaseClient";

type HistoryEntry = {
  time: string;
  fortune: string;
};

const STORAGE_KEY = "fortuneHistory";

export default function FortuneCard() {
  const [flipped, setFlipped] = useState(false);
  const [fortune, setFortune] = useState("...");
  const [item, setItem] = useState("...");
  const [color, setColor] = useState("...");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [todayCount, setTodayCount] = useState<number | null>(null);

  // 페이지가 열릴 때, 이 브라우저에 저장돼 있던 기록을 불러온다
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // 저장된 기록이 없거나 읽을 수 없으면 무시
    }
    fetchTodayCount();
  }, []);

  // 심화실습①: 오늘 자정 이후 fortunes 테이블에 쌓인 행 수 = "오늘 뽑은 사람 수"
  async function fetchTodayCount() {
    if (!supabase) return; // Supabase 연동 전이면 그냥 숨긴다
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from("fortunes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString());

    if (!error) {
      setTodayCount(count ?? 0);
    }
  }

  // 심화실습①: 서버 창고(Supabase)에도 한 줄 남긴다. 실패해도 화면 동작은 막지 않는다.
  async function saveToSupabase(newFortune: string, newItem: string, newColor: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from("fortunes")
      .insert({ fortune: newFortune, item: newItem, color: newColor });

    if (!error) {
      fetchTodayCount();
    }
  }

  function record(newFortune: string) {
    const entry: HistoryEntry = {
      time: new Date().toLocaleString("ko-KR"),
      fortune: newFortune,
    };
    // 함수형 업데이트: 클릭이 연달아 일어나도 항상 최신 history를 기준으로 쌓는다
    setHistory((prev) => {
      const updated = [entry, ...prev]; // 최신순: 새 기록을 맨 앞에
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  function draw() {
    const newFortune = pickRandom(fortunes);
    const newItem = pickRandom(luckyItems);
    const newColor = pickRandom(luckyColors);

    setFortune(newFortune);
    setItem(newItem);
    setColor(newColor);
    setFlipped(true);
    setAiError("");
    record(newFortune);
    saveToSupabase(newFortune, newItem, newColor);
  }

  async function drawWithAI() {
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/ai-fortune", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setAiError(data.error || "AI 운세 생성에 실패했습니다.");
        return;
      }

      const newFortune: string = data.fortune || "오늘은 조용히 쉬어가는 게 좋겠어요.";
      const newItem: string = data.item || pickRandom(luckyItems);
      const newColor = pickRandom(luckyColors);

      setFortune(newFortune);
      setItem(newItem);
      setColor(newColor);
      setFlipped(true);
      record(newFortune);
      saveToSupabase(newFortune, newItem, newColor);
    } catch (err) {
      setAiError("AI 운세 생성 중 오류가 발생했습니다.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <>
      {todayCount !== null && (
        <p className="today-count">오늘 뽑은 사람 수: {todayCount}명</p>
      )}

      <div className="scene" onClick={draw}>
        <div className={`card${flipped ? " flipped" : ""}`}>
          <div className="face front">카드를 눌러보세요</div>
          <div className="face back">
            <p>{fortune}</p>
            <p>행운의 아이템: {item}</p>
            <p>행운의 색: {color}</p>
          </div>
        </div>
      </div>

      <div className="button-row">
        <button onClick={draw}>운세 뽑기</button>
        <button onClick={drawWithAI} disabled={aiLoading}>
          {aiLoading ? "AI가 짓는 중..." : "AI 운세 생성"}
        </button>
      </div>

      {aiError && <p className="ai-error">{aiError}</p>}

      {history.length > 0 && (
        <div className="history">
          <h2>내 운세 기록</h2>
          <table>
            <thead>
              <tr>
                <th>뽑은 시각</th>
                <th>뽑은 운세</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry, i) => (
                <tr key={i}>
                  <td>{entry.time}</td>
                  <td>{entry.fortune}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
