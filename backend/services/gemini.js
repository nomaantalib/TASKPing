const { GoogleGenerativeAI } = require('@google/generative-ai');

// Fallback models in order of preference
const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash'];

/**
 * Get available Gemini API keys in rotation order:
 * 1. User's custom API key (if provided)
 * 2. Pre-provided key 1
 * 3. Pre-provided key 2
 */
const getClientWithKeyRotation = async (userKey) => {
  const keys = [];
  if (userKey && userKey.trim() !== '') {
    keys.push(userKey.trim());
  }
  if (process.env.GEMINI_KEY_1 && process.env.GEMINI_KEY_1.trim() !== '') {
    keys.push(process.env.GEMINI_KEY_1.trim());
  }
  if (process.env.GEMINI_KEY_2 && process.env.GEMINI_KEY_2.trim() !== '') {
    keys.push(process.env.GEMINI_KEY_2.trim());
  }

  if (keys.length === 0) {
    throw new Error('No Gemini API keys found. Please supply a key in user settings.');
  }
  return keys;
};

/**
 * Execute a Gemini operation with key rotation and model fallback
 */
const runGenerativeAI = async (userKey, operation) => {
  const keys = await getClientWithKeyRotation(userKey);
  let lastError = null;

  for (const key of keys) {
    for (const modelName of modelsToTry) {
      try {
        const genAI = new GoogleGenerativeAI(key);
        return await operation(genAI, modelName);
      } catch (err) {
        console.warn(
          `Gemini API failed with key suffix ...${key.slice(-6)} using model ${modelName}: ${err.message}`
        );
        lastError = err;
      }
    }
  }

  throw new Error(`All Gemini API attempts failed. Details: ${lastError ? lastError.message : 'Unknown'}`);
};

/**
 * Helper to generate JSON response from Gemini
 */
const generateJSON = async (userKey, systemInstruction, promptText) => {
  return await runGenerativeAI(userKey, async (genAI, modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: 'application/json' },
      systemInstruction: systemInstruction,
    });
    const result = await model.generateContent(promptText);
    const text = result.response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    }
  });
};

/**
 * Helper to generate text response from Gemini
 */
const generateText = async (userKey, systemInstruction, promptText) => {
  return await runGenerativeAI(userKey, async (genAI, modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemInstruction,
    });
    const result = await model.generateContent(promptText);
    return result.response.text().trim();
  });
};

/**
 * Get embedding vector (768 numbers) for text using text-embedding-004 or embedding-001
 */
const getEmbedding = async (text, userKey) => {
  if (!text || text.trim() === '') return [];

  const keys = await getClientWithKeyRotation(userKey);
  const embeddingModels = ['text-embedding-004', 'embedding-001'];
  let lastError = null;

  for (const key of keys) {
    for (const modelName of embeddingModels) {
      try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.embedContent(text);
        if (result && result.embedding && result.embedding.values) {
          return result.embedding.values;
        }
      } catch (err) {
        console.warn(
          `Embedding failed with key suffix ...${key.slice(-6)} using model ${modelName}: ${err.message}`
        );
        lastError = err;
      }
    }
  }
  console.error(`All embedding attempts failed: ${lastError ? lastError.message : 'Unknown'}`);
  return [];
};

/**
 * Parse Natural Language task text into structured task fields
 */
const parseNLTask = async (text, userKey) => {
  const systemInstruction = `You are a task parsing agent. Parse the user's natural language task and extract details: title, description, deadline, estimatedEffort (in hours), and category.
If the estimated effort is not specified, auto-estimate it based on the task complexity (e.g., "write simple email" -> 0.5 hours, "prepare big exam" -> 5 hours).
If the deadline is not specified, default to tomorrow at 17:00 (5 PM).
Category must be one of: 'Work', 'Personal', 'Health', 'Finance', 'Lifestyle', 'Study', or 'Other'.
Today's local time is: ${new Date().toISOString()}.
Return ONLY a JSON object in this exact format:
{
  "title": "Clean, concise task title",
  "description": "Any details or context about the task, empty string if none",
  "deadline": "YYYY-MM-DDTHH:mm:ss.sssZ (ISO 8601 string)",
  "estimatedEffort": 2,
  "category": "Work"
}`;

  const promptText = `Parse this task: "${text}"`;
  return await generateJSON(userKey, systemInstruction, promptText);
};

/**
 * Prioritize list of tasks by Urgency and Estimated Effort
 */
const prioritizeTasks = async (tasks, userKey) => {
  if (!tasks || tasks.length === 0) return [];

  const systemInstruction = `You are an expert AI productivity assistant. Prioritize the user's tasks by balancing urgency (closeness of deadline), estimated effort, categories, and completion streaks.
For each task, assign a priorityScore from 1 (lowest priority) to 10 (highest priority) and a brief 1-2 sentence aiReasoning explaining why this score was assigned.
Return ONLY a JSON array containing objects with the task database _id, priorityScore, and aiReasoning in this exact format:
[
  {
    "_id": "task_database_id_string",
    "priorityScore": 9,
    "aiReasoning": "Crucial task with a tight deadline that fits well into today's timeline."
  }
]`;

  const tasksData = tasks.map(t => ({
    _id: t._id.toString(),
    title: t.title,
    description: t.description,
    deadline: t.deadline,
    estimatedEffort: t.estimatedEffort,
    category: t.category,
    isRecurring: t.isRecurring,
    streakCount: t.streakCount
  }));

  const promptText = `Prioritize these tasks: ${JSON.stringify(tasksData)}`;
  return await generateJSON(userKey, systemInstruction, promptText);
};

/**
 * Generate a schedule for the day with tasks mapped to time blocks
 */
const generateSchedule = async (tasks, energyWindow, userKey) => {
  const systemInstruction = `You are an expert scheduler. Arrange the user's tasks into time blocks for today between 09:00 and 18:00 (9 AM to 6 PM).
The user's peak energy window is: "${energyWindow}" (morning: 09:00-12:00, afternoon: 12:00-15:00, evening: 15:00-18:00).
- High priority (higher priorityScore) and high estimatedEffort tasks MUST be placed within the user's peak energy window.
- Block intervals must match the task's estimatedEffort (e.g. effort 1.5 -> block is 1.5 hours long).
- Adjust start/end times so blocks do not overlap.
- Keep a 10-15 minute buffer between blocks if possible.
- If total task hours exceed the 9-hour limit, schedule only the highest priority ones.
Return ONLY a JSON object in this exact format:
{
  "blocks": [
    {
      "taskId": "task_database_id_string",
      "startTime": "09:30",
      "endTime": "11:00"
    }
  ]
}`;

  const tasksData = tasks.map(t => ({
    _id: t._id.toString(),
    title: t.title,
    estimatedEffort: t.estimatedEffort,
    priorityScore: t.priorityScore,
    category: t.category
  }));

  const promptText = `Create a schedule for energy window "${energyWindow}" using these tasks: ${JSON.stringify(tasksData)}`;
  return await generateJSON(userKey, systemInstruction, promptText);
};

/**
 * Generate a proactive motivational reminder (nudge)
 */
const generateNudge = async (tasks, stats, userKey) => {
  const systemInstruction = `You are a supportive, proactive AI productivity buddy named TASKping.
Based on the user's task status (number of completed vs pending vs missed tasks) and streaks, generate a short, friendly, and motivational nudge (1-2 sentences) to keep them focused.
Avoid sounding generic or robotic. Reference specific tasks or general statistics if helpful.`;

  const tasksData = tasks.map(t => ({
    title: t.title,
    status: t.status,
    deadline: t.deadline,
    isRecurring: t.isRecurring,
    streakCount: t.streakCount
  }));

  const promptText = `Status statistics: ${JSON.stringify(stats)}. Tasks details: ${JSON.stringify(tasksData)}`;
  return await generateText(userKey, systemInstruction, promptText);
};

/**
 * Generate a Morning Briefing card summarizing today's focus
 */
const generateMorningBriefing = async (tasks, completionRateYesterday, userKey) => {
  const systemInstruction = `You are an AI productivity coach. Generate a 2-3 sentence morning briefing summary for the user today.
Briefly summarize today's priorities based on the pending tasks, and comment on their completion rate from yesterday (${completionRateYesterday}%) to motivate them.`;

  const tasksData = tasks.map(t => ({
    title: t.title,
    priorityScore: t.priorityScore,
    category: t.category
  }));

  const promptText = `Pending tasks for today: ${JSON.stringify(tasksData)}`;
  return await generateText(userKey, systemInstruction, promptText);
};

module.exports = {
  getEmbedding,
  parseNLTask,
  prioritizeTasks,
  generateSchedule,
  generateNudge,
  generateMorningBriefing
};
