import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Matching.css";
import { api } from "../lib/api";
import { AuthContext } from "../context/AuthContext";

const FALLBACK_DIFFICULTIES = ["Easy", "Medium", "Hard"];
const FALLBACK_TOPICS = ["Algorithms", "Arrays", "Data Structures", "Strings", "Graphs"];

export default function Matching() {
  const { user } = useContext(AuthContext);
  const [difficultyOptions, setDifficultyOptions] = useState(FALLBACK_DIFFICULTIES);
  const [topicOptions, setTopicOptions] = useState(FALLBACK_TOPICS);

  const [selectedDifficulty, setSelectedDifficulty] = useState(FALLBACK_DIFFICULTIES[1]);
  const [selectedTopics, setSelectedTopics] = useState(() => new Set([FALLBACK_TOPICS[0]]));
  const [relaxedDifficulties, setRelaxedDifficulties] = useState(() => new Set());

  const [mode, setMode] = useState("pair");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [optionsError, setOptionsError] = useState("");

  const pollTimeoutRef = useRef(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [criteriaLocked, setCriteriaLocked] = useState(false);

  const [ticket, setTicket] = useState(null);
  const [status, setStatus] = useState(null);

  const totalSelected = (selectedDifficulty ? 1 : 0) + selectedTopics.size;

  const navigate = useNavigate()
  const didNavigateRef = useRef(false)

  // Extract collaboration session details from a status payload (supports a few common keys)
  function getCollabInfo(payload) {
    if (!payload) return null;
    const sessionId = payload.sessionId || payload.collabSessionId || payload.roomId;
    const wsUrl = payload.wsUrl || payload.collabWsUrl || payload.wsURL;
    const wsAuthToken = payload.wsAuthToken || payload.collabToken || payload.token;
    const questionId = payload.questionId;
    if (sessionId && wsUrl && wsAuthToken) {
      const roomId = payload.roomId || payload.collabRoomId || sessionId;
      return { sessionId, wsUrl, wsAuthToken, roomId, questionId };
    }
    return null;
  }

  const applyStatus = useCallback(
    (nextStatus, { fromPoll = false } = {}) => {
      if (!nextStatus) return;
      setStatus(nextStatus);

      const state = nextStatus.status;
      const { event, accepted, partnerAccepted } = nextStatus;

      // Pause timer while awaiting handshake decisions
      setIsPaused(state === "PENDING_ACCEPT");

      let handled = false;

      if (event) {
        switch (event) {
          case "BOTH_ACCEPTED":
            setMsg("Both users have accepted the match!");
            setIsSearching(false);
            setIsPaused(false);
            setCriteriaLocked(false);
            setRelaxedDifficulties(new Set());
            handled = true;
            break;
          case "YOU_ACCEPTED":
            setMsg("You have accepted the match. Waiting for the other user.");
            setCriteriaLocked(true);
            handled = true;
            break;
          case "PARTNER_ACCEPTED":
            setMsg("The other user has accepted the match. Please accept to begin together.");
            setCriteriaLocked(true);
            handled = true;
            break;
          case "PARTNER_DECLINED":
            setMsg("Other user has declined the match.");
            setIsPaused(false);
            setElapsedSeconds(0);
            setIsSearching(true);
            setCriteriaLocked(true);
            handled = true;
            break;
          case "YOU_DECLINED":
            setMsg("You have declined the match.");
            setIsSearching(false);
            setIsPaused(false);
            setCriteriaLocked(false);
            setRelaxedDifficulties(new Set());
            handled = true;
            break;
          case "PARTNER_TIMEOUT":
            setMsg("Other user did not respond in time. Searching again...");
            setIsPaused(false);
            setElapsedSeconds(0);
            setIsSearching(true);
            setCriteriaLocked(true);
            handled = true;
            break;
          case "PAIR_TIMEOUT":
            setMsg("Match timed out. Searching again...");
            setIsPaused(false);
            setElapsedSeconds(0);
            setIsSearching(true);
            setCriteriaLocked(true);
            handled = true;
            break;
          case "YOU_TIMEOUT":
            setMsg("You did not respond in time. Please start matching again.");
            setIsSearching(false);
            setIsPaused(false);
            setCriteriaLocked(false);
            setRelaxedDifficulties(new Set());
            handled = true;
            break;
          case "REQUEST_TIMEOUT":
            setMsg("Your request expired. Please start matching again.");
            setIsSearching(false);
            setIsPaused(false);
            setCriteriaLocked(false);
            setRelaxedDifficulties(new Set());
            handled = true;
            break;
          default:
            break;
        }
      }

      if (state === "SESSION_READY") {
        setMsg("Both users have accepted the match!");
        setIsSearching(false);
        setIsPaused(false);
        setCriteriaLocked(false);
        setRelaxedDifficulties(new Set());

        if (!didNavigateRef.current) {
          const info = getCollabInfo(nextStatus);
          if (info) {
            didNavigateRef.current = true;
            navigate(`/collab/${info.sessionId}`, {
              state: {
                wsUrl: info.wsUrl,
                wsAuthToken: info.wsAuthToken,
                roomId: info.roomId,
                questionId: info.questionId,
              },
              replace: true,
            });
          }
        }
        handled = true;
      } else if (state === "PENDING_ACCEPT" && !handled) {
        if (accepted && partnerAccepted) {
          setMsg("Both users have accepted the match!");
          setIsSearching(false);
          setIsPaused(false);
          setCriteriaLocked(false);
        } else if (accepted) {
          setMsg("You have accepted the match. Waiting for the other user.");
          setCriteriaLocked(true);
        } else if (partnerAccepted) {
          setMsg("The other user has accepted the match. Please accept to continue.");
          setCriteriaLocked(true);
        } else {
          setMsg("Match found! Please accept or decline.");
          setCriteriaLocked(true);
        }
        handled = true;
      }

      if (!handled) {
      switch (state) {
        case "QUEUED":
          setMsg("⌛ Still searching… hang tight!");
          setCriteriaLocked(true);
          break;
        case "EXPIRED":
          setMsg("Your request expired. Please start matching again.");
          setIsSearching(false);
          setIsPaused(false);
          setCriteriaLocked(false);
          setRelaxedDifficulties(new Set());
          break;
        case "NONE":
          if (!fromPoll) setMsg("");
          setIsSearching(false);
          setIsPaused(false);
          setCriteriaLocked(false);
          setRelaxedDifficulties(new Set());
          break;
          default:
            if (state && !handled) {
              setMsg(`ℹ️ Current status: ${state}`);
            }
            break;
        }
      }
    },
    []
  );

  const preferences = useMemo(
    () => ({
      difficulty: selectedDifficulty || undefined,
      topics: Array.from(selectedTopics),
      mode,
    }),
    [selectedDifficulty, selectedTopics, mode]
  );


  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      setOptionsLoading(true);
      setOptionsError("");
      try {
        const stats = await api.get("questions", "/api/questions/statistics");
        const byDiff = stats?.data?.byDifficulty ?? [];
        const byCat = stats?.data?.byCategory ?? [];

        const diffs = byDiff.map((item) => String(item._id)).filter(Boolean);
        const topics = byCat.map((item) => String(item._id)).filter(Boolean);

        const nextDiffs = diffs.length ? diffs : FALLBACK_DIFFICULTIES;
        const nextTopics = topics.length ? topics : FALLBACK_TOPICS;

        if (!cancelled) {
          setDifficultyOptions(nextDiffs);
          setTopicOptions(nextTopics);
          setSelectedDifficulty((prev) => (prev && nextDiffs.includes(prev) ? prev : nextDiffs[1] ?? nextDiffs[0]));
          setSelectedTopics((prev) => {
            const filtered = new Set([...prev].filter((topic) => nextTopics.includes(topic)));
            if (filtered.size === 0) filtered.add(nextTopics[0]);
            return filtered;
          });
          if (!diffs.length || !topics.length) {
            setOptionsError("Question Service returned limited data. Using fallback lists.");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setDifficultyOptions(FALLBACK_DIFFICULTIES);
          setTopicOptions(FALLBACK_TOPICS);
          setSelectedDifficulty(FALLBACK_DIFFICULTIES[1]);
          setSelectedTopics(new Set([FALLBACK_TOPICS[0]]));
          setOptionsError("Unable to reach Question Service. Using default lists.");
        }
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSearching || isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (!isSearching) {
        setElapsedSeconds(0);
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isSearching, isPaused]);

  const shouldPoll = Boolean(ticket && (isSearching || status?.status === "PENDING_ACCEPT"));

  useEffect(() => {
    if (!shouldPoll) {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const result = await api.get("match", "/match/status", { token: ticket });
        if (cancelled) return;
        if (result?.status === "PENDING_ACCEPT") {
          setMsg("Match found! Please accept or decline.");
        }

        applyStatus(result, { fromPoll: true });

        let delay = 3000;
        if (result?.status === "PENDING_ACCEPT") delay = 1000;
        else if (result?.status === "QUEUED") delay = 2000;

        pollTimeoutRef.current = setTimeout(poll, delay);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not retrieve status.");
          pollTimeoutRef.current = setTimeout(poll, 4000);
        }
      }
    };

    pollTimeoutRef.current = setTimeout(poll, 0);

    return () => {
      cancelled = true;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [shouldPoll, ticket, applyStatus]);

  const formattedElapsed = useMemo(() => {
    const minutes = Math.floor(elapsedSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (elapsedSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [elapsedSeconds]);

  // Handle when a difficulty is clicked
  function handleDifficultyClick(diff) {
    setSelectedDifficulty((prev) => {
      // Prevent selecting more than one difficulty
      if (prev === diff) {
        return null;  // Deselect if already selected
      }
      return diff;  // Select the clicked difficulty
    });
  }

  // Handle when a topic is clicked
  function handleTopicClick(topic) {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);  // Remove if already selected
      } else if (next.size < 3) {
        next.add(topic);  // Add topic if less than 3
      }
      return next;
    });
  }

  function getLoginToken() {
    if (!user) throw new Error("Missing login token. Please sign in again.");
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Missing login token. Please sign in again.");
    return token;
  }

  async function requestMatch(matchToken) {
    const res = await api.post("match", "/match/requests", {
      token: matchToken,
      json: { difficulty: preferences.difficulty, topics: preferences.topics },
    });
    if (res?.error) {
      throw new Error(res.error);
    }
  }

  async function onStart(e) {
    e.preventDefault();
    if (totalSelected === 0) {
      setError("Select at least one difficulty or topic (up to 3 total).");
      return;
    }
    setError("");
    setStatus(null);
    setTicket(null);

    try {
      setIsLoading(true);
      setIsSearching(true);
      setIsPaused(false);
      setElapsedSeconds(0);
      setRelaxedDifficulties(new Set());

      const difficultyLabel =
        selectedDifficulty || selectedTopics.size === 0 ? selectedDifficulty ?? "any difficulty" : selectedDifficulty;
      const topicLabel =
        selectedTopics.size === topicOptions.length
          ? "any topic"
          : selectedTopics.size
          ? Array.from(selectedTopics).join(", ")
          : "any topic";

      setMsg(
        `Searching for ${mode === "pair" ? "a partner" : "a session"} in ${topicLabel} (${
          difficultyLabel || "any difficulty"
        })…`
      );

      const matchToken = getLoginToken();
      setCriteriaLocked(true);
      await requestMatch(matchToken);
      setTicket(matchToken);
      setMsg("🎯 Request submitted. We’ll notify you once another learner accepts.");
    } catch (err) {
      setTicket(null);
      setStatus(null);
      setMsg("");
      setIsSearching(false);
      setCriteriaLocked(false);
      setError(err.message || "Failed to start matching. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCancel() {
    if (!ticket) {
      setError("No active matching request to cancel.");
      return;
    }
    setError("");
    try {
      await api.post("match", "/match/cancel", { token: ticket });
      setMsg("🛑 Matching cancelled.");
      setStatus(null);
      setTicket(null);
      setIsSearching(false);
      setIsPaused(false);
      setElapsedSeconds(0);
      setCriteriaLocked(false);
      setRelaxedDifficulties(new Set());
    } catch (err) {
      setError(err.message || "Failed to cancel request.");
    }
  }

  // Handle accepting the match
  async function handleAccept() {
    if (!ticket || !status?.pairId) {
      setError("No active pair to accept.");
      return;
    }
    setError("");
    try {
      const result = await api.post("match", "/match/accept", {
        token: ticket,
        json: { pairId: status.pairId },
      });
      if (result?.error) throw new Error(result.error);
      setMsg("✅ You have accepted the match! Waiting for the other user.");
      setStatus((prev) => (prev ? { ...prev, accepted: true } : { status: "PENDING_ACCEPT", accepted: true }));
      setIsPaused(true);
    } catch (err) {
      setError(err.message || "Failed to accept match.");
    }
  }

  // Handle declining the match
  async function handleDecline() {
    if (!ticket || !status?.pairId) {
      setError("No active pair to decline.");
      return;
    }
    setError("");
    try {
      const result = await api.post("match", "/match/decline", {
        token: ticket,
        json: { pairId: status.pairId },
      });
      if (result?.error) throw new Error(result.error);
      setMsg("🚫 You have declined the match.");
      setStatus(null);
      setTicket(null);
      setIsSearching(false);
      setIsPaused(false);
      setCriteriaLocked(false);
      setRelaxedDifficulties(new Set());
    } catch (err) {
      setError(err.message || "Failed to decline match.");
    }
  }

  async function handleRetry(mode = "same") {
    if (!ticket) {
      setError("Start a matching request first.");
      return;
    }
    setError("");
    try {
      const result = await api.post("match", "/match/retry", {
        token: ticket,
        json: { mode },
      });
      if (result?.error) {
        setError(result.error);
        return;
      }

      if (mode === "broaden") {
        const relaxed = result?.applied?.difficulty;
        if (relaxed) {
          setRelaxedDifficulties((prev) => {
            const next = new Set(prev);
            next.add(relaxed);
            return next;
          });
          setMsg(`🔁 Relaxed difficulty to include ${relaxed}. Searching again with broader matches.`);
        } else {
          setMsg("🔁 Relaxed criteria. Searching again with broader matches.");
        }
      } else {
        setMsg("🔁 Requeued with the same criteria.");
      }

      setIsSearching(true);
      setIsPaused(false);
      setElapsedSeconds(0);
      setCriteriaLocked(true);
    } catch (err) {
      setError(err.message || "Failed to retry search.");
    }
  }

  function resetForm() {
    setMsg("");
    setError("");
    setStatus(null);
    setTicket(null);
    setIsSearching(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    setCriteriaLocked(false);
    setRelaxedDifficulties(new Set());
    setMode("pair");
    setSelectedDifficulty(difficultyOptions[1] ?? difficultyOptions[0] ?? null);
    setSelectedTopics(new Set(topicOptions[0] ? [topicOptions[0]] : []));
  }

  const reachedLimit = totalSelected >= 3;
  const canRetry = Boolean(ticket && (!status || ["QUEUED", "EXPIRED"].includes(status?.status ?? 'NONE')));
  const showRetry = isSearching && elapsedSeconds >= 30;
  const relaxNeighbors = useMemo(() => {
    if (!selectedDifficulty) return [];
    const idx = difficultyOptions.indexOf(selectedDifficulty);
    if (idx === -1) return [];
    const neighbors = [];
    if (idx - 1 >= 0) neighbors.push(difficultyOptions[idx - 1]);
    if (idx + 1 < difficultyOptions.length) neighbors.push(difficultyOptions[idx + 1]);
    return neighbors;
  }, [selectedDifficulty, difficultyOptions]);
  const nextRelaxOption = relaxNeighbors.find(diff => !relaxedDifficulties.has(diff));
  const canShowRelax = showRetry && canRetry && Boolean(nextRelaxOption);
  const relaxButtonLabel = nextRelaxOption
    ? `Relax Difficulties (${nextRelaxOption})`
    : 'Relax Difficulties';

  return (
    <div className="matching">
      <h1 className="h1">Start Matching</h1>
      <p className="p-muted">Choose your preferences and begin pairing.</p>

      <div className="card match-card">
        <form className="list" onSubmit={onStart}>
          <div>
            <label className="label">Search Time</label>
            <div className="timer-display">
              <span>{formattedElapsed}</span>
              {isSearching && <span className="p-muted" style={{ marginLeft: 8 }}>Searching…</span>}
            </div>
          </div>

          <div>
            <label className="label">Mode</label>
            <div className="segmented">
              <button
                type="button"
                className={mode === "pair" ? "is-active" : ""}
                onClick={() => setMode("pair")}
                disabled={isLoading || isSearching || criteriaLocked}
              >
                Pair Match
              </button>
              <button
                type="button"
                className={mode === "solo" ? "is-active" : ""}
                onClick={() => setMode("solo")}
                disabled={isLoading || isSearching || criteriaLocked}
              >
                Solo Practice
              </button>
            </div>
          </div>

          <div>
            <label className="label">Difficulties</label>
            <div className="pill-grid">
              {difficultyOptions.map((diff) => {
                const isLocked = criteriaLocked;
                const isUserSelected = selectedDifficulty === diff;  // Check if this difficulty is selected
                const disabled =
                  isLocked ||
                  selectedTopics.size === 3 ||
                  (isUserSelected && totalSelected === 1);  // Disable if 3 topics or if one difficulty is selected

                return (
                  <button
                    key={diff}
                    type="button"
                    className={[
                      "pill-option",
                      isUserSelected ? "is-selected" : "",
                      disabled ? "is-disabled" : "",
                    ].join(" ")}
                    disabled={disabled}  // Disable if the condition is met
                    onClick={() => handleDifficultyClick(diff)}
                  >
                    {diff}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="label">Topics</label>
            <div className="pill-grid two-rows">
              {topicOptions.map((topic) => {
                const checked = selectedTopics.has(topic);
                const isLocked = criteriaLocked;
                const disabled = isLocked || (!checked && reachedLimit);
                return (
                  <button
                    key={topic}
                    type="button"
                    className={["pill-option", checked ? "is-selected" : "", disabled ? "is-disabled" : ""].join(" ")}
                    disabled={isLoading || optionsLoading || disabled}
                    onClick={() => handleTopicClick(topic)}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          </div>

          {optionsError && (
            <div className="msg-box" style={{ color: "var(--warning, #a16207)" }}>
              {optionsError}
            </div>
          )}
          {error && (
            <div className="msg-box" style={{ color: "var(--danger, #d14343)" }}>
              {error}
            </div>
          )}
          {msg && <div className="p-muted msg-box">{msg}</div>}
          {(status?.collabToken || status?.sessionId) && (
            <div className="msg-box">
              <strong>Collaboration Token:</strong>
              <code style={{ display: "block", marginTop: 4, wordBreak: "break-all" }}>
                {status.collabToken ?? status.sessionId}
              </code>
            </div>
          )}
          {status?.status === "PENDING_ACCEPT" && (
            <div className="row btn-row">
              <button
                className="btn btn--dark"
                type="button"
                onClick={handleAccept}
                disabled={Boolean(status?.accepted)}
              >
                ✅ Accept
              </button>
              <button className="btn btn--danger" type="button" onClick={handleDecline}>
                🚫 Decline
              </button>
            </div>
          )}

          <div className="row btn-row">
            <button
              className="btn btn--dark btn--xl"
              type="submit"
              disabled={isLoading || optionsLoading || isSearching || totalSelected === 0}
            >
              ⚡ Start Matching
            </button>
            <button className="btn" type="button" onClick={handleCancel} disabled={!ticket}>
              Cancel
            </button>
            {showRetry && (
              <>
                <button className="btn" type="button" onClick={() => handleRetry("same")} disabled={!canRetry}>
                  Retry
                </button>
                {canShowRelax && (
                  <button className="btn" type="button" onClick={() => handleRetry("broaden")} disabled={!canShowRelax}>
                    {relaxButtonLabel}
                  </button>
                )}
              </>
            )}
            <button className="btn" type="button" onClick={resetForm}>
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
