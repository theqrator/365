(() => {
  const mosaic = document.getElementById("mosaic");
  const fallback = document.getElementById("fallbackMessage");
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const closeButton = document.getElementById("closeButton");

  let files = Array.isArray(window.IMAGE_FILES) && window.IMAGE_FILES.length > 0 
              ? window.IMAGE_FILES.filter(Boolean) 
              : [];
  const tiles = [];
  let highlightTimer = null;

  // 로딩 속도를 대폭 개선한 이미지 탐색기
  async function discoverNumberedImages() {
    if (files.length > 0) return files; 

    const extensions = ["jpg", "jpeg", "png", "webp", "gif"];
    const found = [];
    const maxFiles = 999;
    let emptyStreak = 0;

    for (let n = 1; n <= maxFiles; n++) {
      let foundThisNumber = false;
      // 이미지 여러 확장자를 동시에 빠르게 체크
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
        foundThisNumber = true;
        emptyStreak = 0;
      } else {
        emptyStreak++;
        // 빈 번호가 3번 연속으로 나오면 더 이상 파일이 없다고 판단하고 즉시 종료 (로딩 단축)
        if (emptyStreak >= 3) break;
      }
    }
    files = found;
    return files;
  }

  // 365 텍스트 모양을 크고 빽빽하게 생성
  function make365Points() {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 560;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 폰트 크기를 키워 화면에 꽉 차게 만듭니다
    const fontSize = 460;
    ctx.font = `900 ${fontSize}px Inter, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";

    ctx.fillText("365", canvas.width / 2, canvas.height / 2 + 15);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const candidates = [];

    // 간격을 좁혀서 점들을 촘촘하게 추출 (약 200~250개의 점 생성)
    const step = 14; 
    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        const red = data[(y * canvas.width + x) * 4];
        if (alpha > 0 && red > 100) {
          candidates.push({ x, y });
        }
      }
    }
    return candidates;
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

    const points = shuffleForNaturalLook(choosePoints());

    // 점의 개수만큼 반복하며 사진 배치 (사진이 모자라면 배열을 처음부터 다시 반복)
    points.forEach((point, index) => {
      const fileToUse = files[index % files.length]; // 핵심: 남는 자리는 사진을 반복해서 채움

      const button = document.createElement("button");
      button.className = "tile";
      button.type = "button";

      // 사진 기본 크기
      const sizeBase = window.innerWidth <= 700 ? 38 : 54;
      const size = sizeBase + ((index * 13) % 20);

      button.style.left = `${point.x}px`;
      button.style.top = `${point.y}px`;
      button.style.width = `${size}px`;
      button.style.height = `${size}px`;
      
      const rotation = ((index * 37) % 9) - 4;
      button.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
      button.style.setProperty('--rotation', `${rotation}deg`);

      const img = document.createElement("img");
      img.src = `images/${fileToUse}`;
      img.alt = `Gallery Image`;
      
      button.appendChild(img);
      
      // 클릭 시 해당 이미지 파일명을 넘겨줌
      button.addEventListener("click", () => openLightbox(fileToUse));
      
      mosaic.appendChild(button);
      tiles.push(button);
    });
  }

  // 파일명을 직접 받아서 모달 띄우기
  function openLightbox(fileName) {
    lightboxImage.src = `images/${fileName}`;
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

  // 30초마다 랜덤으로 커지고 5초 유지
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