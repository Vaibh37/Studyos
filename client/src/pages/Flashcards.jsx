import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import DialogSurface from "../components/DialogSurface";
import { ArrowLeft, ArrowRight, Cards, CheckCircle2, Clock3, Pencil, Plus, RefreshCw, Search, Speaker, Trash2, Upload, X } from "../components/icons";
import { WorkspaceSkeleton } from "../components/WorkspaceStates";
import { createLocalId } from "../services/localDb";
import { JAPANESE_PACKS } from "../services/japaneseDecks";
import { applyDeckAction, formatInterval, MAX_CARDS, RATINGS, reviewCard, reviewQueue, summarizeDeck } from "../services/flashcardCore.mjs";
import { changeDeck, createDeck, deleteDeck, getDeck, listDecks, parseCardText } from "../services/flashcards";
import "../styles/flashcards.css";

const blankCard = { front: "", back: "", reading: "", example: "" };
const quickRatings = ["Again", "Hard", "Good", "Easy"];
const packFor = deck => JAPANESE_PACKS.find(p => p.id === deck._id || `migrated-${p.id}` === deck._id);
const nextTime = (timestamp, now) => timestamp ? formatInterval(Math.max(1, timestamp - now)) : null;
const readyCount = stats => stats.new + stats.due;

function DeckMark({ deck }) {
  const pack = packFor(deck);
  return <span className="fc-deck-mark" aria-hidden="true">{pack ? pack.mark : <Cards size={24} weight="regular" />}</span>;
}

function ProgressLine({ stats }) {
  const percent = stats.total ? Math.round(stats.learned / stats.total * 100) : 0;
  return <div className="fc-progress-line">
    <div className="fc-progress-track" role="progressbar" aria-label="Cards in long-term review" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <span style={{ width: `${percent}%` }} />
    </div>
    <span>{stats.learned}/{stats.total}</span>
  </div>;
}

function FlashcardsWorkspace({ guest }) {
  const [decks, setDecks] = useState(null);
  const [deck, setDeck] = useState(null);
  const [session, setSession] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [audioNotice, setAudioNotice] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const locked = useRef(false);
  const lastAutoRefresh = useRef(0);
  const promptRef = useRef(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const interval = setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      mounted.current = false;
      clearInterval(interval);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const run = useCallback(async (work) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true); setError("");
    try { await work(); }
    catch (e) {
      if (mounted.current) {
        setError(e?.message || "Something went wrong. Try again.");
        if (e?.status === 409 || e?.uncertain) setStale(true);
      }
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);
  const loadLibrary = useCallback(() => run(async () => {
    const data = await listDecks(guest);
    if (!mounted.current) return;
    setDecks(data); setDeck(null); setSession(null); setDialog(null); setStale(false); setNow(Date.now());
  }), [guest, run]);
  useEffect(() => { void loadLibrary(); }, [loadLibrary]);

  // Refresh summary counts when a scheduled card becomes due while browsing.
  useEffect(() => {
    if (!decks || deck || busy || stale) return;
    const upcoming = decks.some(d => d.stats.nextDue != null && d.stats.nextDue <= now);
    if (upcoming && now - lastAutoRefresh.current >= 15_000) {
      lastAutoRefresh.current = now;
      void loadLibrary();
    }
  }, [now, decks, deck, busy, stale, loadLibrary]);

  const remember = useCallback(value => {
    if (!mounted.current) return;
    const timestamp = Date.now();
    setDeck(value); setNow(timestamp);
    setDecks(current => {
      const summary = summarizeDeck(value, timestamp);
      const values = current || [];
      return values.some(d => d._id === value._id)
        ? values.map(d => d._id === value._id ? summary : d) : [...values, summary];
    });
  }, []);
  function start(value) {
    const ids = reviewQueue(value.cards);
    setSession({ ids, total: ids.length, done: 0, ratings: { again: 0, hard: 0, good: 0, easy: 0 } });
    setRevealed(false); setAudioNotice("");
  }
  function open(id, review = false) {
    void run(async () => {
      const value = await getDeck(guest, id);
      remember(value); setSearch(""); setSession(null); setStale(false);
      if (review) start(value);
    });
  }
  function refresh() {
    if (!deck) return void loadLibrary();
    void run(async () => {
      const value = await getDeck(guest, deck._id);
      remember(value); setStale(false); setSession(null); setDialog(null); setRevealed(false);
    });
  }
  function back() {
    if (session) { setSession(null); setRevealed(false); return; }
    void loadLibrary();
  }
  function showDialog(type, card) {
    setError("");
    setDialog({ type, card });
    setForm(type === "deck" ? { name: "", japanese: false }
      : type === "rename" ? { name: deck.name }
      : type === "card" ? { ...blankCard, ...card } : {});
  }
  function closeDialog() { if (!locked.current) { setDialog(null); setError(""); } }
  function addStarter(pack) {
    void run(async () => {
      const value = await createDeck(guest, { _id: pack.id, name: pack.name, language: "ja", cards: pack.cards });
      remember(value); setSearch(""); setSession(null); setStale(false);
    });
  }
  function saveDialog(event) {
    event.preventDefault();
    if (stale) return;
    void run(async () => {
      if (dialog.type === "deck") {
        const value = await createDeck(guest, { name: form.name, language: form.japanese ? "ja" : "" });
        remember(value); setSearch("");
      } else if (dialog.type === "delete-deck") {
        await deleteDeck(guest, deck._id);
        setDecks(values => values.filter(d => d._id !== deck._id)); setDeck(null); setSession(null);
      } else {
        let action;
        if (dialog.type === "rename") action = { action: "rename", name: form.name };
        if (dialog.type === "card") action = dialog.card
          ? { action: "edit", cardId: dialog.card.id, card: form }
          : { action: "add", cards: [{ ...form, id: createLocalId() }] };
        if (dialog.type === "delete-card") action = { action: "remove", cardId: dialog.card.id };
        if (dialog.type === "import") {
          const cards = parseCardText(form.text || "");
          if (deck.cards.length + cards.length > MAX_CARDS) throw new Error("A deck can contain up to 500 cards.");
          // A single import is atomic. Keep the encoded request beneath the JSON limit.
          action = { action: "add", cards };
          if (new TextEncoder().encode(JSON.stringify(action)).length > 90_000) throw new Error("This import is too large. Split it into smaller batches.");
        }
        // Validate locally before attempting network I/O; server checks again.
        applyDeckAction(deck, { ...action, revision: deck.revision });
        remember(await changeDeck(guest, deck, action));
      }
      setDialog(null);
    });
  }
  const currentCard = deck && session?.ids.length ? deck.cards.find(c => c.id === session.ids[0]) : null;
  const rate = useCallback(rating => {
    if (!currentCard || !revealed || busy || stale) return;
    void run(async () => {
      const value = await changeDeck(guest, deck, { action: "review", cardId: currentCard.id, rating });
      remember(value);
      setSession(previous => ({
        ...previous, ids: previous.ids.slice(1), done: previous.done + 1,
        ratings: { ...previous.ratings, [rating]: previous.ratings[rating] + 1 },
      }));
      setRevealed(false); setAudioNotice("");
      window.speechSynthesis?.cancel();
    });
  }, [currentCard, revealed, busy, stale, run, guest, deck, remember]);
  const currentCardId = currentCard?.id;
  useEffect(() => {
    if (currentCardId) promptRef.current?.focus({ preventScroll: true });
  }, [currentCardId]); // Focus follows the new card, not each reveal.
  useEffect(() => {
    if (!currentCard || dialog) return;
    const listener = event => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey ||
        event.target?.closest?.("input, textarea, select, [contenteditable]")) return;
      if (!revealed && event.code === "Space" && !event.target?.closest?.("button, a")) {
        event.preventDefault(); setRevealed(true);
      } else if (revealed && /^[1-4]$/.test(event.key)) {
        event.preventDefault(); rate(RATINGS[Number(event.key) - 1]);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [currentCard, dialog, revealed, rate]);

  function speak(card) {
    const synth = window.speechSynthesis;
    if (!synth || !window.SpeechSynthesisUtterance) { setAudioNotice("Japanese audio is not available on this device."); return; }
    const voice = synth.getVoices().find(v => /^ja(?:-|_|$)/i.test(v.lang));
    if (!voice) { setAudioNotice("Install a Japanese system voice to use pronunciation."); return; }
    synth.cancel();
    const utterance = new window.SpeechSynthesisUtterance(card.reading && !card.reading.includes("／") ? card.reading : card.front);
    utterance.voice = voice; utterance.lang = "ja-JP"; utterance.rate = 0.86;
    utterance.onerror = () => setAudioNotice("Could not play Japanese pronunciation.");
    setAudioNotice(""); synth.speak(utterance);
  }

  const metrics = (decks || []).reduce((sum, d) => ({
    due: sum.due + d.stats.due, new: sum.new + d.stats.new, learned: sum.learned + d.stats.learned,
  }), { due: 0, new: 0, learned: 0 });
  const stats = deck ? summarizeDeck(deck, now).stats : null;
  const visibleCards = deck?.cards.filter(c => [c.front, c.back, c.reading, c.example].some(v => v.toLowerCase().includes(search.toLowerCase().trim()))) || [];
  const availablePacks = JAPANESE_PACKS.filter(p => !decks?.some(d => d._id === p.id));
  const dialogTitle = dialog && ({
    deck: "New deck", rename: "Rename deck", card: dialog.card ? "Edit card" : "Add card",
    import: "Import cards", "delete-deck": "Delete deck?", "delete-card": "Delete card?",
  })[dialog.type];

  return <div className="fc-page">
    <header className="fc-header">
      <div>
        {deck && <button className="fc-back" type="button" onClick={back} disabled={busy}><ArrowLeft size={16} /> {session ? deck.name : "All decks"}</button>}
        <h1>{session ? "Review" : deck?.name || "Flashcards"}</h1>
        <p>{session ? "Recall the answer before revealing it." : deck ? "Learn a little every day. Review when cards are due." : "Build lasting memory with spaced repetition."}</p>
      </div>
      {!session && <div className="fc-header-actions">
        <button type="button" className="fc-button fc-icon-button" aria-label="Refresh flashcards" title="Refresh flashcards" disabled={busy} onClick={refresh}><RefreshCw size={17} /></button>
        <button type="button" className="fc-button fc-primary" disabled={busy || stale || !decks} onClick={() => showDialog(deck ? "card" : "deck")}><Plus size={18} /> {deck ? "Add card" : "New deck"}</button>
      </div>}
    </header>

    {error && !dialog && <div role="alert" className="fc-notice fc-error"><span>{error}</span><button type="button" className="fc-button" onClick={refresh} disabled={busy}><RefreshCw size={15} /> Refresh</button></div>}
    {!decks && busy && <WorkspaceSkeleton kind="cards" count={3} label="Loading flashcards" />}
    {!decks && !busy && !error && <WorkspaceSkeleton kind="cards" count={3} label="Loading flashcards" />}

    {decks && !deck && <>
      <div className="fc-metrics">
        <div><span className="fc-metric-label"><Clock3 size={17} /> Due for review</span><strong>{metrics.due}</strong><small>Ready now</small></div>
        <div><span className="fc-metric-label"><Cards size={17} /> New cards</span><strong>{metrics.new}</strong><small>Not studied yet</small></div>
        <div><span className="fc-metric-label"><CheckCircle2 size={17} /> Learned</span><strong>{metrics.learned}</strong><small>In long-term review</small></div>
      </div>
      <section className="fc-section">
        <div className="fc-section-head"><h2>My decks</h2><span>{decks.length} {decks.length === 1 ? "deck" : "decks"}</span></div>
        {decks.length ? <div className="fc-deck-list">{decks.map(item => <div className="fc-deck-row" key={item._id}>
          <button type="button" className="fc-deck-main" onClick={() => open(item._id)} disabled={busy}>
            <DeckMark deck={item} /><span><strong>{item.name}</strong><small>{item.stats.total} {item.stats.total === 1 ? "card" : "cards"} · {item.language === "ja" ? "Japanese" : "Custom deck"}</small></span>
          </button>
          <div className="fc-deck-stats"><span><strong>{item.stats.due}</strong> due</span><span><strong>{item.stats.new}</strong> new</span><ProgressLine stats={item.stats} /></div>
          <button type="button" className="fc-button" onClick={() => open(item._id, true)} disabled={busy || !readyCount(item.stats)}>Study <ArrowRight size={16} /></button>
        </div>)}</div> : <div className="fc-empty"><Cards size={30} /><h3>Your first deck awaits</h3><p>Create your own deck or add a Japanese starter deck below.</p><button className="fc-button" type="button" disabled={busy} onClick={() => showDialog("deck")}><Plus size={17} /> Create deck</button></div>}
      </section>
      {availablePacks.length > 0 && <section className="fc-section">
        <div className="fc-section-head"><div><h2>Japanese starter library</h2><p>Start with kana, then build your vocabulary for JLPT N5.</p></div><span>{availablePacks.length} available</span></div>
        <div className="fc-packs">{availablePacks.map(pack => <article className="fc-pack" key={pack.id}>
          <span className="fc-pack-mark" lang="ja">{pack.mark}</span>
          <div className="fc-pack-copy"><h3>{pack.name}</h3><p>{pack.description}</p></div>
          <div className="fc-pack-bottom"><span>{pack.cards.length} cards</span><button className="fc-button" type="button" disabled={busy || stale} onClick={() => addStarter(pack)}><Plus size={16} /> Add deck</button></div>
        </article>)}</div>
        <p className="fc-footnote">Starter selections are not exhaustive JLPT syllabi.</p>
      </section>}
      <p className="fc-footnote">{guest ? "Guest decks are saved on this device. Sign in to sync across devices." : "Your decks and review progress are private and synced to your account."}</p>
    </>}

    {deck && !session && <>
      <section className="fc-deck-overview">
        <DeckMark deck={deck} />
        <div className="fc-deck-overview-text"><h2>{readyCount(stats) ? `${readyCount(stats)} cards ready` : "You're all caught up"}</h2><p>{stats.due} due · {stats.new} new · {stats.learned} learned {stats.nextDue && !readyCount(stats) && ` · Next in ${nextTime(stats.nextDue, now)}`}</p><ProgressLine stats={stats} /></div>
        <button type="button" className="fc-button fc-primary" disabled={busy || stale || !readyCount(stats)} onClick={() => start(deck)}>Start review <ArrowRight size={17} /></button>
      </section>
      <div className="fc-detail-actions">
        <label className="fc-search"><Search size={18} /><input type="search" aria-label="Search cards" placeholder="Search cards" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <div className="fc-actions">
          <button className="fc-button" type="button" disabled={busy || stale} onClick={() => showDialog("import")}><Upload size={17} /> Import</button>
          <button className="fc-button" type="button" disabled={busy || stale} onClick={() => showDialog("rename")}><Pencil size={16} /> Rename</button>
          <button className="fc-button fc-icon-button" type="button" disabled={busy || stale} aria-label="Delete deck" title="Delete deck" onClick={() => showDialog("delete-deck")}><Trash2 size={18} /></button>
        </div>
      </div>
      <section className="fc-section fc-cards-section">
        <div className="fc-section-head"><h2>Cards</h2><span>{visibleCards.length} of {stats.total}</span></div>
        {visibleCards.length ? <div className="fc-card-table">
          <div className="fc-table-head"><span>Front</span><span>Answer</span><span>Status</span><span /></div>
          {visibleCards.map(card => <div className="fc-card-row" key={card.id}>
            <div className="fc-card-front" lang={deck.language || undefined}>{card.front}</div>
            <div className="fc-card-answer">{card.reading && <small lang="ja">{card.reading}</small>}{card.back}</div>
            <span className={`fc-state fc-state-${card.stage}`}>{card.stage === "new" ? "New" : card.dueAt <= now ? "Due" : `In ${nextTime(card.dueAt, now)}`}</span>
            <div className="fc-row-actions"><button className="fc-icon-button" type="button" aria-label={`Edit ${card.front}`} onClick={() => showDialog("card", card)} disabled={busy || stale}><Pencil size={17} /></button><button className="fc-icon-button" type="button" aria-label={`Delete ${card.front}`} onClick={() => showDialog("delete-card", card)} disabled={busy || stale}><Trash2 size={17} /></button></div>
          </div>)}
        </div> : <div className="fc-empty"><Cards size={30} /><h3>{search ? "No matching cards" : "No cards yet"}</h3><p>{search ? "Try a different search." : "Add a card or import a list of words."}</p>{!search && <button className="fc-button" type="button" onClick={() => showDialog("card")} disabled={busy || stale}><Plus size={17} /> Add first card</button>}</div>}
      </section>
    </>}

    {session && <section className="fc-review">
      <div className="fc-review-progress"><span>{deck.name}</span><strong>{session.done} / {session.total}</strong></div>
      <div className="fc-session-track" role="progressbar" aria-label="Review session progress" aria-valuemin={0} aria-valuemax={Math.max(1, session.total)} aria-valuenow={session.done}><span style={{ width: `${session.total ? session.done / session.total * 100 : 100}%` }} /></div>
      {currentCard ? <>
        <div className="fc-review-card" key={currentCard.id} ref={promptRef} tabIndex={-1}>
          <span className="fc-review-label">{currentCard.stage === "new" ? "New card" : currentCard.stage === "learning" ? "Learning" : "Review"}</span>
          <div className="fc-review-front" lang={deck.language || undefined}>{currentCard.front}</div>
          {revealed && <div className="fc-revealed" aria-live="polite">
            {currentCard.reading && <p className="fc-reading" lang="ja">{currentCard.reading}</p>}
            <p className="fc-answer">{currentCard.back}</p>
            {currentCard.example && <p className="fc-example">{currentCard.example}</p>}
            {deck.language === "ja" && <button className="fc-button fc-pronounce" type="button" onClick={() => speak(currentCard)}><Speaker size={18} /> Pronunciation</button>}
            {audioNotice && <p className="fc-footnote" role="status">{audioNotice}</p>}
          </div>}
          {!revealed && <p className="fc-recall-hint">Think of the answer, then reveal it.</p>}
        </div>
        {!revealed ? <button className="fc-button fc-primary fc-show-answer" type="button" onClick={() => setRevealed(true)} disabled={busy || stale}>Show answer <kbd>Space</kbd></button>
          : <div className="fc-ratings" aria-label="How well did you remember?">{RATINGS.map((rating, i) => <button type="button" className={`fc-rating fc-rating-${rating}`} key={rating} disabled={busy || stale} onClick={() => rate(rating)}>
            <span>{quickRatings[i]}</span><strong>{formatInterval(reviewCard(currentCard, rating, now).interval)}</strong><kbd>{i + 1}</kbd>
          </button>)}</div>}
        <p className="fc-shortcut-hint">{revealed ? "Choose how well you remembered the answer. The next interval is shown above." : "Tap Show answer or press Space."}</p>
      </> : <div className="fc-review-complete">
        <CheckCircle2 size={48} weight="thin" /><h2>Session complete</h2><p>{session.done} cards reviewed. Your progress is saved.</p>
        <div className="fc-result-stats">{RATINGS.map((r, i) => <div key={r}><strong>{session.ratings[r]}</strong><span>{quickRatings[i]}</span></div>)}</div>
        <p>{stats.due ? `${stats.due} reviews ready now.` : stats.nextDue ? `Next review in ${nextTime(stats.nextDue, now)}.` : "No scheduled reviews yet."}</p>
        <div className="fc-actions"><button type="button" className="fc-button" onClick={() => setSession(null)}>Back to deck</button><button type="button" className="fc-button fc-primary" onClick={() => start(deck)} disabled={!readyCount(stats)}>Continue <ArrowRight size={17} /></button></div>
      </div>}
    </section>}

    {dialog && <div className="fc-modal-backdrop" onClick={closeDialog} data-dialog-backdrop>
      <DialogSurface className="fc-modal" onDismiss={closeDialog} initialFocus="input, textarea" aria-labelledby="fc-dialog-title" onClick={event => event.stopPropagation()}>
        <div className="fc-modal-header"><h2 id="fc-dialog-title">{dialogTitle}</h2><button type="button" className="fc-icon-button" aria-label="Close dialog" disabled={busy} onClick={closeDialog}><X size={21} /></button></div>
        <form onSubmit={saveDialog}>
          {(dialog.type === "deck" || dialog.type === "rename") && <>
            <label>Deck name<input required maxLength={80} placeholder="e.g. Japanese N5" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            {dialog.type === "deck" && <label className="fc-checkbox"><input type="checkbox" checked={form.japanese} onChange={e => setForm({ ...form, japanese: e.target.checked })} /> Japanese deck (enable pronunciation)</label>}
          </>}
          {dialog.type === "card" && <>
            <label>Front <textarea aria-label="Front" required rows={2} maxLength={240} placeholder="Word, character or question" value={form.front} onChange={e => setForm({ ...form, front: e.target.value })} /></label>
            <label>Answer <textarea aria-label="Answer" required rows={2} maxLength={400} placeholder="Meaning or answer" value={form.back} onChange={e => setForm({ ...form, back: e.target.value })} /></label>
            <label>Reading (optional)<input aria-label="Reading (optional)" maxLength={120} value={form.reading} placeholder="e.g. にほんご" onChange={e => setForm({ ...form, reading: e.target.value })} /></label>
            <label>Example (optional)<textarea aria-label="Example (optional)" rows={2} maxLength={400} value={form.example} placeholder="Example sentence or extra context" onChange={e => setForm({ ...form, example: e.target.value })} /></label>
          </>}
          {dialog.type === "import" && <><p>Paste tab-separated text: front, answer, optional reading, optional example. One card per line (up to 100).</p><textarea aria-label="Tab-separated cards" rows={8} required maxLength={32000} value={form.text || ""} placeholder={"日本語\tJapanese language\tにほんご"} onChange={e => setForm({ text: e.target.value })} /></>}
          {dialog.type === "delete-deck" && <p>Permanently delete “{deck.name}”, including its {stats.total} cards and all review progress?</p>}
          {dialog.type === "delete-card" && <p>Permanently delete “{dialog.card.front}” and its review progress?</p>}
          {error && <div className="fc-notice fc-error" role="alert">{error}{stale && <button type="button" className="fc-button" onClick={refresh} disabled={busy}>Refresh deck</button>}</div>}
          <div className="fc-modal-actions"><button className="fc-button" type="button" onClick={closeDialog} disabled={busy}>Cancel</button><button type="submit" className={`fc-button ${dialog.type.startsWith("delete") ? "fc-danger" : "fc-primary"}`} disabled={busy || stale}>{busy ? "Saving…" : dialog.type.startsWith("delete") ? "Delete" : dialog.type === "import" ? "Import cards" : "Save"}</button></div>
        </form>
      </DialogSurface>
    </div>}
  </div>;
}

export default function Flashcards() {
  const { isGuest, firebaseUser } = useAuth();
  return <FlashcardsWorkspace guest={isGuest} key={isGuest ? "guest" : firebaseUser?.uid || "account"} />;
}
