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

import { startWebcamAndAnalyze } from "./webcamTest";

export default function App() {
  const [pong, setPong] = useState("");
  const [shapeLoaded, setShapeLoaded] = useState(false);
  const [shapeError, setShapeError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [toggleState, setToggleState] = useState(false);
  const [toggleTransitioning, setToggleTransitioning] = useState(false);
  const [buttonCanvases, setButtonCanvases] = useState({});
  const [hoveredButton, setHoveredButton] = useState(null);

  // pomodoro timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState("work"); // work or break
  const [workDuration, setWorkDuration] = useState(25 * 60); // 25 mins
  const [breakDuration, setBreakDuration] = useState(5 * 60); // 5 mins
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);

  const [backendData, setBackendData] = useState(null);
  const [backendErr, setBackendErr] = useState(null);

  const stopWebcamRef = useRef(null);

  // button configs
  const getToggleImage = () => {
    if (toggleTransitioning) return toggleTransitionBtn;
    return toggleState ? toggleOnBtn : toggleOffBtn;
  };

  const buttonConfigs = [
    { id: "play", image: playBtn },
    { id: "pause", image: pauseBtn },
    { id: "stop", image: stopBtn },
    { id: "settings", image: settingsBtn },
    { id: "close", image: closeBtn },
    { id: "toggle", image: getToggleImage() },
    { id: "timer", image: timerBckgrnd },
  ];

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
  }, [toggleState, toggleTransitioning]);

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

  const handleContainerClick = (event) => {
    // checking each button z pos
    for (let i = buttonConfigs.length - 1; i >= 0; i--) {
      const btn = buttonConfigs[i];
      const imgElement = document.getElementById(`btn-${btn.id}`);
      if (imgElement && isPixelVisible(btn.id, event.clientX, event.clientY, imgElement)) {
        handleButtonClick(btn.id);
        return;
      }
    }
  };

  const handleButtonClick = (buttonId) => {
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
        break;
      case "close":
        console.log("Close clicked");
        window.api?.closeWindow?.();
        break;
      case "toggle":
        console.log("Toggle clicked");
        setToggleTransitioning(true);
        setTimeout(() => {
          setToggleState(!toggleState);
          setToggleTransitioning(false);
        }, 200);
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

  useEffect(() => {
    const image = new Image();
    image.src = "./background.png";

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
  }, []);

useEffect(() => {
  const shouldAnalyze = timerRunning && currentPhase === "work";

  // If we should analyze and we're not already running -> start
  if (shouldAnalyze && !stopWebcamRef.current) {
    (async () => {
      try {
        const stopFn = await startWebcamAndAnalyze({
          userId: "demo",
          intervalMs: 1000,
          onResult: (data) => {
            setBackendData(data);
            setBackendErr(null);
          },
          onError: (err) => {
            setBackendErr(err);
          },
        });

        stopWebcamRef.current = stopFn;
      } catch (e) {
        setBackendErr({ ok: false, error: String(e) });
      }
    })();
  }

  // If we should NOT analyze and it IS running -> stop
  if (!shouldAnalyze && stopWebcamRef.current) {
    stopWebcamRef.current();        // stops the loop + releases camera
    stopWebcamRef.current = null;
  }

  // Cleanup on unmount
  return () => {
    if (stopWebcamRef.current) {
      stopWebcamRef.current();
      stopWebcamRef.current = null;
    }
  };
}, [timerRunning, currentPhase]);

useEffect(() => {
  console.log("window.api keys:", Object.keys(window.api || {}));
}, []);



  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        margin: 0,
        padding: 0,
        boxSizing: "border-box",
        backgroundColor: "transparent",
        backgroundImage: shapeLoaded ? "url('./background.png')" : "none",
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
            ...(btn.id !== "timer" && hoveredButton === btn.id && {
              transform: "scale(1.05)",
              transition: "transform 0.2s ease-out",
            }),
            ...(btn.id !== "timer" && hoveredButton !== btn.id && {
              transition: "transform 0.2s ease-out",
            }),
          }}
          alt={btn.id}
          aria-label={btn.id}
        />
      ))}

      {shapeLoaded && (
        <div
          onClick={handleContainerClick}
          onMouseMove={(e) => {
            for (let i = buttonConfigs.length - 1; i >= 0; i--) {
              const btn = buttonConfigs[i];
              if (btn.id === "timer" || btn.id === "toggle") continue;
              const imgElement = document.getElementById(`btn-${btn.id}`);
              if (imgElement && isPixelVisible(btn.id, e.clientX, e.clientY, imgElement)) {
                setHoveredButton(btn.id);
                return;
              }
            }
            setHoveredButton(null);
          }}
          onMouseLeave={() => setHoveredButton(null)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            cursor: "pointer",
            WebkitAppRegion: "no-drag",
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

      {backendData.tamagotchi && (
        <>
          <div style={{ marginTop: 6, fontWeight: "bold" }}>Tamagotchi</div>
          <div>focus: {backendData.tamagotchi.focus}%</div>
          <div>mood: {backendData.tamagotchi.mood}</div>
          <div>status: {backendData.tamagotchi.last_status}</div>
        </>
      )}
    </>
  )}
</div>
    </div>
  );
}
