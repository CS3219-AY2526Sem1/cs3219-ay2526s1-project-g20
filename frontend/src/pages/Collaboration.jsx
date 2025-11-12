import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { initVimMode } from "monaco-vim";
import { endpoints } from "../lib/api";
import "../css/CodeEditor.css";
import PeerLeftModal from "../components/PeerLeftModal.jsx";
import LanguageRecommendModal from "../components/LanguageRecommendModal.jsx";


/**
 * Collaboration.jsx — full-featured collab UI
 * - Monaco theme toggle, language select, Vim toggle, Run button & output
 * - Yjs incremental sync preserved; no local echo (event.transaction.local)
 * - Question can come via state.question OR state.questionId; else hidden
 */

export default function Collaboration() {
  const { sessionId } = useParams();
  const { state } = useLocation(); // { wsUrl, wsAuthToken, roomId, question, questionId }
  const navigate = useNavigate();

  // --- Connection & editor UI state ---
  const [status, setStatus] = useState("connecting…");
  const [language, setLanguage] = useState("python");
  const [theme, setTheme] = useState("custom-dark");
  const [vimMode, setVimMode] = useState(false);
  const [isReadonly, setIsReadonly] = useState(false);
  const [peerLeftOpen, setPeerLeftOpen] = useState(false);
  const [showLangReco, setShowLangReco] = useState(false);

  // Question & run/test state
  const [question, setQuestion] = useState(state?.question ?? null);
  const [loadingQuestion, setLoadingQuestion] = useState(!state?.question && !!state?.questionId);
  const [output, setOutput] = useState("");
  const [testResults, setTestResults] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [copiedBlockId, setCopiedBlockId] = useState(null);
  const [partnerNotice, setPartnerNotice] = useState(null);
  const partnerNoticeTimeoutRef = useRef(null);

  // Layout (resizable panels) — match practice page defaults
  const [questionWidth, setQuestionWidth] = useState(400);
  const [chatbotWidth, setChatbotWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(null);

  // --- Yjs doc + text ---
  const ydoc = useMemo(() => new Y.Doc(), []);
  const ytext = useMemo(() => ydoc.getText("code"), [ydoc]);

  // --- Refs ---
  const wsRef = useRef(null);
  const editorRef = useRef(null);
  const modelRef = useRef(null);
  const suppressLocalRef = useRef(false);
  const joinedRef = useRef(false);
  const vimRef = useRef(null);
  const suppressNetworkRef = useRef(false);
  const syncedRef = useRef(false);
  const recoShownRef = useRef(false);

  const langRecoKey = useMemo(
    () => `lang-reco-shown:${state?.roomId || sessionId || "unknown"}`,
    [state?.roomId, sessionId]
  );

  const myUserId = useMemo(() => {
    if (!state?.wsAuthToken) return null;
    try {
      const [, payload] = state.wsAuthToken.split(".");
      if (!payload) return null;
      const padding = "=".repeat((4 - (payload.length % 4)) % 4);
      const base64 = (payload + padding).replace(/-/g, "+").replace(/_/g, "/");
      const decoded = JSON.parse(atob(base64));
      return decoded.sub || decoded.userId || decoded.uid || decoded.id || null;
    } catch {
      return null;
    }
  }, [state?.wsAuthToken]);

  useEffect(() => {
    return () => {
      if (partnerNoticeTimeoutRef.current) {
        clearTimeout(partnerNoticeTimeoutRef.current);
      }
    };
  }, []);

  // base64 helpers
  const toB64 = (u8) => btoa(String.fromCharCode(...u8));
  const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  const formatInlineText = useCallback((text) => {
    if (!text) return null;

    const elements = [];
    const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_|`[^`]+`)/g;
    let lastIndex = 0;
    let match;
    let keyIndex = 0;

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        elements.push(text.slice(lastIndex, match.index));
      }

      const token = match[0];

      if (token.startsWith("**") || token.startsWith("__")) {
        elements.push(
          <strong key={`strong-${keyIndex++}`}>{token.slice(2, -2)}</strong>
        );
      } else if (token.startsWith("*") || token.startsWith("_")) {
        elements.push(
          <em key={`italic-${keyIndex++}`}>{token.slice(1, -1)}</em>
        );
      } else if (token.startsWith("`")) {
        elements.push(
          <code key={`code-${keyIndex++}`}>{token.slice(1, -1)}</code>
        );
      }

      lastIndex = match.index + token.length;
    }

    if (lastIndex < text.length) {
      elements.push(text.slice(lastIndex));
    }

    return elements;
  }, []);

  const parseMessageSegments = useCallback((content) => {
    if (!content) return [];

    const codeRegex = /```([a-zA-Z0-9]+)?\n([\s\S]*?)```/g;
    const segments = [];
    let lastIndex = 0;
    let match;

    while ((match = codeRegex.exec(content)) !== null) {
      const [fullMatch, language = "", codeContent = ""] = match;
      if (match.index > lastIndex) {
        segments.push({
          type: "text",
          content: content.slice(lastIndex, match.index),
        });
      }

      segments.push({
        type: "code",
        language: language.trim(),
        content: codeContent.replace(/\s+$/, ""),
      });

      lastIndex = match.index + fullMatch.length;
    }

    if (lastIndex < content.length) {
      segments.push({
        type: "text",
        content: content.slice(lastIndex),
      });
    }

    return segments;
  }, []);

  const renderTextSegment = useCallback(
    (text) => {
      if (!text) return null;

      const lines = text.split("\n");

      return lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={`gap-${idx}`} className="chat-text-gap" />;
        }

        const headingMatch = trimmed.match(/^(#{1,6})\s*(.*)$/);
        if (headingMatch) {
          const level = Math.min(headingMatch[1].length, 3);
          return (
            <div
              key={`heading-${idx}`}
              className={`chat-text-line chat-heading chat-heading-${level}`}
            >
              {formatInlineText(headingMatch[2])}
            </div>
          );
        }

        const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={`bullet-${idx}`} className="chat-text-line chat-text-bullet">
              <span className="chat-bullet-marker">•</span>
              <span>{formatInlineText(bulletMatch[1])}</span>
            </div>
          );
        }

        return (
          <div key={`line-${idx}`} className="chat-text-line">
            {formatInlineText(line)}
          </div>
        );
      });
    },
    [formatInlineText]
  );

  const handleCopyCode = useCallback(async (code, blockId) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = code;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedBlockId(blockId);
      setTimeout(() => setCopiedBlockId(null), 2000);
    } catch (error) {
      console.error("Failed to copy code block:", error);
    }
  }, []);

  const messageLabel = useCallback((msg) => {
    switch (msg.role) {
      case "assistant":
        return "Preppy";
      case "partner":
        return "Partner";
      case "partner-self":
        return "You → Partner";
      case "system":
        return "Notice";
      default:
        return "You";
    }
  }, []);

  // --- Fetch question if we only have an id ---
  useEffect(() => {
    const load = async () => {
      if (!state?.questionId || question) return;
      try {
        setLoadingQuestion(true);
        const resp = await fetch(`${endpoints.questions}/api/questions/${state.questionId}`);
        const result = await resp.json();
        if (result?.success) setQuestion(result.data);
      } catch (e) {
        console.error("Failed to fetch question:", e);
      } finally {
        setLoadingQuestion(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.questionId]);

  // --- WebSocket lifecycle ---
  useEffect(() => {
    if (!state?.wsUrl || !state?.wsAuthToken || !state?.roomId) {
      setStatus("missing session details");
      return;
    }
    const url = new URL(state.wsUrl);
    url.searchParams.set("token", state.wsAuthToken);
    const ws = new WebSocket(url.toString());
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      ws.send(JSON.stringify({ type: "JOIN_ROOM", roomId: state.roomId }));
      joinedRef.current = true;
      if (!recoShownRef.current && !sessionStorage.getItem(langRecoKey)) {
        recoShownRef.current = true;
        setShowLangReco(true);
      }
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (!msg?.type) return;
        if (msg.type === "YJS_UPDATE" && msg.payloadB64) {
          const update = fromB64(msg.payloadB64);
          suppressNetworkRef.current = true;
          Y.applyUpdate(ydoc, update);
          suppressNetworkRef.current = false;
        } else if (msg.type === "YJS_SYNC" && msg.payloadB64) {
          const snapshot = fromB64(msg.payloadB64);
          suppressNetworkRef.current = true;
          Y.applyUpdate(ydoc, snapshot);
          suppressNetworkRef.current = false;
          syncedRef.current = true;
          setStatus("synced");
          if (editorRef.current && modelRef.current) {
            const textNow = ytext.toString();
            if (modelRef.current.getValue() !== textNow) {
              suppressLocalRef.current = true;
              modelRef.current.setValue(textNow);
              suppressLocalRef.current = false;
            }
          }
        } else if (msg.type === "ERROR" && msg.message) {
          setStatus(`error: ${msg.message}`);
        } else if (msg.type === "LEFT") {
          if (!state?.roomId || msg.roomId === state.roomId) {
            setPeerLeftOpen(true);
          }
        } else if (msg.type === "PARTNER_CHAT") {
          const incoming = {
            role: msg.senderId === myUserId ? "partner-self" : "partner",
            content: msg.content,
            senderId: msg.senderId,
            sentAt: msg.sentAt,
            clientId: msg.clientId,
          };

          setChatMessages((prev) => {
            if (msg.senderId === myUserId && msg.clientId) {
              const existingIndex = prev.findIndex((entry) => entry.clientId === msg.clientId);
              if (existingIndex !== -1) {
                const next = [...prev];
                next[existingIndex] = { ...prev[existingIndex], ...incoming, delivered: true };
                return next;
              }
            }
            return [...prev, incoming];
          });

          if (msg.senderId !== myUserId) {
            setPartnerNotice({ content: msg.content, sentAt: msg.sentAt });
            if (partnerNoticeTimeoutRef.current) {
              clearTimeout(partnerNoticeTimeoutRef.current);
            }
            partnerNoticeTimeoutRef.current = setTimeout(() => setPartnerNotice(null), 8000);
          }
        }
      } catch {
        // ignore
      }
    };

    ws.onerror = () => setStatus("error");
    ws.onclose = () => setStatus("disconnected");

    return () => {
      try { ws.close(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.wsUrl, state?.wsAuthToken, state?.roomId]);

  // --- Outgoing incremental Yjs updates ---
  useEffect(() => {
    const onUpdate = (update) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      if (suppressNetworkRef.current) return;
      if (suppressLocalRef.current) return;
      const b64 = toB64(update);
      wsRef.current.send(JSON.stringify({ type: "YJS_UPDATE", payloadB64: b64 }));
    };
    ydoc.on("update", onUpdate);
    return () => ydoc.off("update", onUpdate);
  }, [ydoc]);

  const lastTextRef = useRef("");

  // --- Incoming Y.Text deltas -> Monaco edits (remote only) ---
  useEffect(() => {
    const onYTextEvent = (event) => {
      lastTextRef.current = ytext.toString();
      if (event?.transaction?.local) return; // prevent local echo
      if (!editorRef.current || !modelRef.current) return;
      const editor = editorRef.current;
      const model = modelRef.current;
      const delta = event.delta;
      if (!delta || !delta.length) return;

      let index = 0;
      const edits = [];
      delta.forEach((op) => {
        if (op.retain) {
          index += op.retain;
        } else if (op.insert) {
          const pos = model.getPositionAt(index);
          edits.push({
            range: new window.monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
            text: String(op.insert),
            forceMoveMarkers: true,
          });
          index += String(op.insert).length;
        } else if (op.delete) {
          const start = model.getPositionAt(index);
          const end = model.getPositionAt(index + op.delete);
          edits.push({
            range: new window.monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
            text: "",
            forceMoveMarkers: true,
          });
        }
      });

      if (edits.length > 0) {
        suppressLocalRef.current = true;
        editor.executeEdits("yjs-remote", edits);
        suppressLocalRef.current = false;
      }
    };

    ytext.observe(onYTextEvent);
    return () => ytext.unobserve(onYTextEvent);
  }, [ytext]);

  // --- Monaco mount -> wire Monaco<->Yjs, define themes, init Vim ---
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    modelRef.current = editor.getModel();

    // Word wrap like practice page
    editor.updateOptions({ wordWrap: "on" });

    // Define custom themes (same scheme names as practice page)
    monaco.editor.defineTheme("custom-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955", fontStyle: "italic" },
        { token: "keyword", foreground: "C586C0", fontStyle: "bold" },
        { token: "string", foreground: "CE9178" },
        { token: "number", foreground: "B5CEA8" },
      ],
      colors: {
        "editor.background": "#1e1e1e",
        "editor.foreground": "#d4d4d4",
        "editor.lineHighlightBackground": "#2d2d30",
        "editor.selectionBackground": "#264f78",
      },
    });

    monaco.editor.defineTheme("custom-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "008000", fontStyle: "italic" },
        { token: "keyword", foreground: "0000FF", fontStyle: "bold" },
        { token: "string", foreground: "A31515" },
        { token: "number", foreground: "098658" },
      ],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#000000",
        "editor.lineHighlightBackground": "#f0f0f0",
      },
    });

    monaco.editor.setTheme(theme);

    // Initialize Monaco with Yjs content
    const textFromY = ytext.toString();
    const mirror = lastTextRef.current || "";
    const initial = textFromY || mirror;

    if (initial && modelRef.current.getValue() !== initial) {
      suppressLocalRef.current = true;
      modelRef.current.setValue(initial);
      suppressLocalRef.current = false;
    }

    // Monaco -> Yjs (incremental)
    editor.onDidChangeModelContent((e) => {
      if (suppressLocalRef.current) return;
      const changes = [...e.changes].sort((a, b) => a.rangeOffset - b.rangeOffset);
      Y.transact(ydoc, () => {
        let shift = 0;
        for (const c of changes) {
          const offset = c.rangeOffset + shift;
          const delLen = c.rangeLength;
          const insText = c.text || "";
          if (delLen > 0) {
            ytext.delete(offset, delLen);
            shift -= delLen;
          }
          if (insText.length > 0) {
            ytext.insert(offset, insText);
            shift += insText.length;
          }
        }
      }, "monaco-local");
    });

    // Vim mode (matches practice page behavior)
    const maybeMountVim = () => {
      const statusBar = document.querySelector(".vim-status-bar");
      if (!vimMode) {
        if (vimRef.current) {
          vimRef.current.dispose();
          vimRef.current = null;
        }
        if (statusBar) statusBar.remove();
        return;
      }
      if (!statusBar) {
        const codePanel = document.querySelector(".code-area");
        const statusNode = document.createElement("div");
        statusNode.className = "vim-status-bar";
        statusNode.textContent = "-- NORMAL --";
        if (theme.includes("dark")) {
          statusNode.style.background = "#1e1e1e";
          statusNode.style.color = "#d4d4d4";
          statusNode.style.borderTop = "1px solid #3c3c3c";
          statusNode.style.borderLeft = "1px solid #3c3c3c";
        } else {
          statusNode.style.background = "#ffffff";
          statusNode.style.color = "#000000";
          statusNode.style.borderTop = "1px solid #e5e7eb";
          statusNode.style.borderLeft = "1px solid #e5e7eb";
        }
        if (codePanel) codePanel.appendChild(statusNode);
        vimRef.current = initVimMode(editor, statusNode);
      }
    };
    maybeMountVim();
  };

  // Theme switch (applies to Monaco + Vim status bar)
  useEffect(() => {
    if (window.monaco) window.monaco.editor.setTheme(theme);
    const statusBar = document.querySelector(".vim-status-bar");
    if (statusBar) {
      if (theme.includes("dark")) {
        statusBar.style.background = "#1e1e1e";
        statusBar.style.color = "#d4d4d4";
        statusBar.style.borderTop = "1px solid #3c3c3c";
        statusBar.style.borderLeft = "1px solid #3c3c3c";
      } else {
        statusBar.style.background = "#ffffff";
        statusBar.style.color = "#000000";
        statusBar.style.borderTop = "1px solid #e5e7eb";
        statusBar.style.borderLeft = "1px solid #e5e7eb";
      }
    }
  }, [theme]);

  // Mount/unmount Vim when toggled
  useEffect(() => {
    if (!editorRef.current) return;
    // re-run mount logic
    const statusBar = document.querySelector(".vim-status-bar");
    if (!vimMode) {
      if (vimRef.current) {
        vimRef.current.dispose();
        vimRef.current = null;
      }
      if (statusBar) statusBar.remove();
    } else {
      if (!statusBar) {
        const codePanel = document.querySelector(".code-area");
        const statusNode = document.createElement("div");
        statusNode.className = "vim-status-bar";
        statusNode.textContent = "-- NORMAL --";
        if (theme.includes("dark")) {
          statusNode.style.background = "#1e1e1e";
          statusNode.style.color = "#d4d4d4";
          statusNode.style.borderTop = "1px solid #3c3c3c";
          statusNode.style.borderLeft = "1px solid #3c3c3c";
        } else {
          statusNode.style.background = "#ffffff";
          statusNode.style.color = "#000000";
          statusNode.style.borderTop = "1px solid #e5e7eb";
          statusNode.style.borderLeft = "1px solid #e5e7eb";
        }
        if (codePanel) codePanel.appendChild(statusNode);
        vimRef.current = initVimMode(editorRef.current, statusNode);
      }
    }
  }, [vimMode, theme]);

  // Panel resizing (same as practice page)
  const handleMouseDown = (type) => setIsResizing(type);
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      if (isResizing === "question") {
        const newWidth = e.clientX;
        if (newWidth >= 200 && newWidth <= window.innerWidth - chatbotWidth - 300) {
          setQuestionWidth(newWidth);
        }
      } else if (isResizing === "chatbot") {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= 200 && questionWidth + 300 <= window.innerWidth - newWidth) {
          setChatbotWidth(newWidth);
        }
      }
    };
    const handleMouseUp = () => setIsResizing(null);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, chatbotWidth, questionWidth]);

  // --- Helpers from practice page ---
  const getDefaultCode = (lang) => {
    const templates = {
      python: `def solution():
    # TODO: Implement your solution here
    pass

# Test cases will be provided below
`,
      javascript: `function solution(nums) {
    // TODO: Implement your solution here
    // Example: return nums;
}

// Test cases will be provided below
`,
      java: `public class Solution {
    public void solution() {
        // TODO: Implement your solution here
    }
}
`,
      cpp: `#include <iostream>
#include <vector>
using namespace std;

void solution() {
    // TODO: Implement your solution here
}

int main() {
    solution();
    return 0;
}
`,
      typescript: `export function solution(nums: number[]): any {
  // TODO
}
`,
    };
    return templates[lang] || templates.python;
  };

  // Ensure the document has some initial code when both editor & question are ready
  useEffect(() => {
    if (!modelRef.current) return;
    // Initialize shared text only once
    if (!syncedRef.current) return;
    if (!ytext || ytext.length > 0) return;
    Y.transact(ydoc, () => {
      ytext.insert(0, getDefaultCode(language));
    }, "init-template");
  }, [language, ytext, modelRef.current]);

  // Execute JS locally
  const executeJavaScript = (code, testCases) => {
    const results = [];
    let out = "Running your code...\n\n";
    try {
      // eslint-disable-next-line no-eval
      eval(code); // defines solution() or main()
      let solutionFunc = typeof solution !== "undefined" ? solution : (typeof main !== "undefined" ? main : null);
      if (!solutionFunc || typeof solutionFunc !== "function") {
        throw new Error('Please define a function named "solution" or "main".');
      }
      testCases.forEach((testCase, idx) => {
        try {
          let input = (testCase.input || "").trim();
          let parsedInput = input;
          if (input.includes("nums =") && input.includes("target =")) {
            const numsMatch = input.match(/nums\s*=\s*(\[[^\]]+\])/);
            const targetMatch = input.match(/target\s*=\s*(\d+)/);
            if (numsMatch && targetMatch) {
              const nums = JSON.parse(numsMatch[1]);
              const target = parseInt(targetMatch[1]);
              parsedInput = [nums, target];
            }
          } else {
            try {
              parsedInput = JSON.parse(input);
            } catch {
              if (input.startsWith("[") && input.endsWith("]")) {
                try { parsedInput = JSON.parse(input); } catch {}
              }
            }
          }
          let actualOutput;
          if (Array.isArray(parsedInput) && parsedInput.length === 2 && Array.isArray(parsedInput[0])) {
            actualOutput = solutionFunc(parsedInput[0], parsedInput[1]);
          } else {
            actualOutput = solutionFunc(parsedInput);
          }
          const actualOutputStr =
            actualOutput === null || actualOutput === undefined
              ? String(actualOutput)
              : typeof actualOutput === "object"
              ? JSON.stringify(actualOutput)
              : String(actualOutput);
          const expectedOutput = String(testCase.expectedOutput ?? "").trim();
          const normalizedActual = actualOutputStr.trim().replace(/\s+/g, " ");
          const normalizedExpected = expectedOutput.replace(/\s+/g, " ");
          const passed = normalizedActual === normalizedExpected;
          results.push({
            input: testCase.input,
            expectedOutput,
            actualOutput: actualOutputStr,
            passed,
            testCaseNumber: idx + 1,
          });
        } catch (error) {
          results.push({
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: `Error: ${error.message}`,
            passed: false,
            testCaseNumber: idx + 1,
          });
        }
      });
    } catch (error) {
      (question?.testCases ?? []).forEach((tc, idx) => {
        results.push({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: `Error: ${error.message}`,
          passed: false,
          testCaseNumber: idx + 1,
        });
      });
    }
    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    out += `Results: ${passedCount}/${totalCount} test cases passed.\n\n`;
    results.forEach((r) => {
      out += `Test Case ${r.testCaseNumber}: ${r.passed ? "✓ PASSED" : "✗ FAILED"}\n`;
      out += `  Input: ${r.input}\n`;
      out += `  Expected: ${r.expectedOutput}\n`;
      out += `  Got: ${r.actualOutput}\n\n`;
    });
    out += passedCount === totalCount ? "✓ All test cases passed! Well done!" : "✗ Some test cases failed. Try again.";
    return { results, output: out };
  };

  // Execute non-JS on backend (same endpoint as practice page)
  const executeBackend = async (code, lang, testCases) => {
    try {
      const response = await fetch(`${endpoints.questions}/api/questions/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language: lang, testCases }),
      });
      const result = await response.json();
      if (result.success) return result.data;
      throw new Error(result.message || "Execution failed");
    } catch (error) {
      return {
        results: testCases.map((tc, idx) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: `Error: ${error.message}`,
          passed: false,
          testCaseNumber: idx + 1,
        })),
        output: `Error executing code: ${error.message}`,
      };
    }
  };

  // Run button — IMPORTANT: runs a snapshot of the code at click time
  const runCode = async () => {
    setOutput("Running your code...\n");
    setTestResults([]);

    const code = modelRef.current?.getValue() ?? ""; // snapshot now
    const testCasesToUse =
      (question?.testCases?.length ? question.testCases : null) ??
      (question?.examples?.length
        ? question.examples.map((ex) => ({ input: ex.input || "", expectedOutput: ex.output || "" }))
        : null);

    if (!testCasesToUse || testCasesToUse.length === 0) {
      setOutput("No test cases available for this question.");
      return;
    }

    try {
      const executionResult =
        language === "javascript" || language === "typescript"
          ? executeJavaScript(code, testCasesToUse)
          : await executeBackend(code, language, testCasesToUse);

      setTestResults(executionResult.results);
      setOutput(executionResult.output);
    } catch (error) {
      setOutput(`Error: ${error.message}`);
      setTestResults([]);
    }
  };

  // Chat panel
  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const rawInput = chatInput.trim();
    const isPartnerMessage = /^@partner\b/i.test(rawInput);

    if (isPartnerMessage) {
      const content = rawInput.replace(/^@partner\b\s*/i, "");
      if (!content) {
        setChatMessages((prev) => [
          ...prev,
          { role: "system", content: "Please type a message after @partner to reach your peer." },
        ]);
        setChatInput("");
        return;
      }

      const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const pendingMessage = {
        role: "partner-self",
        content,
        senderId: myUserId || "self",
        sentAt: new Date().toISOString(),
        clientId,
        pending: true,
      };

      setChatMessages((prev) => [...prev, pendingMessage]);
      setChatInput("");

      try {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "PARTNER_CHAT",
              content,
              clientId,
            })
          );
        } else {
          throw new Error("Not connected to collaboration server");
        }
      } catch (error) {
        console.error("Failed to send partner message:", error);
        setChatMessages((prev) => [
          ...prev,
          { role: "system", content: "Failed to send message to your partner. Please try again." },
        ]);
      }

      return;
    }

    const userMessage = rawInput;
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const codeNow = modelRef.current?.getValue() ?? "";
      const response = await fetch(`${endpoints.chatbot}/api/chatbot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          mode: "coding",
          context: {
            questionId: state?.questionId,
            question: question?.title,
            code: codeNow,
            language,
          },
        }),
      });
      const result = await response.json();
      if (result.success) {
        setChatMessages((prev) => [...prev, { role: "assistant", content: result.data.response }]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
        ]);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Unable to connect to the chatbot service. Please try again later." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };
  const handleChatKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    // If doc is empty, seed with template for new language
    if (ytext.length === 0) {
      Y.transact(ydoc, () => {
        ytext.insert(0, getDefaultCode(newLang));
      }, "init-template");
    }
  };

  const quitSession = () => {
    try {
      wsRef.current?.send(JSON.stringify({ type: "LEAVE_ROOM" }));
    } catch {}
    try { wsRef.current?.close(); } catch {}
    navigate("/"); // or navigate('/problems') if you prefer
  };

  // --- Render ---
  if (loadingQuestion) {
    return (
      <div className="code-editor-page">
        <div className="loading">Loading question…</div>
      </div>
    );
  }

  return (
    <div className="code-editor-page">
      <div className="editor-header-bar">
        <button className="back-btn" onClick={quitSession}>
          ← Quit Session
        </button>
        <div style={{ marginLeft: 12, fontSize: 12 }}>
          <strong>Session:</strong> {sessionId} · {status}
        </div>
      </div>

      <div className="editor-container">
        {/* Question Panel (Left) */}
        <div className="question-panel" style={{ width: `${questionWidth}px` }}>
          <div className="question-header">
            <h1>{question?.title ?? "Collaborative Session"}</h1>
            {question?.difficulty && (
              <span className={`difficulty-badge difficulty-${question.difficulty.toLowerCase()}`}>
                {question.difficulty}
              </span>
            )}
          </div>

          <div className="question-content">
            {question ? (
              <>
                <div className="section">
                  <h3>Description</h3>
                  <p>{question.description}</p>
                </div>

                {question.examples?.length > 0 && (
                  <div className="section">
                    <h3>Examples</h3>
                    {question.examples.map((example, idx) => (
                      <div key={idx} className="example">
                        <div className="example-title">Example {idx + 1}</div>
                        <div className="example-box">
                          <div><strong>Input:</strong> {example.input}</div>
                          <div><strong>Output:</strong> {example.output}</div>
                          {example.explanation && <div><strong>Explanation:</strong> {example.explanation}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {question.constraints?.length > 0 && (
                  <div className="section">
                    <h3>Constraints</h3>
                    <ul>
                      {question.constraints.map((c, idx) => <li key={idx}>{c}</li>)}
                    </ul>
                  </div>
                )}

                {question.hints?.length > 0 && (
                  <div className="section">
                    <h3>Hints</h3>
                    <ul>
                      {question.hints.map((h, idx) => <li key={idx}>{h}</li>)}
                    </ul>
                  </div>
                )}

                {question.categories && (
                  <div className="section">
                    <h3>Topics</h3>
                    <div className="tags">
                      {question.categories.map((cat, idx) => (
                        <span key={idx} className="tag">{cat}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="section">
                <h3>No question attached</h3>
                <p>This session doesn’t have a selected problem. You can still code collaboratively.</p>
              </div>
            )}
          </div>
        </div>

        <div className="resize-handle" onMouseDown={() => handleMouseDown("question")} />

        {/* Code Panel (Middle) */}
        <div className="code-panel">
          <div className="code-header">
            <div className="code-controls">
              <select
                className="language-select"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>

              <select
                className="theme-select"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option value="custom-dark">Dark</option>
                <option value="custom-light">Light</option>
              </select>

              <label className="vim-toggle">
                <input
                  type="checkbox"
                  checked={vimMode}
                  onChange={(e) => setVimMode(e.target.checked)}
                />
                <span>Vim</span>
              </label>
            </div>

            <button className="run-btn" onClick={runCode}>Run</button>
          </div>

          <div className="code-area">
            <Editor
              height="100%"
              language={language}
              theme={theme}
              onMount={handleEditorDidMount}
              options={{
                readOnly: isReadonly,
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: "on",
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                formatOnPaste: true,
                formatOnType: true,
                tabSize: 2,
              }}
            />
          </div>

          <div className="output-area">
            <div className="output-header">Output</div>
            <div className="output-content">
              <pre>{output || "Click 'Run' to execute your code..."}</pre>
            </div>
          </div>

          {testResults.length > 0 && (
            <div className="test-results">
              <div className="test-results-header">Test Cases</div>
              {testResults.map((result, idx) => (
                <div key={idx} className={`test-result ${result.passed ? "passed" : "failed"}`}>
                  <div className="test-result-header">
                    Test Case {result.testCaseNumber}
                    <span className="test-status">
                      {result.passed ? "✓ Passed" : "✗ Failed"}
                    </span>
                  </div>
                  {!result.passed && (
                    <div className="test-details">
                      <div>Expected: {result.expectedOutput}</div>
                      <div>Got: {result.actualOutput}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="resize-handle" onMouseDown={() => handleMouseDown("chatbot")} />

        {/* Chatbot Panel (Right) */}
        <div className="chatbot-panel" style={{ width: `${chatbotWidth}px` }}>
          <div className="chatbot-header">
            <h3>Preppy</h3>
            {partnerNotice && (
              <div className="partner-alert">
                <div className="partner-alert-title">Partner</div>
                <div className="partner-alert-body">{partnerNotice.content}</div>
                <button
                  type="button"
                  className="partner-alert-dismiss"
                  onClick={() => {
                    if (partnerNoticeTimeoutRef.current) {
                      clearTimeout(partnerNoticeTimeoutRef.current);
                    }
                    setPartnerNotice(null);
                  }}
                  aria-label="Dismiss partner notification"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <div className="chatbot-messages">
            {chatMessages.length === 0 && (
              <div className="message assistant">
                Hi! I'm Preppy, your AI coding assistant! Ask me questions, request hints, or discuss your approach. Need to reach your peer? Type <code>@partner</code> followed by your message.
              </div>
            )}
            {chatMessages.map((msg, idx) => {
              const segments = parseMessageSegments(msg.content);
              const key = msg.clientId || `chat-${idx}`;
              const label = messageLabel(msg);

              return (
                <div key={key} className={`message ${msg.role}`}>
                  <div className="chat-message-meta">
                    <span>{label}</span>
                    {msg.pending && <span className="chat-pending-indicator">Sending…</span>}
                  </div>
                  <div className="chat-message-content">
                    {segments.length === 0 ? (
                      <div className="chat-text-segment">{renderTextSegment(msg.content)}</div>
                    ) : (
                      segments.map((segment, segIdx) => {
                        if (segment.type === "code") {
                          const blockId = `${key}-code-${segIdx}`;
                          return (
                            <div key={blockId} className="chat-code-block">
                              <div className="chat-code-header">
                                <span className="chat-code-language">{segment.language || "code"}</span>
                                <button
                                  type="button"
                                  className="copy-button"
                                  onClick={() => handleCopyCode(segment.content, blockId)}
                                >
                                  {copiedBlockId === blockId ? "Copied!" : "Copy"}
                                </button>
                              </div>
                              <pre>
                                <code>{segment.content}</code>
                              </pre>
                            </div>
                          );
                        }

                        return (
                          <div key={`${key}-text-${segIdx}`} className="chat-text-segment">
                            {renderTextSegment(segment.content)}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
            {chatLoading && (
              <div className="message assistant">
                <em>AI is typing...</em>
              </div>
            )}
          </div>

          <div className="chatbot-input-area">
            <textarea
              className="chatbot-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={handleChatKeyPress}
              placeholder="Ask Preppy… or type @partner to message your peer"
              disabled={chatLoading}
            />
            <button
              className="chatbot-send-btn"
              onClick={sendChatMessage}
              disabled={chatLoading || !chatInput.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <PeerLeftModal
        open={peerLeftOpen}
        onContinue={() => setPeerLeftOpen(false)}
        onExit={quitSession}
        onClose={() => setPeerLeftOpen(false)}
      />

      <LanguageRecommendModal
        open={showLangReco}
        onClose={() => setShowLangReco(false)}
        onOk={() => {
          sessionStorage.setItem(langRecoKey, "1");
          setShowLangReco(false);
          setTimeout(() => window.location.reload(), 50);
        }}
      />
    </div>
  );
}
