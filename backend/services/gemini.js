const { GoogleGenerativeAI } = require('@google/generative-ai');

// Fallback models in order of preference
const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro'];

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
  const errors = [];

  for (const key of keys) {
    for (const modelName of modelsToTry) {
      try {
        const genAI = new GoogleGenerativeAI(key);
        return await operation(genAI, modelName);
      } catch (err) {
        console.warn(
          `Gemini API failed with key suffix ...${key.slice(-6)} using model ${modelName}: ${err.message}`
        );
        
        let customErrorMsg = err.message;
        if (err.message && err.message.includes('404')) {
          customErrorMsg += ' (Note: A 404 "model not found" error typically means this model is disabled/unsupported on this API key. Verify your key configuration in settings.)';
        } else if (err.message && err.message.includes('429')) {
          customErrorMsg += ' (Note: Free-tier rate limit exceeded. Please wait a minute, or provide a custom API key in Settings.)';
        }
        
        errors.push({
          model: modelName,
          message: customErrorMsg,
          isQuota: err.message && err.message.includes('429')
        });
      }
    }
  }

  // Prioritize reporting 429 quota exhaustion over 404 model mismatches
  const quotaError = errors.find(e => e.isQuota);
  const primaryError = quotaError || errors[errors.length - 1] || { message: 'Unknown error', model: 'N/A' };

  throw new Error(`All Gemini API attempts failed. Details: [Model: ${primaryError.model}] ${primaryError.message}`);
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
 * Parse Natural Language task text into structured task fields or commands
 */
const parseNLCommand = async (text, pendingTasks, userKey) => {
  const pendingTasksData = (pendingTasks || []).map(t => ({
    _id: t._id.toString(),
    title: t.title,
    description: t.description,
    deadline: t.deadline,
    estimatedEffort: t.estimatedEffort,
    category: t.category
  }));

  const systemInstruction = `You are a task management command parser.
You will receive:
1. A natural language text input from the user (e.g. "Add a task to buy groceries tomorrow at 4 PM" or "Reschedule study exam to 6 PM").
2. A list of the user's pending tasks.

Analyze the input text:
Decide whether the user is trying to:
- CREATE a new task.
- UPDATE/EDIT an existing task (e.g. rescheduling, changing title, changing effort).

RULES FOR CREATE:
- A specific due date and time are MANDATORY. The user MUST explicitly specify a date (like "tomorrow", "next monday", "July 4th") AND a time (like "4 PM", "16:00", "noon").
- If the date or time is missing or ambiguous (e.g. "add task buy milk" with no date/time, or just "buy milk tomorrow" with no time), you MUST return:
  { "type": "error", "message": "A due date and time are required to schedule this task. Please specify when it is due (e.g., 'tomorrow at 4 PM')." }
- If all fields are present, extract:
  {
    "type": "create",
    "data": {
      "title": "Clean, concise task title",
      "description": "Any details or context about the task, empty string if none",
      "deadline": "ISO format date-time string (YYYY-MM-DDTHH:mm:ss.sssZ) relative to the current local time",
      "estimatedEffort": number (hours, default to 1 if not specified),
      "category": "Work" | "Personal" | "Health" | "Finance" | "Study" (default to "Work")
    }
  }

RULES FOR UPDATE/EDIT:
- If the user refers to an existing task (e.g., "reschedule study exam", "change deadline of dashboard to tomorrow at 5 PM", "change effort of math task to 2 hours"), match it to one of the pending tasks.
- If you find a match, extract the changes and return:
  {
    "type": "update",
    "taskId": "the _id of the matching task",
    "data": {
      "title": "...", // if changed
      "deadline": "ISO format date-time string (YYYY-MM-DDTHH:mm:ss.sssZ) of the new deadline", // if changed
      "estimatedEffort": number, // if changed
      "category": "..." // if changed
    }
  }
- If you can't find a matching task in the list, return:
  { "type": "error", "message": "I could not find a pending task matching that description to update." }

Return ONLY raw JSON matching these schemas. No markdown formatting.
Today's local time is: ${new Date().toLocaleString()} (ISO: ${new Date().toISOString()}).
Pending tasks list: ${JSON.stringify(pendingTasksData)}`;

  const promptText = `Process command: "${text}"`;
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
  parseNLCommand,
  prioritizeTasks,
  generateSchedule,
  generateNudge,
  generateMorningBriefing
};
