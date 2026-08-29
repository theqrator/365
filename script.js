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
  let currentGalleryIndex = 0;

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

  // ★ 픽셀아트 방식으로 '365' 모양 그리드 생성
  function generateGridPoints() {
    const points = [];
    // 1은 사진이 들어갈 자리, 0은 빈 공간을 의미합니다. (3, 6, 5 형태)
    const mask = [
      "11101110111",
      "00101000100",
      "11101110111",
      "00101010001",
      "11101110111"
    ];
    const rows = mask.length;       // 5행
    const cols = mask[0].length;    // 11열
    
    const mosaicW = mosaic.clientWidth;
    const mosaicH = mosaic.clientHeight;
    
    // 화면 크기에 맞게 여백 설정
    const padding = window.innerWidth <= 700 ? 15 : 60;
    const availW = mosaicW - padding;
    const availH = mosaicH - padding;
    
    // '365' 전체 비율이 깨지지 않도록 정사각형 칸 크기 계산
    const cellW = availW / cols;
    const cellH = availH / rows;
    const size = Math.min(cellW, cellH);
    
    // 중앙 정렬을 위한 시작점
    const startX = (mosaicW - (size * cols)) / 2;
    const startY = (mosaicH - (size * rows)) / 2;

    const gap = size * 0.08; // 칸 사이 간격 (8%)
    const tileSize = size - gap;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // 마스크 값이 "1"인 곳에만 좌표 생성
        if (mask[r][c] === "1") {
          points.push({
            x: startX + c * size + size / 2,
            y: startY + r * size + size / 2,
            size: tileSize
          });
        }
      }
    }
    return points;
  }

  function render() {
    mosaic.innerHTML = "";
    tiles.length = 0;

    if (!files.length) {
      fallback.style.display = "flex";
      return;
    }
    fallback.style.display = "none";

    const points = generateGridPoints();

    points.forEach((point, index) => {
      // 365 모양을 채울 사진이 부족하면 다시 처음부터 순환하여 채움
      const fileIndex = index % files.length; 
      const fileToUse = files[fileIndex];

      const button = document.createElement("button");
      button.className = "tile";
      button.type = "button";

      button.style.left = `${point.x}px`;
      button.style.top = `${point.y}px`;
      button.style.width = `${point.size}px`;
      button.style.height = `${point.size}px`;

      const img = document.createElement("img");
      img.src = `images/${fileToUse}`;
      img.alt = `Gallery Image`;
      
      button.appendChild(img);
      button.addEventListener("click", () => openLightbox(fileIndex));
      
      mosaic.appendChild(button);
      tiles.push(button);
    });
  }

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
    currentGalleryIndex = (currentGalleryIndex + direction + files.length) % files.length;
    updateLightboxImage();
  }

  closeButton.addEventListener("click", closeLightbox);
  prevButton.addEventListener("click", (e) => { e.stopPropagation(); navigateGallery(-1); });
  nextButton.addEventListener("click", (e) => { e.stopPropagation(); navigateGallery(1); });
  
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") navigateGallery(-1);
    if (e.key === "ArrowRight") navigateGallery(1);
  });

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