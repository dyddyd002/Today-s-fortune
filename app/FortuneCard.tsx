"use client";

import { useEffect, useState } from "react";
import { fortunes, luckyItems, luckyColors, pickRandom } from "./fortunes";
import { supabase } from "./lib/supabaseClient";
import { getItemIcon, getColorHex } from "./uiHelpers";

type Result = {
  fortune: string;
  item: string;
  color: string;
};

type HistoryEntry = {
  time: string;
  fortune: string;
};

const STORAGE_KEY = "fortuneHistory";
const HISTORY_PAGE_SIZE = 5;

export default function FortuneCard() {
  const [flipped, setFlipped] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [birthDate, setBirthDate] = useState("");

  // 회원가입/로그인 기능: 로그인하면 이 계정으로 기록이 서버에 계속 쌓인다
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // 로그인한 계정의 기록을 서버(Supabase)에서 불러온다 (기기가 바뀌어도 이어짐)
  async function fetchMyHistory(userId: string) {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("fortunes")
      .select("created_at, fortune")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setHistory(
        data.map((row) => ({
          time: new Date(row.created_at as string).toLocaleString("ko-KR"),
          fortune: row.fortune as string,
        }))
      );
      setHistoryPage(0);
    }
  }

  // 로그아웃 상태(게스트)일 때는 이 브라우저의 localStorage 기록을 보여준다
  function loadGuestHistory() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      setHistory(saved ? JSON.parse(saved) : []);
    } catch {
      setHistory([]);
    }
    setHistoryPage(0);
  }

  // 페이지가 열릴 때, 로그인 상태를 확인하고 그에 맞는 기록을 불러온다
  useEffect(() => {
    fetchTodayCount();

    if (!supabase) {
      loadGuestHistory();
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user;
      if (sessionUser) {
        setUser({ id: sessionUser.id, email: sessionUser.email ?? null });
        fetchMyHistory(sessionUser.id);
      } else {
        loadGuestHistory();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;
      if (sessionUser) {
        setUser({ id: sessionUser.id, email: sessionUser.email ?? null });
        fetchMyHistory(sessionUser.id);
      } else {
        setUser(null);
        loadGuestHistory();
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // 심화실습①: 오늘 자정 이후 fortunes 테이블에 쌓인 행 수 = "오늘 뽑은 사람 수"
  async function fetchTodayCount() {
    if (!supabase) return;
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
    const { error } = await supabase.from("fortunes").insert({
      fortune: newFortune,
      item: newItem,
      color: newColor,
      user_id: user?.id ?? null,
    });

    if (!error) {
      fetchTodayCount();
    }
  }

  function recordDraw(fortune: string) {
    const entry: HistoryEntry = {
      time: new Date().toLocaleString("ko-KR"),
      fortune,
    };
    // 함수형 업데이트: 클릭이 연달아 일어나도 항상 최신 history를 기준으로 쌓는다
    setHistory((prev) => {
      const updated = [entry, ...prev]; // 최신순: 새 기록을 맨 앞에
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setHistoryPage(0); // 새로 뽑으면 항상 최신 기록이 보이는 1페이지로
  }

  function draw() {
    if (flipped) {
      // 이미 뒤집힌 상태라면 다시 뽑기: 먼저 앞면으로 되돌린 뒤 잠시 후 새 결과로 뒤집는다
      setFlipped(false);
      window.setTimeout(() => {
        const newFortune = pickRandom(fortunes);
        const newItem = pickRandom(luckyItems);
        const newColor = pickRandom(luckyColors);
        setResult({
          fortune: newFortune,
          item: newItem,
          color: newColor,
        });
        setFlipped(true);
        recordDraw(newFortune);
        saveToSupabase(newFortune, newItem, newColor);
      }, 450);
      return;
    }
    const newFortune = pickRandom(fortunes);
    const newItem = pickRandom(luckyItems);
    const newColor = pickRandom(luckyColors);
    setResult({
      fortune: newFortune,
      item: newItem,
      color: newColor,
    });
    setFlipped(true);
    recordDraw(newFortune);
    saveToSupabase(newFortune, newItem, newColor);
  }

  async function drawWithAI() {
    if (!birthDate) {
      setAiError("생년월일을 먼저 입력해주세요.");
      return;
    }
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/ai-fortune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAiError(data.error || "AI 운세 생성에 실패했습니다.");
        return;
      }

      const newFortune: string =
        data.fortune || "오늘은 조용히 쉬어가는 게 좋겠어요.";
      const newItem: string = data.item || pickRandom(luckyItems);
      const newColor = pickRandom(luckyColors);

      setResult({
        fortune: newFortune,
        item: newItem,
        color: newColor,
      });
      setFlipped(true);
      recordDraw(newFortune);
      saveToSupabase(newFortune, newItem, newColor);
    } catch {
      setAiError("AI 운세 생성 중 오류가 발생했습니다.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSignUp() {
    if (!supabase) return;
    setAuthLoading(true);
    setAuthError("");
    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    });
    if (error) setAuthError(error.message);
    setAuthLoading(false);
  }

  async function handleSignIn() {
    if (!supabase) return;
    setAuthLoading(true);
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    if (error) setAuthError(error.message);
    setAuthLoading(false);
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  const totalHistoryPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
  const pageStart = historyPage * HISTORY_PAGE_SIZE;
  const pagedHistory = history.slice(pageStart, pageStart + HISTORY_PAGE_SIZE);
  const borderColor = result ? getColorHex(result.color) : undefined;

  return (
    <>
      <nav className="gnb">
        <div className="gnb-title">
          <span className="gnb-emoji">🔮</span>
          <span className="gnb-text">오늘의 운세</span>
        </div>
        <div className="gnb-auth">
          {user ? (
            <div className="auth-status">
              <span className="auth-email">{user.email}</span>
              <button className="auth-link-btn" onClick={handleSignOut}>
                로그아웃
              </button>
            </div>
          ) : (
            <div className="auth-form">
              <input
                type="email"
                placeholder="이메일"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="비밀번호 (6자 이상)"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
              <button
                className="auth-link-btn"
                onClick={handleSignUp}
                disabled={authLoading}
              >
                회원가입
              </button>
              <button
                className="auth-link-btn"
                onClick={handleSignIn}
                disabled={authLoading}
              >
                로그인
              </button>
            </div>
          )}
        </div>
      </nav>
      {authError && <p className="gnb-error">{authError}</p>}

      <main>
        {todayCount !== null && (
          <p className="today-count">오늘 뽑은 사람 수: {todayCount}명</p>
        )}

        <div className="scene" onClick={draw}>
          <div className={`card${flipped ? " flipped" : ""}`}>
            <div className="face front">
              <span className="tarot-ornament corner-tl">✦</span>
              <span className="tarot-ornament corner-tr">✦</span>
              <span className="tarot-ornament corner-bl">✦</span>
              <span className="tarot-ornament corner-br">✦</span>
              <div className="symbol">🔮</div>
              <div className="hint">카드를 눌러보세요</div>
            </div>
            <div
              className="face back"
              style={
                borderColor
                  ? ({ "--lucky-color": borderColor } as React.CSSProperties)
                  : undefined
              }
            >
              <span className="tarot-ornament corner-tl">✦</span>
              <span className="tarot-ornament corner-tr">✦</span>
              <span className="tarot-ornament corner-bl">✦</span>
              <span className="tarot-ornament corner-br">✦</span>
              <div className="label">오늘의 운세</div>
              <div className="fortune-text">{result?.fortune ?? "..."}</div>

              <div className="item-thumb">
                <span className="item-thumb-emoji">
                  {result ? getItemIcon(result.item) : "❔"}
                </span>
              </div>
              <div className="lucky-item-name">
                {result ? result.item : "..."}
              </div>
              <div className="lucky-color-name">
                행운의 색: {result ? result.color : "..."}
              </div>
            </div>
          </div>
        </div>

        <div className="birth-row">
          <label htmlFor="birthDate">생년월일 (AI 운세에 반영돼요)</label>
          <input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>

        <div className="button-row">
          <button className="draw-btn" onClick={draw}>
            {flipped ? "다시 뽑기" : "운세 뽑기"}
          </button>
          <button className="draw-btn" onClick={drawWithAI} disabled={aiLoading}>
            {aiLoading ? "AI가 짓는 중..." : "AI 운세 생성"}
          </button>
        </div>
        <div className="reveal-hint">
          {flipped ? "카드를 다시 눌러도 새로운 운세가 나와요" : " "}
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
                {pagedHistory.map((entry, i) => (
                  <tr key={pageStart + i}>
                    <td>{entry.time}</td>
                    <td>{entry.fortune}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalHistoryPages > 1 && (
              <div className="history-pagination">
                <button
                  className="page-btn"
                  onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
                  disabled={historyPage === 0}
                >
                  이전
                </button>
                <span className="page-indicator">
                  {historyPage + 1} / {totalHistoryPages}
                </span>
                <button
                  className="page-btn"
                  onClick={() =>
                    setHistoryPage((p) => Math.min(totalHistoryPages - 1, p + 1))
                  }
                  disabled={historyPage >= totalHistoryPages - 1}
                >
                  다음
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
