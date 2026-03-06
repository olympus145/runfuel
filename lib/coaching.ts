import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface TrainingWeek {
  runs: { date: string; miles: number; paceSecMile: number | null; avgHr: number | null; type: string }[];
  totalRunMiles: number;
  totalRunMin: number;
  bikes: { date: string; miles: number; durationMin: number; avgHr: number | null }[];
  totalBikeMiles: number;
  totalBikeMin: number;
  strengthDays: number;
  coreDays: number;
  avgV02max: number | null;
  avgHrv: number | null;
}

export interface DayNutrition {
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  meals: { mealType: string; name: string; calories: number }[];
}

export interface UserGoals {
  weeklyRunMilesGoal?: number | null;
  weeklyBikeMilesGoal?: number | null;
  strengthDaysGoal?: number | null;
  coreDaysGoal?: number | null;
  dailyCalorieGoal?: number | null;
  dailyProteinGoal?: number | null;
  weightGoal?: number | null;
  currentWeight?: number | null;
}

export interface PreviousCoaching {
  date: string;
  feedback: string;
  overallScore: number | null;
  focusArea: string | null;
}

export async function generateDailyCoaching(
  week: TrainingWeek,
  nutrition: DayNutrition,
  goals: UserGoals,
  date: string,
  history: PreviousCoaching[]
): Promise<{
  feedback: string;
  highlights: string[];
  runScore: number;
  nutritionScore: number;
  recoveryScore: number;
  overallScore: number;
  focusArea: string;
}> {
  const systemPrompt = `You are an elite running coach and sports nutritionist named Pace — think the expertise of a Tracksmith-sponsored coach combined with a data-driven nutritionist. You track athletes over time and give personalized, progressive coaching.

Your style is:
- Direct, warm, and encouraging — like a coach who genuinely cares
- Data-driven: always reference specific numbers from their training
- Progressive: build on previous feedback, don't repeat the same advice
- Practical: give specific, actionable recommendations for tomorrow
- Concise: no fluff, no generic platitudes

You track: running, cycling, strength/core work, and nutrition together as a holistic performance picture.`;

  // Build conversation history for incremental coaching
  const messages: Anthropic.MessageParam[] = [];

  // Add past coaching sessions as context
  if (history.length > 0) {
    const historyContext = history
      .slice(-7) // last 7 sessions
      .map(
        (h) =>
          `[${h.date}] Score: ${h.overallScore ?? "N/A"}/100, Focus: ${h.focusArea ?? "general"}\n${h.feedback}`
      )
      .join("\n\n---\n\n");

    messages.push({
      role: "user",
      content: `Here is my recent coaching history for context:\n\n${historyContext}\n\nPlease keep this in mind as you provide today's coaching.`,
    });
    messages.push({
      role: "assistant",
      content: `Got it — I have your last ${history.length} coaching session${history.length > 1 ? "s" : ""} in mind. I'll build on what we've been working on and track your progress over time.`,
    });
  }

  // Today's data request
  const todayPrompt = `Here is my training and nutrition data for today (${date}):

## This Week's Training
**Running (${week.totalRunMiles.toFixed(1)} miles / goal: ${goals.weeklyRunMilesGoal ?? "not set"} mi)**
${week.runs.map((r) => `- ${r.date} | ${r.type} | ${r.miles.toFixed(1)}mi | ${r.paceSecMile ? formatPaceMile(r.paceSecMile) : "N/A"}/mi | HR: ${r.avgHr ?? "N/A"}`).join("\n") || "- No runs this week"}

**Cycling (${week.totalBikeMiles.toFixed(1)} miles / goal: ${goals.weeklyBikeMilesGoal ?? "not set"} mi)**
${week.bikes.map((b) => `- ${b.date} | ${b.miles.toFixed(1)}mi | ${b.durationMin}min | HR: ${b.avgHr ?? "N/A"}`).join("\n") || "- No rides this week"}

**Strength: ${week.strengthDays} day${week.strengthDays !== 1 ? "s" : ""} (goal: ${goals.strengthDaysGoal ?? "not set"}/wk)**
**Core: ${week.coreDays} day${week.coreDays !== 1 ? "s" : ""} (goal: ${goals.coreDaysGoal ?? "not set"}/wk)**

**Biometrics:** VO2max: ${week.avgV02max?.toFixed(1) ?? "N/A"} | HRV: ${week.avgHrv ?? "N/A"}

## Today's Nutrition
Calories: ${nutrition.totalCalories} / ${goals.dailyCalorieGoal ?? "goal N/A"} kcal
Protein: ${nutrition.totalProteinG.toFixed(0)}g / ${goals.dailyProteinGoal ?? "N/A"}g target
Carbs: ${nutrition.totalCarbsG.toFixed(0)}g | Fat: ${nutrition.totalFatG.toFixed(0)}g
Meals: ${nutrition.meals.map((m) => `${m.mealType}: ${m.name} (${m.calories} kcal)`).join(", ") || "None logged"}

## Body
Weight: ${goals.currentWeight ?? "N/A"} lbs (goal: ${goals.weightGoal ?? "N/A"} lbs)

Please provide coaching as a JSON object with these exact fields:
{
  "feedback": "2-4 paragraphs of personalized coaching. Reference specific numbers. Build on past sessions. End with tomorrow's specific workout recommendation.",
  "highlights": ["3-5 concise bullet points — mix wins and focus areas"],
  "runScore": <0-100>,
  "nutritionScore": <0-100>,
  "recoveryScore": <0-100, based on HRV, training load, rest days>,
  "overallScore": <0-100>,
  "focusArea": "<one of: speed, endurance, recovery, strength, nutrition, balance>"
}`;

  messages.push({ role: "user", content: todayPrompt });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    system: systemPrompt,
    messages,
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse coaching response");

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    feedback: parsed.feedback ?? "",
    highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
    runScore: clamp(parsed.runScore ?? 50),
    nutritionScore: clamp(parsed.nutritionScore ?? 50),
    recoveryScore: clamp(parsed.recoveryScore ?? 50),
    overallScore: clamp(parsed.overallScore ?? 50),
    focusArea: parsed.focusArea ?? "balance",
  };
}

function clamp(n: number) {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function formatPaceMile(secPerMile: number): string {
  const min = Math.floor(secPerMile / 60);
  const sec = Math.round(secPerMile % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
