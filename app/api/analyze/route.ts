import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

interface AnalysisResult {
  whatIsIt: string;
  isSafe: string;
  nextSteps: string;
}

const PROMPT = `You are ClearShield, an AI assistant that helps people understand confusing medical, billing, and insurance documents in plain language.

Analyze the following document text and return a JSON object with exactly these three fields:

- "whatIsIt": A one or two sentence summary of what this document is (e.g. "This is a standard blood test report" or "This is a hospital bill for an ER visit").
- "isSafe": Whether anything in the document requires urgent attention. Start with "All Clear" if nothing is concerning, or "Requires Attention" if something needs follow-up. Then explain why in one or two sentences.
- "nextSteps": A clear, actionable next step the person should take (e.g. "Schedule a follow-up with your doctor to discuss these results").

Return ONLY the JSON object, no markdown, no explanation, no code fences. The JSON must be valid and parseable.

Document text:
`;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "No document text was provided." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "The AI service is not configured. A Gemini API key is required." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.8-flash",
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(PROMPT + text);
    const rawText = result.response.text();

    let parsed: AnalysisResult;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json(
          { error: "The AI returned an unexpected response. Please try again." },
          { status: 500 }
        );
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    if (!parsed.whatIsIt || !parsed.isSafe || !parsed.nextSteps) {
      return NextResponse.json(
        { error: "The AI response was incomplete. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong during analysis.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
