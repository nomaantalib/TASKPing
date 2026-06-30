import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

const TaskChart = ({ tasks }) => {
  const pendingTasks = tasks.filter(t => t.status === 'pending');

  const chartData = pendingTasks.map(task => {
    // Calculate Urgency score (1 to 10). Closer to deadline = higher urgency
    const now = new Date();
    const deadlineDate = new Date(task.deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    let urgency = 1;
    if (diffDays <= 0) {
      urgency = 10; // Overdue or due now
    } else if (diffDays <= 1) {
      urgency = 9.5; // Due within a day
    } else {
      // Scale from 1 to 9 based on days remaining (cap at 10 days)
      urgency = Math.max(1, Math.min(9, 10 - diffDays));
    }

    return {
      id: task._id,
      name: task.title,
      urgency: Math.round(urgency * 10) / 10, // Round to 1 decimal
      effort: task.estimatedEffort,
      priority: task.priorityScore || 1,
      category: task.category
    };
  });

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1e293b]/95 backdrop-blur-md p-4 rounded-xl border border-gray-800 shadow-xl max-w-xs text-xs">
          <p className="font-bold text-white mb-1.5 text-sm">{data.name}</p>
          <div className="space-y-1 text-gray-300">
            <p><span className="text-indigo-400 font-medium">Category:</span> {data.category}</p>
            <p><span className="text-amber-400 font-medium">Urgency (1-10):</span> {data.urgency}</p>
            <p><span className="text-emerald-400 font-medium">Estimated Effort:</span> {data.effort}h</p>
            <p className="mt-2 pt-1 border-t border-gray-800 text-white font-semibold">
              AI Priority Tier: <span className={
                data.priority >= 8 ? 'text-rose-400' : data.priority >= 5 ? 'text-amber-400' : 'text-emerald-400'
              }>{data.priority}/10</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Get bubble color based on priority score
  const getPriorityColor = (priority) => {
    if (priority >= 8) return '#f43f5e'; // rose-500
    if (priority >= 5) return '#f59e0b'; // amber-500
    return '#10b981'; // emerald-500
  };

  if (chartData.length === 0) {
    return (
      <div className="bg-[#111827]/40 border border-gray-800/80 rounded-2xl p-8 text-center">
        <p className="text-gray-400 text-sm">Add some pending tasks to view the AI Urgency vs. Effort grid.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#111827]/30 border border-gray-800/80 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span>Priority Visualization</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Urgency vs Effort</span>
        </h3>
        <p className="text-xs text-gray-500 mt-1">Bubble size and color represent AI priority score. Hover over points for details.</p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />
            <XAxis 
              type="number" 
              dataKey="urgency" 
              name="Urgency" 
              domain={[0, 10]} 
              stroke="#6b7280"
              fontSize={10}
              tickCount={6}
              label={{ value: 'Urgency ➔', position: 'insideBottomRight', offset: -10, fill: '#9ca3af', fontSize: 10 }}
            />
            <YAxis 
              type="number" 
              dataKey="effort" 
              name="Effort" 
              domain={[0, 'auto']} 
              stroke="#6b7280"
              fontSize={10}
              label={{ value: 'Effort (hrs) ➔', angle: -90, position: 'insideLeft', offset: 10, fill: '#9ca3af', fontSize: 10 }}
            />
            <ZAxis 
              type="number" 
              dataKey="priority" 
              range={[60, 400]} 
              name="Priority" 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#374151' }} />
            <Scatter name="Tasks" data={chartData}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getPriorityColor(entry.priority)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-4 justify-end mt-2 text-xs">
        <div className="flex items-center gap-1.5 text-gray-400">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>High Priority (8+)</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-400">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Medium Priority (5-7)</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Low Priority (1-4)</span>
        </div>
      </div>
    </div>
  );
};

export default TaskChart;
