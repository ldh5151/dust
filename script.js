// 선택한 시도의 실시간 측정값을 가져와 화면에 안전하게 표시합니다.
const REGIONS = ["전국", "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
const GRADE_LABELS = {
  "1": "좋음",
  "2": "보통",
  "3": "나쁨",
  "4": "매우 나쁨"
};

const regionSelect = document.querySelector("#region-select");
const averageTitle = document.querySelector("#average-title");
const averageValue = document.querySelector("#average-value");
const resultCount = document.querySelector("#result-count");
const statusMessage = document.querySelector("#status-message");
const stationList = document.querySelector("#station-list");

regionSelect.addEventListener("change", () => loadRegion(regionSelect.value));

function showStatus(message) {
  statusMessage.textContent = message;
  statusMessage.hidden = false;
}

function formatMeasurement(value) {
  if (value === null || value === undefined || String(value).trim() === "" || String(value).trim() === "-") {
    return "측정 안 됨";
  }
  return String(value);
}

function numericMeasurement(value) {
  if (value === null || value === undefined || String(value).trim() === "" || String(value).trim() === "-") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function createMeasurement(label, value, className = "") {
  const wrapper = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = value;
  if (className) description.className = className;
  wrapper.append(term, description);
  return wrapper;
}

function renderStations(items, region) {
  stationList.replaceChildren();
  const measurements = items
    .map((item) => numericMeasurement(item.pm10Value))
    .filter((value) => value !== null);
  const average = measurements.length
    ? Math.round(measurements.reduce((sum, value) => sum + value, 0) / measurements.length)
    : null;

  averageTitle.textContent = `${region} 미세먼지 평균`;
  averageValue.textContent = average === null ? "측정 안 됨" : String(average);
  resultCount.textContent = `측정소 ${items.length}곳`;
  statusMessage.hidden = items.length > 0;
  if (items.length === 0) {
    showStatus("선택한 지역의 측정 정보가 없습니다.");
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const item of items) {
    const grade = String(item.pm10Grade ?? "").trim();
    const gradeLabel = GRADE_LABELS[grade];
    const card = document.createElement("article");
    card.className = `station-card ${gradeLabel ? `grade-${grade}` : "grade-unknown"}`;

    const topline = document.createElement("div");
    topline.className = "card-topline";
    const name = document.createElement("h3");
    name.className = "station-name";
    name.textContent = item.stationName || "측정소 이름 없음";
    const badge = document.createElement("span");
    badge.className = "grade-badge";
    badge.textContent = gradeLabel || "등급 정보 없음";
    topline.append(name, badge);

    const list = document.createElement("dl");
    list.className = "measurement-list";
    list.append(
      createMeasurement("미세먼지", formatMeasurement(item.pm10Value)),
      createMeasurement("초미세먼지", formatMeasurement(item.pm25Value)),
      createMeasurement("측정 시각", formatMeasurement(item.dataTime), "time-value")
    );
    card.append(topline, list);
    fragment.append(card);
  }
  stationList.append(fragment);
}

async function loadRegion(region) {
  averageTitle.textContent = `${region} 미세먼지 평균`;
  averageValue.textContent = "--";
  resultCount.textContent = "정보를 불러오는 중입니다.";
  stationList.replaceChildren();
  showStatus("대기오염 정보를 불러오고 있습니다.");

  try {
    const requestedRegion = REGIONS.includes(region) ? region : "전국";
    const response = await fetch(`/api/dust?sido=${encodeURIComponent(requestedRegion)}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "대기오염 정보를 가져오지 못했습니다.");
    }

    const header = data?.response?.header;
    if (header?.resultCode && header.resultCode !== "00") {
      throw new Error(header.resultMsg || "대기오염 정보를 가져오지 못했습니다.");
    }
    const rawItems = data?.response?.body?.items?.item;
    const items = rawItems ? (Array.isArray(rawItems) ? rawItems : [rawItems]) : [];
    renderStations(items, region);
  } catch (error) {
    resultCount.textContent = "정보를 불러오지 못했습니다.";
    showStatus(`대기오염 정보를 불러오지 못했습니다. ${error.message}`);
  }
}

loadRegion(regionSelect.value);
