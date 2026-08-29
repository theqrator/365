(() => {
  const mosaic = document.getElementById("mosaic");
  const fallback = document.getElementById("fallbackMessage");
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const closeButton = document.getElementById("closeButton");

  let files = [];
  const tiles = [];
  let highlightTimer = null;

  async function discoverNumberedImages() {
    const extensions = ["jpg", "jpeg", "png", "webp", "gif"];
    const found = [];
    const maxFiles = 999;
    let emptyStreak = 0;

    for (let n = 1; n <= maxFiles; n++) {
      let foundThisNumber = false;
      for (const ext of extensions) {
        const name = `(${n}).${ext}`;
        try {
          const response = await fetch(`images/${encodeURIComponent(name)}`, { method: "HEAD", cache: "no-store" });
          if (response.ok) {
            found.push(name);
            foundThisNumber = true;
            break;
          }
        } catch (_) {}
      }
      if (foundThisNumber) {
        emptyStreak = 0;
      } else {
        emptyStreak++;
        if (emptyStreak >= 8 && found.length > 0) break;
      }
    }
    files = found;
    return files;
  }

  // 원래 코드의 '365' 글자 좌표 추출 함수 복구
  function make365Points(count) {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 560;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const fontSize = 410;
    ctx.font = `900 ${fontSize}px Inter, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";

    ctx.fillText("365", canvas.width / 2, canvas.height / 2 + 15);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const candidates = [];

    const step = 11;
    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        const red = data[(y * canvas.width + x) * 4];
        if (alpha > 0 && red > 100) {
          candidates.push({ x, y });
        }
      }
    }

    const target = Math.min(Math.max(count * 1.8, 60), 420);
    const selected = [];
    const stride = Math.max(1, Math.floor(candidates.length / target));

    for (let i = 0; i < candidates.length && selected.length < target; i += stride) {
      selected.push(candidates[i]);
    }

    return selected;
  }

  function choosePoints(count) {
    const raw = make365Points(count);
    const w = mosaic.clientWidth;
    const h = mosaic.clientHeight;

    return raw.map((p, i) => ({
      x: (p.x / 1200) * w,
      y: (p.y / 560) * h,
      i
    }));
  }

  function shuffleForNaturalLook(arr) {
    return arr.map((p, i) => ({
      ...p,
      x: p.x + ((i * 17) % 9 - 4),
      y: p.y + ((i * 29) % 9 - 4)
    }));
  }

  function render() {
    mosaic.innerHTML = "";
    tiles.length = 0;

    if (!files.length) {
      fallback.style.display = "flex";
      return;
    }
    fallback.style.display = "none";

    const points = shuffleForNaturalLook(choosePoints(files.length));

    files.forEach((file, index) => {
      const point = points[index % points.length];
      const button = document.createElement("button");
      button.className = "tile";
      button.type = "button";

      const sizeBase = window.innerWidth <= 700 ? 38 : 54;
      const size = sizeBase + ((index * 13) % 20);

      button.style.left = `${point.x}px`;
      button.style.top = `${point.y}px`;
      button.style.width = `${size}px`;
      button.style.height = `${size}px`;
      
      // 약간의 랜덤 회전값 유지
      button.style.transform = `translate(-50%, -50%) rotate(${((index * 37) % 9) - 4}deg)`;
      // CSS에서 덮어씌워지는 것을 방지하기 위해 CSS 변수 사용
      button.style.setProperty('--rotation', `${((index * 37) % 9) - 4}deg`);

      const img = document.createElement("img");
      img.src = `images/${file}`;
      img.alt = `Gallery Image ${index + 1}`;
      
      button.appendChild(img);
      button.addEventListener("click", () => openLightbox(index));
      mosaic.appendChild(button);
      tiles.push(button);
    });
  }

  function openLightbox(index) {
    if (!files[index]) return;
    lightboxImage.src = `images/${files[index]}`;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "auto";
    lightboxImage.src = "";
  }

  closeButton.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });

  // 패턴을 랜덤으로 하여 30초마다 1장씩 커지고 5초 후 작아짐
  function startRandomHighlight() {
    clearInterval(highlightTimer);
    if (!tiles.length) return;

    highlightTimer = setInterval(() => {
      tiles.forEach(t => t.classList.remove("is-highlighted"));

      // 랜덤 타일 선택
      const randomIndex = Math.floor(Math.random() * tiles.length);
      const tile = tiles[randomIndex];

      tile.classList.add("is-highlighted");

      setTimeout(() => {
        tile.classList.remove("is-highlighted");
      }, 5000);
    }, 30000);
  }

  window.addEventListener("resize", () => {
    render();
    startRandomHighlight();
  });

  async function init() {
    await discoverNumberedImages();
    render();
    startRandomHighlight();
  }

  init();
})();
