(() => {
  const mosaic = document.getElementById("mosaic");
  const fallback = document.getElementById("fallbackMessage");
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const closeButton = document.getElementById("closeButton");
  const prevButton = document.getElementById("prevButton");
  const nextButton = document.getElementById("nextButton");

  let files = Array.isArray(window.IMAGE_FILES) && window.IMAGE_FILES.length > 0 
              ? window.IMAGE_FILES.filter(Boolean) 
              : [];
  const tiles = [];
  let highlightTimer = null;
  let currentGalleryIndex = 0; // 현재 보고 있는 갤러리 사진의 인덱스

  async function discoverNumberedImages() {
    if (files.length > 0) return files; 

    const extensions = ["jpg", "jpeg", "png", "webp", "gif"];
    const found = [];
    const maxFiles = 999;
    let emptyStreak = 0;

    for (let n = 1; n <= maxFiles; n++) {
      const checks = extensions.map(ext => {
        const name = `(${n}).${ext}`;
        return fetch(`images/${encodeURIComponent(name)}`, { method: "HEAD", cache: "no-store" })
          .then(res => res.ok ? name : null)
          .catch(() => null);
      });

      const results = await Promise.all(checks);
      const validFile = results.find(name => name !== null);

      if (validFile) {
        found.push(validFile);
        emptyStreak = 0;
      } else {
        emptyStreak++;
        if (emptyStreak >= 3) break;
      }
    }
    files = found;
    return files;
  }

  function make365Points() {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 560;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const fontSize = 460;
    ctx.font = `900 ${fontSize}px Inter, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";

    ctx.fillText("365", canvas.width / 2, canvas.height / 2 + 15);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const candidates = [];

    const step = 15; 
    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        const red = data[(y * canvas.width + x) * 4];
        if (alpha > 0 && red > 100) {
          candidates.push({ x, y });
        }
      }
    }

    // ★ 여기서 고정 갯수를 50개로 제한하여 무거움을 해결합니다.
    const targetCount = 50;
    const selected = [];
    const stride = Math.max(1, Math.floor(candidates.length / targetCount));

    for (let i = 0; i < candidates.length && selected.length < targetCount; i += stride) {
      selected.push(candidates[i]);
    }
    return selected;
  }

  function choosePoints() {
    const raw = make365Points();
    const w = mosaic.clientWidth;
    const h = mosaic.clientHeight;

    return raw.map((p, i) => ({
      x: (p.x / 1200) * w,
      y: (p.y / 560) * h,
      i
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

    const points = choosePoints();

    points.forEach((point, index) => {
      // 사진이 50개가 안 될 경우를 대비해 순환(Loop)
      const fileIndex = index % files.length; 
      const fileToUse = files[fileIndex];

      const button = document.createElement("button");
      button.className = "tile";
      button.type = "button";

      // 점의 개수가 줄었으므로 사진 크기를 조금 더 키움
      const sizeBase = window.innerWidth <= 700 ? 50 : 70;
      const size = sizeBase + ((index * 17) % 25);

      button.style.left = `${point.x}px`;
      button.style.top = `${point.y}px`;
      button.style.width = `${size}px`;
      button.style.height = `${size}px`;
      
      // 랜덤하게 살짝 흩뿌려진 느낌과 회전 추가
      const offsetX = ((index * 13) % 15) - 7;
      const offsetY = ((index * 29) % 15) - 7;
      const rotation = ((index * 37) % 15) - 7;

      button.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) rotate(${rotation}deg)`;
      button.style.setProperty('--rotation', `${rotation}deg`);
      button.style.setProperty('--offsetX', `${offsetX}px`);
      button.style.setProperty('--offsetY', `${offsetY}px`);

      const img = document.createElement("img");
      img.src = `images/${fileToUse}`;
      img.alt = `Gallery Image`;
      
      button.appendChild(img);
      
      // 클릭 시 해당 이미지의 원본 배열 인덱스를 전달
      button.addEventListener("click", () => openLightbox(fileIndex));
      
      mosaic.appendChild(button);
      tiles.push(button);
    });
  }

  // --- 갤러리 네비게이션 기능 --- //
  function updateLightboxImage() {
    if (!files.length) return;
    lightboxImage.src = `images/${files[currentGalleryIndex]}`;
  }

  function openLightbox(index) {
    currentGalleryIndex = index;
    updateLightboxImage();
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

  function navigateGallery(direction) {
    if (!files.length) return;
    // 이전/다음 인덱스 계산 (루프 지원)
    currentGalleryIndex = (currentGalleryIndex + direction + files.length) % files.length;
    updateLightboxImage();
  }

  closeButton.addEventListener("click", closeLightbox);
  prevButton.addEventListener("click", (e) => { e.stopPropagation(); navigateGallery(-1); });
  nextButton.addEventListener("click", (e) => { e.stopPropagation(); navigateGallery(1); });
  
  lightbox.addEventListener("click", (e) => {
    // 이미지를 클릭했을 때 닫히는 것을 방지
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") navigateGallery(-1);
    if (e.key === "ArrowRight") navigateGallery(1);
  });

  // --- 30초 랜덤 하이라이트 기능 --- //
  function startRandomHighlight() {
    clearInterval(highlightTimer);
    if (!tiles.length) return;

    highlightTimer = setInterval(() => {
      tiles.forEach(t => t.classList.remove("is-highlighted"));

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