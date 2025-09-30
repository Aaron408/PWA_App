export const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

export const createTask = (data) => ({
  id: '',
  title: '',
  description: '',
  completed: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  dueDate: null,
  priority: TaskPriority.MEDIUM,
  photo: null,
  synced: false,
  ...data
});

export const createTaskStats = () => ({
  total: 0,
  completed: 0,
  pending: 0,
  highPriority: 0
});