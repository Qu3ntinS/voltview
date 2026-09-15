import { useEffect, useRef, useState } from "react";

export function GamesPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-volt-2">Beifahrer</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold">Games</h1>
        <p className="mt-3 max-w-2xl text-mist">
          Kurze Pausen-Spiele fürs Tesla-Theater — Volt Snake und Circuit Memory. Kein Content-Katalog.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SnakeGame />
        <MemoryGame />
      </div>
    </div>
  );
}

function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const dirRef = useRef({ x: 1, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = 18;
    const cols = 24;
    const rows = 16;
    canvas.width = cols * size;
    canvas.height = rows * size;
    let snake = [{ x: 4, y: 8 }];
    let food = { x: 12, y: 8 };
    let alive = true;

    const tick = window.setInterval(() => {
      if (!alive) return;
      const head = { x: snake[0].x + dirRef.current.x, y: snake[0].y + dirRef.current.y };
      if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows || snake.some((p) => p.x === head.x && p.y === head.y)) {
        alive = false;
        return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        setScore((s) => s + 1);
        food = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
      } else {
        snake.pop();
      }
      ctx.fillStyle = "#0a0714";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#c4b5fd";
      ctx.fillRect(food.x * size, food.y * size, size - 2, size - 2);
      ctx.fillStyle = "#8b5cf6";
      snake.forEach((p) => ctx.fillRect(p.x * size, p.y * size, size - 2, size - 2));
    }, 140);

    return () => window.clearInterval(tick);
  }, []);

  return (
    <section className="rounded-[28px] border border-white/5 bg-panel p-5 glow-ring">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Volt Snake</h2>
        <p className="text-mist">Score {score}</p>
      </div>
      <canvas ref={canvasRef} className="w-full rounded-2xl bg-ink" aria-label="Volt Snake Spielfeld" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <span />
        <Pad onClick={() => (dirRef.current = { x: 0, y: -1 })} label="↑" />
        <span />
        <Pad onClick={() => (dirRef.current = { x: -1, y: 0 })} label="←" />
        <Pad onClick={() => (dirRef.current = { x: 0, y: 1 })} label="↓" />
        <Pad onClick={() => (dirRef.current = { x: 1, y: 0 })} label="→" />
      </div>
    </section>
  );
}

function Pad({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="h-16 rounded-2xl bg-white/5 text-2xl">
      {label}
    </button>
  );
}

function MemoryGame() {
  const icons = ["✦", "◈", "◎", "⚡", "☾", "✧"];
  const [cards, setCards] = useState(() => shuffle([...icons, ...icons]).map((v, i) => ({ id: i, v, open: false, done: false })));
  const [picked, setPicked] = useState<number[]>([]);

  function flip(index: number) {
    if (cards[index].open || cards[index].done || picked.length === 2) return;
    const next = cards.map((c, i) => (i === index ? { ...c, open: true } : c));
    const nextPicked = [...picked, index];
    setCards(next);
    setPicked(nextPicked);
    if (nextPicked.length === 2) {
      const [a, b] = nextPicked;
      if (next[a].v === next[b].v) {
        window.setTimeout(() => {
          setCards((cur) => cur.map((c, i) => (i === a || i === b ? { ...c, done: true } : c)));
          setPicked([]);
        }, 350);
      } else {
        window.setTimeout(() => {
          setCards((cur) => cur.map((c, i) => (i === a || i === b ? { ...c, open: false } : c)));
          setPicked([]);
        }, 700);
      }
    }
  }

  return (
    <section className="rounded-[28px] border border-white/5 bg-panel p-5 glow-ring">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Circuit Memory</h2>
        <button
          type="button"
          className="rounded-xl bg-white/5 px-3 py-2 text-sm"
          onClick={() => {
            setCards(shuffle([...icons, ...icons]).map((v, i) => ({ id: i, v, open: false, done: false })));
            setPicked([]);
          }}
        >
          Neu
        </button>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {cards.map((card, index) => (
          <button
            key={card.id}
            type="button"
            onClick={() => flip(index)}
            aria-label={card.open || card.done ? `Karte ${card.v}` : "Verdeckte Karte"}
            className={`flex h-20 items-center justify-center rounded-2xl text-2xl ${
              card.open || card.done ? "bg-volt/30 text-volt-2" : "bg-ink text-transparent"
            }`}
          >
            {card.v}
          </button>
        ))}
      </div>
    </section>
  );
}

function shuffle<T>(list: T[]) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}
