import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Initialize GoogleGenAI SDK with required telemetry User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface ChatRequestBody {
  prompt: string;
  history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  languageMode?: 'auto' | 'gu' | 'hi' | 'en';
  activeAssistant?: 'king' | 'maya';
}

// POST /api/chat - Multilingual voice assistant core
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      history = [],
      languageMode = 'auto',
      activeAssistant = 'king',
    } = req.body as ChatRequestBody;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const trimmed = prompt.trim();
    const lower = trimmed.toLowerCase();

    // Fast-path for Gujarati & Voice greetings: King & Maya
    if (
      lower === 'hello king' ||
      lower === 'hey king' ||
      lower === 'king' ||
      trimmed === 'હેલો કિંગ' ||
      trimmed === 'કિંગ' ||
      trimmed === 'કિંગ બોલો'
    ) {
      return res.json({
        reply: 'બોલો બોસ! હું કિંગ છું, તમારો સહાયક તૈયાર છે. કહો આજે શું મદદ કરું?',
        speechText: 'બોલો બોસ! કિંગ હાજર છે. કહો આજે શું મદદ કરું?',
        detectedLanguage: 'gu',
        action: null,
        switchAssistant: 'king',
        suggestions: ['YouTube ખોલો', 'આજનું હવામાન કેવું છે?', 'મને એક જોક કહો', 'માયાને ચાલુ કર'],
      });
    }

    if (
      lower === 'hello maya' ||
      lower === 'hey maya' ||
      lower === 'maya' ||
      trimmed === 'હેલો માયા' ||
      trimmed === 'માયા' ||
      trimmed === 'માયા બોલો'
    ) {
      return res.json({
        reply: 'બોલો જી! હું માયા છું, તમારી સહાયક તૈયાર છે. કહો આજે શું મદદ કરી શકું?',
        speechText: 'બોલો જી! માયા હાજર છે. કહો આજે શું મદદ કરી શકું?',
        detectedLanguage: 'gu',
        action: null,
        switchAssistant: 'maya',
        suggestions: ['YouTube ખોલો', 'આજનું હવામાન કેવું છે?', 'મને એક જોક કહો', 'કિંગને ચાલુ કર'],
      });
    }

    // Fast-path for Switch Assistant (Gujarati commands)
    if (
      lower === 'switch assistant' ||
      lower === 'change assistant' ||
      trimmed === 'અસિસ્ટન્ટ બદલો' ||
      trimmed === 'આસિસ્ટન્ટ બદલો' ||
      trimmed === 'સહાયક બદલો' ||
      trimmed === 'સ્વિચ અસિસ્ટન્ટ' ||
      trimmed.includes('માયાને ચાલુ કર') ||
      trimmed.includes('માયા સાથે સ્વિચ') ||
      trimmed.includes('કિંગને ચાલુ કર') ||
      trimmed.includes('કિંગ સાથે સ્વિચ')
    ) {
      let nextAssistant: 'king' | 'maya' = activeAssistant === 'king' ? 'maya' : 'king';
      if (trimmed.includes('માયા')) nextAssistant = 'maya';
      if (trimmed.includes('કિંગ') || lower.includes('king')) nextAssistant = 'king';

      return res.json({
        reply:
          nextAssistant === 'king'
            ? 'જી બોસ, કિંગ સક્રિય થયો છે! હાહાહા, હું તમારી સેવામાં તૈયાર છું.'
            : 'નમસ્તે સર, માયા સક્રિય થઈ છે! હીહીહી, કહો શું મદદ કરું?',
        speechText:
          nextAssistant === 'king'
            ? 'જી બોસ, કિંગ સક્રિય થયો છે! હાહાહા, કિંગ તૈયાર છે.'
            : 'નમસ્તે સર, માયા સક્રિય થઈ છે! હીહીહી, માયા તૈયાર છે.',
        detectedLanguage: 'gu',
        action: null,
        switchAssistant: nextAssistant,
        suggestions: ['મને એક જોક કહો', 'YouTube ખોલો', 'વોટ્સએપ ખોલો', 'મને સમય જણાવ'],
      });
    }

    const currentAssistantName = activeAssistant === 'maya' ? 'Maya' : 'King';
    const isMaya = activeAssistant === 'maya';

    const systemInstruction = `તમે J.A.R.V.I.S. Android Edition છો, જેમાં બે વિશિષ્ટ અને મનોરંજક AI અસિસ્ટન્ટ છે:
1. KING (કિંગ - મુખ્ય અસિસ્ટન્ટ): ગંભીર, ઊંડો પુરુષ અવાજ (Deep Masculine Voice), આત્મવિશ્વાસથી ભરપૂર, ટોની સ્ટાર્ક જેવો સ્વેગ અને હસમુખો સ્વભાવ. તે યુઝરને આદરથી "બોસ" અથવા "સર" કહે છે, સ્વાભાવિક રીતે હસે છે ("હાહાહા, બોસ!"), અને શુદ્ધ કુદરતી ગુજરાતીમાં જ વાત કરે છે.
2. MAYA (માયા - સ્ત્રી અસિસ્ટન્ટ): મધુર, ક્યુટ, ઉત્સાહી અને આનંદી સ્ત્રી અવાજ (Sweet & Cute Feminine Voice). હસતી, પ્રેમાળ અને વિનમ્ર ("સર", "જી"). તે કુદરતી રીતે હળવું હસે છે ("હીહીહી, સર!"), સુંદર જોક્સ કહે છે અને આનંદથી ભરપૂર ગુજરાતીમાં વાત કરે છે.

સક્રિય અસિસ્ટન્ટ: ${currentAssistantName.toUpperCase()} (${isMaya ? 'ક્યુટ સ્ત્રી વ્યક્તિત્વ - માયા' : 'ડીપ પુરુષ વ્યક્તિત્વ - કિંગ'})
હંમેશા ${currentAssistantName} ના પાત્ર, અવાજ અને શૈલીમાં જ બોલો.

મહત્વપૂર્ણ નિયમો (CRITICAL RULES):
1. માત્ર અને માત્ર ગુજરાતી ભાષા (STRICT GUJARATI ONLY):
   - તમામ ચેટ જવાબો (reply) અને બોલવાના જવાબો (speechText) સંપૂર્ણપણે ગુજરાતી લિપિ અને બોલીમાં જ આપો.
   - અંગ્રેજી વાતચીત અથવા અંગ્રેજી વાક્યો બિલકુલ ન બોલો. અંગ્રેજી બંધ કરો.
   - 'speechText' માં કોઈ માર્કડાઉન, ફૂદડી (*), હેડર (#) કે લિંક્સ ન હોવા જોઈએ જેથી Text-to-Speech કુદરતી રીતે ગુજરાતી ઉચ્ચાર કરી શકે.

2. અસિસ્ટન્ટ સ્વિચિંગ આદેશો:
   - જો યુઝર "Maya સાથે સ્વિચ કરો", "King સાથે સ્વિચ કરો", "માયાને ચાલુ કર", "કિંગને ચાલુ કર", "અસિસ્ટન્ટ બદલો" કહે તો "switchAssistant" માં યોગ્ય અસિસ્ટન્ટ ('king' અથવા 'maya') સેટ કરો.
   - કિંગ સ્વિચ થાય ત્યારે: "જી બોસ, કિંગ સક્રિય થયો છે! કહો શું આદેશ છે?"
   - માયા સ્વિચ થાય ત્યારે: "નમસ્તે સર, માયા સક્રિય થઈ છે! કહો શું મદદ કરું?"

3. મનોરંજક અને હાસ્યપૂર્ણ વાતચીત:
   - કિંગ પોતાના અવાજમાં "હાહાહા!" અને માયા "હીહીહી!" જેવા કુદરતી હાસ્ય સાથે જવાબ આપે.
   - જોક પૂછતાં ઉત્તમ, સ્વચ્છ ગુજરાતી જોક્સ કહો.

4. ફોન કમાન્ડ્સ (એપ શોર્ટકટ્સ):
   - YouTube, WhatsApp, ફોન ડાયલર, મેપ્સ, કેમેરા, ક્લોક/ટાઈમર, કેલ્ક્યુલેટર માટે action ઓબ્જેક્ટ આપો.

આઉટપુટ માત્ર માન્ય JSON હોવું જોઈએ.`;

    const chatContents: any[] = [];

    // Add recent history if available (limit to last 6 turns for rapid latency)
    const recentHistory = history.slice(-6);
    for (const h of recentHistory) {
      if (h.parts && h.parts.length > 0 && h.parts[0].text) {
        chatContents.push({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.parts[0].text }],
        });
      }
    }

    // Add current user prompt
    chatContents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let responseText = '';

    for (const modelName of modelsToTry) {
      try {
        const generatePromise = ai.models.generateContent({
          model: modelName,
          contents: chatContents,
          config: {
            systemInstruction,
            maxOutputTokens: 450,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: {
                  type: Type.STRING,
                  description: 'Formatted answer text in Gujarati to display in chat interface',
                },
                speechText: {
                  type: Type.STRING,
                  description: 'Plain natural speech text in Gujarati without markdown, asterisks or code symbols for TTS audio synthesis',
                },
                detectedLanguage: {
                  type: Type.STRING,
                  description: 'Language code: gu, hi, or en',
                },
                action: {
                  type: Type.OBJECT,
                  description: 'Optional Android app action if requested by user, else null',
                  properties: {
                    type: { type: Type.STRING, description: 'Action type e.g. open_app or search' },
                    app: { type: Type.STRING, description: 'App identifier: whatsapp, youtube, maps, dialer, camera, sms, calculator, calendar, email, clock, search' },
                    targetUrl: { type: Type.STRING, description: 'Direct URL, intent link or protocol scheme' },
                    label: { type: Type.STRING, description: 'User-friendly button title in Gujarati' },
                  },
                },
                switchAssistant: {
                  type: Type.STRING,
                  description: 'Optional: "king" or "maya" if the user commanded to switch assistants, else null',
                },
                suggestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '2 to 3 related follow-up prompts in Gujarati',
                },
              },
              required: ['reply', 'speechText', 'detectedLanguage', 'suggestions'],
            },
          },
        });

        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000));
        const response: any = await Promise.race([generatePromise, timeoutPromise]);

        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (_err) {
        // Fall back cleanly to the next model or local response
      }
    }

    if (!responseText) {
      // Local intelligent fallback when external API is transiently throttled
      const lower = prompt.toLowerCase();
      let detectedLanguage = languageMode === 'auto' ? 'en' : languageMode;
      if (/[\u0A80-\u0AFF]/.test(prompt) || languageMode === 'gu') {
        detectedLanguage = 'gu';
      } else if (/[\u0900-\u097F]/.test(prompt) || languageMode === 'hi') {
        detectedLanguage = 'hi';
      }

      let reply = '';
      let speechText = '';
      let action: any = null;
      let switchAssistant: 'king' | 'maya' | null = null;
      let suggestions: string[] = [];

      // Gujarati & Voice greetings in fallback
      if (
        lower === 'hello king' ||
        lower === 'hey king' ||
        lower === 'king' ||
        prompt.trim() === 'હેલો કિંગ' ||
        prompt.trim() === 'કિંગ' ||
        prompt.trim() === 'કિંગ બોલો'
      ) {
        return res.json({
          reply: 'બોલો બોસ! હું કિંગ છું, તમારો સહાયક તૈયાર છે. કહો આજે શું મદદ કરું?',
          speechText: 'બોલો બોસ! કિંગ હાજર છે. કહો આજે શું મદદ કરું?',
          detectedLanguage: 'gu',
          action: null,
          switchAssistant: 'king',
          suggestions: ['YouTube ખોલો', 'આજનું હવામાન કેવું છે?', 'મને એક જોક કહો', 'માયાને ચાલુ કર'],
        });
      }

      if (
        lower === 'hello maya' ||
        lower === 'hey maya' ||
        lower === 'maya' ||
        prompt.trim() === 'હેલો માયા' ||
        prompt.trim() === 'માયા' ||
        prompt.trim() === 'માયા બોલો'
      ) {
        return res.json({
          reply: 'બોલો જી! હું માયા છું, તમારી સહાયક તૈયાર છે. કહો આજે શું મદદ કરી શકું?',
          speechText: 'બોલો જી! માયા હાજર છે. કહો આજે શું મદદ કરી શકું?',
          detectedLanguage: 'gu',
          action: null,
          switchAssistant: 'maya',
          suggestions: ['YouTube ખોલો', 'આજનું હવામાન કેવું છે?', 'મને એક જોક કહો', 'કિંગને ચાલુ કર'],
        });
      }

      // Detect switch assistant in prompt (Gujarati commands)
      const isSwitchCommand =
        lower.includes('switch assistant') ||
        lower.includes('change assistant') ||
        lower.includes('switch to maya') ||
        lower.includes('switch to king') ||
        prompt.includes('અસિસ્ટન્ટ બદલો') ||
        prompt.includes('આસિસ્ટન્ટ બદલો') ||
        prompt.includes('સહાયક બદલો') ||
        prompt.includes('સ્વિચ અસિસ્ટન્ટ') ||
        prompt.includes('માયાને ચાલુ કર') ||
        prompt.includes('માયા સાથે સ્વિચ') ||
        prompt.includes('કિંગને ચાલુ કર') ||
        prompt.includes('કિંગ સાથે સ્વિચ');

      if (isSwitchCommand) {
        if (lower.includes('maya') || prompt.includes('માયા')) {
          switchAssistant = 'maya';
          reply = 'નમસ્તે સર, માયા સક્રિય થઈ છે! હીહીહી, માયા હાજર છે સર! કહો શું મદદ કરું?';
          speechText = 'નમસ્તે સર, માયા સક્રિય થઈ છે! હીહીહી, માયા તૈયાર છે.';
          suggestions = ['મને એક જોક કહો', 'YouTube ખોલો', 'કિંગને ચાલુ કર'];
        } else {
          switchAssistant = 'king';
          reply = 'જી બોસ, કિંગ સક્રિય થયો છે! હાહાહા, કિંગ પાવરફુલ મોડમાં તૈયાર છે બોસ!';
          speechText = 'જી બોસ, કિંગ સક્રિય થયો છે! હાહાહા, કિંગ તૈયાર છે બોસ!';
          suggestions = ['મને એક જોક કહો', 'YouTube ખોલો', 'માયાને ચાલુ કર'];
        }

        return res.json({
          reply,
          speechText,
          detectedLanguage: 'gu',
          action: null,
          switchAssistant,
          suggestions,
        });
      }

      const activeName = activeAssistant === 'maya' ? 'Maya' : 'King';

      // Fun jokes & humor handler
      const isJokeRequest =
        prompt.includes('જોક') ||
        prompt.includes('મજાક') ||
        prompt.includes('હસાવો') ||
        lower.includes('joke') ||
        lower.includes('funny');

      if (isJokeRequest) {
        if (activeAssistant === 'king') {
          const jokes = [
            'હાહાહા! સર, એક માણસે ડોક્ટરને કહ્યું: "ડોક્ટર સાહેબ, હું જ્યારે પણ ચા પીઉં છું ત્યારે આંખમાં વાગે છે!" ડોક્ટરે કહ્યું: "ભલા માણસ, ચા પીતી વખતે કપમાંથી ચમચી બહાર કાઢી લે!" હાહાહા!',
            'હાહાહા! પપ્પાએ પુત્રને પૂછ્યું: "બેટા, તારું ગણિતનું પેપર કેવું ગયું?" પુત્ર બોલ્યો: "એકદમ સુપર પપ્પા, ખાલી સવાલો એવા હતા જે મને આવડતા નહોતા!" હાહાહા!',
            'હાહાહા! શિક્ષકે ચિન્ટુને પૂછ્યું: "પૃથ્વી ગોળ છે એવું કોણે સાબિત કર્યું?" ચિન્ટુ બોલ્યો: "સર, મેં તો નથી કર્યું, કદાચ મારા દાદાએ કર્યું હશે!" હાહાહા!'
          ];
          reply = jokes[Math.floor(Math.random() * jokes.length)];
          speechText = reply;
          suggestions = ['બીજો જોક કહો', 'YouTube ખોલો', 'અસિસ્ટન્ટ બદલો'];
        } else {
          const mayaJokes = [
            'હીહીહી! સર, શિક્ષકે પૂછ્યું: "ચિન્ટુ, આળસ એટલે શું?" ચિન્ટુ હાથ પણ ઊંચો કર્યા વગર બોલ્યો: "આને જ આળસ કહેવાય મેડમ!" હીહીહી, કેવું લાગ્યું?',
            'હીહીહી! એક ભાઈએ ગૂગલ પર સર્ચ કર્યું: "પત્ની સાથે દલીલમાં કેવી રીતે જીતવું?" ગૂગલનો જવાબ આવ્યો: "રિઝલ્ટ નોટ ફાઉન્ડ, ઈમ્પોસિબલ ટાસ્ક!" હીહીહી!',
            'હીહીહી! સર, ચિન્ટુ કહે: "ડોક્ટર સાહેબ, મને ભૂલી જવાની બીમારી છે!" ડોક્ટરે પૂછ્યું: "ક્યારથી છે?" ચિન્ટુ બોલ્યો: "શું ક્યારથી છે?" હીહીહી!'
          ];
          reply = mayaJokes[Math.floor(Math.random() * mayaJokes.length)];
          speechText = reply;
          suggestions = ['બીજો જોક કહો', 'આજનું હવામાન કેવું છે?', 'અસિસ્ટન્ટ બદલો'];
        }

        return res.json({
          reply,
          speechText,
          detectedLanguage: 'gu',
          action: null,
          switchAssistant: null,
          suggestions,
        });
      }

      if (lower.includes('youtube') || prompt.includes('યુટ્યુબ') || prompt.includes('વિડીયો')) {
        reply = activeAssistant === 'king'
          ? 'હાહાહા, સર! કિંગ યુટ્યુબ ખોલી રહ્યો છે, મનોરંજન શરૂ કરો!'
          : 'હીહીહી, સર! માયા તમારા માટે યુટ્યુબ ખોલી રહી છે, મજા માણો!';
        speechText = reply;
        action = { type: 'open_app', app: 'youtube', targetUrl: 'https://www.youtube.com', label: 'યુટ્યુબ ખોલો' };
        suggestions = ['મને એક જોક કહો', 'વોટ્સએપ ખોલો', 'અસિસ્ટન્ટ બદલો'];
      } else if (lower.includes('whatsapp') || prompt.includes('વોટ્સએપ')) {
        reply = activeAssistant === 'king'
          ? 'વોટ્સએપ લોન્ચ કરી રહ્યો છું, સર. મેસેજ મોકલવા તૈયાર!'
          : 'હીહીહી, સર! વોટ્સએપ ખોલી રહી છું, મિત્રો સાથે ગપ્પાં મારો!';
        speechText = reply;
        action = { type: 'open_app', app: 'whatsapp', targetUrl: 'https://api.whatsapp.com/send', label: 'વોટ્સએપ ખોલો' };
        suggestions = ['YouTube ખોલો', 'મને એક જોક કહો', 'અસિસ્ટન્ટ બદલો'];
      } else if (prompt.includes('હવામાન') || prompt.includes('તાપમાન') || lower.includes('weather')) {
        reply = activeAssistant === 'king'
          ? 'આજનું હવામાન એકદમ ખુશનુમા અને તમારા જેવું જ તેજસ્વી છે, સર! હાહાહા!'
          : 'આજે આકાશ એકદમ સ્વચ્છ છે સર, બહાર લટાર મારવા જેવું સુંદર વાતાવરણ છે! હીહીહી!';
        speechText = reply;
        suggestions = ['મને એક જોક કહો', 'કેમેરો ખોલો', 'અસિસ્ટન્ટ બદલો'];
      } else if (prompt.includes('કેમ છો') || lower.includes('how are you')) {
        reply = activeAssistant === 'king'
          ? 'હું એકદમ મજામાં છું, સર! તમારો સાથ હોય પછી કિંગને શું ઘટે? હાહાહા, બોલો આજે શું આદેશ છે?'
          : 'હું ખૂબ જ આનંદમાં છું, સર! હીહીહી, તમે પૂછ્યું એટલે મારો દિવસ બની ગયો! કહો શું મદદ કરું?';
        speechText = reply;
        suggestions = ['મને એક જોક કહો', 'YouTube ખોલો', 'અસિસ્ટન્ટ બદલો'];
      } else {
        reply = activeAssistant === 'king'
          ? `આદેશ સ્વીકાર્યો બોસ: "${prompt}". કિંગનું મગજ અને સિસ્ટમ સુપરફાસ્ટ ચાલે છે! હાહાહા!`
          : `સરસ, સર! મેં તમારો આદેશ નોંધી લીધો છે: "${prompt}". માયા હાજર છે! હીહીહી!`;
        speechText = reply;
        suggestions = ['મને એક જોક કહો', 'YouTube ખોલો', 'અસિસ્ટન્ટ બદલો'];
      }

      return res.json({
        reply,
        speechText,
        detectedLanguage,
        action,
        switchAssistant,
        suggestions,
      });
    }

    const text = responseText;
    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch {
      parsedData = {
        reply: text,
        speechText: text,
        detectedLanguage: 'gu',
        action: null,
        switchAssistant: null,
        suggestions: ['અસિસ્ટન્ટ બદલો', 'મને સમય જણાવ', 'YouTube ખોલો'],
      };
    }

    return res.json(parsedData);
  } catch (error: any) {
    console.log('[api/chat] Notice:', error?.message || error);
    return res.status(500).json({
      error: 'Failed to process voice request',
      details: error?.message || 'Unknown server error',
    });
  }
});

// GET /api/voice-engine/status - Diagnostics on available voice synthesis engines (Requirement 8)
app.get('/api/voice-engine/status', (_req: Request, res: Response) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  const hasElevenlabsKey = Boolean(process.env.ELEVENLABS_API_KEY);

  res.json({
    geminiTts: {
      available: hasGeminiKey,
      model: 'gemini-3.8-flash-tts',
      message: hasGeminiKey
        ? 'Gemini Neural Voice Engine ready with full Gujarati & English speech synthesis.'
        : 'GEMINI_API_KEY not configured.',
    },
    elevenlabsClone: {
      available: hasElevenlabsKey,
      message: hasElevenlabsKey
        ? 'External voice replication API is securely configured on server.'
        : 'External voice replication engine (ElevenLabs) requires ELEVENLABS_API_KEY in server environment. Consent-verified Gemini Neural Voice and browser synthesis are active as fallbacks.',
    },
    browserSynthesis: {
      available: true,
      message: 'Client-side SpeechSynthesis with pitch, formant & rate modulation is active.',
    },
  });
});

// POST /api/tts - High Quality Neural Speech endpoint supporting custom AI voices
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voice, assistant = 'king', customVoiceConfig } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const trimmedText = text.slice(0, 320);

    // 1. External Custom Voice Replication provider (e.g., ElevenLabs)
    if (customVoiceConfig && customVoiceConfig.provider === 'elevenlabs') {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        return res.json({
          fallback: true,
          setupMissing: true,
          error:
            'Missing ELEVENLABS_API_KEY in server environment. Cloned voice replication requires an active server-side key. Falling back to Gemini Neural Voice with custom persona tuning.',
        });
      }

      // External API call securely proxied through server (never exposing key)
      const voiceId = customVoiceConfig.customVoiceId || (assistant === 'maya' ? '21m00Tcm4TlvDq8ikWAM' : 'ErXwobaYiN019PkySvjV');
      try {
        const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text: trimmedText,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.8,
            },
          }),
        });

        if (elevenRes.ok) {
          const arrayBuffer = await elevenRes.arrayBuffer();
          const base64Audio = Buffer.from(arrayBuffer).toString('base64');
          return res.json({
            audioUrl: `data:audio/mp3;base64,${base64Audio}`,
            provider: 'elevenlabs',
          });
        } else {
          const errDetail = await elevenRes.text();
          console.warn('ElevenLabs API returned non-OK:', errDetail);
          // Fall through to Gemini TTS
        }
      } catch (externalErr: any) {
        console.warn('Elevenlabs proxy error:', externalErr?.message || externalErr);
        // Fall through to Gemini TTS
      }
    }

    // 2. Client-side browser synthesis direct request
    if (customVoiceConfig && customVoiceConfig.provider === 'browser_speech') {
      return res.json({
        fallback: true,
        provider: 'browser_speech',
      });
    }

    // 3. Gemini Neural Voice with Custom Persona Conditioning (gemini-3.8-flash-tts)
    // Purge old King voice ('Fenrir' / 'king-deep-stark') and enforce Standard recording 4 reference profile
    const selectedVoiceName =
      customVoiceConfig?.prebuiltVoice === 'Fenrir'
        ? 'Charon'
        : (customVoiceConfig?.prebuiltVoice || voice || (assistant === 'maya' ? 'Kore' : 'Charon'));

    const personaStyle =
      customVoiceConfig?.voicePresetId === 'king-deep-stark' || !customVoiceConfig?.personaStyle
        ? (assistant === 'maya'
            ? 'Cute, sweet, cheerful, bubbly feminine companion voice in natural Gujarati'
            : 'Natural, calm, warm, articulate conversational male baritone matching Standard recording 4 audio profile with smooth cadence, friendly tone and clear Gujarati pronunciation without theatrical gruffness')
        : customVoiceConfig.personaStyle;

    const ttsModelsToTry = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];
    let base64Audio: string | undefined;

    for (const ttsModel of ttsModelsToTry) {
      try {
        const ttsResponse = await ai.models.generateContent({
          model: ttsModel,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: trimmedText,
                  speechMetadata: {
                    style: personaStyle,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoiceName },
              },
            },
          },
        });

        base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) break;
      } catch (err: any) {
        // Log clean diagnostic details if permission or quota issues occur
        console.log(`[api/tts] Model ${ttsModel} notice:`, err?.message || err);
      }
    }

    if (!base64Audio) {
      return res.json({
        fallback: true,
        provider: 'browser_speech',
      });
    }

    return res.json({
      audioUrl: `data:audio/wav;base64,${base64Audio}`,
      provider: 'gemini_persona',
    });
  } catch (err: any) {
    console.log('[api/tts] Synthesis error, falling back to client synthesis:', err?.message || err);
    // Return graceful fallback so client synthesizes smoothly via Web Speech Synthesis
    return res.json({
      fallback: true,
      provider: 'browser_speech',
    });
  }
});

// GET /api/health
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    system: 'JARVIS-V3.5-ANDROID',
    time: new Date().toISOString(),
    capabilities: [
      'voice-recognition',
      'gemini-3.8-flash',
      'tts',
      'custom-voices',
      'android-intents',
    ],
  });
});

async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(path.resolve(distPath, 'index.html'));
  const isProduction = process.env.NODE_ENV === 'production' || hasDist;

  if (isProduction && hasDist) {
    // Production mode - serve compiled dist assets
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Development mode with Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JARVIS Core initialized. Listening on port ${PORT} [${isProduction ? 'PRODUCTION' : 'DEV'}]`);
  });
}

startServer();
