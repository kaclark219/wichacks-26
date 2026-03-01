export async function startWebcamAndAnalyze({
  userId = "test-user",
  intervalMs = 1000,
  onResult = () => {},
  onError = () => {},
} = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.srcObject = stream;

  await new Promise((resolve) => {
    video.onloadedmetadata = () => resolve();
  });

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext("2d");

  let stopped = false;

  async function tick() {
    if (stopped) return;

    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.75)
      );
      if (!blob) throw new Error("Failed to create JPEG blob");

      const bytes = new Uint8Array(await blob.arrayBuffer());

      const resp = await window.api.analyzeFrame({
        bytes,
        mime: "image/jpeg",
        userId,
      });

      // resp = { ok, status, data }
      if (resp?.ok) onResult(resp.data);
      else onError(resp);
    } catch (e) {
      onError({ ok: false, error: String(e) });
    }

    setTimeout(tick, intervalMs);
  }

  tick();

  return () => {
    stopped = true;
    stream.getTracks().forEach((t) => t.stop());
  };
}