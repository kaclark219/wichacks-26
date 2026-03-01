import { useEffect, useRef, useState } from "react";
import playBtn from "./assets/play-btn.png";
import pauseBtn from "./assets/pause-btn.png";
import stopBtn from "./assets/stop-btn.png";
import settingsBtn from "./assets/settings.png";
import closeBtn from "./assets/close.png";
import toggleOffBtn from "./assets/toggle-off.png";
import toggleOnBtn from "./assets/toggle-on.png";
import toggleTransitionBtn from "./assets/toggle-transition.png";
import timerBckgrnd from "./assets/timer.png";

// high contrast/monochromatic color blindness friendly assets
import monoPlayBtn from "./assets/mono-play-btn.PNG";
import monoPauseBtn from "./assets/mono-pause-btn.PNG";
import monoStopBtn from "./assets/mono-stop-btn.PNG";
import monoSettingsBtn from "./assets/mono-settings.PNG";
import monoCloseBtn from "./assets/mono-close.PNG";
import monoToggleOffBtn from "./assets/mono-toggle-off.PNG";
import monoToggleOnBtn from "./assets/mono-toggle-on.PNG";
import monoToggleTransitionBtn from "./assets/mono-toggle-transition.PNG";
import monoTimerBckgrnd from "./assets/mono-timer.PNG";

import spriteContent from "./assets/sprite/Content_Base.png";
import spriteContentIdle from "./assets/sprite/Content_Idle.png";
import spriteHappy from "./assets/sprite/Happy_Base.png";
import spriteHappyIdle from "./assets/sprite/Happy_Idle.png";
import spriteSad from "./assets/sprite/Sad_Base.png";
import spriteSadIdle from "./assets/sprite/Sad_Idle.png";
import spriteAngry from "./assets/sprite/Angry_Base.png";
import spriteAngryIdle from "./assets/sprite/Angry_Idle.png";
import spriteRelax from "./assets/sprite/Relax_Base.png";
import spriteRelaxIdle from "./assets/sprite/Relax_Idle.png";

import settingsBackground from "./assets/settings/settings-background.PNG";
import settingsCloseBtn from "./assets/settings/settings-close.PNG";
import topCheckBtn from "./assets/settings/top-check.PNG";
import topUncheckBtn from "./assets/settings/top-uncheck.PNG";
import middleCheckBtn from "./assets/settings/middle-check.PNG";
import middleUncheckBtn from "./assets/settings/middle-uncheck.PNG";
import bottomCheckBtn from "./assets/settings/bottom-check.PNG";
import bottomUncheckBtn from "./assets/settings/bottom-uncheck.PNG";

import { startWebcamAndAnalyze } from "./webcamTest";
import { startActivityAndObserve } from "./activityTest";

export default function App() {
  const audioCtxRef = useRef(null);

  const sadBufferRef = useRef(null);
  const sadSourceRef = useRef(null);
  const sadGainRef = useRef(null);

  const chillBufferRef = useRef(null);
  const chillSourceRef = useRef(null);
  const chillGainRef = useRef(null);

  const [audioReady, setAudioReady] = useState(false);
  const [audioErr, setAudioErr] = useState(null);

  const [pong, setPong] = useState("");
  const [shapeLoaded, setShapeLoaded] = useState(false);
  const [shapeError, setShapeError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [toggleState, setToggleState] = useState(false);
  const [toggleTransitioning, setToggleTransitioning] = useState(false);
  const [buttonCanvases, setButtonCanvases] = useState({});
  const [hoveredButton, setHoveredButton] = useState(null);
  const [isOverInteractiveButton, setIsOverInteractiveButton] = useState(false);
  const [isDraggingBackground, setIsDraggingBackground] = useState(false);

  // pomodoro timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState("work"); // work or break
  const [workDuration, setWorkDuration] = useState(25 * 60); // 25 mins
  const [breakDuration, setBreakDuration] = useState(5 * 60); // 5 mins
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [spriteState, setSpriteState] = useState("base"); // "base" or "idle"

  // settings menu state
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [lowMotionMode, setLowMotionMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [settingsButtonCanvases, setSettingsButtonCanvases] = useState({});

  const [backendData, setBackendData] = useState(null);
  const [backendErr, setBackendErr] = useState(null);

  const stopWebcamRef = useRef(null);
  const stopModeRef = useRef(null);
  const settingsModalRef = useRef(null);
  const focusedButtonRef = useRef(null);
  const [focusedButton, setFocusedButton] = useState(null);
  const [showFocusIndicator, setShowFocusIndicator] = useState(false);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape closes settings
      if (e.key === "Escape" && settingsMenuOpen) {
        e.preventDefault();
        setSettingsMenuOpen(false);
        return;
      }

      // Keyboard shortcuts for buttons when settings not open
      if (settingsMenuOpen) return;

      const keyMap = {
        " ": "play",
        "Enter": "play",
        "p": "play",
        "P": "play",
        "m": "pause",
        "M": "pause",
        "s": "stop",
        "S": "stop",
        "?": "settings",
        "/": "settings",
        "t": "toggle",
        "T": "toggle",
        "q": "close",
        "Q": "close",
      };

      const buttonToActivate = keyMap[e.key];
      if (buttonToActivate) {
        e.preventDefault();
        handleButtonClick(buttonToActivate);
      }

      // Tab key for focus indication
      if (e.key === "Tab") {
        setShowFocusIndicator(true);
      }
    };

    const handleMouseDown = () => {
      setShowFocusIndicator(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [settingsMenuOpen]);

  const ensureAudioReady = async () => {
  try {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioCtx();

      sadGainRef.current = audioCtxRef.current.createGain();
      sadGainRef.current.gain.value = 0.9;
      sadGainRef.current.connect(audioCtxRef.current.destination);

      chillGainRef.current = audioCtxRef.current.createGain();
      chillGainRef.current.gain.value = 0.7;
      chillGainRef.current.connect(audioCtxRef.current.destination);
    }

    if (audioCtxRef.current.state !== "running") {
      await audioCtxRef.current.resume();
    }

    // miaomiao
    if (!sadBufferRef.current) {
      const res = await fetch("http://localhost:5173/miaomiao.mp3");
      const arr = await res.arrayBuffer();
      sadBufferRef.current = await audioCtxRef.current.decodeAudioData(arr);
    }

    // chill
    if (!chillBufferRef.current) {
      const res = await fetch("http://localhost:5173/chill.mp3");
      const arr = await res.arrayBuffer();
      chillBufferRef.current = await audioCtxRef.current.decodeAudioData(arr);
    }

    setAudioReady(true);
    setAudioErr(null);
    return true;
  } catch (e) {
    setAudioErr(e?.message ? `${e.name}: ${e.message}` : String(e));
    return false;
  }
};

const startSadLoop = async () => {
  const ok = await ensureAudioReady();
  if (!ok) return;

  // already playing
  if (sadSourceRef.current) return;

  const ctx = audioCtxRef.current;

  const src = ctx.createBufferSource();
  src.buffer = sadBufferRef.current;
  src.loop = true;
  src.connect(sadGainRef.current);

  src.start(0);
  sadSourceRef.current = src;
};

const stopSadLoop = () => {
  try {
    if (sadSourceRef.current) {
      sadSourceRef.current.stop(0);
      sadSourceRef.current.disconnect();
      sadSourceRef.current = null;
    }
  } catch {}
};
  // button configs
  const getToggleImage = () => {
    const offImg = highContrastMode ? monoToggleOffBtn : toggleOffBtn;
    const onImg = highContrastMode ? monoToggleOnBtn : toggleOnBtn;
    const transitionImg = highContrastMode ? monoToggleTransitionBtn : toggleTransitionBtn;
    
    if (toggleTransitioning) return transitionImg;
    return toggleState ? onImg : offImg;
  };

  const startChillLoop = async () => {
  const ok = await ensureAudioReady();
  if (!ok) return;
  if (chillSourceRef.current) return;

  const ctx = audioCtxRef.current;
  const src = ctx.createBufferSource();
  src.buffer = chillBufferRef.current;
  src.loop = true;
  src.connect(chillGainRef.current);
  src.start(0);
  chillSourceRef.current = src;
};

const stopChillLoop = () => {
  try {
    if (chillSourceRef.current) {
      chillSourceRef.current.stop(0);
      chillSourceRef.current.disconnect();
      chillSourceRef.current = null;
    }
  } catch {}
};

const buttonConfigs = [
  { id: "play", image: highContrastMode ? monoPlayBtn : playBtn, alt: "Play timer" },
  { id: "pause", image: highContrastMode ? monoPauseBtn : pauseBtn, alt: "Pause timer" },
  { id: "stop", image: highContrastMode ? monoStopBtn : stopBtn, alt: "Stop timer" },
  { id: "settings", image: highContrastMode ? monoSettingsBtn : settingsBtn, alt: "Settings" },
  { id: "close", image: highContrastMode ? monoCloseBtn : closeBtn, alt: "Close window" },
  { id: "toggle", image: getToggleImage(), alt: toggleState ? "Camera mode enabled" : "Activity mode enabled" },
  { id: "timer", image: highContrastMode ? monoTimerBckgrnd : timerBckgrnd, alt: "Timer background" },
];

const mood = backendData?.tamagotchi?.mood || "content";
const phaseLabel = currentPhase === "work" ? "working" : "on break";
const animLabel = spriteState === "base" ? "base pose" : "idle pose";
const characterAlt = `Tamagotchi character: ${mood}, ${phaseLabel}, ${animLabel}`;
  // smart pixel detection logic
  useEffect(() => {
    const canvases = {};
    let loaded = 0;
    
    buttonConfigs.forEach((btn) => {
      const img = new Image();
      img.src = btn.image;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        canvases[btn.id] = { canvas, ctx, width: img.naturalWidth, height: img.naturalHeight };
        loaded++;
        if (loaded === buttonConfigs.length) {
          setButtonCanvases(canvases);
        }
      };
    });
  }, [toggleState, toggleTransitioning, highContrastMode]);

  const isPixelVisible = (buttonId, clientX, clientY, imgElement) => {
    const btnData = buttonCanvases[buttonId];
    if (!btnData) return false;

    const rect = imgElement.getBoundingClientRect();
    const { canvas, ctx, width: imgWidth, height: imgHeight } = btnData;

    const containerW = rect.width;
    const containerH = rect.height;
    const imageRatio = imgWidth / imgHeight;
    const containerRatio = containerW / containerH;

    let renderedW, renderedH, offsetX, offsetY;

    if (imageRatio > containerRatio) {
      renderedW = containerW;
      renderedH = containerW / imageRatio;
      offsetX = 0;
      offsetY = (containerH - renderedH) / 2;
    } else {
      renderedH = containerH;
      renderedW = containerH * imageRatio;
      offsetX = (containerW - renderedW) / 2;
      offsetY = 0;
    }

    const x = clientX - rect.left - offsetX;
    const y = clientY - rect.top - offsetY;

    if (x < 0 || x > renderedW || y < 0 || y > renderedH) return false;

    const imageX = Math.floor((x / renderedW) * imgWidth);
    const imageY = Math.floor((y / renderedH) * imgHeight);

    const pixel = ctx.getImageData(imageX, imageY, 1, 1).data;
    return pixel[3] > 10;
  };

  const interactiveButtonIds = new Set(["play", "pause", "stop", "settings", "close", "toggle"]);

  const findButtonAtPoint = (clientX, clientY, interactiveOnly = false) => {
    for (let i = buttonConfigs.length - 1; i >= 0; i--) {
      const btn = buttonConfigs[i];
      const imgElement = document.getElementById(`btn-${btn.id}`);
      if (!imgElement || !isPixelVisible(btn.id, clientX, clientY, imgElement)) continue;
      if (interactiveOnly && !interactiveButtonIds.has(btn.id)) continue;
      return btn.id;
    }
    return null;
  };

  const handleContainerClick = (event) => {
    const buttonId = findButtonAtPoint(event.clientX, event.clientY, true);
    if (buttonId) {
      handleButtonClick(buttonId);
    }
  };

  const handleContainerMouseDown = (event) => {
    if (settingsMenuOpen) return;
    const buttonId = findButtonAtPoint(event.clientX, event.clientY, true);
    if (buttonId) return;

    setHoveredButton(null);
    setIsOverInteractiveButton(false);
    setIsDraggingBackground(true);
    window.api?.startWindowDrag?.({ screenX: event.screenX, screenY: event.screenY });
  };

  const handleContainerMouseMove = (event) => {
    if (isDraggingBackground) {
      window.api?.updateWindowDrag?.({ screenX: event.screenX, screenY: event.screenY });
      return;
    }

    const interactiveButtonId = findButtonAtPoint(event.clientX, event.clientY, true);
    setIsOverInteractiveButton(Boolean(interactiveButtonId));

    if (interactiveButtonId && interactiveButtonId !== "toggle") {
      setHoveredButton(interactiveButtonId);
      return;
    }

    setHoveredButton(null);
  };

  const stopBackgroundDragging = () => {
    if (!isDraggingBackground) return;
    setIsDraggingBackground(false);
    window.api?.endWindowDrag?.();
  };

  const handleButtonClick = (buttonId) => {
    ensureAudioReady();
    switch (buttonId) {
      case "play":
        console.log("Play clicked");
        if (timerRunning) {
          // skip to next cycle
          if (currentPhase === "work") {
            setCurrentPhase("break");
            setTimeRemaining(breakDuration);
          } else {
            setCurrentPhase("work");
            setTimeRemaining(workDuration);
            setCyclesCompleted(cyclesCompleted + 1);
          }
        } else {
          // start timer
          setTimerRunning(true);
        }
        break;
      case "pause":
        console.log("Pause clicked");
        setTimerRunning(false);
        break;
      case "stop":
        console.log("Stop clicked");
        setTimerRunning(false);
        setCurrentPhase("work");
        setTimeRemaining(workDuration);
        setCyclesCompleted(0);
        break;
      case "settings":
        console.log("Settings clicked");
        setSettingsMenuOpen(true);
        break;
      case "close":
        console.log("Close clicked");
        window.api?.closeWindow?.();
        break;
      case "toggle":
        console.log("Toggle clicked");
        if (lowMotionMode) {
          setToggleTransitioning(false);
          setToggleState(!toggleState);
        } else {
          setToggleTransitioning(true);
          setTimeout(() => {
            setToggleState(!toggleState);
            setToggleTransitioning(false);
          }, 200);
        }
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    setPong(window.api?.ping?.() ?? "no preload");
  }, []);

  // pomodoro timer countdown effect
  useEffect(() => {
    let interval = null;

    if (timerRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && timerRunning) {
      // phase completed, switch to next phase
      if (currentPhase === "work") {
        setCurrentPhase("break");
        setTimeRemaining(breakDuration);
      } else {
        setCurrentPhase("work");
        setTimeRemaining(workDuration);
        setCyclesCompleted(cyclesCompleted + 1);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timeRemaining, currentPhase, workDuration, breakDuration, cyclesCompleted]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // send timer state to backend
  useEffect(() => {
    if (window.api?.updateTimerState) {
      window.api.updateTimerState({
        timerRunning,
        currentPhase,
        timeRemaining,
        workDuration,
        breakDuration,
        cyclesCompleted,
      });
    }
  }, [timerRunning, currentPhase, timeRemaining, workDuration, breakDuration, cyclesCompleted]);

  // idle animation effect
  useEffect(() => {
    if (lowMotionMode) {
      setSpriteState("idle");
      return;
    }
    
    const interval = setInterval(() => {
      setSpriteState((prev) => (prev === "base" ? "idle" : "base"));
    }, 1000); // toggle every 1 seconds

    return () => clearInterval(interval);
  }, [lowMotionMode]);

  // load settings button canvases for pixel detection
  useEffect(() => {
    if (!settingsMenuOpen) return;
    
    const canvases = {};
    let loaded = 0;
    const settingsButtons = [
      { id: "settings-close", image: settingsCloseBtn },
      { id: "settings-top", image: highContrastMode ? topCheckBtn : topUncheckBtn },
      { id: "settings-middle", image: lowMotionMode ? middleCheckBtn : middleUncheckBtn },
      { id: "settings-bottom", image: soundEnabled ? bottomCheckBtn : bottomUncheckBtn },
    ];
    
    settingsButtons.forEach((btn) => {
      const img = new Image();
      img.src = btn.image;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        canvases[btn.id] = { canvas, ctx, width: img.naturalWidth, height: img.naturalHeight };
        loaded++;
        if (loaded === settingsButtons.length) {
          setSettingsButtonCanvases(canvases);
        }
      };
    });
  }, [settingsMenuOpen, highContrastMode, lowMotionMode, soundEnabled]);

  const isSettingsPixelVisible = (buttonId, clientX, clientY, imgElement) => {
    const btnData = settingsButtonCanvases[buttonId];
    if (!btnData) return false;

    const rect = imgElement.getBoundingClientRect();
    const { canvas, ctx, width: imgWidth, height: imgHeight } = btnData;

    const containerW = rect.width;
    const containerH = rect.height;
    const imageRatio = imgWidth / imgHeight;
    const containerRatio = containerW / containerH;

    let renderedW, renderedH, offsetX, offsetY;

    if (imageRatio > containerRatio) {
      renderedW = containerW;
      renderedH = containerW / imageRatio;
      offsetX = 0;
      offsetY = (containerH - renderedH) / 2;
    } else {
      renderedH = containerH;
      renderedW = containerH * imageRatio;
      offsetX = (containerW - renderedW) / 2;
      offsetY = 0;
    }

    const x = clientX - rect.left - offsetX;
    const y = clientY - rect.top - offsetY;

    if (x < 0 || x > renderedW || y < 0 || y > renderedH) return false;

    const imageX = Math.floor((x / renderedW) * imgWidth);
    const imageY = Math.floor((y / renderedH) * imgHeight);

    const pixel = ctx.getImageData(imageX, imageY, 1, 1).data;
    return pixel[3] > 10;
  };

  const handleSettingsButtonClick = (buttonId) => {
    switch (buttonId) {
      case "settings-close":
        setSettingsMenuOpen(false);
        break;
      case "settings-top":
        setHighContrastMode(!highContrastMode);
        break;
      case "settings-middle":
        setLowMotionMode(!lowMotionMode);
        break;
      case "settings-bottom":
        setSoundEnabled(!soundEnabled);
        break;
      default:
        break;
    }
  };

  const mainBackgroundImage = highContrastMode ? "./mono-background.PNG" : "./background.png";

  useEffect(() => {
    const image = new Image();
    image.src = mainBackgroundImage;

    image.onload = () => {
      setShapeLoaded(true);
      setShapeError(false);
    };
    image.onerror = () => {
      setShapeLoaded(false);
      setShapeError(true);
    };

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [mainBackgroundImage]);

useEffect(() => {
  const shouldRun = timerRunning && currentPhase === "work";
  const mode = toggleState ? "camera" : "activity";

  // stop any running mode if we shouldn't run
  if (!shouldRun && stopModeRef.current) {
    stopModeRef.current();
    stopModeRef.current = null;
    return;
  }

  if (stopModeRef.current) {
    stopModeRef.current();
    stopModeRef.current = null;
  }

  if (!shouldRun) return;

  (async () => {
    try {
      if (mode === "camera") {
        stopModeRef.current = await startWebcamAndAnalyze({
          userId: "demo",
          intervalMs: 1000,
          onResult: (data) => { setBackendData(data); setBackendErr(null); },
          onError: (err) => setBackendErr(err),
        });
      } else {
        stopModeRef.current = startActivityAndObserve({
          userId: "demo",
          intervalMs: 1000,
          idleThresholdMs: 15000,
          onResult: (data) => {
            // data includes { status, idleMs, ok, tamagotchi... } depending on response
            setBackendData(data);
            setBackendErr(null);
          },
          onError: (err) => setBackendErr(err),
        });
      }
    } catch (e) {
      setBackendErr({ ok: false, error: String(e) });
    }
  })();

  return () => {
    if (stopModeRef.current) {
      stopModeRef.current();
      stopModeRef.current = null;
    }
  };
}, [timerRunning, currentPhase, toggleState]);

useEffect(() => {
  if (!timerRunning || currentPhase !== "work") { stopChillLoop(); stopSadLoop(); return; }
  if (!soundEnabled) {
    stopChillLoop();
    stopSadLoop();
    return;
  }

  const mode = toggleState ? "camera" : "activity";
  const status =
    mode === "camera"
      ? backendData?.tamagotchi?.last_status
      : (backendData?.status ?? backendData?.tamagotchi?.last_status);

  const BAD = new Set(["idle", "phone", "sleep"]);
  const isUnfocused = BAD.has(status);

  if (isUnfocused) {
    stopChillLoop();
    startSadLoop();     // miaomiao
  } else {
    stopSadLoop();
    startChillLoop();   // chill
  }
}, [backendData, toggleState, soundEnabled]);

useEffect(() => {
  return () => {
    stopSadLoop();
    stopChillLoop();
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    sadBufferRef.current = null;
    chillBufferRef.current = null;
    sadGainRef.current = null;
    chillGainRef.current = null;
  };
}, []);

  return (
    <main
      id="main-content"
      role="application"
      aria-label="Pomochi - Focus monitoring tamagotchi"
      style={{
        width: "100%",
        height: "100%",
        margin: 0,
        padding: 0,
        boxSizing: "border-box",
        backgroundColor: "transparent",
        backgroundImage: shapeLoaded ? `url('${mainBackgroundImage}')` : "none",
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        position: "relative",
        WebkitAppRegion: "drag",
      }}
    >
      {shapeLoaded && buttonConfigs.map((btn) => (
        <img
          key={btn.id}
          id={`btn-${btn.id}`}
          src={btn.image}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center",
            pointerEvents: "none",
            ...(!lowMotionMode && btn.id !== "timer" && hoveredButton === btn.id && {
              transform: "scale(1.05)",
              transition: "transform 0.2s ease-out",
            }),
            ...(!lowMotionMode && btn.id !== "timer" && hoveredButton !== btn.id && {
              transition: "transform 0.2s ease-out",
            }),
          }}
          alt={btn.alt}
          aria-label={btn.id}
        />
      ))}

      {shapeLoaded && (
        <div
          ref={focusedButtonRef}
          role="region"
          aria-label="Application controls: Use keyboard shortcuts SPACE/Enter for play, M for pause, S for stop, T for toggle mode, / for settings, Q to close, ESC to close settings"
          onClick={handleContainerClick}
          onMouseDown={handleContainerMouseDown}
          onMouseMove={handleContainerMouseMove}
          onMouseUp={stopBackgroundDragging}
          onMouseLeave={() => {
            setHoveredButton(null);
            setIsOverInteractiveButton(false);
            stopBackgroundDragging();
          }}
          tabIndex={0}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            cursor: isDraggingBackground ? "grabbing" : isOverInteractiveButton ? "pointer" : "grab",
            WebkitAppRegion: "no-drag",
            outline: showFocusIndicator && focusedButton !== null ? "3px solid #4a90e2" : "none",
            outlineOffset: "2px",
          }}
        />
      )}

      {!shapeLoaded && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(20,20,20,0.85)",
            color: "white",
            padding: 16,
            borderRadius: 10,
            maxWidth: 520,
            textAlign: "center",
            WebkitAppRegion: "no-drag",
          }}
        >
          {shapeError
            ? "background image failed to load"
            : "loading background image..."}
        </div>
      )}

      {shapeLoaded && (
        <img
          src={
            currentPhase === "work"
              ? backendData?.tamagotchi?.mood === "happy"
                ? ((lowMotionMode ? "idle" : spriteState) === "base" ? spriteHappy : spriteHappyIdle)
                : backendData?.tamagotchi?.mood === "content"
                ? ((lowMotionMode ? "idle" : spriteState) === "base" ? spriteContent : spriteContentIdle)
                : backendData?.tamagotchi?.mood === "worried"
                ? ((lowMotionMode ? "idle" : spriteState) === "base" ? spriteSad : spriteSadIdle)
                : backendData?.tamagotchi?.mood === "upset"
                ? ((lowMotionMode ? "idle" : spriteState) === "base" ? spriteAngry : spriteAngryIdle)
                : ((lowMotionMode ? "idle" : spriteState) === "base" ? spriteContent : spriteContentIdle)
              : ((lowMotionMode ? "idle" : spriteState) === "base" ? spriteRelax : spriteRelaxIdle)
          }
          style={{
            position: "absolute",
            top: "45%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "200px",
            height: "auto",
            objectFit: "contain",
            transition: lowMotionMode ? "none" : "opacity 0.3s ease-in-out",
            pointerEvents: "none",
          }}
          alt={characterAlt}
        />
      )}

      {/* Live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        Focus: {backendData?.tamagotchi?.focus ?? 0}%. Mood: {backendData?.tamagotchi?.mood ?? "unknown"}. 
        Status: {backendData?.tamagotchi?.last_status ?? "unknown"}. 
        Timer: {currentPhase === "work" ? "Work" : "Break"} phase - {formatTime(timeRemaining)}.
      </div>

      {shapeLoaded && (
        <div
          style={{
            position: "absolute",
            top: "21%",
            left: "36%",
            textAlign: "center",
            color: "#872817",
            fontFamily: "monospace, ui-monospace",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: "48px", fontWeight: "bold", marginBottom: "8px" }}>
            {formatTime(timeRemaining)}
          </div>
          <div style={{ fontSize: "16px", textTransform: "capitalize", visibility: "hidden" }}>
            {currentPhase === "work" ? "Work" : "Break"}
          </div>
          <div style={{ fontSize: "12px", marginTop: "8px", opacity: 0.7, visibility: "hidden" }}>
            Cycles: {cyclesCompleted}
          </div>
        </div>
      )}
      {/* Debug panel hidden
      <div
  style={{
    position: "absolute",
    bottom: 16,
    left: 16,
    width: 360,
    background: "rgba(0,0,0,0.65)",
    color: "white",
    padding: 12,
    borderRadius: 10,
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 1.4,
    zIndex: 9999,
    WebkitAppRegion: "no-drag",
    pointerEvents: "none",
  }}
>
  <div style={{ fontWeight: "bold", marginBottom: 6 }}>Backend Debug</div>
  <div>audioReady: {String(audioReady)}</div>
  {audioErr && <div style={{ color: "#ffb3b3" }}>audioErr: {audioErr}</div>}
  {backendErr && (
    <div style={{ color: "#ffb3b3" }}>
      Error: {backendErr.error || JSON.stringify(backendErr)}
    </div>
  )}
  {!backendData && !backendErr && <div>Waiting for frames...</div>}
  {backendData && (
    <>
      <div>phone_detected: {String(backendData.phone_detected)}</div>
      <div>phone_confidence: {Number(backendData.phone_confidence || 0).toFixed(2)}</div>
      {"eyes_closed" in backendData && (
        <div>eyes_closed: {String(backendData.eyes_closed)}</div>
      )}
      {"status" in (backendData || {}) && (
        <div>activity_status: {backendData.status} (idle {Math.round((backendData.idleMs||0)/1000)}s)</div>
      )}
      {backendData.tamagotchi && (
        <>
          <div style={{ marginTop: 6, fontWeight: "bold" }}>Tamagotchi</div>
          <div>focus: {backendData.tamagotchi.focus}%</div>
          <div>mood: {backendData.tamagotchi.mood}</div>
          <div>status: {backendData.tamagotchi.last_status}</div>
          <div>mode: {toggleState ? "camera" : "activity"}</div>
        </>
      )}
    </>
  )}
</div>
      */}

      {backendData?.tamagotchi?.focus !== undefined && (
        <div
          style={{
            position: "fixed",
            top: "280px",
            left: "50%",
            transform: "translateX(-50%)",
            height: 20,
            width: "250px",
            backgroundColor: "white",
            borderRadius: 8,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            zIndex: 5000,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${backendData.tamagotchi.focus}%`,
              backgroundColor: "#3b3579",
              transition: "width 0.3s ease-out",
              borderRadius: 8,
            }}
          />
        </div>
      )}

      {settingsMenuOpen && (
        <div
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSettingsMenuOpen(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setSettingsMenuOpen(false);
            }
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            WebkitAppRegion: "no-drag",
          }}
        >
          <div
            ref={settingsModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            tabIndex={-1}
            style={{
              position: "relative",
              width: "80%",
              height: "80%",
              maxWidth: "800px",
              maxHeight: "600px",
            }}
          >
            <img
              src={settingsBackground}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "center",
                pointerEvents: "none",
              }}
              alt="settings-background"
            />
            
            <img
              id="settings-close"
              src={settingsCloseBtn}
              role="button"
              aria-label="Close settings"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSettingsMenuOpen(false);
                }
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "center",
                pointerEvents: "auto",
                cursor: "pointer",
              }}
              alt="close-settings-button"
            />
            
            <img
              id="settings-top"
              src={highContrastMode ? topCheckBtn : topUncheckBtn}
              role="checkbox"
              aria-labelledby="high-contrast-label"
              aria-checked={highContrastMode}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setHighContrastMode(!highContrastMode);
                }
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "center",
                pointerEvents: "auto",
                cursor: "pointer",
              }}
              alt="high-contrast-mode-checkbox"
            />
            
            <img
              id="settings-middle"
              src={lowMotionMode ? middleCheckBtn : middleUncheckBtn}
              role="checkbox"
              aria-labelledby="low-motion-label"
              aria-checked={lowMotionMode}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setLowMotionMode(!lowMotionMode);
                }
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "center",
                pointerEvents: "auto",
                cursor: "pointer",
              }}
              alt="low-motion-mode-checkbox"
            />
            
            <img
              id="settings-bottom"
              src={soundEnabled ? bottomCheckBtn : bottomUncheckBtn}
              role="checkbox"
              aria-labelledby="sound-label"
              aria-checked={soundEnabled}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSoundEnabled(!soundEnabled);
                }
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "center",
                pointerEvents: "auto",
                cursor: "pointer",
              }}
              alt="sound-checkbox"
            />

            <div
              id="settings-title"
              style={{
                position: "absolute",
                top: "10%",
                left: "40%",
                color: "white",
                fontSize: "24px",
                fontWeight: 700,
                pointerEvents: "none",
                userSelect: "none",
                display: "none",
              }}
            >
              Settings
            </div>

            <div
              id="high-contrast-label"
              style={{
                position: "absolute",
                top: "39%",
                left: "40%",
                color: "white",
                fontSize: "18px",
                fontWeight: 700,
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              High Contrast Mode
            </div>

            <div
              id="low-motion-label"
              style={{
                position: "absolute",
                top: "51%",
                left: "40%",
                color: "white",
                fontSize: "18px",
                fontWeight: 700,
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              Low Motion Mode
            </div>

            <div
              id="sound-label"
              style={{
                position: "absolute",
                top: "64%",
                left: "40%",
                color: "white",
                fontSize: "18px",
                fontWeight: 700,
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              Sound On/Off
            </div>
            
            <div
              onClick={(e) => {
                const buttons = ["settings-close", "settings-top", "settings-middle", "settings-bottom"];
                for (const btnId of buttons.reverse()) {
                  const imgElement = document.getElementById(btnId);
                  if (imgElement && isSettingsPixelVisible(btnId, e.clientX, e.clientY, imgElement)) {
                    handleSettingsButtonClick(btnId);
                    return;
                  }
                }
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                cursor: "pointer",
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
