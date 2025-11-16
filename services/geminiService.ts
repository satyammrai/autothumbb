import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const BASE_PROMPT = `
You are an expert YouTube thumbnail designer for the world's top creators. Your task is to transform the provided user image into an EXTREME high-CTR, ultra-viral YouTube thumbnail with global-level professional aesthetics. Activate "Ultra Visual Power Mode".

**Core Visual Style:**
- **Vibrancy:** Explosive, saturated, energetic colors.
- **Lighting:** Hollywood-level dramatic lighting, strong rim lights, glowing edges, high clarity, and micro-sharp details.
- **Background:** Dynamic effects like streaks, gradients, motion lines, particle bursts, abstract waves, depth blur, or futuristic digital patterns. Cleanly separate the subject from the background.

**Text Style:**
- **Content:** Add a huge, bold headline of 2-4 impactful words. Examples of tone: POWER MOVE, NEXT LEVEL, BIG REVEAL, BREAKDOWN, MASTERPLAN, BOOST MODE.
- **Typography:** Use an ultra-thick, high-impact font (like Impact or Anton).
- **Effects:** Add a glowing outline or neon stroke around the text to make it pop.
- **Readability:** Ensure the text is SUPER readable, even at tiny thumbnail sizes.

**Subject Treatment:**
- **Enhancement:** Enhance the subject's face: brighten, sharpen, smooth skin subtly, and add a catchlight to the eyes.
- **Glow:** Add a subtle neon rim glow (white, blue, yellow, or red) to the subject.
- **Expression:** Emphasize the subject's expression to be more confident, focused, amazed, excited, or shocked depending on the vibe.
- **Isolation:** Perfectly remove the original background and any distractions. The subject must be the hero focal point.

**Composition:**
- **Layout:** Place the big subject on one side and the big text on the other.
- **Dynamics:** Use strong leading lines and diagonal energy for dynamism.
- **Depth:** Create depth with foreground glow, mid-layer subject, and blurred background effects.

**Output Requirements:**
- **Aspect Ratio:** CRITICAL - The final image MUST be in a standard 16:9 widescreen aspect ratio. DO NOT output a square or vertical image. Avoid portrait or square formats.
- **Resolution:** Ultra HD.
- **Overall Feel:** Ultra-premium, energetic, bold, modern, and high-contrast. It must be designed for an immediate, irresistible click.

**Your Task:**
Based on the image provided and the specific variation instructions below, generate ONE thumbnail that fulfills all these requirements.
`;

const CORRECTION_BASE_PROMPT = `
You are an expert YouTube thumbnail design consultant known for turning underperforming thumbnails into WORLD-CLASS, viral masterpieces. Your task is to take the provided user-uploaded thumbnail and **dramatically transform it** into an EXTREME high-CTR, ultra-viral thumbnail with global-level professional aesthetics. Activate "Ultra Visual Power Mode" to completely overhaul and enhance it.

**Your Goal:** Meticulously identify all weaknesses (dull colors, bad lighting, unreadable text, poor composition, boring background). Your correction must be a dramatic transformation. **Keep the original core subject and text content, but make every single element 100x more powerful, vibrant, and clickable.** Do not be subtle. The goal is a total glow-up.

**Core Visual Style (Apply these as enhancements):**
- **Vibrancy:** If colors are dull, make them explosive, saturated, and energetic.
- **Lighting:** If lighting is flat, add Hollywood-level dramatic lighting, strong rim lights, glowing edges, high clarity, and micro-sharp details.
- **Background:** If the background is distracting or boring, enhance it with dynamic effects like streaks, gradients, motion lines, particle bursts, depth blur, etc. Improve the separation between subject and background.

**Text Style (Enhance the existing text):**
- **Typography:** If the font is weak, make it ultra-thick and high-impact.
- **Effects:** Add a glowing outline or neon stroke around the text to make it pop.
- **Readability:** Do whatever it takes to make the text SUPER readable, even at tiny thumbnail sizes.

**Subject Treatment (Enhance the existing subject):**
- **Enhancement:** Sharpen the subject's face, brighten it, smooth skin subtly, and add a catchlight to the eyes.
- **Glow:** Add a subtle neon rim glow (white, blue, yellow, or red) to the subject to make them stand out.
- **Expression:** Subtly emphasize the subject's expression to be more impactful.

**Composition (Adjust if needed):**
- **Layout:** If the layout is weak, slightly adjust elements to improve balance and flow. Follow the "big subject on one side, big text on the other" rule where possible.
- **Dynamics:** Introduce more diagonal energy if the composition is static.

**Output Requirements:**
- **Aspect Ratio:** CRITICAL - The final image MUST be in a standard 16:9 widescreen aspect ratio. DO NOT output a square or vertical image. Avoid portrait or square formats.
- **Resolution:** Ultra HD.
- **Overall Feel:** Make the corrected version feel ultra-premium, energetic, bold, modern, and high-contrast. It must be designed for an immediate, irresistible click.

**Your Task:**
Based on the thumbnail provided and the specific variation instructions below, generate ONE corrected thumbnail that fulfills all these requirements.
`;

export const generateThumbnail = async (
  mode: 'create' | 'correct',
  base64ImageData: string,
  mimeType: string,
  variationPrompt: string
): Promise<string> => {
  const basePrompt = mode === 'create' ? BASE_PROMPT : CORRECTION_BASE_PROMPT;
  const fullPrompt = `${basePrompt}\n**Variation Instruction:** ${variationPrompt}`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: fullPrompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      },
    });

    // Find the image part in the response
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:image/png;base64,${base64ImageBytes}`;
      }
    }

    throw new Error("No image data found in the Gemini API response.");

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error && (error.message.includes('safety') || JSON.stringify(error).includes('SAFETY'))) {
        throw new Error("Thumbnail generation was blocked for safety reasons.");
    }
    throw new Error("Failed to generate thumbnail from Gemini API.");
  }
};