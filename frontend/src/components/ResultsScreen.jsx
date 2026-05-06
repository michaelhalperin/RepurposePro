import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Bookmark } from "lucide-react";

function CopyButton({ text, small, label }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (small) {
    return (
      <button
        className={`copy-btn-sm ${copied ? "copied" : ""}`}
        onClick={handleCopy}
        title="Copy"
      >
        {copied ? "✓" : "Copy"}
      </button>
    );
  }

  return (
    <button
      className={`copy-btn ${copied ? "copied" : ""}`}
      onClick={handleCopy}
    >
      {copied ? "Copied!" : (label ?? "Copy")}
    </button>
  );
}

function SaveButton({ saved, onSave, onUnsave, loading }) {
  return (
    <button
      className={`save-btn ${saved ? "save-btn--saved" : ""}`}
      onClick={saved ? onUnsave : onSave}
      disabled={loading}
      title={saved ? "Remove from saved" : "Save"}
    >
      <Bookmark
        size={15}
        strokeWidth={1.75}
        fill={saved ? "currentColor" : "none"}
      />
    </button>
  );
}

function EditableField({ value, onChange, className }) {
  const ref = useRef();

  useLayoutEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = ref.current.scrollHeight + "px";
  });

  return (
    <textarea
      ref={ref}
      className={`editable-field ${className ?? ""}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={1}
      spellCheck
    />
  );
}

function TikTokCard({ data, index, saved, onSave, onUnsave, saving, onEdit }) {
  const scriptText = `${data.hook}\n\n${data.script}\n\n${data.hashtags.map((h) => `#${h}`).join(" ")}`;

  return (
    <article className="card tiktok-card">
      <div className="card-header">
        <div className="card-badge card-badge--tiktok">
          TikTok · Idea {index + 1}
        </div>
        <div className="card-actions">
          <SaveButton
            saved={saved}
            onSave={onSave}
            onUnsave={onUnsave}
            loading={saving}
          />
          <CopyButton text={scriptText} />
        </div>
      </div>
      <div className="tiktok-body">
        <div className="content-field">
          <div className="content-field-row">
            <span className="content-field-label">Hook</span>
            <CopyButton text={data.hook} small />
          </div>
          <EditableField
            value={data.hook}
            onChange={(v) => onEdit("hook", v)}
            className="content-field-text content-field-text--hook"
          />
        </div>
        <div className="content-field">
          <div className="content-field-row">
            <span className="content-field-label">Script</span>
            <CopyButton text={data.script} small />
          </div>
          <EditableField
            value={data.script}
            onChange={(v) => onEdit("script", v)}
            className="content-field-text content-field-text--script"
          />
        </div>
        <div className="content-field content-field--flush">
          <span className="content-field-label">Hashtags</span>
          <div className="card-hashtags">
            {data.hashtags.map((h) => (
              <span key={h} className="hashtag">
                #{h}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function ThreadBlock({ tweets, saved, onSave, onUnsave, saving, onEditTweet }) {
  const fullThread = tweets.join("\n\n---\n\n");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

  function copySingleTweet(tweet, index) {
    navigator.clipboard.writeText(tweet).then(
      () => {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      },
      () => {},
    );
  }

  function onTweetKeyDown(e, tweet, index) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      copySingleTweet(tweet, index);
    }
  }

  return (
    <article className="card thread-card">
      <div className="card-header">
        <div className="card-badge card-badge--x">X (Twitter) thread</div>
        <div className="card-actions">
          <SaveButton
            saved={saved}
            onSave={onSave}
            onUnsave={onUnsave}
            loading={saving}
          />
          <CopyButton text={fullThread} />
        </div>
      </div>
      <p className="thread-meta">
        {tweets.length} posts · click to copy · Edit to modify
      </p>
      <ol className="thread-tweets" aria-label="Thread posts">
        {tweets.map((tweet, i) => (
          <li key={i}>
            {editingIndex === i ? (
              <div className="tweet tweet--editing">
                <span className="tweet-num" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="tweet-edit-wrap">
                  <textarea
                    className="tweet-edit-textarea"
                    value={tweet}
                    onChange={(e) => onEditTweet(i, e.target.value)}
                    autoFocus
                    rows={3}
                  />
                  <div className="tweet-footer">
                    <span
                      className={`tweet-char-count ${tweet.length > 280 ? "tweet-char-count--over" : ""}`}
                    >
                      {tweet.length}/280
                    </span>
                    <button
                      className="tweet-done-btn"
                      onClick={() => setEditingIndex(null)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                className={`tweet tweet--interactive ${copiedIndex === i ? "tweet--copied" : ""}`}
                onClick={() => copySingleTweet(tweet, i)}
                onKeyDown={(e) => onTweetKeyDown(e, tweet, i)}
                aria-label={
                  copiedIndex === i
                    ? `Post ${i + 1} copied to clipboard`
                    : `Copy post ${i + 1} to clipboard`
                }
              >
                <span className="tweet-num" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="tweet-view-wrap">
                  <p className="tweet-text">{tweet}</p>
                  <div className="tweet-footer">
                    <span
                      className={`tweet-char-count ${tweet.length > 280 ? "tweet-char-count--over" : ""}`}
                    >
                      {tweet.length}/280
                    </span>
                    <button
                      className="tweet-edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingIndex(i);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
    </article>
  );
}

function LinkedInBlock({ post, saved, onSave, onUnsave, saving, onEdit }) {
  return (
    <article className="card linkedin-card">
      <div className="card-header">
        <div className="card-badge card-badge--linkedin">LinkedIn post</div>
        <div className="card-actions">
          <SaveButton
            saved={saved}
            onSave={onSave}
            onUnsave={onUnsave}
            loading={saving}
          />
          <CopyButton text={post} />
        </div>
      </div>
      <div className="linkedin-body">
        <EditableField
          value={post}
          onChange={onEdit}
          className="linkedin-text"
        />
      </div>
    </article>
  );
}

export default function ResultsScreen({
  output,
  onOutputChange,
  onPersistOutput,
  onDelete,
  deleting,
  savedItems,
  onSaveItem,
  onUnsaveItem,
}) {
  const containerRef = useRef();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savingKey, setSavingKey] = useState(null);
  const [draftOutput, setDraftOutput] = useState(output);
  const [saveMessage, setSaveMessage] = useState(null);
  const [isSavingChanges, setIsSavingChanges] = useState(false);

  useEffect(() => {
    setDraftOutput(output);
    setSaveMessage(null);
  }, [output]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".results-hero", {
        opacity: 0,
        y: -12,
        duration: 0.4,
        ease: "power2.out",
      });
      gsap.from(".results-section", {
        opacity: 0,
        y: 24,
        duration: 0.45,
        stagger: 0.1,
        delay: 0.12,
        ease: "power3.out",
      });
    }, containerRef);
    return () => ctx.revert();
  }, [output]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(draftOutput) !== JSON.stringify(output),
    [draftOutput, output],
  );

  const savedMap = useMemo(() => {
    if (!savedItems) return {};
    const map = {};
    savedItems.forEach((item) => {
      if (item.item_type === "tiktok") {
        draftOutput.tiktoks?.forEach((t, i) => {
          if (JSON.stringify(t) === JSON.stringify(item.item_data)) {
            map[`tiktok-${i}`] = item.id;
          }
        });
      } else if (item.item_type === "thread") {
        if (
          JSON.stringify({ tweets: draftOutput.thread }) ===
          JSON.stringify(item.item_data)
        ) {
          map["thread"] = item.id;
        }
      } else if (item.item_type === "linkedin") {
        if (
          JSON.stringify({ post: draftOutput.linkedin }) ===
          JSON.stringify(item.item_data)
        ) {
          map["linkedin"] = item.id;
        }
      }
    });
    return map;
  }, [savedItems, draftOutput]);

  async function handleSave(key, itemType, itemData) {
    setSavingKey(key);
    try {
      await onSaveItem(itemType, itemData);
    } finally {
      setSavingKey(null);
    }
  }

  async function handleUnsave(key) {
    const id = savedMap[key];
    if (!id) return;
    setSavingKey(key);
    try {
      await onUnsaveItem(id);
    } finally {
      setSavingKey(null);
    }
  }

  function handleEditTikTok(index, field, value) {
    const newTiktoks = draftOutput.tiktoks.map((t, i) =>
      i === index ? { ...t, [field]: value } : t,
    );
    setDraftOutput((prev) => ({ ...prev, tiktoks: newTiktoks }));
    setSaveMessage(null);
  }

  function handleEditTweet(index, value) {
    const newThread = draftOutput.thread.map((t, i) =>
      i === index ? value : t,
    );
    setDraftOutput((prev) => ({ ...prev, thread: newThread }));
    setSaveMessage(null);
  }

  function handleEditLinkedIn(value) {
    setDraftOutput((prev) => ({ ...prev, linkedin: value }));
    setSaveMessage(null);
  }

  async function handleSaveChanges() {
    setIsSavingChanges(true);
    try {
      await onPersistOutput(draftOutput);
      onOutputChange(draftOutput);
      setSaveMessage("Changes saved.");
    } catch (err) {
      setSaveMessage(err.message || "Could not save changes.");
    } finally {
      setIsSavingChanges(false);
    }
  }

  function handleDiscardChanges() {
    setDraftOutput(output);
    setSaveMessage("Edits discarded.");
  }

  const nTiktok = draftOutput.tiktoks?.length ?? 0;
  const nThread = draftOutput.thread?.length ?? 0;

  const allTikTokText = draftOutput.tiktoks
    .map(
      (t, i) =>
        `Script ${i + 1}\n\nHook: ${t.hook}\n\nScript: ${t.script}\n\nHashtags: ${t.hashtags.map((h) => `#${h}`).join(" ")}`,
    )
    .join("\n\n---\n\n");

  return (
    <div className="results-screen" ref={containerRef}>
      <div className="results-inner">
        <header className="results-hero">
          <div className="results-hero-text">
            <p className="results-eyebrow">Repurpose pack</p>
            <h1 className="results-title">Your content is ready</h1>
            <p className="results-sub">
              {nTiktok} TikTok {nTiktok === 1 ? "script" : "scripts"} ·{" "}
              {nThread} thread {nThread === 1 ? "post" : "posts"} · 1 LinkedIn
              draft
            </p>
          </div>
          <div className="results-hero-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveChanges}
              disabled={!hasUnsavedChanges || isSavingChanges}
            >
              {isSavingChanges ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleDiscardChanges}
              disabled={!hasUnsavedChanges}
            >
              Discard
            </button>
            {confirmDelete ? (
              <div className="confirm-inline">
                <span className="confirm-text confirm-danger">
                  Delete this result?
                </span>
                <button
                  className="confirm-yes danger"
                  onClick={onDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  className="confirm-cancel"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </button>
            )}
          </div>
        </header>
        {saveMessage && <p className="section-hint">{saveMessage}</p>}

        <section
          className="results-section results-section--tiktok"
          aria-labelledby="results-tiktok-heading"
        >
          <div className="results-section-head">
            <div>
              <h2 id="results-tiktok-heading" className="section-heading">
                TikTok
              </h2>
              <p className="section-hint">
                Short-form hooks and scripts · click any field to edit
              </p>
            </div>
            <CopyButton text={allTikTokText} label="Copy all" />
          </div>
          <div className="cards-grid">
            {draftOutput.tiktoks.map((t, i) => {
              const key = `tiktok-${i}`;
              return (
                <TikTokCard
                  key={i}
                  data={t}
                  index={i}
                  saved={!!savedMap[key]}
                  onSave={() => handleSave(key, "tiktok", t)}
                  onUnsave={() => handleUnsave(key)}
                  saving={savingKey === key}
                  onEdit={(field, value) => handleEditTikTok(i, field, value)}
                />
              );
            })}
          </div>
        </section>

        <div className="results-two-col">
          <section
            className="results-section results-section--thread"
            aria-labelledby="results-thread-heading"
          >
            <div className="results-section-head">
              <div>
                <h2 id="results-thread-heading" className="section-heading">
                  X thread
                </h2>
                <p className="section-hint">Ordered for posting</p>
              </div>
            </div>
            <ThreadBlock
              tweets={draftOutput.thread}
              saved={!!savedMap["thread"]}
              onSave={() =>
                handleSave("thread", "thread", { tweets: draftOutput.thread })
              }
              onUnsave={() => handleUnsave("thread")}
              saving={savingKey === "thread"}
              onEditTweet={handleEditTweet}
            />
          </section>

          <section
            className="results-section results-section--linkedin"
            aria-labelledby="results-li-heading"
          >
            <div className="results-section-head">
              <div>
                <h2 id="results-li-heading" className="section-heading">
                  LinkedIn
                </h2>
                <p className="section-hint">Long-form post · click to edit</p>
              </div>
            </div>
            <LinkedInBlock
              post={draftOutput.linkedin}
              saved={!!savedMap["linkedin"]}
              onSave={() =>
                handleSave("linkedin", "linkedin", {
                  post: draftOutput.linkedin,
                })
              }
              onUnsave={() => handleUnsave("linkedin")}
              saving={savingKey === "linkedin"}
              onEdit={handleEditLinkedIn}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
