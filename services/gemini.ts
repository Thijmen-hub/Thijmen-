import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key ontbreekt. Zorg dat process.env.API_KEY is ingesteld.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateText = async (userInput: string): Promise<string> => {
  try {
    const ai = getClient();
    
    const prompt = `Je bent een backend API die JSON teruggeeft voor een Scam Checker dashboard.
Analyseer de volgende input op fraude, phishing en veiligheidsrisico's.

Input om te analyseren:
"${userInput}"

Geef GEEN markdown opmaak. Geef ALLEEN een valide JSON object terug met exact deze structuur:

{
  "score": nummer 0-100 (waarbij 100 zeker scam is en 0 zeker veilig),
  "riskLevel": "LAAG", "MIDDEN" of "HOOG",
  "summary": "Een korte samenvatting van 1 of 2 zinnen over de conclusie.",
  "checks": [
    {
      "category": "URL & Domein",
      "status": "safe", "warning" of "danger",
      "detail": "Uitleg over domein controle..."
    },
    {
      "category": "Taal & Grammatica",
      "status": "safe", "warning" of "danger",
      "detail": "Uitleg over taalgebruik..."
    },
    {
      "category": "Urgentie & Druk",
      "status": "safe", "warning" of "danger",
      "detail": "Wordt er druk uitgeoefend?"
    },
    {
      "category": "Imitatie & Afzender",
      "status": "safe", "warning" of "danger",
      "detail": "Lijkt het op een bekend bedrijf?"
    }
  ],
  "brokenLinks": ["lijst", "van", "kapotte", "urls", "of", "leeg"],
  "tips": ["tip 1", "tip 2", "tip 3", "max 5 tips, gericht op jongeren"]
}

Zorg dat de analyse streng is. Controleer specifiek op broken links of malgevormde URL's en zet die in de 'brokenLinks' array.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "Je bent een expert in cyber security. Je antwoordt altijd in valide JSON formaat."
      }
    });
    
    return response.text || "{}";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Er is een fout opgetreden bij de scam-analyse.");
  }
};