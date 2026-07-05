// ---- Yardımcı: Fisher-Yates shuffle ----
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- "Shuffle bag": havuz bitmeden hiçbir öğe tekrar etmez ----
function createBag(items) {
  let bag = [];
  return {
    draw(count) {
      const drawn = [];
      while (drawn.length < count) {
        if (bag.length === 0) bag = shuffle(items);
        drawn.push(bag.pop());
      }
      return drawn;
    },
  };
}

const WORDS_PER_PAGE = 6;
const wordsBag = createBag(WORDS);
let paragraphBags = {}; // her kategori filtresi için ayrı torba

function getParagraphBag(filter) {
  if (!paragraphBags[filter]) {
    const pool = filter === "all" ? PARAGRAPHS : PARAGRAPHS.filter((p) => p.category === filter);
    paragraphBags[filter] = createBag(pool);
  }
  return paragraphBags[filter];
}

// ---- Sekme geçişi ----
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    tabPanels.forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// ---- Kelimeler sekmesi ----
const wordsGrid = document.getElementById("words-grid");
const toggleTr = document.getElementById("toggle-tr");
const refreshWordsBtn = document.getElementById("refresh-words");

function renderWordCard(item) {
  const card = document.createElement("div");
  card.className = "word-card";
  card.innerHTML = `
    <p class="en-word">${item.word}</p>
    <p class="tr-word ${toggleTr.checked ? "" : "hidden"}">${item.tr}</p>
    <div class="word-row">
      <span>Eş anlamlı:</span>
      <span class="chip-list">${item.syn.map((s) => `<span class="chip syn">${s}</span>`).join("")}</span>
    </div>
    <div class="word-row">
      <span>Zıt anlamlı:</span>
      <span class="chip-list">${item.ant.map((a) => `<span class="chip ant">${a}</span>`).join("")}</span>
    </div>
    <div class="example-box">
      <p class="ex-en">"${item.ex}"</p>
      <p class="ex-tr ${toggleTr.checked ? "" : "hidden"}">${item.exTr}</p>
    </div>
  `;
  return card;
}

function renderWords() {
  const picked = wordsBag.draw(WORDS_PER_PAGE);
  wordsGrid.innerHTML = "";
  picked.forEach((item) => wordsGrid.appendChild(renderWordCard(item)));
}

refreshWordsBtn.addEventListener("click", renderWords);
toggleTr.addEventListener("change", () => {
  document.querySelectorAll(".tr-word, .ex-tr").forEach((el) => {
    el.classList.toggle("hidden", !toggleTr.checked);
  });
});

// ---- Paragraflar sekmesi ----
const paragraphCard = document.getElementById("paragraph-card");
const refreshParagraphBtn = document.getElementById("refresh-paragraph");
const toggleParagraphTr = document.getElementById("toggle-paragraph-tr");
const filterButtons = document.querySelectorAll(".filter-btn");
let currentFilter = "all";

const categoryLabels = {
  story: "Hikaye",
  engineering: "Mühendislik",
};

function renderParagraph() {
  const [item] = getParagraphBag(currentFilter).draw(1);
  paragraphCard.innerHTML = `
    <span class="badge ${item.category}">${categoryLabels[item.category]}</span>
    <h2>${item.title}</h2>
    <h3>${item.titleTr}</h3>
    <p class="en-text">${item.en}</p>
    <p class="tr-text ${toggleParagraphTr.checked ? "" : "hidden"}">${item.tr}</p>
  `;
}

refreshParagraphBtn.addEventListener("click", renderParagraph);

toggleParagraphTr.addEventListener("change", () => {
  const trText = paragraphCard.querySelector(".tr-text");
  if (trText) trText.classList.toggle("hidden", !toggleParagraphTr.checked);
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderParagraph();
  });
});

// ---- İlk yükleme ----
renderWords();
renderParagraph();
