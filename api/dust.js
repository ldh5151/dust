// 에어코리아 요청을 대신 수행해 인증키가 브라우저에 노출되지 않도록 합니다.
const AIRKOREA_URL = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesure";

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "GET 요청만 사용할 수 있습니다." });
  }

  const serviceKey = process.env.AIRKOREA_KEY;
  if (!serviceKey) {
    return res.status(500).json({ message: "서버 환경변수 AIRKOREA_KEY를 설정해주세요." });
  }

  const requestedRegion = req.query && req.query.sido;
  const sido = typeof requestedRegion === "string" && requestedRegion.trim()
    ? requestedRegion.trim()
    : "서울";
  const requestUrl = `${AIRKOREA_URL}?serviceKey=${encodeURIComponent(serviceKey)}&returnType=json&sidoName=${encodeURIComponent(sido)}&numOfRows=100&pageNo=1&ver=1.3`;

  try {
    const upstreamResponse = await fetch(requestUrl);
    const responseText = await upstreamResponse.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      return res.status(502).json({ message: "인증키 또는 요청값을 확인해주세요" });
    }

    const resultCode = data && data.response && data.response.header && data.response.header.resultCode;
    if (!upstreamResponse.ok || resultCode !== "00") {
      return res.status(502).json({
        message: "대기오염 정보를 가져오지 못했습니다. 인증키, 요청값 또는 서비스 상태를 확인해주세요."
      });
    }

    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ message: "대기오염 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요." });
  }
};
