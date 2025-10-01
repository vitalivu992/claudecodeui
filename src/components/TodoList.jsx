import React from 'react';
import { CheckCircle2, Clock, Circle } from 'lucide-react';

const TodoList = ({ todos, isResult = false }) => {
  if (!todos || !Array.isArray(todos)) {
    return null;
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
      case 'pending':
      default:
        return <Circle className="w-4 h-4 text-gray-400 dark:text-gray-500" />;
    }
  };

  
  return (
    <div className="space-y-1">
      {isResult && (
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Todo List ({todos.length} {todos.length === 1 ? 'item' : 'items'})
        </div>
      )}

      {todos.map((todo, index) => (
        <div
          key={todo.id || `todo-${index}`}
          className="flex items-center gap-2 py-1"
        >
          <div className="flex-shrink-0">
            {getStatusIcon(todo.status)}
          </div>

          <div className={`text-sm ${todo.status === 'completed' ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
            {todo.content}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TodoList;