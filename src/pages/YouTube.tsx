import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MediaCard } from "../components/MediaCard";
import { Row } from "../components/Row";
import { api, type YoutubeChannel, type YoutubeVideo } from "../lib/api";
import { formatDuration } from "../lib/format";
import { requestYoutubeToken, youtubeOauthClientId } from "../lib/google";
import { isTeslaBrowser } from "../lib/tesla";
import { useSettings } from "../lib/settings";

const categories = [
  { id: "", label: "Trending" },
  { id: "10", label: "Musik" },
  { id: "20", label: "Gaming" },
  { id: "17", label: "Sport" },
  { id: "24", label: "Entertainment" },
  { id: "23", label: "Comedy" },
  { id: "28", label: "Wissenschaft" },
  { id: "1", label: "Film" },
];

export function YouTubePage() {
  const { settings, update } = useSettings();
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<YoutubeVideo[]>([]);
  const [liked, setLiked] = useState<YoutubeVideo[]>([]);
  const [feed, setFeed] = useState<YoutubeVideo[]>([]);
  const [subs, setSubs] = useState<YoutubeChannel[]>([]);
  const [error, setError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .youtubeTrending(settings, category)
      .then((data) => {
        if (!alive) return;
        setItems(data.items || []);
        setError(data.error || "");
      })
      .catch((err) => {
        if (alive) setError(err.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [settings, category]);

  useEffect(() => {
    if (!settings.youtubeAccessToken) {
      setLiked([]);
      setFeed([]);
      setSubs([]);
      return;
    }
    const recover = (err: Error) => {
      if (err.message === "NO_YOUTUBE_LOGIN" || /401/.test(err.message)) {
        update({ youtubeAccessToken: "" });
      }
      return { items: [] };
    };
    Promise.all([
      api.youtubeLiked(settings).catch(recover),
      api.youtubeFeed(settings).catch(recover),
      api.youtubeSubscriptions(settings).catch(recover),
    ]).then(([likes, personal, channels]) => {
      setLiked(likes.items || []);
      setFeed(personal.items || []);
      setSubs(channels.items || []);
    });
  }, [settings]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    api
      .youtubeSearch(settings, q.trim())
      .then((data) => {
        setItems(data.items || []);
        setError(data.error || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function signIn() {
    setLoginError("");
    if (isTeslaBrowser()) {
      setLoginError("Im Tesla den QR unter Setup scannen und auf dem Handy bei Google anmelden.");
      return;
    }
    try {
      const token = await requestYoutubeToken(youtubeOauthClientId(settings));
      update({ youtubeAccessToken: token });
    } catch (err) {
      setLoginError((err as Error).message);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">YouTube</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.youtubeAccessToken ? (
            <button
              type="button"
              onClick={() => update({ youtubeAccessToken: "" })}
              className="btn"
            >
              Trennen
            </button>
          ) : isTeslaBrowser() ? (
            <Link to="/settings" className="btn btn-primary">
              QR · Handy
            </Link>
          ) : (
            <button type="button" onClick={signIn} className="btn btn-primary">
              Google
            </button>
          )}
          <form onSubmit={onSearch} className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Video oder Kanal"
              className="h-10 w-52 rounded-lg border border-white/10 bg-panel px-3 outline-none"
            />
            <button type="submit" className="btn btn-primary">
              Suchen
            </button>
          </form>
        </div>
      </div>
      {loginError ? <p className="mb-4 text-volt-2">{loginError}</p> : null}
      {!settings.youtubeAccessToken ? (
        <div className="card mb-5">
          <p className="muted">
            Abos und Likes: QR unter Setup, Google auf dem Handy. Trends laufen über den Server-Key — der bleibt geheim.
          </p>
          {isTeslaBrowser() ? (
            <Link to="/settings" className="btn mt-3 btn-primary">
              QR zeigen
            </Link>
          ) : (
            <button type="button" onClick={signIn} className="btn mt-3">
              Google
            </button>
          )}
        </div>
      ) : null}

      {feed.length ? (
        <Row title="Neu aus deinen Abos">
          {feed.map((video) => (
            <MediaCard
              key={`feed-${video.id}`}
              to={`/watch/yt/${video.id}`}
              title={video.title}
              subtitle={video.channel}
              image={video.thumbnail}
              wide
            />
          ))}
        </Row>
      ) : null}
      {liked.length ? (
        <Row title="Geliked">
          {liked.map((video) => (
            <MediaCard
              key={`like-${video.id}`}
              to={`/watch/yt/${video.id}`}
              title={video.title}
              subtitle={video.channel}
              image={video.thumbnail}
              wide
            />
          ))}
        </Row>
      ) : null}
      {subs.length ? (
        <Row title="Deine Kanäle">
          {subs.map((channel) => (
            <button
              key={channel.id}
              type="button"
              onClick={() => {
                setLoading(true);
                api
                  .youtubeChannel(settings, channel.id)
                  .then((data) => {
                    setItems(data.items || []);
                    setError(data.error || "");
                  })
                  .catch((err) => setError(err.message))
                  .finally(() => setLoading(false));
              }}
              className="flex h-24 w-64 shrink-0 items-center gap-3 rounded-2xl border border-white/5 bg-panel px-4 text-left"
            >
              {channel.thumbnail ? (
                <img src={channel.thumbnail} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : null}
              <p className="font-semibold">{channel.title}</p>
            </button>
          ))}
        </Row>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id || "all"}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={`h-12 rounded-2xl px-4 ${
              category === cat.id ? "bg-volt" : "border border-white/10 bg-panel text-mist"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      {error ? (
        <div className="mb-6 rounded-2xl border border-volt/30 bg-volt/10 p-5 text-volt-2">
          {error === "NO_YOUTUBE_KEY"
            ? "Trends kommen vom Server. Für deine Liste: QR scannen und auf dem Handy bei Google anmelden."
            : error}
        </div>
      ) : null}
      {loading ? <p className="text-mist">Lade…</p> : null}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map((video) => (
          <MediaCard
            key={video.id}
            to={`/watch/yt/${video.id}`}
            title={video.title}
            subtitle={video.channel}
            image={video.thumbnail}
            badge={formatDuration(video.duration)}
            fill
          />
        ))}
      </div>
    </div>
  );
}
