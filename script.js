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

  // 레퍼런스 이미지와 같은 우상단 계단식 그리드 생성 (총 48칸)
  function generateGridPoints() {
    const points = [];
    const cols = 10;
    const rows = 7;
    // 각 행(row)마다 왼쪽에서 몇 칸을 비울지 결정하는 마스크 (우상단 폭포수 형태)
    const emptyCellsFromLeft = [0, 0, 1, 3, 4, 6, 8]; 
    
    const mosaicW = mosaic.clientWidth;
    const mosaicH = mosaic.clientHeight;
    
    const padding = window.innerWidth <= 700 ? 10 : 40;
    const availW = mosaicW - padding;
    const availH = mosaicH - padding;
    
    // 화면 비율에 맞춰 완벽한 정사각형 셀 크기 계산
    const cellW = availW / cols;
    const cellH = availH / rows;
    const size = Math.min(cellW, cellH);
    
    // 갤러리 전체를 화면 중앙에 정렬하기 위한 시작점
    const startX = (mosaicW - (size * cols)) / 2;
    const startY = (mosaicH - (size * rows)) / 2;

    const gap = size * 0.05; // 사진 사이의 간격 (5%)
    const tileSize = size - gap;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // 빈 공간 조건을 통과한 칸(우상단)에만 사진 배치
        if (c >= emptyCellsFromLeft[r]) {
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