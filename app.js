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

function poolFor(filter) {
  return filter === "all" ? PARAGRAPHS : PARAGRAPHS.filter((p) => p.category === filter);
}

const categoryLabels = {
  story: "Hikaye",
  engineering: "Mühendislik",
};

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

    if (btn.dataset.tab !== "listening") {
      speechSynthesis.cancel();
      setPlayButtonState(false);
    }
  });
});

// ---- Words sekmesi ----
const WORDS_PER_PAGE = 6;
const wordsBag = createBag(WORDS);

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

// ---- Reading sekmesi ----
let readingBags = {};
function getReadingBag(filter) {
  if (!readingBags[filter]) readingBags[filter] = createBag(poolFor(filter));
  return readingBags[filter];
}

const readingCard = document.getElementById("reading-card");
const refreshReadingBtn = document.getElementById("refresh-reading");
const toggleReadingTr = document.getElementById("toggle-reading-tr");
const readingFilterButtons = document.querySelectorAll("#reading .filter-btn");
let currentReadingFilter = "all";

function renderReading() {
  const [item] = getReadingBag(currentReadingFilter).draw(1);
  readingCard.innerHTML = `
    <span class="badge ${item.category}">${categoryLabels[item.category]}</span>
    <h2>${item.title}</h2>
    <h3>${item.titleTr}</h3>
    <p class="en-text">${item.en}</p>
    <p class="tr-text ${toggleReadingTr.checked ? "" : "hidden"}">${item.tr}</p>
  `;
}

refreshReadingBtn.addEventListener("click", renderReading);

toggleReadingTr.addEventListener("change", () => {
  const trText = readingCard.querySelector(".tr-text");
  if (trText) trText.classList.toggle("hidden", !toggleReadingTr.checked);
});

readingFilterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    readingFilterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentReadingFilter = btn.dataset.filter;
    renderReading();
  });
});

// ---- Listening sekmesi ----
let listeningBags = {};
function getListeningBag(filter) {
  if (!listeningBags[filter]) listeningBags[filter] = createBag(poolFor(filter));
  return listeningBags[filter];
}

const listeningCard = document.getElementById("listening-card");
const refreshListeningBtn = document.getElementById("refresh-listening");
const playListeningBtn = document.getElementById("play-listening");
const toggleListeningText = document.getElementById("toggle-listening-text");
const listeningFilterButtons = document.querySelectorAll("#listening .filter-btn");
let currentListeningFilter = "all";
let currentListeningItem = null;

const speechSupported = "speechSynthesis" in window;

function setPlayButtonState(isSpeaking) {
  playListeningBtn.textContent = isSpeaking ? "⏹️ Durdur" : "▶️ Dinle";
}

function renderListening() {
  speechSynthesis.cancel();
  setPlayButtonState(false);
  [currentListeningItem] = getListeningBag(currentListeningFilter).draw(1);
  const item = currentListeningItem;
  listeningCard.innerHTML = `
    <span class="badge ${item.category}">${categoryLabels[item.category]}</span>
    <h2>${item.title}</h2>
    <h3>${item.titleTr}</h3>
    <p class="en-text listening-text ${toggleListeningText.checked ? "" : "hidden"}">${item.en}</p>
  `;
}

function toggleSpeech() {
  if (!speechSupported) {
    alert("Tarayıcınız sesli okumayı desteklemiyor.");
    return;
  }
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    setPlayButtonState(false);
    return;
  }
  const utterance = new SpeechSynthesisUtterance(currentListeningItem.en);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  utterance.onend = () => setPlayButtonState(false);
  utterance.onerror = () => setPlayButtonState(false);
  speechSynthesis.speak(utterance);
  setPlayButtonState(true);
}

refreshListeningBtn.addEventListener("click", renderListening);
playListeningBtn.addEventListener("click", toggleSpeech);

toggleListeningText.addEventListener("change", () => {
  const text = listeningCard.querySelector(".listening-text");
  if (text) text.classList.toggle("hidden", !toggleListeningText.checked);
});

listeningFilterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    listeningFilterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentListeningFilter = btn.dataset.filter;
    renderListening();
  });
});

// ---- İlk yükleme ----
renderWords();
renderReading();
renderListening();
