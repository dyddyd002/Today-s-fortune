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
    const { error } = await supabase.from("fortunes").insert({
      fortune: newFortune,
      item: newItem,
      color: newColor,
      user_id: user?.id ?? null, // 로그인 중이면 이 계정 기록으로 남긴다
    });

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
      <div className="auth-panel">
        {user ? (
          <div className="auth-status">
            <span>{user.email} 님으로 로그인됨 (기록이 계정에 저장돼요)</span>
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
            <button className="auth-link-btn" onClick={handleSignUp} disabled={authLoading}>
              회원가입
            </button>
            <button className="auth-link-btn" onClick={handleSignIn} disabled={authLoading}>
              로그인
            </button>
          </div>
        )}
        {authError && <p className="ai-error">{authError}</p>}
      </div>

      {todayCount !== null && (
        <p className="today-count">오늘 뽑은 사람 수: {todayCount}명</p>
      )}

      <div className="scene" onClick={draw}>
        <div className={`card${flipped ? " flipped" : ""}`}>
          <div className="face front">카드를 눌러보세요</div>
          <div className="face back">
            <p className="fortune-text">{fortune}</p>
            <p>행운의 아이템: {item}</p>
            <p>행운의 색: {color}</p>
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
