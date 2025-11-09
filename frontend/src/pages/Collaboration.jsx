import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from "y-protocols/awareness.js";
import { initVimMode } from "monaco-vim";
import { endpoints } from "../lib/api";
import "../css/CodeEditor.css";

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
  const [language, setLanguage] = useState("python"); // default matches practice page
  const [theme, setTheme] = useState("custom-dark");
  const [vimMode, setVimMode] = useState(false);
  const [isReadonly, setIsReadonly] = useState(false);

  // Question & run/test state
  const [question, setQuestion] = useState(state?.question ?? null);
  const [loadingQuestion, setLoadingQuestion] = useState(!state?.question && !!state?.questionId);
  const [output, setOutput] = useState("");
  const [testResults, setTestResults] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Layout (resizable panels) — match practice page defaults
  const [questionWidth, setQuestionWidth] = useState(400);
  const [chatbotWidth, setChatbotWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(null);

  // --- Yjs doc + text + awareness---
  const ydoc = useMemo(() => new Y.Doc(), []);
  const ytext = useMemo(() => ydoc.getText("code"), [ydoc]);
  const awareness = useMemo(() => new Awareness(ydoc), [ydoc]);
  const remoteDecosRef = useRef([]);
  const peerStylesRef = useRef(new Map());

  // --- Refs ---
  const wsRef = useRef(null);
  const editorRef = useRef(null);
  const modelRef = useRef(null);
  const suppressLocalRef = useRef(false);
  const joinedRef = useRef(false);
  const vimRef = useRef(null);
  const suppressNetworkRef = useRef(false);
  const syncedRef = useRef(false);

  // base64 helpers
  const toB64 = (u8) => btoa(String.fromCharCode(...u8));
  const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

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

      const colorFor = (id) => {
      const h = (id * 2654435761) % 360;
        return { solid: `hsl(${h}, 90%, 55%)`, alpha: `hsla(${h}, 90%, 55%, 0.25)` };
      };

      awareness.setLocalState({
        name: "You",
        color: colorFor(awareness.clientID).solid,
        cursor: null,
      });

      const init = encodeAwarenessUpdate(awareness, [awareness.clientID]);
      ws.send(JSON.stringify({ type: "AWARENESS_SET", payloadB64: toB64(init) }));
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
        } else if (msg.type === "AWARENESS_UPDATE" && msg.payloadB64) {
          const buf = fromB64(msg.payloadB64);
          applyAwarenessUpdate(awareness, buf, "remote");
          renderRemoteCursors();
        } else if (msg.type === "AWARENESS_SYNC" && msg.payloadB64) {
          const buf = fromB64(msg.payloadB64);
          applyAwarenessUpdate(awareness, buf, "remote");
          renderRemoteCursors();
        } else if (msg.type === "ERROR" && msg.message) {
          setStatus(`error: ${msg.message}`);
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
    renderRemoteCursors();
  };

  // Cursor changes
  useEffect(() => {
    if (!editorRef.current || !modelRef.current) return;
    const editor = editorRef.current;
    const model = modelRef.current;

    const sendAwareness = () => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      const update = encodeAwarenessUpdate(awareness, [awareness.clientID]);
      wsRef.current.send(JSON.stringify({
        type: "AWARENESS_SET",
        payloadB64: toB64(update),
      }));
    };

    const onPos = editor.onDidChangeCursorPosition(() => {
      const sel = editor.getSelection();
      if (!sel) return;
      const anchorOffset = model.getOffsetAt({ lineNumber: sel.selectionStartLineNumber, column: sel.selectionStartColumn });
      const headOffset   = model.getOffsetAt({ lineNumber: sel.positionLineNumber,       column: sel.positionColumn });

      awareness.setLocalStateField("cursor", { anchor: anchorOffset, head: headOffset });
      sendAwareness();
    });

    const onSel = editor.onDidChangeCursorSelection(() => {
      const sel = editor.getSelection();
      if (!sel) return;
      const anchorOffset = model.getOffsetAt({ lineNumber: sel.selectionStartLineNumber, column: sel.selectionStartColumn });
      const headOffset   = model.getOffsetAt({ lineNumber: sel.positionLineNumber,       column: sel.positionColumn });

      awareness.setLocalStateField("cursor", { anchor: anchorOffset, head: headOffset });
      sendAwareness();
    });

    const onBlur = editor.onDidBlurEditorText(() => {
      awareness.setLocalStateField("cursor", null);
      sendAwareness();
    });

    return () => { onPos.dispose(); onSel.dispose(); onBlur.dispose(); };
  }, [awareness]);

  const renderRemoteCursors = () => {
    if (!editorRef.current || !modelRef.current || !window.monaco) return;
    const model = modelRef.current;

    // Clear previous decorations
    remoteDecosRef.current = editorRef.current.deltaDecorations(remoteDecosRef.current, []);

    const decos = [];
    const states = awareness.getStates(); // Map<clientID, state>
    states.forEach((st, clientID) => {
      if (!st || clientID === awareness.clientID) return;
      const name = st.name || `Peer ${clientID}`;
      const color = st.color || "hsl(200, 90%, 55%)";
      const cursor = st.cursor;

      // Ensure CSS for this peer exists
      if (!peerStylesRef.current.has(clientID)) {
        const s = document.createElement("style");
        s.innerHTML = `
          .remote-caret-${clientID} { border-left: 2px solid ${color}; margin-left: -1px; }
          .remote-caret-label-${clientID}::after {
            content: "${name}";
            position: absolute; transform: translateY(-100%);
            background: ${color}; color: white; font-size: 10px;
            padding: 1px 4px; border-radius: 3px;
          }
          .remote-selection-${clientID} { background: ${color}40; }
        `;
        document.head.appendChild(s);
        peerStylesRef.current.set(clientID, s);
      }

      if (cursor && Number.isFinite(cursor.anchor) && Number.isFinite(cursor.head)) {
        const a = Math.max(0, Math.min(cursor.anchor, model.getValueLength()));
        const h = Math.max(0, Math.min(cursor.head, model.getValueLength()));
        const startPos = model.getPositionAt(Math.min(a, h));
        const endPos   = model.getPositionAt(Math.max(a, h));

        // Selection highlight
        if (a !== h) {
          decos.push({
            range: new window.monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
            options: { className: `remote-selection remote-selection-${clientID}` }
          });
        }

        // Caret (zero-length decoration with beforeContent)
        const caretPos = model.getPositionAt(h);
        decos.push({
          range: new window.monaco.Range(caretPos.lineNumber, caretPos.column, caretPos.lineNumber, caretPos.column),
          options: {
            beforeContentClassName: `remote-caret remote-caret-${clientID}`,
            afterContentClassName: `remote-caret-label remote-caret-label-${clientID}`,
            stickiness: 1,
            hoverMessage: { value: `**${name}**` },
          },
        });
      }
    });

    remoteDecosRef.current = editorRef.current.deltaDecorations(remoteDecosRef.current, decos);
  };

  useEffect(() => {
    const handler = () => renderRemoteCursors();
    awareness.on("update", handler);
    return () => awareness.off("update", handler);
  }, [awareness]);

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
    const userMessage = chatInput.trim();
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
          </div>

          <div className="chatbot-messages">
            {chatMessages.length === 0 ? (
              <div className="message assistant">
                Hi! I'm Preppy, your AI coding assistant! Ask me questions, request hints, or discuss your approach!
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.role}`}>
                  {msg.content}
                </div>
              ))
            )}
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
              placeholder="Ask for help or hints..."
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
    </div>
  );
}
