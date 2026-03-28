import { GoogleGenAI, Modality, ThinkingLevel } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export type VoiceOption = 'Fenrir' | 'Zephyr' | 'Kore' | 'Puck' | 'Charon';
export type DeliveryStyle = 'enthusiastic' | 'calm' | 'dramatic' | 'formal' | 'nostalgic' | 'humorous' | 'epic';
export type LanguageOption = 'saudi' | 'kuwaiti' | 'emirati' | 'egyptian' | 'levantine' | 'english';

export type LengthOption = 'short' | 'medium' | 'long';

export const LANGUAGE_OPTIONS: { id: LanguageOption; name: string; flag: string; description: string }[] = [
  { id: 'saudi', name: 'سعودي (نبطي)', flag: '🇸🇦', description: 'لهجة نجد والحجاز الأصيلة' },
  { id: 'kuwaiti', name: 'كويتي', flag: '🇰🇼', description: 'لهجة الكويت العريقة' },
  { id: 'emirati', name: 'إماراتي', flag: '🇦🇪', description: 'لهجة الإمارات الفخمة' },
  { id: 'egyptian', name: 'مصري', flag: '🇪🇬', description: 'لهجة مصر المحبوبة' },
  { id: 'levantine', name: 'شامي', flag: '🇸🇾', description: 'لهجة بلاد الشام الرقيقة' },
  { id: 'english', name: 'English', flag: '🇺🇸', description: 'Modern English Lyrics' },
];

export const VOICE_OPTIONS: { id: VoiceOption; name: string; description: string }[] = [
  { id: 'Fenrir', name: 'صوت حماسي', description: 'مناسب للشيلات القوية والترحيبية' },
  { id: 'Zephyr', name: 'صوت هادئ', description: 'مناسب للقصائد الوجدانية والمدح' },
  { id: 'Kore', name: 'صوت رزين', description: 'مناسب للقصائد الرسمية والمناسبات الكبيرة' },
  { id: 'Puck', name: 'صوت شبابي', description: 'مناسب للحفلات والزواجات الشبابية' },
  { id: 'Charon', name: 'صوت عميق', description: 'مناسب لقصائد الفخر والاعتزاز' },
];

export const DELIVERY_STYLES: { id: DeliveryStyle; name: string; icon: string }[] = [
  { id: 'enthusiastic', name: 'حماسي', icon: '🔥' },
  { id: 'calm', name: 'هادئ', icon: '🍃' },
  { id: 'dramatic', name: 'درامي/مؤثر', icon: '🎭' },
  { id: 'formal', name: 'رسمي/فخم', icon: '🏛️' },
  { id: 'nostalgic', name: 'تراثي/قديم', icon: '📻' },
  { id: 'humorous', name: 'فكاهي/مرح', icon: '😄' },
  { id: 'epic', name: 'ملحمي/قوي', icon: '⚔️' },
];

export async function generateShilatLyrics(topic: string, occasionType: string = 'زواج', language: LanguageOption = 'saudi', length: LengthOption = 'medium') {
  const model = "gemini-3-flash-preview";
  
  const lengthPrompts: Record<LengthOption, string> = {
    short: "عدد الأبيات/الأسطر: من 4 إلى 6.",
    medium: "عدد الأبيات/الأسطر: من 8 إلى 12.",
    long: "عدد الأبيات/الأسطر: من 16 إلى 20."
  };

  const languagePrompts: Record<LanguageOption, string> = {
    saudi: "لهجة سعودية بيضاء أصيلة، فخمة، وجزلة. استخدم مفردات بدوية أصيلة.",
    kuwaiti: "لهجة كويتية عريقة، استخدم مفردات كويتية أصيلة وأسلوب شعري كويتي.",
    emirati: "لهجة إماراتية فخمة، استخدم مفردات إماراتية أصيلة وأسلوب شعري إماراتي.",
    egyptian: "لهجة مصرية عامية، بأسلوب غنائي شعبي أو طربي حسب المناسبة.",
    levantine: "لهجة شامية رقيقة، بأسلوب شعري شامي (زجل أو قصيدة عامية).",
    english: "Modern English lyrics, with a rhythmic and poetic flow suitable for a song or anthem."
  };

  const systemInstruction = `أنت "خوارزمية الشعر المتقدمة"، محاكي ذكاء اصطناعي فائق التطور متخصص في الأدب الشعبي والغنائي.
  مهمتك هي كتابة قصائد أو كلمات أغاني بجودة تضاهي كبار الشعراء.
  
  يجب أن تلتزم بالقواعد التالية لضمان "التركيز العالي":
  1. اللغة/اللهجة: ${languagePrompts[language]}
  2. الوزن والقافية: الالتزام التام بقواعد الشعر المناسبة للغة المختارة.
  3. الهيكل: ابدأ باستهلال مناسب، ثم صلب الموضوع، ثم خاتمة.
  4. التنسيق: كل بيت أو سطر في سطر واحد، وإذا كان شعراً عربياً يفصل بين الشطرين علامة " | ".`;

  const prompt = `اكتب كلمات (بند التركيز العالي) لمناسبة: "${occasionType}" وبموضوع: "${topic}" باللغة/اللهجة: "${language}".
  المطلوب:
  - الالتزام التام بالقواعد الشعرية.
  - استخدام مفردات قوية ومعبرة.
  - ${lengthPrompts[length]}`;

  try {
    const response = await ai.models.generateContent({
      model,
      config: {
        systemInstruction,
        temperature: 0.7, // Lower temperature for better structural consistency
        topP: 0.9,
        maxOutputTokens: 1500,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW
        }
      },
      contents: [{ parts: [{ text: prompt }] }],
    });

    if (!response.text) {
      throw new Error("لم يتمكن الذكاء الاصطناعي من صياغة القصيدة، يرجى تجربة موضوع آخر أو المحاولة لاحقاً.");
    }

    return response.text;
  } catch (error: any) {
    console.error("Lyrics Generation Error:", error);
    
    // Check for specific API errors if possible
    if (error?.message?.includes("quota")) {
      throw new Error("تم تجاوز الحصة المجانية للذكاء الاصطناعي، يرجى المحاولة غداً.");
    }
    
    // Fallback to flash if pro fails
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });
      return fallbackResponse.text || "";
    } catch (fallbackError) {
      throw new Error("حدث خطأ في الاتصال بخوادم الذكاء الاصطناعي، يرجى التأكد من اتصالك بالإنترنت.");
    }
  }
}

export async function* generateShilatLyricsStream(topic: string, occasionType: string = 'زواج', language: LanguageOption = 'saudi', length: LengthOption = 'medium') {
  const model = "gemini-3-flash-preview";
  
  const lengthPrompts: Record<LengthOption, string> = {
    short: "عدد الأبيات/الأسطر: من 4 إلى 6.",
    medium: "عدد الأبيات/الأسطر: من 8 إلى 12.",
    long: "عدد الأبيات/الأسطر: من 16 إلى 20."
  };

  const languagePrompts: Record<LanguageOption, string> = {
    saudi: "لهجة سعودية بيضاء أصيلة، فخمة، وجزلة. استخدم مفردات بدوية أصيلة.",
    kuwaiti: "لهجة كويتية عريقة، استخدم مفردات كويتية أصيلة وأسلوب شعري كويتي.",
    emirati: "لهجة إماراتية فخمة، استخدم مفردات إماراتية أصيلة وأسلوب شعري إماراتي.",
    egyptian: "لهجة مصرية عامية، بأسلوب غنائي شعبي أو طربي حسب المناسبة.",
    levantine: "لهجة شامية رقيقة، بأسلوب شعري شامي (زجل أو قصيدة عامية).",
    english: "Modern English lyrics, with a rhythmic and poetic flow suitable for a song or anthem."
  };

  const systemInstruction = `أنت "خوارزمية الشعر المتقدمة"، محاكي ذكاء اصطناعي فائق التطور متخصص في الأدب الشعبي والغنائي.
  مهمتك هي كتابة قصائد أو كلمات أغاني بجودة تضاهي كبار الشعراء.
  
  يجب أن تلتزم بالقواعد التالية لضمان "التركيز العالي":
  1. اللغة/اللهجة: ${languagePrompts[language]}
  2. الوزن والقافية: الالتزام التام بقواعد الشعر المناسبة للغة المختارة.
  3. الهيكل: ابدأ باستهلال مناسب، ثم صلب الموضوع، ثم خاتمة.
  4. التنسيق: كل بيت أو سطر في سطر واحد، وإذا كان شعراً عربياً يفصل بين الشطرين علامة " | ".`;

  const prompt = `اكتب كلمات (بند التركيز العالي) لمناسبة: "${occasionType}" وبموضوع: "${topic}" باللغة/اللهجة: "${language}".
  المطلوب:
  - الالتزام التام بالقواعد الشعرية.
  - استخدام مفردات قوية ومعبرة.
  - ${lengthPrompts[length]}`;

  try {
    const response = await ai.models.generateContentStream({
      model,
      config: {
        systemInstruction,
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 1500,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW
        }
      },
      contents: [{ parts: [{ text: prompt }] }],
    });

    for await (const chunk of response) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error: any) {
    console.error("Lyrics Streaming Error:", error);
    throw error;
  }
}

export async function generateShilatAudio(lyrics: string, voiceName: VoiceOption = 'Fenrir', style: DeliveryStyle = 'enthusiastic', language: LanguageOption = 'saudi', pitch: number = 1, modulation: number = 1) {
  if (!lyrics || lyrics.trim().length < 10) {
    throw new Error(language === 'english' ? "The lyrics are too short or missing." : "القصيدة قصيرة جداً أو غير موجودة لتوليد الصوت.");
  }
  
  const model = "gemini-2.5-flash-preview-tts";
  
  const stylePrompts: Record<DeliveryStyle, string> = {
    enthusiastic: language === 'english' ? "in an enthusiastic, high-energy style" : "بأسلوب حماسي جداً، سريع الإيقاع، وجزل يناسب الشيلات القوية",
    calm: language === 'english' ? "in a calm, soothing style" : "بأسلوب هادئ، رزين، ووقور يناسب القصائد الوجدانية والمدح الهادئ",
    dramatic: language === 'english' ? "in a dramatic and emotional style" : "بأسلوب درامي ومؤثر، مع التركيز على المشاعر والوقفات التأثيرية",
    formal: language === 'english' ? "in a formal, professional style" : "بأسلوب رسمي فخم، مخارج حروف دقيقة جداً، وأداء ملكي يليق بالمناسبات الكبرى",
    nostalgic: language === 'english' ? "in a nostalgic, vintage style" : "بأسلوب تراثي قديم، يذكرنا بالماضي الجميل، مع نبرة حنين دافئة",
    humorous: language === 'english' ? "in a humorous, lighthearted style" : "بأسلوب فكاهي مرح، خفيف الظل، وسريع الوقع لرسم الابتسامة",
    epic: language === 'english' ? "in an epic, powerful style" : "بأسلوب ملحمي أسطوري، صوت جهوري قوي، يبعث على الفخر والهيبة"
  };

  const styleInstructions: Record<DeliveryStyle, string> = {
    enthusiastic: language === 'english' ? "You are an enthusiastic performer with high energy." : "أنت مؤدي شيلات حماسي جداً، صوتك قوي ومليء بالطاقة.",
    calm: language === 'english' ? "You are a calm and soothing performer." : "أنت مؤدي قصائد هادئ ورزين، صوتك مريح ووقور.",
    dramatic: language === 'english' ? "You are a dramatic and emotional performer." : "أنت مؤدي قصائد درامي ومؤثر، صوتك يفيض بالمشاعر والوقفات التأثيرية.",
    formal: language === 'english' ? "You are a formal and professional performer." : "أنت مؤدي شيلات رسمي وفخم، صوتك ملكي ومخارج حروفك دقيقة جداً.",
    nostalgic: language === 'english' ? "You are a nostalgic performer with a vintage feel." : "أنت مؤدي قصائد تراثي، صوتك يحمل نبرة الحنين والارتباط بالماضي العريق.",
    humorous: language === 'english' ? "You are a humorous and lighthearted performer." : "أنت مؤدي قصائد فكاهي ومرح، أداؤك خفيف ومبهج.",
    epic: language === 'english' ? "You are an epic and powerful performer." : "أنت مؤدي شيلات ملحمي، صوتك جهوري، ضخم، ويوحي بالعظمة والقوة."
  };

  // تحسين التنظيف لضمان أفضل أداء صوتي
  const cleanLyrics = lyrics
    .replace(/[*#]/g, '')
    .replace(/\|/g, ', ') // استبدال الفواصل بوقفات طبيعية
    .replace(/\n\n/g, '. ')
    .replace(/\n/g, '. ')
    .trim();

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ 
        parts: [{ 
          text: language === 'english' 
            ? `Perform these lyrics ${stylePrompts[style]} with pitch level ${pitch} and modulation level ${modulation}, ensuring clear pronunciation and natural rhythm: \n\n${cleanLyrics}`
            : `ألقِ هذه الكلمات ${stylePrompts[style]}، مع ضبط طبقة الصوت على مستوى ${pitch} وتعديل نبرة الأداء على مستوى ${modulation}، ومراعاة اللهجة والوضوح التام في مخارج الحروف لضمان أداء احترافي: \n\n${cleanLyrics}` 
        }] 
      }],
      config: {
        systemInstruction: styleInstructions[style],
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/mpeg;base64,${base64Audio}`;
    }
    throw new Error("لم يتمكن النظام من تحويل النص إلى صوت، يرجى المحاولة مرة أخرى.");
  } catch (error: any) {
    console.error("Gemini TTS Error:", error);
    if (error?.message?.includes("quota")) {
      throw new Error("تم تجاوز الحصة المجانية لتوليد الصوت، يرجى المحاولة غداً.");
    }
    throw new Error(error.message || "فشل في توليد الصوت بسبب خطأ تقني.");
  }
}

export async function generateShilatPreviewImage(topic: string, occasion: string, language: LanguageOption = 'saudi') {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `A high-quality, cinematic, and artistic social media preview image for a ${language === 'english' ? 'song' : 'traditional Arabic song/Shila'}. 
            Language/Dialect: ${language}.
            Occasion: ${occasion}. 
            Topic: ${topic}. 
            The style should be elegant, with cultural elements matching the ${language} context. 
            No text in the image, just the atmosphere. 
            Rich colors, professional lighting, 16:9 aspect ratio.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Image Generation Error:", error);
  }
  return null;
}

export async function generateVoicePreview(voiceName: VoiceOption, style: DeliveryStyle = 'enthusiastic', lyricsSnippet?: string, language: LanguageOption = 'saudi') {
  const model = "gemini-2.5-flash-preview-tts";
  
  const styleInstructions: Record<DeliveryStyle, string> = {
    enthusiastic: language === 'english' ? "You are an enthusiastic performer." : "أنت مؤدي شيلات حماسي جداً، صوتك قوي ومليء بالطاقة.",
    calm: language === 'english' ? "You are a calm performer." : "أنت مؤدي قصائد هادئ ورزين، صوتك مريح ووقور.",
    dramatic: language === 'english' ? "You are a dramatic performer." : "أنت مؤدي قصائد درامي ومؤثر، صوتك يفيض بالمشاعر والوقفات التأثيرية.",
    formal: language === 'english' ? "You are a formal performer." : "أنت مؤدي شيلات رسمي وفخم، صوتك ملكي ومخارج حروفك دقيقة جداً.",
    nostalgic: language === 'english' ? "You are a nostalgic performer." : "أنت مؤدي قصائد تراثي، صوتك يحمل نبرة الحنين والارتباط بالماضي العريق.",
    humorous: language === 'english' ? "You are a humorous performer." : "أنت مؤدي قصائد فكاهي ومرح، أداؤك خفيف ومبهج.",
    epic: language === 'english' ? "You are an epic performer." : "أنت مؤدي شيلات ملحمي، صوتك جهوري، ضخم، ويوحي بالعظمة والقوة."
  };

  const previewText = lyricsSnippet 
    ? (language === 'english' ? `Perform this lyrics snippet with professional delivery: \n\n${lyricsSnippet}` : `ألقِ هذه الأبيات الشعرية بأداء احترافي ومخارج حروف واضحة: \n\n${lyricsSnippet}`)
    : (language === 'english' ? "Hello, this is my suggested voice for your next song, with clear pronunciation and professional performance. I can handle various styles and emotions to bring your lyrics to life." : "أهلاً بكم في برنامج تركها علينا، هذا هو صوتي المقترح لشيلتكم القادمة، بوضوح تام وأداء فخم. أستطيع أداء مختلف الألوان الشعرية والمشاعر لتجسيد كلماتكم بأفضل صورة ممكنة.");

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: previewText }] }],
      config: {
        systemInstruction: styleInstructions[style] || "أنت مؤدي شيلات محترف، صوتك واضح جداً، ومخارج حروفك دقيقة.",
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/mpeg;base64,${base64Audio}`;
    }
  } catch (error) {
    console.error("Gemini Preview TTS Error:", error);
  }
  throw new Error("Failed to generate voice preview");
}

export async function generateAISuggestions(occasion: string, language: LanguageOption = 'saudi'): Promise<string[]> {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `أنت خبير في التراث الشعبي والشعر. 
  مهمتك هي اقتراح 5 عناوين أو مواضيع قصيرة ومبتكرة لقصائد أو شيلات بناءً على المناسبة المختارة.
  يجب أن تكون الاقتراحات جذابة، متنوعة، وتناسب اللهجة/اللغة المطلوبة.
  رد فقط بقائمة من 5 اقتراحات، كل اقتراح في سطر منفصل، بدون أرقام أو رموز إضافية.`;

  const prompt = `اقترح 5 مواضيع لقصيدة/شيلة لمناسبة: "${occasion}" باللغة/اللهجة: "${language}".`;

  try {
    const response = await ai.models.generateContent({
      model,
      config: {
        systemInstruction,
        temperature: 0.8,
        maxOutputTokens: 200,
      },
      contents: [{ parts: [{ text: prompt }] }],
    });

    const text = response.text;
    if (!text) return [];
    
    return text.split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .slice(0, 5);
  } catch (error) {
    console.error("AI Suggestions Error:", error);
    return [];
  }
}
