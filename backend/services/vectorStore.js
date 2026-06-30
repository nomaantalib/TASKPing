/**
 * Calculate cosine similarity between two numeric arrays
 */
const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Filter and sort tasks based on vector similarity with a query embedding.
 * Returns the top K tasks most semantically similar to the query.
 * 
 * @param {Array} tasks - List of MongoDB Task documents
 * @param {Array<Number>} queryEmbedding - The embedding of the query text
 * @param {Number} limit - Maximum number of tasks to return
 */
const searchSimilarTasks = (tasks, queryEmbedding, limit = 5) => {
  if (!queryEmbedding || queryEmbedding.length === 0 || !tasks || tasks.length === 0) {
    return tasks.slice(0, limit);
  }

  // Calculate similarity score for each task
  const scoredTasks = tasks.map(task => {
    let score = 0;
    if (task.embedding && task.embedding.length > 0) {
      score = cosineSimilarity(queryEmbedding, task.embedding);
    }
    return { task, score };
  });

  // Sort by score descending
  scoredTasks.sort((a, b) => b.score - a.score);

  // Return the raw task objects
  return scoredTasks.slice(0, limit).map(item => item.task);
};

module.exports = {
  cosineSimilarity,
  searchSimilarTasks
};
